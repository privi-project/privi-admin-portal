import { NavLink } from "@/components/nav-link";
import { listSeasonBanners, effectiveBannerStatus } from "@/lib/season-banners/queries";
import { toggleSeasonBannerActiveAction, duplicateSeasonBannerAction } from "./actions";

const ACTION_TYPE_LABELS: Record<string, string> = {
  none: "Information only",
  categories: "Links to categories",
  external_link: "Links out",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const STATUS_STYLES: Record<string, string> = {
  live: "border-status-success/30 bg-teal/10 text-status-success",
  scheduled: "border-gold bg-note-bg privi-gold-text",
  ended: "border-border-hairline bg-border-hairline-2 text-muted-dark",
  always_on: "border-status-success/30 bg-teal/10 text-status-success",
  inactive: "border-border-hairline bg-border-hairline-2 text-muted-dark",
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

        {banners.map((banner) => {
          const status = effectiveBannerStatus(banner);
          const statusLabel =
            status === "live"
              ? "Live now"
              : status === "scheduled"
                ? `Starts ${formatDate(banner.starts_at!)}`
                : status === "ended"
                  ? `Ended ${formatDate(banner.ends_at!)}`
                  : status === "always_on"
                    ? "Active"
                    : "Inactive";

          return (
            <div key={banner.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{banner.title}</p>
                <p className="truncate text-xs text-muted-dark">
                  {ACTION_TYPE_LABELS[banner.action_type]}
                  {banner.starts_at || banner.ends_at
                    ? ` · ${banner.starts_at ? formatDate(banner.starts_at) : "no start"} – ${banner.ends_at ? formatDate(banner.ends_at) : "no end"}`
                    : ""}
                </p>
              </div>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
              >
                {statusLabel}
              </span>

              <NavLink href={`/app-data/season-banners/${banner.id}/edit`} className="text-sm text-gold">
                Edit
              </NavLink>

              <form action={duplicateSeasonBannerAction.bind(null, banner.id)}>
                <button type="submit" className="text-sm text-gold">
                  Duplicate
                </button>
              </form>

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
          );
        })}
      </div>
    </div>
  );
}
