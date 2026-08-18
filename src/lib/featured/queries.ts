import { createAdminClient } from "@/lib/supabase/admin";

export type FeaturedHistoryRow = {
  id: string;
  business_id: string;
  featured_level: "category" | "global";
  duration_months: number;
  amount_charged: number | null;
  started_at: string;
  expires_at: string;
  created_at: string;
};

export type FeaturedHistoryWithBusinessName = FeaturedHistoryRow & { business_name: string };

/**
 * The permanent accounting ledger — every set/renew ever recorded,
 * regardless of the business's current live featured status. from/to
 * filter on started_at, matching how the founder actually thinks about
 * this ("what did I charge in this period"), not on created_at.
 */
export async function listFeaturedHistory(filters: {
  from?: string;
  to?: string;
} = {}): Promise<FeaturedHistoryWithBusinessName[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  let query = adminClient
    .from("featured_history")
    .select("*, businesses(name)")
    .order("started_at", { ascending: false });

  if (filters.from) query = query.gte("started_at", filters.from);
  if (filters.to) query = query.lte("started_at", filters.to);

  const { data } = await query;

  type Row = FeaturedHistoryRow & { businesses: { name: string } | null };
  return ((data as unknown as Row[]) ?? []).map((row) => ({
    ...row,
    business_name: row.businesses?.name ?? "Unknown business",
  }));
}
