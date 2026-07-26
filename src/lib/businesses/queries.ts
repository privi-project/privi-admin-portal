import { createAdminClient } from "@/lib/supabase/admin";

export type Business = {
  id: string;
  name: string;
  short_description: string | null;
  logo_url: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  is_accessible: boolean;
  internal_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type BusinessListRow = Business & {
  categories: { id: string; slug: string; label: string }[];
  location_count: number;
};

export type BusinessListFilters = {
  q?: string;
  categoryId?: string;
  status?: string;
  sort?: "name_asc" | "name_desc" | "newest" | "oldest";
};

export async function listBusinesses(
  filters: BusinessListFilters = {},
): Promise<BusinessListRow[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  let query = adminClient.from("businesses").select(
    "*, business_categories(category:categories(id, slug, label)), business_locations(count)",
  );

  if (filters.q) {
    query = query.ilike("name", `%${filters.q}%`);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  switch (filters.sort) {
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "name_desc":
      query = query.order("name", { ascending: false });
      break;
    case "oldest":
      query = query.order("updated_at", { ascending: true });
      break;
    default:
      // Most-recently-touched first by default — so a business you just
      // added OR edited is always at the top, not buried alphabetically.
      // updated_at (not created_at) so edits bubble up too, not just adds.
      query = query.order("updated_at", { ascending: false });
  }

  const { data } = await query;
  if (!data) return [];

  type Row = Business & {
    business_categories: { category: { id: string; slug: string; label: string } | null }[];
    business_locations: { count: number }[];
  };

  const rows = (data as unknown as Row[]).map((row) => ({
    ...row,
    categories: row.business_categories
      .map((bc) => bc.category)
      .filter((c): c is { id: string; slug: string; label: string } => c !== null),
    location_count: row.business_locations[0]?.count ?? 0,
  }));

  if (filters.categoryId) {
    return rows.filter((row) => row.categories.some((c) => c.id === filters.categoryId));
  }

  return rows;
}

export async function getBusiness(id: string): Promise<Business | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient.from("businesses").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function getBusinessCategoryIds(businessId: string): Promise<string[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("business_categories")
    .select("category_id")
    .eq("business_id", businessId);

  return (data ?? []).map((row) => row.category_id);
}

export async function getBusinessCategories(
  businessId: string,
): Promise<{ id: string; slug: string; label: string }[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("business_categories")
    .select("category:categories(id, slug, label)")
    .eq("business_id", businessId);

  type Row = { category: { id: string; slug: string; label: string } | null };

  return ((data as unknown as Row[]) ?? [])
    .map((row) => row.category)
    .filter((c): c is { id: string; slug: string; label: string } => c !== null);
}
