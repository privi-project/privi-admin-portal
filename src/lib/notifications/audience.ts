import { createAdminClient } from "@/lib/supabase/admin";
import { geocodeAddress } from "@/lib/google-maps/geocode";
import { haversineDistanceMiles } from "@/lib/google-maps/bounds";

export type AudienceType = "all" | "monthly" | "annual" | "complimentary" | "area" | "individual";

export type AudienceCriteria = {
  audienceType: AudienceType;
  audienceMemberId?: string | null;
  audienceRadiusMiles?: number | null;
  audienceReferenceBusinessId?: string | null;
  /** When set, area targeting matches this specific offer's locations
   * (respecting its location_scope) instead of the whole business's — see
   * getOfferLocations below. */
  linkedOfferId?: string | null;
};

type LatLng = { latitude: number; longitude: number };

export type AudienceResult = {
  count: number;
  memberIds: string[];
};

/**
 * Shared logic used both for the live preview count on the notification
 * form/preview page and the real send-time snapshot — same computation,
 * called twice (once to show, once to commit), so they can never disagree.
 */
export async function computeAudience(criteria: AudienceCriteria): Promise<AudienceResult> {
  const adminClient = createAdminClient();
  if (!adminClient) return { count: 0, memberIds: [] };

  if (criteria.audienceType === "individual") {
    return criteria.audienceMemberId
      ? { count: 1, memberIds: [criteria.audienceMemberId] }
      : { count: 0, memberIds: [] };
  }

  if (criteria.audienceType === "area") {
    return computeAreaAudience(criteria);
  }

  const [{ data: profileRows }, { data: adminRows }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, subscription_status, subscription_plan, is_complimentary"),
    adminClient.from("admin_users").select("id"),
  ]);

  const adminIds = new Set((adminRows ?? []).map((r) => r.id));
  const rows = (profileRows ?? []).filter((r) => !adminIds.has(r.id));

  let matched = rows;
  if (criteria.audienceType === "complimentary") {
    matched = rows.filter((r) => r.is_complimentary);
  } else if (criteria.audienceType === "monthly") {
    matched = rows.filter(
      (r) => r.subscription_status === "active" && r.subscription_plan === "monthly",
    );
  } else if (criteria.audienceType === "annual") {
    matched = rows.filter(
      (r) => r.subscription_status === "active" && r.subscription_plan === "annual",
    );
  } else {
    // "all" — every currently-active member, complimentary or paying.
    matched = rows.filter((r) => r.subscription_status === "active" || r.is_complimentary);
  }

  return { count: matched.length, memberIds: matched.map((r) => r.id) };
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

async function getBusinessLocations(adminClient: AdminClient, businessId: string): Promise<LatLng[]> {
  const { data } = await adminClient
    .from("business_locations")
    .select("latitude, longitude")
    .eq("business_id", businessId)
    .not("latitude", "is", null);

  return (data ?? []).filter(
    (l): l is LatLng => l.latitude != null && l.longitude != null,
  );
}

/**
 * A national/multi-location business can run an offer at only some of its
 * sites (task #6's location_scope + offer_locations). For 'selected'
 * scope, match only those specific locations rather than every branch the
 * business has — otherwise a member near a branch the offer doesn't even
 * run at would incorrectly get targeted.
 */
async function getOfferLocations(adminClient: AdminClient, offerId: string): Promise<LatLng[]> {
  const { data: offer } = await adminClient
    .from("offers")
    .select("business_id, location_scope")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer) return [];

  if (offer.location_scope !== "selected") {
    return getBusinessLocations(adminClient, offer.business_id);
  }

  const { data: rows } = await adminClient
    .from("offer_locations")
    .select("business_locations(latitude, longitude)")
    .eq("offer_id", offerId);

  type Row = { business_locations: { latitude: number | null; longitude: number | null } | null };
  return ((rows as unknown as Row[]) ?? [])
    .map((r) => r.business_locations)
    .filter((l): l is LatLng => l?.latitude != null && l?.longitude != null);
}

async function computeAreaAudience(criteria: AudienceCriteria): Promise<AudienceResult> {
  const adminClient = createAdminClient();
  if (!adminClient) return { count: 0, memberIds: [] };

  const points = criteria.linkedOfferId
    ? await getOfferLocations(adminClient, criteria.linkedOfferId)
    : criteria.audienceReferenceBusinessId
      ? await getBusinessLocations(adminClient, criteria.audienceReferenceBusinessId)
      : [];

  if (points.length === 0) {
    return { count: 0, memberIds: [] };
  }

  const radius = criteria.audienceRadiusMiles ?? 20;

  const [{ data: profileRows }, { data: adminRows }] = await Promise.all([
    adminClient.from("profiles").select("id, preferred_area").not("preferred_area", "is", null),
    adminClient.from("admin_users").select("id"),
  ]);

  const adminIds = new Set((adminRows ?? []).map((r) => r.id));
  const candidates = (profileRows ?? []).filter((r) => !adminIds.has(r.id) && r.preferred_area);

  // Geocoding each candidate live — proportionate while virtually no real
  // member has preferred_area set yet (see task #9 plan). Revisit if the
  // member base grows large enough to make this slow.
  const matched: string[] = [];
  for (const candidate of candidates) {
    const geocoded = await geocodeAddress(candidate.preferred_area as string);
    if (geocoded.status !== "ok") continue;

    const withinAnyLocation = points.some(
      (point) =>
        haversineDistanceMiles(point.latitude, point.longitude, geocoded.latitude, geocoded.longitude) <=
        radius,
    );
    if (withinAnyLocation) matched.push(candidate.id);
  }

  return { count: matched.length, memberIds: matched };
}
