import { createAdminClient } from "@/lib/supabase/admin";

export type SeasonBanner = {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  action_type: "none" | "categories" | "external_link";
  action_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function listSeasonBanners(): Promise<SeasonBanner[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("season_banners")
    .select("*")
    .order("updated_at", { ascending: false });

  return data ?? [];
}

export async function getSeasonBanner(id: string): Promise<SeasonBanner | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient.from("season_banners").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function getSeasonBannerCategoryIds(bannerId: string): Promise<string[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("season_banner_categories")
    .select("category_id")
    .eq("banner_id", bannerId);

  return (data ?? []).map((row) => row.category_id);
}
