import { NavLink } from "@/components/nav-link";
import { listFeaturedPaymentRequests } from "@/lib/featured/payment-queries";
import { listBusinesses } from "@/lib/businesses/queries";
import { PaymentCard } from "./payment-card";
import { AddPaymentForm } from "./add-payment-form";

export default async function FeaturedPaymentsPage() {
  const [payments, businesses] = await Promise.all([listFeaturedPaymentRequests(), listBusinesses()]);
  const unpaid = payments.filter((p) => p.status === "unpaid");
  const paid = payments.filter((p) => p.status === "paid");
  const outstandingTotal = unpaid.reduce((sum, p) => sum + p.amount_gbp, 0);

  return (
    <div className="p-6">
      <NavLink href="/featured" className="text-sm text-gold">
        ← Back to Featured
      </NavLink>

      <h1 className="mt-2 text-lg font-medium">Invoicing</h1>
      <p className="mt-1 text-sm text-muted-dark">
        Track invoices for Featured Placement deals you&apos;ve agreed —
        separate from the earnings total on the main Featured page, which
        only counts placements actually switched on for a real business.
        Nothing here ever feeds into any revenue figure, marked Paid or
        not. If an invoice is linked to a real business, marking it Paid
        can also switch Featured on for it in the same click; unlinked
        ones just update their own status here, and get activated
        separately from that business&apos;s edit page once it exists.
      </p>

      <div className="mt-4 rounded-2xl border border-border-hairline bg-white p-4">
        <p className="text-xs text-muted-dark">Outstanding</p>
        <p className="mt-1 text-2xl font-medium">£{outstandingTotal.toFixed(2)}</p>
      </div>

      <AddPaymentForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium">Unpaid</h2>
            <span className="text-xs text-muted-dark">{unpaid.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {unpaid.length === 0 ? (
              <p className="px-1 text-xs text-muted-dark">Nothing outstanding.</p>
            ) : (
              unpaid.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium">Paid</h2>
            <span className="text-xs text-muted-dark">{paid.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {paid.length === 0 ? (
              <p className="px-1 text-xs text-muted-dark">None yet.</p>
            ) : (
              paid.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
