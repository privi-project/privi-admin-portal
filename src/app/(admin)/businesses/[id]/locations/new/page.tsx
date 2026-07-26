import { NavLink } from "@/components/nav-link";
import { LocationForm } from "@/components/location-form";
import { createLocationAction, geocodeLocationAddressAction } from "../actions";

export default async function NewLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const createWithBusinessId = createLocationAction.bind(null, id);

  return (
    <div className="p-6">
      <NavLink href={`/businesses/${id}/edit`} className="text-sm text-gold">
        ← Back to business
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Add location</h1>
      <LocationForm
        formAction={createWithBusinessId}
        geocodeAction={geocodeLocationAddressAction}
        submitLabel="Add location"
      />
    </div>
  );
}
