import { NavLink } from "@/components/nav-link";
import { getDashboardSummary } from "@/lib/dashboard/queries";

const PERIOD_OPTIONS = [7, 30, 90];

function StatTile({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <>
      <p className="text-xs text-muted-dark">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </>
  );

  if (href) {
    return (
      <NavLink
        href={href}
        className="block rounded-2xl border border-border-hairline bg-white p-4 hover:border-gold"
      >
        {content}
      </NavLink>
    );
  }

  return <div className="rounded-2xl border border-border-hairline bg-white p-4">{content}</div>;
}

function ActionList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: { key: string; href: string; label: string; meta: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border-hairline bg-white p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-dark">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-border-hairline">
          {items.map((item) => (
            <li key={item.key}>
              <NavLink
                href={item.href}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:text-gold"
              >
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 text-xs text-muted-dark">{item.meta}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const periodDays = PERIOD_OPTIONS.includes(Number(days)) ? Number(days) : 30;
  const summary = await getDashboardSummary(periodDays);

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Dashboard</h1>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-dark">Summary</h2>
          <div className="flex items-center gap-1 text-xs">
            {PERIOD_OPTIONS.map((opt) => (
              <NavLink
                key={opt}
                href={`/home?days=${opt}`}
                className={`rounded-lg border px-2 py-1 ${
                  periodDays === opt
                    ? "border-teal bg-teal text-ivory"
                    : "border-border-hairline text-muted-dark"
                }`}
              >
                {opt}d
              </NavLink>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-dark">Members</p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="Active members"
            value={String(summary.members.active)}
            href="/members?status=active"
          />
          <StatTile
            label="Monthly"
            value={String(summary.members.monthly)}
            href="/members?status=active&plan=monthly"
          />
          <StatTile
            label="Annual"
            value={String(summary.members.annual)}
            href="/members?status=active&plan=annual"
          />
          <StatTile
            label="Complimentary"
            value={String(summary.members.complimentary)}
            href="/members?complimentary=on"
          />
          <StatTile
            label="Cancelled"
            value={String(summary.members.cancelled)}
            href="/members?status=canceled"
          />
          <StatTile
            label={`New members (${periodDays}d)`}
            value={String(summary.members.newInPeriod)}
            href="/members"
          />
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-dark">Revenue</p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="MRR (monthly members)"
            value={`£${summary.monthlyMrr.toFixed(2)}`}
            href="/subscriptions"
          />
          <StatTile
            label="ARR (annual members)"
            value={`£${summary.annualRevenueGbp.toFixed(2)}`}
            href="/subscriptions"
          />
          <StatTile
            label="Total revenue (all time)"
            value={`£${summary.totalRevenueCollectedGbp.toFixed(2)}`}
            href="/subscriptions"
          />
          <StatTile
            label="Featured earnings (all time)"
            value={`£${summary.featured.earningsAllTimeGbp.toFixed(2)}`}
            href="/featured"
          />
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-muted-dark">
          Businesses &amp; offers
        </p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            label="Active businesses"
            value={String(summary.businesses.active)}
            href="/businesses?status=active"
          />
          <StatTile
            label="Inactive businesses"
            value={String(summary.businesses.inactive)}
            href="/businesses?status=inactive"
          />
          <StatTile label="Active offers" value={String(summary.offers.active)} />
          <StatTile label="Scheduled offers" value={String(summary.offers.scheduled)} />
          <StatTile label="Expired offers" value={String(summary.offers.expired)} />
          <StatTile label="Featured (active)" value={String(summary.featured.active)} href="/featured" />
        </div>

        <p className="mt-4 text-xs text-muted-dark">
          &quot;Cancelled&quot;, MRR and ARR are current snapshots (real
          Stripe amounts, monthly-plan and annual-plan revenue kept
          separate rather than combined into one projected figure — see
          the Subscriptions page for why). Total revenue is the one
          cumulative, non-snapshot figure here — every payment ever
          actually collected. No historical subscription-event log exists
          to compute a period-based cancellation count (same limitation
          noted on the Subscriptions page). Offer tiles aren&apos;t
          clickable —
          there&apos;s no single cross-business offers list to link to yet
          (offers currently only live nested under each business); the
          Action Centre below covers the drill-down cases that matter most
          (expiring/expired/starting soon).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-dark">Action Centre</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ActionList
            title="Offers approaching expiry"
            emptyLabel="Nothing expiring soon."
            items={summary.actionCentre.expiringOffers.map((o) => ({
              key: o.id,
              href: `/businesses/${o.business_id}/offers/${o.id}/edit`,
              label: `${o.business_name} — ${o.title}`,
              meta: o.expiry_date ?? "",
            }))}
          />
          <ActionList
            title="Expired offers"
            emptyLabel="No expired offers."
            items={summary.actionCentre.expiredOffers.map((o) => ({
              key: o.id,
              href: `/businesses/${o.business_id}/offers/${o.id}/edit`,
              label: `${o.business_name} — ${o.title}`,
              meta: o.expiry_date ?? "",
            }))}
          />
          <ActionList
            title="Offers scheduled to start soon"
            emptyLabel="Nothing scheduled to start soon."
            items={summary.actionCentre.scheduledOffers.map((o) => ({
              key: o.id,
              href: `/businesses/${o.business_id}/offers/${o.id}/edit`,
              label: `${o.business_name} — ${o.title}`,
              meta: o.start_date ?? "",
            }))}
          />
          <ActionList
            title="Failed subscription payments"
            emptyLabel="No failed payments."
            items={summary.actionCentre.pastDueMembers.map((m) => ({
              key: m.id,
              href: `/members/${m.id}`,
              label: m.name || m.id,
              meta: "Past due",
            }))}
          />
          <ActionList
            title="Account-deletion requests"
            emptyLabel="No pending requests."
            items={summary.actionCentre.deletionRequests.map((m) => ({
              key: m.id,
              href: `/members/${m.id}`,
              label: m.name,
              meta: new Date(m.requestedAt).toLocaleDateString(),
            }))}
          />
          <ActionList
            title="Featured placements expiring soon"
            emptyLabel="Nothing expiring soon."
            items={summary.actionCentre.featuredExpiringSoon.map((b) => ({
              key: b.id,
              href: `/businesses/${b.id}/edit`,
              label: b.name,
              meta: new Date(b.expires_at).toLocaleDateString(),
            }))}
          />
          <ActionList
            title="Featured placements lapsed"
            emptyLabel="None lapsed."
            items={summary.actionCentre.featuredLapsed.map((b) => ({
              key: b.id,
              href: `/businesses/${b.id}/edit`,
              label: b.name,
              meta: new Date(b.expired_at).toLocaleDateString(),
            }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-dark">Recent activity</h2>
        <div className="mt-3 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
          {summary.recentActivity.length === 0 && (
            <p className="p-4 text-sm text-muted-dark">No activity yet.</p>
          )}
          {summary.recentActivity.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="truncate">
                {entry.admin_email} {entry.action} {entry.entity_type}
                {entry.entity_label ? ` — ${entry.entity_label}` : ""}
              </span>
              <span className="shrink-0 text-xs text-muted-dark">{timeAgo(entry.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
