"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ForgotPasswordState = { message: string } | undefined;

const GENERIC_MESSAGE =
  "If that email is registered, we've sent a password reset link.";

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) return { message: GENERIC_MESSAGE };

  // Only actually send the email if this is a real admin account — but
  // return the same generic message either way, so this surface can't be
  // used to test which emails are registered admins.
  const adminClient = createAdminClient();
  if (adminClient) {
    const { data: adminUser } = await adminClient
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (adminUser) {
      const headersList = await headers();
      const origin =
        headersList.get("origin") ?? `http://${headersList.get("host")}`;

      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/confirm?next=/reset-password`,
      });
    }
  }

  return { message: GENERIC_MESSAGE };
}
