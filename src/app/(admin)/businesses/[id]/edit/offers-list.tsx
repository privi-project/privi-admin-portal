import { NavLink } from "@/components/nav-link";
import { listOffersForBusiness, effectiveStatus } from "@/lib/offers/queries";
import { StatusBadge } from "@/components/status-badge";
import { duplicateOfferAction, toggleOfferActiveAction } from "../offers/actions";
import { OfferDeleteControl } from "./offer-delete-control";

export async function OffersList({ businessId }: { businessId: string }) {
  const offers = await listOffersForBusiness(businessId);

  return (
    <div className="mt-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-dark">Offers</h2>
        <NavLink href={`/businesses/${businessId}/offers/new`} className="text-sm text-gold">
          Add offer
        </NavLink>
      </div>

      {offers.length === 0 && (
        <p className="mt-3 text-sm text-muted-dark">No offers yet.</p>
      )}

      <div className="mt-3 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {offers.map((offer) => {
          const status = effectiveStatus(offer);

          return (
            <div key={offer.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{offer.title}</p>
                {offer.value_summary && (
                  <p className="truncate text-xs text-muted-dark">{offer.value_summary}</p>
                )}
              </div>

              <StatusBadge status={status} />

              <NavLink
                href={`/businesses/${businessId}/offers/${offer.id}/edit`}
                className="text-sm text-gold"
              >
                Edit
              </NavLink>

              <form action={duplicateOfferAction.bind(null, businessId, offer.id)}>
                <button type="submit" className="text-sm text-gold">
                  Duplicate
                </button>
              </form>

              {(offer.status === "active" || offer.status === "inactive") && (
                <form
                  action={toggleOfferActiveAction.bind(
                    null,
                    businessId,
                    offer.id,
                    offer.title,
                    offer.status !== "active",
                  )}
                >
                  <button type="submit" className="text-sm text-gold">
                    {offer.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </form>
              )}

              {offer.status === "draft" && (
                <OfferDeleteControl
                  businessId={businessId}
                  offerId={offer.id}
                  title={offer.title}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
