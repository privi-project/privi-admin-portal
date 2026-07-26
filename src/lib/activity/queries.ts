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

export type ActivityFilters = {
  limit?: number;
  offset?: number;
  entityType?: string;
};

// Powers both the Dashboard's "Recent activity" (task #10, small limit,
// no filters) and the full Activity Log page (task #11, paginated +
// filterable) — same table, same shape.
export async function listActivity(filters: ActivityFilters = {}): Promise<ActivityLogRow[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const limit = filters.limit ?? 10;
  const offset = filters.offset ?? 0;

  let query = adminClient
    .from("admin_activity_log")
    .select("id, admin_email, action, entity_type, entity_id, entity_label, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  const { data } = await query;
  return data ?? [];
}
