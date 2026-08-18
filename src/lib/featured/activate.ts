import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity/log";
import { GLOBAL_FEATURED_CAP, CATEGORY_FEATURED_CAP } from "@/lib/featured-config";
import {
  listActiveGlobalFeatured,
  countActiveFeaturedInCategory,
  getBusinessCategories,
} from "@/lib/businesses/queries";

export type ActivateFeaturedInput = {
  businessId: string;
  businessName: string;
  tier: "category" | "global";
  durationMonths: number;
  amountCharged: number;
  adminId: string;
  adminEmail: string;
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
  const { businessId, businessName, tier, durationMonths, amountCharged, adminId, adminEmail } = input;

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

  const { error } = await adminClient
    .from("businesses")
    .update({
      featured_level: tier,
      featured_at: now.toISOString(),
      featured_expires_at: expires.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", businessId);

  if (error) return { error: error.message };

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

  return {};
}
