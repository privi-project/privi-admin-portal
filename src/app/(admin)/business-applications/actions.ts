"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired } from "@/lib/validation";
import { NEW_APPLICATION_STATUS_SLUG } from "@/lib/business-applications/config";

export type ManualApplicationFormState = { error?: string } | undefined;

/**
 * The direct-outreach counterpart to the public form — for a business
 * the founder is already talking to (walking an area, a chain/BID
 * conversation) who hasn't submitted the website form themselves.
 * Deliberately lets the caller choose the starting column rather than
 * always defaulting to "New" — someone already mid-conversation often
 * belongs straight in "Contacted", not queued as if unworked.
 */
export async function createManualApplicationAction(
  _prevState: ManualApplicationFormState,
  formData: FormData,
): Promise<ManualApplicationFormState> {
  const session = await requireAdminSession();

  const businessName = String(formData.get("business_name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const locationType = String(formData.get("location_type") ?? "single");
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "").trim();

  if (!isRequired(businessName)) return { error: "Business name is required." };
  if (!isRequired(contactName)) return { error: "Contact name is required." };
  if (!isRequired(contactEmail)) return { error: "Contact email is required." };
  if (!["single", "multi"].includes(locationType)) return { error: "Choose a location type." };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: statusRow } = await adminClient
    .from("business_application_statuses")
    .select("slug")
    .eq("slug", status)
    .eq("is_active", true)
    .maybeSingle();
  if (!statusRow) return { error: "Choose a starting column." };

  const { error } = await adminClient.from("business_applications").insert({
    business_name: businessName,
    category_id: categoryId,
    location_type: locationType,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    message,
    status,
    source: "manual",
  });

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "added manually",
    entityType: "business_application",
    entityLabel: `${businessName} — ${status}`,
  });

  revalidatePath("/business-applications");
  revalidatePath("/home");
}

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
