import { NavLink } from "@/components/nav-link";
import { listBusinesses } from "@/lib/businesses/queries";
import { listCategories } from "@/lib/categories/queries";
import { BUSINESS_STATUSES } from "@/lib/businesses/config";
import { StatusBadge } from "@/components/status-badge";
import { CategoryIcon } from "@/components/category-icon";
import { toggleBusinessActiveAction } from "./actions";

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const [businesses, categories] = await Promise.all([
    listBusinesses({
      q: params.q,
      categoryId: params.category,
      status: params.status,
      sort: params.sort as never,
    }),
    listCategories(),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Businesses</h1>
        <div className="flex items-center gap-3">
          <a
            href={`/businesses/export.csv${exportQuery ? `?${exportQuery}` : ""}`}
            className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
          >
            Export CSV
          </a>
          <NavLink
            href="/businesses/new"
            className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
          >
            Add business
          </NavLink>
        </div>
      </div>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-hairline bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Search
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Business name"
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            name="category"
            defaultValue={params.category ?? ""}
            className="rounded-lg border border-border-hairline px-3 py-2"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-lg border border-border-hairline px-3 py-2"
          >
            <option value="">All statuses</option>
            {BUSINESS_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Sort
          <select
            name="sort"
            defaultValue={params.sort ?? "newest"}
            className="rounded-lg border border-border-hairline px-3 py-2"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
        >
          Apply
        </button>
      </form>

      <div className="mt-6 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {businesses.length === 0 && (
          <p className="p-6 text-sm text-muted-dark">No businesses found.</p>
        )}

        {businesses.map((business) => (
          <div key={business.id} className="flex items-center gap-4 px-4 py-3">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-border-hairline-2" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{business.name}</p>
              <div className="mt-1 flex items-center gap-1">
                {business.categories.map((c) => (
                  <CategoryIcon key={c.id} slug={c.slug} className="h-4 w-4 text-muted-dark" />
                ))}
                <span className="text-xs text-muted-dark">
                  {business.location_count} location
                  {business.location_count === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <StatusBadge status={business.status} />

            <NavLink href={`/businesses/${business.id}/edit`} className="text-sm text-gold">
              Edit
            </NavLink>
            <NavLink href={`/businesses/${business.id}/preview`} className="text-sm text-gold">
              Preview
            </NavLink>

            {/* Draft businesses go live via Preview -> Publish, not this
                toggle — otherwise it bypasses the preview step entirely.
                Archived businesses are unarchived from the edit page. */}
            {(business.status === "active" || business.status === "inactive") && (
              <form
                action={toggleBusinessActiveAction.bind(
                  null,
                  business.id,
                  business.name,
                  business.status !== "active",
                )}
              >
                <button type="submit" className="text-sm text-gold">
                  {business.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
