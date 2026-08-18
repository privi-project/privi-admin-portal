import { createAdminClient } from "@/lib/supabase/admin";

// Kept intentionally open (not a strict union) — Admin_Portal_Structure.docx
// Section 11 calls for a simple "what changed, when, on which record" log,
// not a rigid taxonomy. Use short, consistent past-tense verbs at call
// sites: "created", "updated", "activated", "deactivated", "archived",
// "sent", etc.
export type ActivityAction = string;
export type ActivityEntityType =
  | "business"
  | "location"
  | "offer"
  | "member"
  | "notification"
  | "category"
  | "settings"
  | "banner"
  | "business_application"
  | "business_application_status"
  | "featured_payment_request";

export type LogActivityInput = {
  adminId: string;
  adminEmail: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  /** Human-readable snapshot (business name, offer title, etc.) — stored
   * denormalized so the log stays readable even if the record is later
   * renamed or archived. */
  entityLabel?: string;
};

/**
 * Writes one row to admin_activity_log. Call this from every mutation
 * (Server Action) that changes business/location/offer/member/notification
 * data — this is the sole source for both the Activity Log page (task #11)
 * and Dashboard's "Recent activity" (task #10).
 *
 * Deliberately fire-and-forget from the caller's perspective in spirit —
 * failures are logged, not thrown, so a logging hiccup never blocks the
 * actual admin action it's describing.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    console.error("logActivity: admin Supabase client is not configured");
    return;
  }

  const { error } = await adminClient.from("admin_activity_log").insert({
    admin_id: input.adminId,
    admin_email: input.adminEmail,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
  });

  if (error) {
    console.error("logActivity failed:", error.message);
  }
}
