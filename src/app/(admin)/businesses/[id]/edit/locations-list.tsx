import { NavLink } from "@/components/nav-link";
import { listLocationsForBusiness } from "@/lib/locations/queries";
import { LOCATION_TYPES, LOCATION_TYPES_WITHOUT_ADDRESS } from "@/lib/locations/config";
import { StatusBadge } from "@/components/status-badge";
import {
  duplicateLocationAction,
  toggleLocationActiveAction,
} from "../locations/actions";
import { LocationDeleteControl } from "./location-delete-control";

function locationTypeLabel(value: string) {
  return LOCATION_TYPES.find((t) => t.value === value)?.label ?? value;
}

export async function LocationsList({ businessId }: { businessId: string }) {
  const locations = await listLocationsForBusiness(businessId);

  return (
    <div className="mt-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-dark">Locations</h2>
        <NavLink
          href={`/businesses/${businessId}/locations/new`}
          className="text-sm text-gold"
        >
          Add location
        </NavLink>
      </div>

      {locations.length === 0 && (
        <p className="mt-3 text-sm text-muted-dark">No locations yet.</p>
      )}

      <div className="mt-3 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {locations.map((location) => {
          const needsAddress = !LOCATION_TYPES_WITHOUT_ADDRESS.includes(
            location.location_type as never,
          );
          const label =
            location.label ?? location.formatted_address ?? locationTypeLabel(location.location_type);

          return (
            <div key={location.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-dark">
                  {locationTypeLabel(location.location_type)}
                  {location.formatted_address ? ` · ${location.formatted_address}` : ""}
                </p>
                {needsAddress && location.geocode_status === "pending" && (
                  <p className="text-xs text-status-warning">No coordinates set</p>
                )}
              </div>

              <StatusBadge status={location.status} />

              <NavLink
                href={`/businesses/${businessId}/locations/${location.id}/edit`}
                className="text-sm text-gold"
              >
                Edit
              </NavLink>

              <form action={duplicateLocationAction.bind(null, businessId, location.id)}>
                <button type="submit" className="text-sm text-gold">
                  Duplicate
                </button>
              </form>

              <form
                action={toggleLocationActiveAction.bind(
                  null,
                  businessId,
                  location.id,
                  label,
                  location.status !== "active",
                )}
              >
                <button type="submit" className="text-sm text-gold">
                  {location.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </form>

              {location.status === "draft" && (
                <LocationDeleteControl
                  businessId={businessId}
                  locationId={location.id}
                  label={label}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
