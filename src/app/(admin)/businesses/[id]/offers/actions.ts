"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired } from "@/lib/validation";
import { OFFER_TYPES, REDEMPTION_METHODS } from "@/lib/offer-config";
import { createAutoDraftNotification } from "@/lib/notifications/auto-draft";

export type OfferFormState = { error?: string } | undefined;

const LOCATION_SCOPES = ["all", "selected", "online", "national", "regional"];

// The form shows two checkboxes (in person / online) rather than a single
// select — more natural for the founder to fill in from what a business
// tells them ("we take online bookings too"). Both ticked -> 'both'.
function deriveRedeemWhere(formData: FormData): string {
  const inPerson = formData.get("redeem_in_person") === "on";
  const online = formData.get("redeem_online") === "on";
  if (inPerson && online) return "both";
  if (online) return "online";
  if (inPerson) return "in_store";
  return "";
}

function readOfferFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    value_summary: String(formData.get("value_summary") ?? "").trim() || null,
    offer_type: String(formData.get("offer_type") ?? ""),
    terms: String(formData.get("terms") ?? "").trim() || null,
    availability: String(formData.get("availability") ?? "").trim() || null,
    redemption_method: String(formData.get("redemption_method") ?? ""),
    redemption_value: String(formData.get("redemption_value") ?? "").trim() || null,
    redeem_where: deriveRedeemWhere(formData),
    location_scope: String(formData.get("location_scope") ?? "all"),
    start_date: String(formData.get("start_date") ?? "").trim() || null,
    expiry_date: String(formData.get("expiry_date") ?? "").trim() || null,
  };
}

function validateOfferFields(fields: ReturnType<typeof readOfferFields>): string | null {
  if (!isRequired(fields.title)) return "Offer title is required.";

  const validOfferTypes = OFFER_TYPES.map((t) => t.value) as string[];
  if (!validOfferTypes.includes(fields.offer_type)) return "Select a valid offer type.";

  const validRedemptionMethods = REDEMPTION_METHODS.map((m) => m.value) as string[];
  if (!validRedemptionMethods.includes(fields.redemption_method)) {
    return "Select a valid redemption method.";
  }

  if (!fields.redeem_where) {
    return "Tick at least one: in person and/or online.";
  }

  if (!LOCATION_SCOPES.includes(fields.location_scope)) return "Invalid location scope.";

  if (fields.start_date && fields.expiry_date && fields.start_date > fields.expiry_date) {
    return "Start date can't be after the expiry date.";
  }

  return null;
}

async function syncOfferLocations(offerId: string, locationScope: string, locationIds: string[]) {
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient.from("offer_locations").delete().eq("offer_id", offerId);

  if (locationScope === "selected" && locationIds.length > 0) {
    await adminClient
      .from("offer_locations")
      .insert(locationIds.map((locationId) => ({ offer_id: offerId, location_id: locationId })));
  }
}

export async function createOfferAction(
  businessId: string,
  _prevState: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const session = await requireAdminSession();
  const fields = readOfferFields(formData);
  const locationIds = formData.getAll("locationIds").map(String);

  const validationError = validateOfferFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data, error } = await adminClient
    .from("offers")
    .insert({ ...fields, business_id: businessId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the offer." };
  }

  await syncOfferLocations(data.id, fields.location_scope, locationIds);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "offer",
    entityId: data.id,
    entityLabel: fields.title,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
  redirect(`/businesses/${businessId}/offers/${data.id}/preview`);
}

export async function updateOfferAction(
  businessId: string,
  offerId: string,
  _prevState: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const session = await requireAdminSession();
  const fields = readOfferFields(formData);
  const locationIds = formData.getAll("locationIds").map(String);

  const validationError = validateOfferFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("offers")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", offerId);

  if (error) return { error: error.message };

  await syncOfferLocations(offerId, fields.location_scope, locationIds);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "offer",
    entityId: offerId,
    entityLabel: fields.title,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
  redirect(`/businesses/${businessId}/edit`);
}

export async function activateOfferAction(businessId: string, offerId: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("offers")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", offerId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "activated",
    entityType: "offer",
    entityId: offerId,
    entityLabel: title,
  });

  const { data: business } = await adminClient
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .maybeSingle();

  await createAutoDraftNotification(adminClient, {
    title: business?.name ? `New offer at ${business.name}: ${title}` : `New offer: ${title}`,
    body: "Check out this new offer on Privi.",
    notificationType: "new_offer",
    linkedBusinessId: businessId,
    linkedOfferId: offerId,
    createdBy: session.userId,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
  revalidatePath("/notifications");
  redirect("/businesses");
}

export async function toggleOfferActiveAction(
  businessId: string,
  offerId: string,
  title: string,
  nextActive: boolean,
) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("offers")
    .update({ status: nextActive ? "active" : "inactive", updated_at: new Date().toISOString() })
    .eq("id", offerId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: nextActive ? "activated" : "deactivated",
    entityType: "offer",
    entityId: offerId,
    entityLabel: title,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}

export async function archiveOfferAction(businessId: string, offerId: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("offers")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", offerId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "archived",
    entityType: "offer",
    entityId: offerId,
    entityLabel: title,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}

export async function unarchiveOfferAction(businessId: string, offerId: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("offers")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", offerId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "unarchived",
    entityType: "offer",
    entityId: offerId,
    entityLabel: title,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}

export async function duplicateOfferAction(businessId: string, offerId: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: original } = await adminClient
    .from("offers")
    .select(
      "title, description, value_summary, offer_type, terms, availability, redemption_method, redemption_value, redeem_where, location_scope, start_date, expiry_date",
    )
    .eq("id", offerId)
    .maybeSingle();

  if (!original) return;

  const { data: copy, error } = await adminClient
    .from("offers")
    .insert({ ...original, business_id: businessId, status: "draft" })
    .select("id")
    .single();

  if (error || !copy) return;

  if (original.location_scope === "selected") {
    const { data: originalLocations } = await adminClient
      .from("offer_locations")
      .select("location_id")
      .eq("offer_id", offerId);

    if (originalLocations && originalLocations.length > 0) {
      await adminClient.from("offer_locations").insert(
        originalLocations.map((row) => ({ offer_id: copy.id, location_id: row.location_id })),
      );
    }
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "duplicated",
    entityType: "offer",
    entityId: copy.id,
    entityLabel: original.title,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
  redirect(`/businesses/${businessId}/offers/${copy.id}/edit`);
}

/**
 * Hard delete — only for offers that never went live. Anything that was
 * ever active must be archived instead, never deleted. The draft-only
 * check happens server-side, not just hidden in the UI.
 */
export async function deleteOfferAction(businessId: string, offerId: string, title: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: offer } = await adminClient
    .from("offers")
    .select("status")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer || offer.status !== "draft") {
    return;
  }

  await adminClient.from("offers").delete().eq("id", offerId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "offer",
    entityId: offerId,
    entityLabel: title,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}
