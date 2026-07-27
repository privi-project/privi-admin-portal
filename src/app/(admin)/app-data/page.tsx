import { NavLink } from "@/components/nav-link";
import { getSystemSettings } from "@/lib/system-settings/queries";
import { SettingsForm } from "./settings-form";

export default async function AppDataPage() {
  const settings = await getSystemSettings();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">App Data</h1>
        <div className="flex items-center gap-4">
          <NavLink href="/categories" className="text-sm text-gold">
            Manage categories →
          </NavLink>
          <NavLink href="/app-data/season-banners" className="text-sm text-gold">
            Manage season banners →
          </NavLink>
        </div>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
