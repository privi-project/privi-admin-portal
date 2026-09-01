import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity/log";
import { GLOBAL_FEATURED_CAP, CATEGORY_FEATURED_CAP } from "@/lib/featured-config";
import {
  listActiveGlobalFeatured,
  countActiveFeaturedInCategory,
  getBusinessCategories,
} from "@/lib/businesses/queries";
import { sendTransactionalEmail } from "@/lib/emails/resend";
import { featuredActivatedEmail, PARTNERS_EMAIL } from "@/lib/emails/featured";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export type ActivateFeaturedInput = {
  businessId: string;
  businessName: string;
  tier: "category" | "global";
  durationMonths: number;
  amountCharged: number;
  adminId: string;
  adminEmail: string;
  // Optional (2026-08-23): which of the business's locations this term
  // actually covers, for founders who charge per-location. Omitted by the
  // Featured Payments "mark paid & activate" one-click path (that flow has
  // no location picker of its own) — omitting leaves the business's
  // existing featured_location_scope/featured_locations untouched rather
  // than silently resetting them, so a founder who already set specific
  // locations via the business edit page isn't overwritten by a later
  // invoice payment confirmation for the same term.
  locationScope?: "all" | "selected";
  locationIds?: string[];
};

export type ActivateFeaturedResult = { error?: string };

/**
 * Core "switch Featured on for a business" logic — cap checks, the
 * businesses row update, the featured_history ledger insert, and activity
 * logging. Factored out of setFeaturedAction (2026-08-18) so the Featured
 * Payments tracker's one-click "mark paid & activate" path shares the
 * exact same cap-checking rules rather than risking a second, slowly
 * drifting copy of them.
 */
export async function activateFeaturedPlacement(
  input: ActivateFeaturedInput,
): Promise<ActivateFeaturedResult> {
  const {
    businessId,
    businessName,
    tier,
    durationMonths,
    amountCharged,
    adminId,
    adminEmail,
    locationScope,
    locationIds,
  } = input;

  if (tier === "global") {
    const activeGlobal = await listActiveGlobalFeatured(businessId);
    if (activeGlobal.length >= GLOBAL_FEATURED_CAP) {
      const names = activeGlobal.map((b) => b.name).join(", ");
      return {
        error: `All ${GLOBAL_FEATURED_CAP} sitewide slots are in use (${names}). Clear one before adding another, or feature this business in its category instead.`,
      };
    }
  }

  const categories = await getBusinessCategories(businessId);
  for (const category of categories) {
    const { count, names } = await countActiveFeaturedInCategory(category.id, businessId);
    if (count >= CATEGORY_FEATURED_CAP) {
      return {
        error: `"${category.label}" already has all ${CATEGORY_FEATURED_CAP} featured spots taken (${names.join(", ")}). Clear one there first.`,
      };
    }
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + durationMonths);

  const update: Record<string, unknown> = {
    featured_level: tier,
    featured_at: now.toISOString(),
    featured_expires_at: expires.toISOString(),
    updated_at: now.toISOString(),
  };
  if (locationScope) update.featured_location_scope = locationScope;

  const { error } = await adminClient.from("businesses").update(update).eq("id", businessId);

  if (error) return { error: error.message };

  // Only touch featured_locations when this call actually specified a
  // scope — see the locationScope comment on ActivateFeaturedInput above.
  if (locationScope) {
    await adminClient.from("featured_locations").delete().eq("business_id", businessId);
    if (locationScope === "selected" && locationIds && locationIds.length > 0) {
      await adminClient
        .from("featured_locations")
        .insert(locationIds.map((locationId) => ({ business_id: businessId, location_id: locationId })));
    }
  }

  await adminClient.from("featured_history").insert({
    business_id: businessId,
    featured_level: tier,
    duration_months: durationMonths,
    amount_charged: amountCharged,
    started_at: now.toISOString(),
    expires_at: expires.toISOString(),
    created_by: adminId,
  });

  await logActivity({
    adminId,
    adminEmail,
    action: "updated",
    entityType: "business",
    entityId: businessId,
    entityLabel: `${businessName} — featured (${tier}, ${durationMonths}mo, £${amountCharged.toFixed(2)})`,
  });

  // Best-effort — a failed confirmation email shouldn't undo an
  // activation that already genuinely succeeded (cap checks passed, the
  // business is live). Same reasoning as every other transactional send
  // in this project: log and move on rather than surface it as an error
  // to the admin, since the placement itself is already correct.
  try {
    const { data: business } = await adminClient
      .from("businesses")
      .select("contact_name, contact_email")
      .eq("id", businessId)
      .maybeSingle();

    if (business?.contact_email) {
      let locationLabels: string[] | undefined;
      if (locationScope === "selected" && locationIds && locationIds.length > 0) {
        const { data: locations } = await adminClient
          .from("business_locations")
          .select("label, city")
          .in("id", locationIds);
        locationLabels = (locations ?? []).map((l) => l.label || l.city || "a location");
      }

      const { subject, html } = featuredActivatedEmail({
        businessName: business.contact_name || businessName,
        tier,
        term: durationMonths === 1 ? "1 month" : `${durationMonths} months`,
        startDate: formatDate(now.toISOString()),
        endDate: formatDate(expires.toISOString()),
        locations: locationLabels,
      });
      await sendTransactionalEmail({ to: business.contact_email, subject, html, replyTo: PARTNERS_EMAIL });
    }
  } catch (emailErr) {
    console.error("activateFeaturedPlacement: confirmation email failed", businessId, emailErr);
  }

  return {};
}
