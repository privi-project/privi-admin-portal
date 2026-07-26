import { createAdminClient } from "@/lib/supabase/admin";

export type Offer = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  value_summary: string | null;
  offer_type: string;
  terms: string | null;
  availability: string | null;
  redemption_method: string;
  redemption_value: string | null;
  location_scope: string;
  start_date: string | null;
  expiry_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

/**
 * The display status — never stored. An 'active' offer with a future
 * start_date reads as "scheduled"; one past its expiry_date reads as
 * "expired". draft/inactive/archived pass through unchanged. This is the
 * whole mechanism behind "activate scheduled offers" / "flag expired
 * offers" — no background job flips anything, this is just computed fresh
 * on every read.
 */
export function effectiveStatus(offer: Pick<Offer, "status" | "start_date" | "expiry_date">): string {
  if (offer.status !== "active") return offer.status;

  const today = new Date().toISOString().slice(0, 10);

  if (offer.expiry_date && offer.expiry_date < today) return "expired";
  if (offer.start_date && offer.start_date > today) return "scheduled";
  return "active";
}

export async function listOffersForBusiness(businessId: string): Promise<Offer[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("offers")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export type OfferWithBusinessName = Offer & { business_name: string };

// Flat cross-business list — used by the notification form's offer picker
// (a notification can link to any offer, not just one business's).
export async function listAllOffers(): Promise<OfferWithBusinessName[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("offers")
    .select("*, businesses(name)")
    .order("created_at", { ascending: false });

  type Row = Offer & { businesses: { name: string } | null };
  return ((data as unknown as Row[]) ?? []).map((row) => ({
    ...row,
    business_name: row.businesses?.name ?? "Unknown business",
  }));
}

export async function getOffer(id: string): Promise<Offer | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient.from("offers").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function getOfferLocationIds(offerId: string): Promise<string[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("offer_locations")
    .select("location_id")
    .eq("offer_id", offerId);

  return (data ?? []).map((row) => row.location_id);
}
