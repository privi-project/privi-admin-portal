import { NavLink } from "@/components/nav-link";
import { getSystemSettings } from "@/lib/system-settings/queries";
import { SettingsForm } from "./settings-form";

export default async function AppDataPage() {
  const settings = await getSystemSettings();

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">App Data</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NavLink
          href="/categories"
          className="flex flex-col gap-1 rounded-2xl border border-border-hairline bg-white p-4 hover:border-gold"
        >
          <span className="text-sm font-medium">Categories</span>
          <span className="text-xs text-muted-dark">
            Manage the category list businesses are assigned to.
          </span>
        </NavLink>
        <NavLink
          href="/app-data/season-banners"
          className="flex flex-col gap-1 rounded-2xl border border-border-hairline bg-white p-4 hover:border-gold"
        >
          <span className="text-sm font-medium">Season banners</span>
          <span className="text-xs text-muted-dark">
            Manage the homepage&apos;s seasonal promotional banner.
          </span>
        </NavLink>
        <NavLink
          href="/app-data/waitlist"
          className="flex flex-col gap-1 rounded-2xl border border-border-hairline bg-white p-4 hover:border-gold"
        >
          <span className="text-sm font-medium">Waitlist</span>
          <span className="text-xs text-muted-dark">
            See who&apos;s waiting and where they are, by postcode.
          </span>
        </NavLink>
        <NavLink
          href="/app-data/live-areas"
          className="flex flex-col gap-1 rounded-2xl border border-border-hairline bg-white p-4 hover:border-gold"
        >
          <span className="text-sm font-medium">Live areas</span>
          <span className="text-xs text-muted-dark">
            Controls where sign-up is actually open, and invites waitlist members once an area's ready.
          </span>
        </NavLink>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
