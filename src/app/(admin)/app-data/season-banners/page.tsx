import { NavLink } from "@/components/nav-link";
import { listSeasonBanners } from "@/lib/season-banners/queries";
import { toggleSeasonBannerActiveAction } from "./actions";

const ACTION_TYPE_LABELS: Record<string, string> = {
  none: "Information only",
  categories: "Links to categories",
  external_link: "Links out",
};

export default async function SeasonBannersPage() {
  const banners = await listSeasonBanners();

  return (
    <div className="p-6">
      <NavLink href="/app-data" className="text-sm text-gold">
        ← Back to App Data
      </NavLink>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">Season Banners</h1>
        <NavLink
          href="/app-data/season-banners/new"
          className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
        >
          Add banner
        </NavLink>
      </div>
      <p className="mt-1 text-sm text-muted-dark">
        Shown at the top of the App&apos;s home feed when active. Only one
        should typically be on at a time.
      </p>

      <div className="mt-6 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {banners.length === 0 && (
          <p className="p-6 text-sm text-muted-dark">No banners yet.</p>
        )}

        {banners.map((banner) => (
          <div key={banner.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{banner.title}</p>
              <p className="truncate text-xs text-muted-dark">
                {ACTION_TYPE_LABELS[banner.action_type]}
              </p>
            </div>

            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                banner.is_active
                  ? "border-status-success/30 bg-teal/10 text-status-success"
                  : "border-border-hairline bg-border-hairline-2 text-muted-dark"
              }`}
            >
              {banner.is_active ? "Active" : "Inactive"}
            </span>

            <NavLink href={`/app-data/season-banners/${banner.id}/edit`} className="text-sm text-gold">
              Edit
            </NavLink>

            <form
              action={toggleSeasonBannerActiveAction.bind(
                null,
                banner.id,
                banner.title,
                !banner.is_active,
              )}
            >
              <button type="submit" className="text-sm text-gold">
                {banner.is_active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
