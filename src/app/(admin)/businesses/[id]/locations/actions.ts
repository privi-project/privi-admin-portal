"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired } from "@/lib/validation";
import { geocodeAddress, type GeocodeResult } from "@/lib/google-maps/geocode";
import { LOCATION_TYPES } from "@/lib/locations/config";

export type LocationFormState = { error?: string } | undefined;

function readLocationFields(formData: FormData) {
  return {
    label: String(formData.get("label") ?? "").trim() || null,
    location_type: String(formData.get("location_type") ?? ""),
    address_line1: String(formData.get("address_line1") ?? "").trim() || null,
    address_line2: String(formData.get("address_line2") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    region: String(formData.get("region") ?? "").trim() || null,
    postcode: String(formData.get("postcode") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    formatted_address: String(formData.get("formatted_address") ?? "").trim() || null,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    geocode_status: String(formData.get("geocode_status") ?? "pending"),
  };
}

function validateLocationFields(fields: ReturnType<typeof readLocationFields>): string | null {
  if (!isRequired(fields.location_type)) return "Location type is required.";
  const validTypes = LOCATION_TYPES.map((t) => t.value) as string[];
  if (!validTypes.includes(fields.location_type)) return "Invalid location type.";
  return null;
}

export async function createLocationAction(
  businessId: string,
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const session = await requireAdminSession();
  const fields = readLocationFields(formData);

  const validationError = validateLocationFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data, error } = await adminClient
    .from("business_locations")
    .insert({ ...fields, business_id: businessId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the location." };
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "location",
    entityId: data.id,
    entityLabel: fields.label ?? fields.formatted_address ?? "New location",
  });

  revalidatePath(`/businesses/${businessId}/edit`);
  redirect(`/businesses/${businessId}/edit`);
}

export async function updateLocationAction(
  businessId: string,
  locationId: string,
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const session = await requireAdminSession();
  const fields = readLocationFields(formData);

  const validationError = validateLocationFields(fields);
  if (validationError) return { error: validationError };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("business_locations")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", locationId);

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "location",
    entityId: locationId,
    entityLabel: fields.label ?? fields.formatted_address ?? "Location",
  });

  revalidatePath(`/businesses/${businessId}/edit`);
  redirect(`/businesses/${businessId}/edit`);
}

export async function duplicateLocationAction(businessId: string, locationId: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: original } = await adminClient
    .from("business_locations")
    .select(
      "label, location_type, address_line1, address_line2, city, region, postcode, country, formatted_address, latitude, longitude, geocode_status, phone",
    )
    .eq("id", locationId)
    .maybeSingle();

  if (!original) return;

  const { data: copy, error } = await adminClient
    .from("business_locations")
    .insert({
      ...original,
      business_id: businessId,
      // Never clone straight into a live/active row.
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !copy) return;

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "duplicated",
    entityType: "location",
    entityId: copy.id,
    entityLabel: original.label ?? original.formatted_address ?? "Location",
  });

  revalidatePath(`/businesses/${businessId}/edit`);
  redirect(`/businesses/${businessId}/locations/${copy.id}/edit`);
}

export async function toggleLocationActiveAction(
  businessId: string,
  locationId: string,
  label: string,
  nextActive: boolean,
) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("business_locations")
    .update({ status: nextActive ? "active" : "inactive", updated_at: new Date().toISOString() })
    .eq("id", locationId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: nextActive ? "activated" : "deactivated",
    entityType: "location",
    entityId: locationId,
    entityLabel: label,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}

export async function archiveLocationAction(businessId: string, locationId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("business_locations")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", locationId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "archived",
    entityType: "location",
    entityId: locationId,
    entityLabel: label,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}

export async function unarchiveLocationAction(businessId: string, locationId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("business_locations")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", locationId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "unarchived",
    entityType: "location",
    entityId: locationId,
    entityLabel: label,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}

export async function geocodeLocationAddressAction(address: string): Promise<GeocodeResult> {
  await requireAdminSession();
  return geocodeAddress(address);
}

/**
 * Hard delete — only for locations that never went live (e.g. an accidental
 * duplicate). Anything that was ever active must be archived instead, never
 * deleted, per Section 14's "archive not delete" convention. The draft-only
 * check happens server-side (not just hidden in the UI), so this can never
 * remove a record with real history even if called directly.
 */
export async function deleteLocationAction(businessId: string, locationId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: location } = await adminClient
    .from("business_locations")
    .select("status")
    .eq("id", locationId)
    .maybeSingle();

  if (!location || location.status !== "draft") {
    return;
  }

  await adminClient.from("business_locations").delete().eq("id", locationId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "location",
    entityId: locationId,
    entityLabel: label,
  });

  revalidatePath(`/businesses/${businessId}/edit`);
}
