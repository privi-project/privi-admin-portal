import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { getBusiness, getBusinessCategories } from "@/lib/businesses/queries";
import { listLocationsForBusiness } from "@/lib/locations/queries";
import { CategoryIcon } from "@/components/category-icon";
import { publishBusinessAction } from "../../actions";

export default async function BusinessPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getBusiness(id);
  if (!business) notFound();

  const [categories, locations] = await Promise.all([
    getBusinessCategories(id),
    listLocationsForBusiness(id),
  ]);

  const activeLocations = locations.filter((l) => l.status === "active");

  const missing: string[] = [];
  if (!business.logo_url) missing.push("a logo");
  if (categories.length === 0) missing.push("at least one category");
  if (activeLocations.length === 0) missing.push("at least one active location");

  return (
    <div className="p-6">
      <NavLink href={`/businesses/${id}/edit`} className="text-sm text-gold">
        ← Back to edit
      </NavLink>

      <h1 className="mt-2 text-lg font-medium">Preview</h1>
      <p className="text-sm text-muted-dark">
        A simplified read-only view of how this business will read to members.
      </p>

      <div className="privi-gold-border mt-6 max-w-md rounded-2xl border bg-charcoal p-6 text-ivory [--gold-border-bg:var(--color-charcoal)]">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt=""
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-teal/30" />
        )}

        <h2 className="mt-4 text-lg font-medium">{business.name}</h2>

        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="privi-gold-border flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs [--gold-border-bg:var(--color-charcoal)]"
            >
              <CategoryIcon slug={c.slug} className="h-3 w-3 text-gold" />
              {c.label}
            </span>
          ))}
        </div>

        {business.short_description && (
          <p className="mt-3 text-sm text-ivory/80">{business.short_description}</p>
        )}

        {business.is_accessible && (
          <p className="mt-3 text-xs text-teal">Accessible venue</p>
        )}

        {activeLocations.length > 0 && (
          <div className="mt-4 space-y-1 text-xs text-ivory/70">
            {activeLocations.map((loc) => (
              <p key={loc.id}>
                {loc.formatted_address ?? loc.label ?? loc.location_type}
              </p>
            ))}
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <p className="mt-4 max-w-md text-sm text-status-warning">
          Before publishing, you may want to add: {missing.join(", ")}.
        </p>
      )}

      {business.status === "draft" && (
        <form
          action={publishBusinessAction.bind(null, id, business.name)}
          className="mt-6"
        >
          <button
            type="submit"
            className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
          >
            Publish
          </button>
        </form>
      )}
    </div>
  );
}
