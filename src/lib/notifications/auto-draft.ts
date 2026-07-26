import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

/**
 * Auto-drafts a notification when a business/offer goes live — the admin
 * still reviews the audience and clicks Send themselves (task #9 plan's
 * hold-and-release model, unchanged). Called from publishBusinessAction
 * (businesses/actions.ts) and activateOfferAction (offers/actions.ts) so
 * these show up for review without the admin having to remember to draft
 * one manually every time.
 */
export async function createAutoDraftNotification(
  adminClient: AdminClient,
  input: {
    title: string;
    body: string;
    notificationType: "new_business" | "new_offer";
    linkedBusinessId?: string | null;
    linkedOfferId?: string | null;
    createdBy: string;
  },
): Promise<void> {
  // Area-based by default, centred on the business/offer itself — most
  // notifications are location-relevant, not whole-membership blasts. For
  // an offer with location_scope 'selected' (e.g. a national chain running
  // a deal at only some sites), computeAudience resolves linked_offer_id
  // to just that offer's own locations, not every branch the business has.
  const { error } = await adminClient.from("notifications").insert({
    title: input.title,
    body: input.body,
    notification_type: input.notificationType,
    linked_business_id: input.linkedBusinessId ?? null,
    linked_offer_id: input.linkedOfferId ?? null,
    audience_type: "area",
    audience_reference_business_id: input.linkedBusinessId ?? null,
    audience_radius_miles: 20,
    status: "draft",
    created_by: input.createdBy,
  });

  if (error) {
    console.error("createAutoDraftNotification failed:", error.message);
  }
}
