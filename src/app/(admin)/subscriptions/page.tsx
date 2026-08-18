import { NavLink } from "@/components/nav-link";
import {
  getSubscriptionOverview,
  getSubscriptionPeriodReport,
  getAllTimeRevenueCollected,
} from "@/lib/subscriptions/queries";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-hairline bg-white p-4">
      <p className="text-xs text-muted-dark">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const [overview, totalRevenueCollectedGbp] = await Promise.all([
    getSubscriptionOverview(),
    getAllTimeRevenueCollected(),
  ]);

  const hasRange = !!(params.from && params.to);
  const periodReport = hasRange
    ? await getSubscriptionPeriodReport(params.from!, `${params.to}T23:59:59.999Z`)
    : null;

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Subscriptions &amp; Payments</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Active" value={String(overview.activeCount)} />
        <StatTile label="Past due (failed payments)" value={String(overview.pastDueCount)} />
        <StatTile label="Cancelled" value={String(overview.cancelledCount)} />
        <StatTile label="Complimentary" value={String(overview.complimentaryCount)} />
        <StatTile label="MRR (monthly members)" value={`£${overview.monthlyMrr.toFixed(2)}`} />
        <StatTile label="ARR (annual members)" value={`£${overview.annualRevenueGbp.toFixed(2)}`} />
        <StatTile label="Total revenue (all time)" value={`£${totalRevenueCollectedGbp.toFixed(2)}`} />
        <StatTile
          label="Cancellation rate"
          value={`${(overview.cancellationRate * 100).toFixed(1)}%`}
        />
        <StatTile
          label="Refunds (all-time)"
          value={`${overview.refundCount} · £${overview.refundTotalGbp.toFixed(2)}`}
        />
      </div>
      <p className="mt-2 text-xs text-muted-dark">
        &quot;Cancelled&quot; covers what the spec calls active/cancelled/
        expired — there&apos;s no separate &quot;expired&quot; state in the
        actual subscription data, so it&apos;s folded in here. Cancellation
        rate is a current snapshot, not a time-windowed rate — no historical
        subscription-event log exists to compute one properly. MRR and ARR
        are kept separate deliberately — MRR is real monthly-plan revenue,
        ARR here is real annual-plan revenue already collected (not the
        usual SaaS convention of MRR x 12, which would blend a real number
        with an unearned 12-month projection). Total revenue is the one
        genuinely cumulative figure — every payment ever actually
        collected, from real Stripe invoices, not an estimate.
      </p>

      <h2 className="mt-8 text-sm font-medium text-muted-dark">Report for a date range</h2>
      <p className="mt-1 text-xs text-muted-dark">
        MRR/ARR/active-count above are point-in-time snapshots ("as of
        now") — they don&apos;t have a meaningful "for this period" version
        without real historical tracking, so they&apos;re not part of this.
        What actually changed during a chosen range: new subscriptions
        started, subscriptions cancelled, and money actually collected/
        refunded — all pulled live from Stripe.
      </p>
      <form
        method="get"
        className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-border-hairline bg-white p-4"
      >
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            From
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              required
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>
          <span className="pb-2.5 text-muted-dark">–</span>
          <label className="flex flex-col gap-1 text-sm">
            To
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ""}
              required
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>
        </div>
        <button
          type="submit"
          className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
        >
          Run report
        </button>
      </form>

      {periodReport && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="New subscriptions" value={String(periodReport.newSubscriptions)} />
          <StatTile label="Cancellations" value={String(periodReport.cancellations)} />
          <StatTile label="Revenue collected" value={`£${periodReport.revenueCollectedGbp.toFixed(2)}`} />
          <StatTile label="Refunds" value={`£${periodReport.refundsGbp.toFixed(2)}`} />
        </div>
      )}

      {overview.pastDueMembers.length > 0 && (
        <div className="mt-6 max-w-md">
          <h2 className="text-sm font-medium text-muted-dark">
            Members with failed payments
          </h2>
          <div className="mt-2 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
            {overview.pastDueMembers.map((m) => (
              <NavLink
                key={m.id}
                href={`/members/${m.id}`}
                className="block px-4 py-3 text-sm hover:bg-border-hairline-2"
              >
                {m.name || m.id}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
