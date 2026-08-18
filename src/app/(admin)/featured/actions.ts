"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { FEATURED_DURATIONS } from "@/lib/featured-config";
import { activateFeaturedPlacement } from "@/lib/featured/activate";

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
  const amountRaw = String(formData.get("amount_charged") ?? "").trim();

  if (!FEATURED_TIERS.includes(tier)) return { error: "Select a tier." };
  const validDurations = FEATURED_DURATIONS.map((d) => d.value) as string[];
  if (!validDurations.includes(duration)) return { error: "Select a duration." };

  // Founder's explicit policy: featured placement is never free. Required
  // here (not just a nullable DB column) so the accounting ledger below
  // is never missing the one figure it exists to record.
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter the amount actually charged for this term." };
  }

  const result = await activateFeaturedPlacement({
    businessId,
    businessName,
    tier: tier as "category" | "global",
    durationMonths: Number(duration),
    amountCharged: amount,
    adminId: session.userId,
    adminEmail: session.email,
  });

  if (result.error) return result;

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
