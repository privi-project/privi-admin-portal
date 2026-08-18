import { createAdminClient } from "@/lib/supabase/admin";

export type Business = {
  id: string;
  name: string;
  short_description: string | null;
  about_description: string | null;
  search_keywords: string | null;
  logo_url: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  internal_notes: string | null;
  status: string;
  featured_level: "none" | "category" | "global";
  featured_at: string | null;
  featured_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * The tier that actually counts right now — a business whose paid term
 * has lapsed reads as 'none' here even if featured_level in the database
 * still says otherwise, same computed-at-read-time pattern as offers'
 * effectiveStatus(). This is what the App's sort/badge logic should use,
 * and what the Featured list page uses to distinguish "active" from
 * "expired, needs renewing or clearing."
 */
export function effectiveFeaturedLevel(
  business: Pick<Business, "featured_level" | "featured_expires_at">,
): "none" | "category" | "global" {
  if (business.featured_level === "none") return "none";
  if (business.featured_expires_at && new Date(business.featured_expires_at) < new Date()) {
    return "none";
  }
  return business.featured_level;
}

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

/**
 * Every business currently marked featured (any tier), including ones
 * whose term has already lapsed — the Featured list page deliberately
 * shows lapsed ones too (not just active) so the founder sees "this
 * needs renewing or clearing" rather than it silently vanishing from
 * view the moment it expires.
 */
export async function listFeaturedBusinesses(): Promise<Business[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("businesses")
    .select("*")
    .neq("featured_level", "none")
    .order("featured_expires_at", { ascending: true, nullsFirst: true });

  return data ?? [];
}

/**
 * Global-tier businesses currently active (not expired) — used to
 * enforce GLOBAL_FEATURED_CAP and to show the founder who's holding the
 * other slots when a cap-full rejection happens. excludeBusinessId lets
 * renewing/editing a business that's ALREADY one of the active global
 * slots not count against itself.
 */
export async function listActiveGlobalFeatured(excludeBusinessId?: string): Promise<Business[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  let query = adminClient.from("businesses").select("*").eq("featured_level", "global");
  if (excludeBusinessId) query = query.neq("id", excludeBusinessId);

  const { data } = await query;
  return (data ?? []).filter(
    (b) => effectiveFeaturedLevel(b) === "global",
  );
}

/**
 * How many businesses are currently boosted (either tier) within a given
 * category — a category's cap is shared by category-tier AND global-tier
 * businesses that belong to it, since global boosts category views too.
 * Without this, "3 featured spots per category" wouldn't actually be
 * true if global-tier businesses in that category weren't counted.
 */
export async function countActiveFeaturedInCategory(
  categoryId: string,
  excludeBusinessId?: string,
): Promise<{ count: number; names: string[] }> {
  const adminClient = createAdminClient();
  if (!adminClient) return { count: 0, names: [] };

  const { data } = await adminClient
    .from("business_categories")
    .select("business:businesses(id, name, featured_level, featured_expires_at)")
    .eq("category_id", categoryId);

  type Row = {
    business: Pick<Business, "id" | "name" | "featured_level" | "featured_expires_at"> | null;
  };

  const featured = ((data as unknown as Row[]) ?? [])
    .map((row) => row.business)
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .filter((b) => b.id !== excludeBusinessId)
    .filter((b) => effectiveFeaturedLevel(b) !== "none");

  return { count: featured.length, names: featured.map((b) => b.name) };
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
