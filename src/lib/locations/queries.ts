import { createAdminClient } from "@/lib/supabase/admin";
import type { OpeningHours } from "@/lib/locations/opening-hours";

export type Location = {
  id: string;
  business_id: string;
  label: string | null;
  location_type: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  geocode_status: string;
  phone: string | null;
  opening_hours: OpeningHours | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function listLocationsForBusiness(businessId: string): Promise<Location[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("business_locations")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getLocation(id: string): Promise<Location | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data } = await adminClient
    .from("business_locations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}
