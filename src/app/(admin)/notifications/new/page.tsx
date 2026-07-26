import { NavLink } from "@/components/nav-link";
import { NotificationForm } from "@/components/notification-form";
import { listBusinesses } from "@/lib/businesses/queries";
import { listAllOffers } from "@/lib/offers/queries";
import { listMembers } from "@/lib/members/queries";
import { createNotificationAction } from "../actions";

export default async function NewNotificationPage() {
  const [businesses, offers, members] = await Promise.all([
    listBusinesses(),
    listAllOffers(),
    listMembers(),
  ]);

  return (
    <div className="p-6">
      <NavLink href="/notifications" className="text-sm text-gold">
        ← Back to notifications
      </NavLink>
      <h1 className="mt-2 text-lg font-medium">Add notification</h1>
      <NotificationForm
        formAction={createNotificationAction}
        submitLabel="Save as draft"
        businesses={businesses.map((b) => ({ id: b.id, name: b.name }))}
        offers={offers.map((o) => ({
          id: o.id,
          business_id: o.business_id,
          title: o.title,
          business_name: o.business_name,
        }))}
        members={members.map((m) => ({
          id: m.id,
          email: m.email,
          first_name: m.first_name,
          last_name: m.last_name,
        }))}
      />
    </div>
  );
}
