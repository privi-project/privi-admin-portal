import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { getOffer, effectiveStatus } from "@/lib/offers/queries";
import { getBusiness } from "@/lib/businesses/queries";
import { OFFER_TYPES } from "@/lib/offer-config";
import { activateOfferAction } from "../../actions";

export default async function OfferPreviewPage({
  params,
}: {
  params: Promise<{ id: string; offerId: string }>;
}) {
  const { id, offerId } = await params;
  const [offer, business] = await Promise.all([getOffer(offerId), getBusiness(id)]);
  if (!offer || !business || offer.business_id !== id) notFound();

  const offerTypeLabel = OFFER_TYPES.find((t) => t.value === offer.offer_type)?.label;
  const status = effectiveStatus(offer);

  return (
    <div className="p-6">
      <NavLink href={`/businesses/${id}/offers/${offerId}/edit`} className="text-sm text-gold">
        ← Back to edit
      </NavLink>

      <h1 className="mt-2 text-lg font-medium">Preview</h1>
      <p className="text-sm text-muted-dark">
        A simplified read-only view of how this offer will read to members.
      </p>

      <div className="privi-gold-border mt-6 max-w-md rounded-2xl border bg-charcoal p-6 text-ivory [--gold-border-bg:var(--color-charcoal)]">
        <p className="text-xs uppercase tracking-wide text-teal">{offerTypeLabel}</p>
        <h2 className="mt-1 text-lg font-medium">{offer.title}</h2>
        {offer.value_summary && (
          <p className="privi-gold-text mt-1 text-sm font-medium">{offer.value_summary}</p>
        )}
        {offer.description && (
          <p className="mt-3 text-sm text-ivory/80">{offer.description}</p>
        )}
        {offer.availability && (
          <p className="mt-3 text-xs text-ivory/60">Available: {offer.availability}</p>
        )}
        {offer.terms && (
          <p className="mt-3 text-xs text-ivory/60">Terms: {offer.terms}</p>
        )}
        {offer.expiry_date && (
          <p className="mt-3 text-xs text-ivory/60">Ends {offer.expiry_date}</p>
        )}
      </div>

      {business.status !== "active" && (
        <p className="mt-4 max-w-md text-sm text-status-warning">
          This business isn&apos;t published yet — this offer won&apos;t be visible
          to members until it is.
        </p>
      )}

      {offer.status === "draft" && (
        <form
          action={activateOfferAction.bind(null, id, offerId, offer.title)}
          className="mt-6"
        >
          <button
            type="submit"
            className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
          >
            Activate
          </button>
        </form>
      )}

      {status !== "draft" && (
        <p className="mt-4 text-sm text-muted-dark">Current status: {status}</p>
      )}
    </div>
  );
}
