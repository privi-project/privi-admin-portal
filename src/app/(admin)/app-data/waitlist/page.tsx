import { NavLink } from "@/components/nav-link";
import { getWaitlistOverview } from "@/lib/waitlist/queries";
import { getWaitlistByPostcode } from "@/lib/live-areas/queries";

// 2026-09-06: the old "Notify N waiting" / "Remind N people" blunt,
// everyone-at-once buttons are retired — sending is now always
// area-scoped, done from the Live Areas page, since that's what
// actually decides who's covered. This page is now a read-only view:
// the total, and a by-postcode breakdown to help decide which area to
// open next.
export default async function WaitlistPage() {
  const [overview, byPostcode] = await Promise.all([getWaitlistOverview(), getWaitlistByPostcode()]);

  return (
    <div className="p-6">
      <NavLink href="/app-data" className="text-sm text-gold">
        ← Back to App Data
      </NavLink>

      <h1 className="mt-2 text-lg font-medium">Waitlist</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-dark">
        {overview.total} {overview.total === 1 ? "person has" : "people have"} joined the waitlist so
        far. Sending an invite is done from{" "}
        <NavLink href="/app-data/live-areas" className="text-gold hover:underline">
          Live Areas
        </NavLink>{" "}
        once you're ready to open an area — this page is just for seeing where demand is clustering.
      </p>

      <div className="mt-6 rounded-2xl border border-border-hairline bg-white p-5">
        <h2 className="mb-3 text-sm font-medium">By postcode</h2>
        {byPostcode.length === 0 ? (
          <p className="text-sm text-muted-dark">No postcodes recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {byPostcode.map((row) => (
              <div key={row.postcode} className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.postcode}</span>
                <span className="text-muted-dark">
                  {row.count} {row.count === 1 ? "person" : "people"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
