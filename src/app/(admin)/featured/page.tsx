import { NavLink } from "@/components/nav-link";
import {
  listFeaturedBusinesses,
  effectiveFeaturedLevel,
  getFeaturedCountsByCategory,
} from "@/lib/businesses/queries";
import { listCategories } from "@/lib/categories/queries";
import { listFeaturedHistory } from "@/lib/featured/queries";
import { GLOBAL_FEATURED_CAP, CATEGORY_FEATURED_CAP } from "@/lib/featured-config";

const EARNINGS_PERIODS = [7, 30, 90] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function FeaturedPage({
  searchParams,
}: {
  searchParams: Promise<{ earnings?: string }>;
}) {
  const params = await searchParams;
  const earningsPeriod =
    params.earnings && EARNINGS_PERIODS.includes(Number(params.earnings) as (typeof EARNINGS_PERIODS)[number])
      ? Number(params.earnings)
      : null; // null = all time (default)

  const earningsFrom = earningsPeriod
    ? new Date(Date.now() - earningsPeriod * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const [businesses, categories, countsByCategory, earningsHistory] = await Promise.all([
    listFeaturedBusinesses(),
    listCategories(),
    getFeaturedCountsByCategory(),
    listFeaturedHistory({ from: earningsFrom }),
  ]);

  const totalEarnings = earningsHistory.reduce((sum, h) => sum + (h.amount_charged ?? 0), 0);

  const active = businesses.filter((b) => effectiveFeaturedLevel(b) !== "none");
  const lapsed = businesses.filter((b) => effectiveFeaturedLevel(b) === "none");
  const activeGlobalCount = active.filter((b) => b.featured_level === "global").length;
  const activeCategoryCount = active.filter((b) => b.featured_level === "category").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Featured placement</h1>
      </div>
      <p className="mt-1 text-sm text-muted-dark">
        Every business currently on a featured term, and any whose term has
        lapsed but hasn&apos;t been cleared yet. Set or renew a business&apos;s
        featured placement from its own edit page.
      </p>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border-hairline bg-white p-4">
        <div>
          <p className="text-xs text-muted-dark">
            {earningsPeriod ? `Earnings (last ${earningsPeriod}d)` : "Earnings (all time)"}
          </p>
          <p className="mt-1 text-2xl font-medium">£{totalEarnings.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <NavLink
            href="/featured"
            className={`rounded-lg border px-2 py-1 ${
              earningsPeriod === null
                ? "border-teal bg-teal text-ivory"
                : "border-border-hairline text-muted-dark"
            }`}
          >
            All time
          </NavLink>
          {EARNINGS_PERIODS.map((opt) => (
            <NavLink
              key={opt}
              href={`/featured?earnings=${opt}`}
              className={`rounded-lg border px-2 py-1 ${
                earningsPeriod === opt
                  ? "border-teal bg-teal text-ivory"
                  : "border-border-hairline text-muted-dark"
              }`}
            >
              {opt}d
            </NavLink>
          ))}
        </div>
      </div>

      <form
        action="/featured/export.csv"
        method="GET"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border-hairline bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="featured-export-from" className="text-xs text-muted-dark">
            From
          </label>
          <input
            id="featured-export-from"
            type="date"
            name="from"
            className="rounded-lg border border-border-hairline px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="featured-export-to" className="text-xs text-muted-dark">
            To
          </label>
          <input
            id="featured-export-to"
            type="date"
            name="to"
            className="rounded-lg border border-border-hairline px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
        >
          Export CSV
        </button>
        <p className="w-full text-xs text-muted-dark">
          This is the permanent accounting record — every period ever set,
          matched against what was charged, whether or not that placement
          is still active. Leave both dates blank to export everything.
        </p>
      </form>

      <div className="mt-4 flex gap-4">
        <div className="rounded-2xl border border-border-hairline bg-white px-4 py-3">
          <p className="text-xs text-muted-dark">Sitewide slots</p>
          <p className="mt-1 text-lg font-medium">
            {activeGlobalCount} / {GLOBAL_FEATURED_CAP}
          </p>
        </div>
        <div className="rounded-2xl border border-border-hairline bg-white px-4 py-3">
          <p className="text-xs text-muted-dark">Category-featured (active)</p>
          <p className="mt-1 text-lg font-medium">{activeCategoryCount}</p>
        </div>
      </div>
      <h2 className="mt-8 text-sm font-medium text-muted-dark">By category</h2>
      <p className="mt-1 text-xs text-muted-dark">
        Each category holds up to {CATEGORY_FEATURED_CAP} featured spots,
        shared by category- and homepage-tier businesses that belong to it.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {categories.map((category) => {
          const count = countsByCategory[category.id] ?? 0;
          const isFull = count >= CATEGORY_FEATURED_CAP;
          return (
            <div
              key={category.id}
              className={`rounded-xl border p-3 ${
                isFull ? "border-gold bg-note-bg" : "border-border-hairline bg-white"
              }`}
            >
              <p className="truncate text-sm font-medium">{category.label}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: CATEGORY_FEATURED_CAP }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-4 rounded-full ${i < count ? "privi-gold-fill" : "bg-border-hairline-2"}`}
                    />
                  ))}
                </div>
                <span className={`text-xs ${isFull ? "privi-gold-text font-medium" : "text-muted-dark"}`}>
                  {count} / {CATEGORY_FEATURED_CAP}
                  {isFull ? " full" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 text-sm font-medium text-muted-dark">Active</h2>
      <div className="mt-3 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {active.length === 0 && <p className="p-4 text-sm text-muted-dark">No active featured placements.</p>}
        {active.map((business) => {
          const days = business.featured_expires_at ? daysUntil(business.featured_expires_at) : null;
          return (
            <div key={business.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{business.name}</p>
                <p className="text-xs text-muted-dark">
                  {business.featured_level === "global" ? "Homepage and category" : "Category only"}
                  {business.featured_expires_at && ` · expires ${formatDate(business.featured_expires_at)}`}
                </p>
              </div>
              {days !== null && days <= 7 && (
                <span className="privi-gold-text shrink-0 rounded-full border border-gold px-2.5 py-0.5 text-xs font-medium">
                  {days <= 0 ? "Expires today" : `${days}d left`}
                </span>
              )}
              <NavLink href={`/businesses/${business.id}/edit`} className="shrink-0 text-sm text-gold">
                Manage
              </NavLink>
            </div>
          );
        })}
      </div>

      {lapsed.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-muted-dark">
            Lapsed — needs renewing or clearing
          </h2>
          <div className="mt-3 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
            {lapsed.map((business) => (
              <div key={business.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{business.name}</p>
                  <p className="text-xs text-status-warning">
                    {business.featured_level === "global" ? "Was homepage and category" : "Was category only"}
                    {business.featured_expires_at && ` · expired ${formatDate(business.featured_expires_at)}`}
                    {" — no longer boosted in the App"}
                  </p>
                </div>
                <NavLink href={`/businesses/${business.id}/edit`} className="shrink-0 text-sm text-gold">
                  Manage
                </NavLink>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
