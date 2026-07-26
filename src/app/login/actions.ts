"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkLockout,
  recordFailedAttempt,
  resetAttempts,
} from "@/lib/auth/login-attempts";
import { GENERIC_LOGIN_ERROR } from "@/lib/auth/constants";

export type LoginState = { error?: string } | undefined;

export async function signInAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  // Checked before ever calling Supabase auth — avoids hitting Supabase's
  // own rate limits and avoids a timing difference between "locked" and
  // "wrong password" that could leak account existence.
  const { isLocked } = await checkLockout(email);
  if (isLocked) {
    return { error: "Too many failed attempts. Try again later." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    await recordFailedAttempt(email);
    return { error: GENERIC_LOGIN_ERROR };
  }

  // Explicit server-side check: a valid Supabase session does not imply
  // admin. No matching admin_users row → sign out immediately, same
  // generic error, no exceptions.
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("Admin Supabase client is not configured.");
  }

  const { data: adminUser } = await adminClient
    .from("admin_users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!adminUser) {
    await supabase.auth.signOut();
    await recordFailedAttempt(email);
    return { error: GENERIC_LOGIN_ERROR };
  }

  await resetAttempts(adminUser.id);
  redirect("/mfa/challenge");
}
