import { NavLink } from "@/components/nav-link";
import { listBusinesses } from "@/lib/businesses/queries";
import { listLiveAreas, listBusinessLocationsForMap, getWaitlistWithinRadius } from "@/lib/live-areas/queries";
import { LiveAreaForm } from "./live-area-form";
import { LiveAreaCard } from "./live-area-card";

export default async function LiveAreasPage() {
  const [areas, businesses, businessPoints] = await Promise.all([
    listLiveAreas(),
    listBusinesses(),
    listBusinessLocationsForMap(),
  ]);

  const areasWithCounts = await Promise.all(
    areas.map(async (area) => {
      const pendingInvite = await getWaitlistWithinRadius(area.latitude, area.longitude, area.radiusMiles, {
        onlyNotYetNotified: true,
      });
      return { area, pendingInvite: pendingInvite.length };
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
        call each time. Marking an area live sends the invite email straight away to everyone already
        waiting nearby, and anyone still on the list 5 days later gets one automatic reminder — nothing
        more to remember once you've clicked the button below.
      </p>

      <LiveAreaForm
        businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
        businessPoints={businessPoints}
        liveCircles={areas.map((a) => ({
          id: a.id,
          label: a.label,
          latitude: a.latitude,
          longitude: a.longitude,
          radiusMiles: a.radiusMiles,
        }))}
      />

      <div className="mt-8 flex flex-col gap-4">
        {areasWithCounts.length === 0 ? (
          <p className="text-sm text-muted-dark">
            No live areas yet — every postcode currently lands on the waitlist, same as before.
          </p>
        ) : (
          areasWithCounts.map(({ area, pendingInvite }) => (
            <LiveAreaCard key={area.id} area={area} pendingInvite={pendingInvite} />
          ))
        )}
      </div>
    </div>
  );
}
