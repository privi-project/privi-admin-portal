import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { getOffer, getOfferLocationIds } from "@/lib/offers/queries";
import { listLocationsForBusiness } from "@/lib/locations/queries";
import { OfferForm } from "@/components/offer-form";
import { updateOfferAction } from "../../actions";
import { OfferArchiveControl } from "./offer-archive-control";

export default async function EditOfferPage({
  params,
}: {
  params: Promise<{ id: string; offerId: string }>;
}) {
  const { id, offerId } = await params;
  const offer = await getOffer(offerId);
  if (!offer || offer.business_id !== id) notFound();

  const [locations, selectedLocationIds] = await Promise.all([
    listLocationsForBusiness(id),
    getOfferLocationIds(offerId),
  ]);

  const updateWithIds = updateOfferAction.bind(null, id, offerId);

  return (
    <div className="p-6">
      <NavLink href={`/businesses/${id}/edit`} className="text-sm text-gold">
        ← Back to business
      </NavLink>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">Edit offer</h1>
        <div className="flex items-center gap-4">
          <NavLink href={`/businesses/${id}/offers/${offerId}/preview`} className="text-sm text-gold">
            Preview
          </NavLink>
          <OfferArchiveControl
            businessId={id}
            offerId={offerId}
            title={offer.title}
            isArchived={offer.status === "archived"}
          />
        </div>
      </div>

      <OfferForm
        formAction={updateWithIds}
        submitLabel="Save changes"
        locations={locations}
        initial={{
          title: offer.title,
          description: offer.description,
          value_summary: offer.value_summary,
          offer_type: offer.offer_type,
          terms: offer.terms,
          availability: offer.availability,
          redemption_method: offer.redemption_method,
          redemption_value: offer.redemption_value,
          redeem_where: offer.redeem_where,
          location_scope: offer.location_scope,
          start_date: offer.start_date,
          expiry_date: offer.expiry_date,
          selectedLocationIds,
        }}
      />
    </div>
  );
}
