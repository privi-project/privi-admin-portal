import { createAdminClient } from "@/lib/supabase/admin";
import { haversineDistanceMiles } from "@/lib/google-maps/bounds";

export type LiveArea = {
  id: string;
  label: string;
  referenceBusinessId: string | null;
  referenceBusinessName: string | null;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  createdAt: string;
};

export type BusinessMapPoint = { id: string; name: string; latitude: number; longitude: number };

/** For the coverage map's business picker — only businesses with a real
 * geocoded location can anchor an area (same rule createLiveAreaAction
 * enforces), so national/online-only businesses with no coordinates are
 * left out here rather than shown as an option that would just error. */
export async function listBusinessLocationsForMap(): Promise<BusinessMapPoint[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("business_locations")
    .select("business_id, latitude, longitude, businesses(name)")
    .not("latitude", "is", null)
    .order("created_at", { ascending: true });

  type Row = { business_id: string; latitude: number; longitude: number; businesses: { name: string } | null };

  const seen = new Set<string>();
  const points: BusinessMapPoint[] = [];
  for (const row of (data as unknown as Row[]) ?? []) {
    if (seen.has(row.business_id) || !row.businesses) continue; // first (earliest) location per business only
    seen.add(row.business_id);
    points.push({ id: row.business_id, name: row.businesses.name, latitude: row.latitude, longitude: row.longitude });
  }
  return points;
}

export async function listLiveAreas(): Promise<LiveArea[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("live_areas")
    .select("id, label, reference_business_id, latitude, longitude, radius_miles, created_at, businesses(name)")
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    label: string;
    reference_business_id: string | null;
    latitude: number;
    longitude: number;
    radius_miles: number;
    created_at: string;
    businesses: { name: string } | null;
  };

  return ((data as unknown as Row[]) ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    referenceBusinessId: row.reference_business_id,
    referenceBusinessName: row.businesses?.name ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMiles: row.radius_miles,
    createdAt: row.created_at,
  }));
}

export type WaitlistPostcodeGroup = { postcode: string; count: number };

/** Founder's own "where should I expand next" view — every waitlist
 * entry's postcode, counted and sorted by cluster size. */
export async function getWaitlistByPostcode(): Promise<WaitlistPostcodeGroup[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient.from("waitlist_signups").select("postcode").not("postcode", "is", null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const pc = (row.postcode as string).toUpperCase();
    counts.set(pc, (counts.get(pc) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([postcode, count]) => ({ postcode, count }))
    .sort((a, b) => b.count - a.count);
}

type WaitlistCandidate = {
  id: string;
  email: string;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  notified_at: string | null;
};

async function getSignedUpEmailSet(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<Set<string>> {
  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  return new Set((data?.users ?? []).map((u) => (u.email ?? "").toLowerCase()));
}

/** Waitlist entries within a given point+radius who haven't already
 * signed up some other way — same computation used both for the "N
 * people in this radius" live preview when creating an area, and the
 * real send. Kept as one function so those two can never disagree,
 * same reasoning as notifications/audience.ts's computeAudience. */
export async function getWaitlistWithinRadius(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  options: { onlyNotYetNotified?: boolean } = {},
): Promise<WaitlistCandidate[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  let query = adminClient
    .from("waitlist_signups")
    .select("id, email, postcode, latitude, longitude, notified_at")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (options.onlyNotYetNotified) {
    query = query.is("notified_at", null);
  }

  const [{ data: rows }, signedUpEmails] = await Promise.all([query, getSignedUpEmailSet(adminClient)]);

  return (rows ?? []).filter(
    (row) =>
      !signedUpEmails.has(row.email.toLowerCase()) &&
      haversineDistanceMiles(latitude, longitude, row.latitude as number, row.longitude as number) <=
        radiusMiles,
  );
}
