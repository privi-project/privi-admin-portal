"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { NEW_APPLICATION_STATUS_SLUG } from "@/lib/business-applications/config";

export async function moveApplicationStatusAction(
  id: string,
  businessName: string,
  newStatus: string,
) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  // Columns are admin-editable now, so validate against the live, active
  // list rather than a fixed set — also rejects moving into a column
  // that's since been deactivated.
  const { data: statusRow } = await adminClient
    .from("business_application_statuses")
    .select("slug")
    .eq("slug", newStatus)
    .eq("is_active", true)
    .maybeSingle();
  if (!statusRow) return;

  const { error } = await adminClient
    .from("business_applications")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return;

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "business_application",
    entityId: id,
    entityLabel: `${businessName} — moved to ${newStatus}`,
  });

  revalidatePath("/business-applications");
  revalidatePath("/home");
}

export async function saveApplicationNotesAction(id: string, notes: string) {
  await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("business_applications")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/business-applications");
}

/**
 * Hard delete — only for applications still "New". Anything actioned
 * further (Reviewing/Contacted/Signed up/Declined) is a real record of
 * work done and stays put; "Declined" is already this board's non-
 * destructive way to close out an application that didn't go anywhere.
 * "New" is the one column that's just as likely to hold test rows, spam,
 * or a mis-submitted form, so it's the one safe to remove outright.
 * Status is re-checked server-side, not just hidden client-side.
 */
export async function deleteApplicationAction(id: string, businessName: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: application } = await adminClient
    .from("business_applications")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!application || application.status !== NEW_APPLICATION_STATUS_SLUG) return;

  await adminClient.from("business_applications").delete().eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "business_application",
    entityId: id,
    entityLabel: businessName,
  });

  revalidatePath("/business-applications");
  revalidatePath("/home");
}
