import { createAdminClient } from "@/lib/supabase/admin";

export type Notification = {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  linked_business_id: string | null;
  linked_offer_id: string | null;
  audience_type: string;
  audience_member_id: string | null;
  audience_radius_miles: number | null;
  audience_reference_business_id: string | null;
  scheduled_at: string | null;
  expires_at: string | null;
  status: string;
  sent_at: string | null;
  targeted_count: number | null;
  sent_count: number | null;
  failed_count: number | null;
  created_at: string;
  updated_at: string;
};

export async function listNotifications(filters: { status?: string } = {}): Promise<Notification[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  let query = adminClient.from("notifications").select("*").order("created_at", { ascending: false });
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getNotification(id: string): Promise<Notification | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient.from("notifications").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

// Mirrors getOfferLocationIds in offers/queries.ts — used by the edit
// page to pre-check the right boxes, and by the preview/send flow to
// compute the precise audience for a "New location" notification.
export async function getNotificationLocationIds(id: string): Promise<string[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("notification_locations")
    .select("location_id")
    .eq("notification_id", id);

  return (data ?? []).map((row) => row.location_id);
}
