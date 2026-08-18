import { NavLink } from "@/components/nav-link";
import { listFeaturedBusinesses, effectiveFeaturedLevel } from "@/lib/businesses/queries";
import { GLOBAL_FEATURED_CAP, CATEGORY_FEATURED_CAP } from "@/lib/featured-config";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function FeaturedPage() {
  const businesses = await listFeaturedBusinesses();

  const active = businesses.filter((b) => effectiveFeaturedLevel(b) !== "none");
  const lapsed = businesses.filter((b) => effectiveFeaturedLevel(b) === "none");
  const activeGlobalCount = active.filter((b) => b.featured_level === "global").length;
  const activeCategoryCount = active.filter((b) => b.featured_level === "category").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Featured placement</h1>
        <NavLink href="/featured/export.csv" className="text-sm text-gold">
          Export CSV
        </NavLink>
      </div>
      <p className="mt-1 text-sm text-muted-dark">
        Every business currently on a featured term, and any whose term has
        lapsed but hasn&apos;t been cleared yet. Set or renew a business&apos;s
        featured placement from its own edit page.
      </p>

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
      <p className="mt-2 text-xs text-muted-dark">
        Each category holds up to {CATEGORY_FEATURED_CAP} featured spots,
        shared by category- and homepage-tier businesses that belong to it
        — checked per-category when you set a business as featured, not
        shown as a single number here.
      </p>

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
