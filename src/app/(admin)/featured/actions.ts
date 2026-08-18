"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { FEATURED_DURATIONS, GLOBAL_FEATURED_CAP, CATEGORY_FEATURED_CAP } from "@/lib/featured-config";
import { listActiveGlobalFeatured, countActiveFeaturedInCategory, getBusinessCategories } from "@/lib/businesses/queries";

export type FeaturedActionState = { error?: string } | undefined;

const FEATURED_TIERS = ["category", "global"];

/**
 * Sets (or renews) a business's featured tier for a fixed paid term.
 * Deliberately its own action, separate from updateBusinessAction — same
 * pattern as SetPasswordControl/OfferArchiveControl: a distinct,
 * consequential state change shouldn't be bundled into "save the general
 * edit form" where it's easy to trigger by accident.
 */
export async function setFeaturedAction(
  businessId: string,
  businessName: string,
  _prevState: FeaturedActionState,
  formData: FormData,
): Promise<FeaturedActionState> {
  const session = await requireAdminSession();

  const tier = String(formData.get("featured_level") ?? "");
  const duration = String(formData.get("duration") ?? "");

  if (!FEATURED_TIERS.includes(tier)) return { error: "Select a tier." };
  const validDurations = FEATURED_DURATIONS.map((d) => d.value) as string[];
  if (!validDurations.includes(duration)) return { error: "Select a duration." };

  if (tier === "global") {
    const activeGlobal = await listActiveGlobalFeatured(businessId);
    if (activeGlobal.length >= GLOBAL_FEATURED_CAP) {
      const names = activeGlobal.map((b) => b.name).join(", ");
      return {
        error: `All ${GLOBAL_FEATURED_CAP} sitewide slots are in use (${names}). Clear one before adding another, or feature this business in its category instead.`,
      };
    }
  }

  // Both tiers occupy a category's slots (global boosts category views
  // too) — check every category this business belongs to, whichever tier
  // is being set.
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
  expires.setMonth(expires.getMonth() + Number(duration));

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

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "business",
    entityId: businessId,
    entityLabel: `${businessName} — featured (${tier}, ${duration}mo)`,
  });

  revalidatePath("/featured");
  revalidatePath(`/businesses/${businessId}/edit`);
  revalidatePath("/businesses");
  return undefined;
}

export async function clearFeaturedAction(businessId: string, businessName: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("businesses")
    .update({
      featured_level: "none",
      featured_at: null,
      featured_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "business",
    entityId: businessId,
    entityLabel: `${businessName} — featured cleared`,
  });

  revalidatePath("/featured");
  revalidatePath(`/businesses/${businessId}/edit`);
  revalidatePath("/businesses");
}
