import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityLogRow = {
  id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  created_at: string;
};

// Powers both the Dashboard's "Recent activity" (task #10, small limit)
// and the full Activity Log page (task #11, larger/paginated) — same
// table, same shape, different limit.
export async function listActivity(limit = 10): Promise<ActivityLogRow[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("admin_activity_log")
    .select("id, admin_email, action, entity_type, entity_id, entity_label, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
