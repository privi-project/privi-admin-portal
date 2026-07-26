"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";

export type SettingsFormState = { error?: string; saved?: boolean } | undefined;

/**
 * Unlike reset-password's updatePasswordAction (unauthenticated
 * magic-link flow, which signs the admin back out afterward), this is a
 * logged-in admin voluntarily changing their own password mid-session —
 * no current-password re-entry required (same security model as the
 * reset flow; aal2 is already enforced to reach this page at all), and it
 * stays on the page with a confirmation rather than redirecting to login.
 */
export async function updateOwnPasswordAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await requireAdminSession();

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "changed_password",
    entityType: "settings",
    entityLabel: "Own account",
  });

  return { saved: true };
}

function positiveInt(formData: FormData, key: string, label: string): number | { error: string } {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value) || value < 1) {
    return { error: `${label} must be a whole number of 1 or more.` };
  }
  return value;
}

export async function updateSecuritySettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await requireAdminSession();

  const sessionTimeout = positiveInt(formData, "session_timeout_minutes", "Session timeout");
  if (typeof sessionTimeout !== "number") return sessionTimeout;
  const maxAttempts = positiveInt(formData, "max_failed_login_attempts", "Failed-login attempt limit");
  if (typeof maxAttempts !== "number") return maxAttempts;
  const lockoutMinutes = positiveInt(formData, "lockout_minutes", "Lockout duration");
  if (typeof lockoutMinutes !== "number") return lockoutMinutes;

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("system_settings")
    .update({
      session_timeout_minutes: sessionTimeout,
      max_failed_login_attempts: maxAttempts,
      lockout_minutes: lockoutMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "settings",
    entityLabel: "Security settings",
  });

  revalidatePath("/settings");
  return { saved: true };
}
