import { NavLink } from "@/components/nav-link";
import { OfferForm } from "@/components/offer-form";
import { listLocationsForBusiness } from "@/lib/locations/queries";
import { createOfferAction } from "../actions";

export default async function NewOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locations = await listLocationsForBusiness(id);
  const createWithBusinessId = createOfferAction.bind(null, id);

  return (
    <div className="p-6">
      <NavLink href={`/businesses/${id}/edit`} className="text-sm text-gold">
        ← Back to business
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Add offer</h1>
      <OfferForm
        formAction={createWithBusinessId}
        submitLabel="Add offer"
        locations={locations}
      />
    </div>
  );
}
