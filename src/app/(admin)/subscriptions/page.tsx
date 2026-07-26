import { NavLink } from "@/components/nav-link";
import { getSubscriptionOverview } from "@/lib/subscriptions/queries";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-hairline bg-white p-4">
      <p className="text-xs text-muted-dark">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  );
}

export default async function SubscriptionsPage() {
  const overview = await getSubscriptionOverview();

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Subscriptions &amp; Payments</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Active" value={String(overview.activeCount)} />
        <StatTile label="Past due (failed payments)" value={String(overview.pastDueCount)} />
        <StatTile label="Cancelled" value={String(overview.cancelledCount)} />
        <StatTile label="Complimentary" value={String(overview.complimentaryCount)} />
        <StatTile label="MRR" value={`£${overview.mrr.toFixed(2)}`} />
        <StatTile label="ARR" value={`£${overview.arr.toFixed(2)}`} />
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
        subscription-event log exists to compute one properly.
      </p>

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
