import { createAdminClient } from "@/lib/supabase/admin";
import { getSystemSettings } from "@/lib/system-settings/queries";

type AdminUserRow = {
  id: string;
  email: string;
  failed_login_count: number;
  locked_until: string | null;
};

/**
 * Looks up an admin_users row by email and reports whether it's currently
 * locked out. Checked BEFORE calling Supabase auth at all, so a locked
 * account is rejected without hitting Supabase's own rate limits and
 * without a timing difference between "locked" and "wrong password."
 */
export async function checkLockout(email: string): Promise<{
  row: AdminUserRow | null;
  isLocked: boolean;
}> {
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data } = await adminClient
    .from("admin_users")
    .select("id, email, failed_login_count, locked_until")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!data) return { row: null, isLocked: false };

  const isLocked = Boolean(
    data.locked_until && new Date(data.locked_until).getTime() > Date.now(),
  );

  return { row: data, isLocked };
}

/** Increments the failed-attempt counter and locks the account if it just
 * crossed the threshold. No-op if no admin_users row matches the email
 * (a non-admin trying to log in has nothing to increment). */
export async function recordFailedAttempt(email: string): Promise<void> {
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data } = await adminClient
    .from("admin_users")
    .select("id, failed_login_count")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!data) return;

  const { max_failed_login_attempts, lockout_minutes } = await getSystemSettings();
  const nextCount = data.failed_login_count + 1;
  const lockedUntil =
    nextCount >= max_failed_login_attempts
      ? new Date(Date.now() + lockout_minutes * 60 * 1000).toISOString()
      : null;

  await adminClient
    .from("admin_users")
    .update({ failed_login_count: nextCount, locked_until: lockedUntil })
    .eq("id", data.id);
}

/** Resets the lockout state and records last_login_at on a successful
 * login. */
export async function resetAttempts(userId: string): Promise<void> {
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("admin_users")
    .update({
      failed_login_count: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
