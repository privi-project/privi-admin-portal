import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { getLocation } from "@/lib/locations/queries";
import { LocationForm } from "@/components/location-form";
import { updateLocationAction, geocodeLocationAddressAction } from "../../actions";
import { LocationArchiveControl } from "./location-archive-control";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const { id, locationId } = await params;
  const location = await getLocation(locationId);
  if (!location || location.business_id !== id) notFound();

  const updateWithIds = updateLocationAction.bind(null, id, locationId);
  const label = location.label ?? location.formatted_address ?? "Location";

  return (
    <div className="p-6">
      <NavLink href={`/businesses/${id}/edit`} className="text-sm text-gold">
        ← Back to business
      </NavLink>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">Edit location</h1>
        <LocationArchiveControl
          businessId={id}
          locationId={locationId}
          label={label}
          isArchived={location.status === "archived"}
        />
      </div>

      <LocationForm
        formAction={updateWithIds}
        geocodeAction={geocodeLocationAddressAction}
        submitLabel="Save changes"
        initial={{
          label: location.label ?? "",
          location_type: location.location_type,
          address_line1: location.address_line1 ?? "",
          address_line2: location.address_line2 ?? "",
          city: location.city ?? "",
          region: location.region ?? "",
          postcode: location.postcode ?? "",
          country: location.country ?? "",
          phone: location.phone ?? "",
          website_url: location.website_url ?? "",
          is_accessible: location.is_accessible,
          formatted_address: location.formatted_address,
          latitude: location.latitude,
          longitude: location.longitude,
          geocode_status: location.geocode_status,
          opening_hours: location.opening_hours,
        }}
      />
    </div>
  );
}
