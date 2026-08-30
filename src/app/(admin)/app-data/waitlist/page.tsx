import { NavLink } from "@/components/nav-link";
import { getWaitlistOverview } from "@/lib/waitlist/queries";
import { WaitlistActions } from "./waitlist-actions";

export default async function WaitlistPage() {
  const overview = await getWaitlistOverview();

  return (
    <div className="p-6">
      <NavLink href="/app-data" className="text-sm text-gold">
        ← Back to App Data
      </NavLink>

      <h1 className="mt-2 text-lg font-medium">Waitlist</h1>
      <p className="mt-1 text-sm text-muted-dark">
        {overview.total} {overview.total === 1 ? "person has" : "people have"} joined the pre-launch waitlist.
        Two one-time sends, nothing automatic or scheduled — see the notes on each below.
      </p>

      <WaitlistActions pendingLiveEmail={overview.pendingLiveEmail} pendingReminder={overview.pendingReminder} />
    </div>
  );
}
