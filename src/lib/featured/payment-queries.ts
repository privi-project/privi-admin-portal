import { createAdminClient } from "@/lib/supabase/admin";

export type FeaturedPaymentStatus = "unpaid" | "paid";

export type FeaturedPaymentRequest = {
  id: string;
  business_name: string;
  business_id: string | null;
  featured_level: "category" | "global";
  duration_months: 1 | 3;
  amount_gbp: number;
  invoice_number: string | null;
  status: FeaturedPaymentStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listFeaturedPaymentRequests(): Promise<FeaturedPaymentRequest[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("featured_payment_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// Nav-badge count — how many invoices are still waiting to be paid.
export async function countUnpaidFeaturedPayments(): Promise<number> {
  const adminClient = createAdminClient();
  if (!adminClient) return 0;

  const { count } = await adminClient
    .from("featured_payment_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "unpaid");

  return count ?? 0;
}
