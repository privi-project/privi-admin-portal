"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired, isValidEmail } from "@/lib/validation";

export type CreateMemberState = { error?: string } | undefined;

export async function createMemberAction(
  _prevState: CreateMemberState,
  formData: FormData,
): Promise<CreateMemberState> {
  const session = await requireAdminSession();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const isComplimentary = formData.get("is_complimentary") === "on";
  const complimentaryReason = String(formData.get("complimentary_reason") ?? "").trim();

  if (!isRequired(firstName) || !isRequired(lastName)) {
    return { error: "First and last name are required." };
  }
  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (isComplimentary && !isRequired(complimentaryReason)) {
    return { error: "A reason is required to grant complimentary membership." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  // Invite-based, not an admin-typed password — matches the credential-
  // hygiene pattern already used to bootstrap the admin account. Fires
  // handle_new_user(), which creates the profiles row automatically.
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { first_name: firstName, last_name: lastName },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Could not create the member." };
  }

  const memberId = data.user.id;

  if (isComplimentary) {
    await adminClient
      .from("profiles")
      .update({ is_complimentary: true, complimentary_reason: complimentaryReason })
      .eq("id", memberId);
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "member",
    entityId: memberId,
    entityLabel: `${firstName} ${lastName}`,
  });

  redirect(`/members/${memberId}`);
}
