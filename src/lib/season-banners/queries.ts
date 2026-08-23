import { createAdminClient } from "@/lib/supabase/admin";

export type SeasonBanner = {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  // Optional scheduling window — a banner with both null behaves exactly
  // as before (on whenever is_active is true). Stored as plain dates
  // (day granularity), not timestamps — a banner is either "today's
  // date" or it isn't, there's no meaningful time-of-day for this.
  starts_at: string | null;
  ends_at: string | null;
  action_type: "none" | "categories" | "external_link";
  action_url: string | null;
  created_at: string;
  updated_at: string;
};

export type EffectiveBannerStatus = "live" | "scheduled" | "ended" | "always_on" | "inactive";

/**
 * What's actually true right now for a banner, computed the same
 * "compare stored dates to today" way effectiveFeaturedLevel() already
 * does for Featured Placement — mirrors exactly what the RLS policy on
 * season_banners itself checks, so this label always matches what the
 * App is actually showing (or not) at this moment.
 */
export function effectiveBannerStatus(
  banner: Pick<SeasonBanner, "is_active" | "starts_at" | "ends_at">,
): EffectiveBannerStatus {
  if (!banner.is_active) return "inactive";
  if (!banner.starts_at && !banner.ends_at) return "always_on";

  const today = new Date().toISOString().slice(0, 10);
  if (banner.starts_at && today < banner.starts_at) return "scheduled";
  if (banner.ends_at && today > banner.ends_at) return "ended";
  return "live";
}

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
