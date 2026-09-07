import { NavLink } from "@/components/nav-link";
import { listBusinesses } from "@/lib/businesses/queries";
import { listLiveAreas, getWaitlistWithinRadius } from "@/lib/live-areas/queries";
import { LiveAreaForm } from "./live-area-form";
import { LiveAreaCard } from "./live-area-card";

export default async function LiveAreasPage() {
  const [areas, businesses] = await Promise.all([listLiveAreas(), listBusinesses()]);

  const areasWithCounts = await Promise.all(
    areas.map(async (area) => {
      const pendingInvite = await getWaitlistWithinRadius(area.latitude, area.longitude, area.radiusMiles, {
        onlyNotYetNotified: true,
      });
      const allWithinRadius = await getWaitlistWithinRadius(area.latitude, area.longitude, area.radiusMiles);
      const pendingReminder = allWithinRadius.filter((r) => r.notified_at).length;
      return { area, pendingInvite: pendingInvite.length, pendingReminder };
    }),
  );

  return (
    <div className="p-6">
      <NavLink href="/app-data" className="text-sm text-gold">
        ← Back to App Data
      </NavLink>

      <h1 className="mt-2 text-lg font-medium">Live Areas</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-dark">
        This is what actually controls sign-up now — not a single on/off switch. Anyone visiting Privi's
        sign-up page has their postcode checked against the areas below; only a postcode within one of
        these gets through to real sign-up, everyone else lands on the waitlist. Add an area once you're
        genuinely happy with the businesses you've signed up nearby — this isn't automatic, it's your
        call each time.
      </p>

      <LiveAreaForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />

      <div className="mt-8 flex flex-col gap-4">
        {areasWithCounts.length === 0 ? (
          <p className="text-sm text-muted-dark">
            No live areas yet — every postcode currently lands on the waitlist, same as before.
          </p>
        ) : (
          areasWithCounts.map(({ area, pendingInvite, pendingReminder }) => (
            <LiveAreaCard key={area.id} area={area} pendingInvite={pendingInvite} pendingReminder={pendingReminder} />
          ))
        )}
      </div>
    </div>
  );
}
