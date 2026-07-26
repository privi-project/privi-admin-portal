"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired } from "@/lib/validation";
import { computeAudience, type AudienceType } from "@/lib/notifications/audience";
import { NOTIFICATION_TYPES, AUDIENCE_TYPES } from "@/lib/notification-config";

export type NotificationFormState = { error?: string } | undefined;

const NOTIFICATION_TYPE_VALUES = NOTIFICATION_TYPES.map((t) => t.value as string);
const AUDIENCE_TYPE_VALUES = AUDIENCE_TYPES.map((a) => a.value as string);

// Schedule only ever captures a day, not a time — "07:00 regardless" per
// the founder, so it always reads as a morning message whenever it's
// actually sent. The date input gives "YYYY-MM-DD"; pin it to 07:00 here.
function toScheduledTimestamp(dateOnly: string | null): string | null {
  if (!dateOnly) return null;
  return `${dateOnly}T07:00:00`;
}

function readNotificationFields(formData: FormData) {
  const linkedBusinessId = String(formData.get("linked_business_id") ?? "").trim() || null;
  const audienceType = String(formData.get("audience_type") ?? "area") as AudienceType;
  const explicitReferenceBusinessId =
    String(formData.get("audience_reference_business_id") ?? "").trim() || null;

  return {
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    notification_type: String(formData.get("notification_type") ?? "general"),
    linked_business_id: linkedBusinessId,
    linked_offer_id: String(formData.get("linked_offer_id") ?? "").trim() || null,
    audience_type: audienceType,
    audience_member_id: String(formData.get("audience_member_id") ?? "").trim() || null,
    audience_radius_miles: formData.get("audience_radius_miles")
      ? Number(formData.get("audience_radius_miles"))
      : 20,
    // A notification linked to a business/offer already has a natural
    // centre point — the form only shows the standalone reference picker
    // for unlinked "General" notifications, so fall back to the linked
    // business here rather than requiring it to be picked twice.
    audience_reference_business_id: explicitReferenceBusinessId ?? linkedBusinessId,
    scheduled_at: toScheduledTimestamp(String(formData.get("scheduled_at") ?? "").trim() || null),
    expires_at: String(formData.get("expires_at") ?? "").trim() || null,
  };
}

function validateNotificationFields(fields: ReturnType<typeof readNotificationFields>): string | null {
  if (!isRequired(fields.title)) return "Title is required.";
  if (!isRequired(fields.body)) return "Body is required.";
  if (!NOTIFICATION_TYPE_VALUES.includes(fields.notification_type)) return "Invalid notification type.";
  if (!AUDIENCE_TYPE_VALUES.includes(fields.audience_type)) return "Invalid audience type.";
  if (fields.audience_type === "individual" && !fields.audience_member_id) {
    return "Select a member for an individual notification.";
  }
  if (fields.audience_type === "area" && !fields.audience_reference_business_id) {
    return "Select a reference business for area-based targeting.";
  }
  return null;
}

export async function createNotificationAction(
  _prevState: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const session = await requireAdminSession();
  const fields = readNotificationFields(formData);

  const validationError = validateNotificationFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data, error } = await adminClient
    .from("notifications")
    .insert({ ...fields, created_by: session.userId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the notification." };
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "notification",
    entityId: data.id,
    entityLabel: fields.title,
  });

  // Back to the drafts list, not straight into Preview/Send — this is
  // meant to support batch-drafting several notifications and sending
  // each one later when ready, not a single-record "create then commit"
  // flow like businesses/offers use.
  revalidatePath("/notifications");
  redirect("/notifications?status=draft");
}

export async function updateNotificationAction(
  id: string,
  _prevState: NotificationFormState,
  formData: FormData,
): Promise<NotificationFormState> {
  const session = await requireAdminSession();
  const fields = readNotificationFields(formData);

  const validationError = validateNotificationFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("notifications")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "notification",
    entityId: id,
    entityLabel: fields.title,
  });

  // Stays on the edit page rather than jumping to Preview — there's
  // already a Preview link right there when the admin actually wants it.
  revalidatePath("/notifications");
  revalidatePath(`/notifications/${id}/edit`);
  redirect(`/notifications/${id}/edit?saved=1`);
}

/**
 * Computes and snapshots the target audience — there's no App yet to
 * actually deliver anything to, so this is the whole of what "Send" does
 * for now (see task #9 plan). sent_count = targeted_count and
 * failed_count = 0 since nothing can fail without a real delivery
 * mechanism to fail against.
 */
export async function sendNotificationAction(id: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: notification } = await adminClient
    .from("notifications")
    .select(
      "audience_type, audience_member_id, audience_radius_miles, audience_reference_business_id, linked_offer_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!notification) return;

  const audience = await computeAudience({
    audienceType: notification.audience_type as AudienceType,
    audienceMemberId: notification.audience_member_id,
    audienceRadiusMiles: notification.audience_radius_miles,
    audienceReferenceBusinessId: notification.audience_reference_business_id,
    linkedOfferId: notification.linked_offer_id,
  });

  await adminClient
    .from("notifications")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      targeted_count: audience.count,
      sent_count: audience.count,
      failed_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "sent",
    entityType: "notification",
    entityId: id,
    entityLabel: `${title} (${audience.count} targeted)`,
  });

  revalidatePath("/notifications");
  redirect("/notifications");
}

/** Informational only — no cron exists to auto-send at scheduled_at (see
 * task #9 plan). The admin still comes back and clicks Send when ready. */
export async function scheduleNotificationAction(id: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("notifications")
    .update({ status: "scheduled", updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "scheduled",
    entityType: "notification",
    entityId: id,
    entityLabel: title,
  });

  revalidatePath("/notifications");
  redirect("/notifications");
}

export async function cancelNotificationAction(id: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("notifications")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "cancelled",
    entityType: "notification",
    entityId: id,
    entityLabel: title,
  });

  revalidatePath("/notifications");
}

export async function duplicateNotificationAction(id: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: original } = await adminClient
    .from("notifications")
    .select(
      "title, body, notification_type, linked_business_id, linked_offer_id, audience_type, audience_member_id, audience_radius_miles, audience_reference_business_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (!original) return;

  const { data: copy, error } = await adminClient
    .from("notifications")
    .insert({ ...original, status: "draft", created_by: session.userId })
    .select("id")
    .single();

  if (error || !copy) return;

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "duplicated",
    entityType: "notification",
    entityId: copy.id,
    entityLabel: original.title,
  });

  revalidatePath("/notifications");
  redirect(`/notifications/${copy.id}/edit`);
}

/** Hard delete — only for notifications still in draft. Anything that was
 * ever scheduled or sent must stay as history (Section 8b's own "History"
 * requirement) — use cancel instead. */
export async function deleteNotificationAction(id: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: notification } = await adminClient
    .from("notifications")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!notification || notification.status !== "draft") {
    return;
  }

  await adminClient.from("notifications").delete().eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "notification",
    entityId: id,
    entityLabel: title,
  });

  revalidatePath("/notifications");
  redirect("/notifications");
}
