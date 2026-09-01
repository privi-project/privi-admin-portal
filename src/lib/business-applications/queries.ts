import { createAdminClient } from "@/lib/supabase/admin";

export type BusinessApplication = {
  id: string;
  business_name: string;
  category_id: string | null;
  location_type: "single" | "multi";
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  /** 'form' (the public site's own submission — the default) or 'manual'
   * (added by the founder for someone they're already in conversation
   * with, not yet a real form submission). Purely a display distinction —
   * behaves identically either way from here on. */
  source: "form" | "manual";
  created_at: string;
  updated_at: string;
};

export type BusinessApplicationWithCategory = BusinessApplication & {
  category_label: string | null;
};

export async function listBusinessApplications(): Promise<BusinessApplicationWithCategory[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("business_applications")
    .select("*, categories(label)")
    .order("created_at", { ascending: false });

  type Row = BusinessApplication & { categories: { label: string } | null };
  return ((data as unknown as Row[]) ?? []).map((row) => ({
    ...row,
    category_label: row.categories?.label ?? null,
  }));
}

export async function countNewApplications(): Promise<number> {
  const adminClient = createAdminClient();
  if (!adminClient) return 0;

  const { count } = await adminClient
    .from("business_applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  return count ?? 0;
}

export type ApplicationStatusRow = {
  id: string;
  slug: string;
  label: string;
  display_order: number;
  is_active: boolean;
};

// Kanban columns, admin-editable — see /business-applications/statuses.
// Always returns every status (active and inactive); callers that only
// want selectable ones filter on is_active themselves, since the board
// page needs the inactive ones too (to keep already-placed cards visible).
export async function listApplicationStatuses(): Promise<ApplicationStatusRow[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("business_application_statuses")
    .select("id, slug, label, display_order, is_active")
    .order("display_order", { ascending: true });

  return data ?? [];
}
