import { NavLink } from "@/components/nav-link";
import { notFound, redirect } from "next/navigation";
import { NotificationForm } from "@/components/notification-form";
import { getNotification, getNotificationLocationIds } from "@/lib/notifications/queries";
import { listBusinesses } from "@/lib/businesses/queries";
import { listAllOffers } from "@/lib/offers/queries";
import { listMembers } from "@/lib/members/queries";
import { listAllLocations } from "@/lib/locations/queries";
import { updateNotificationAction } from "../../actions";
import { NotificationCancelControl } from "./notification-cancel-control";
import { NotificationDeleteControl } from "./notification-delete-control";

export default async function EditNotificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const notification = await getNotification(id);
  if (!notification) notFound();

  // Sent/cancelled/failed notifications are history — view-only.
  if (["sent", "cancelled", "failed"].includes(notification.status)) {
    redirect(`/notifications/${id}/preview`);
  }

  const [businesses, offers, members, locations, selectedLocationIds] = await Promise.all([
    listBusinesses(),
    listAllOffers(),
    listMembers(),
    listAllLocations(),
    getNotificationLocationIds(id),
  ]);

  const updateWithId = updateNotificationAction.bind(null, id);

  return (
    <div className="p-6">
      <NavLink href="/notifications" className="text-sm text-gold">
        ← Back to notifications
      </NavLink>

      {saved === "1" && (
        <p className="mt-2 rounded-lg bg-status-success/10 px-4 py-2 text-sm text-status-success">
          Changes saved.
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">Edit notification</h1>
        <div className="flex items-center gap-4">
          <NavLink href={`/notifications/${id}/preview`} className="text-sm text-gold">
            Preview
          </NavLink>
          {notification.status === "scheduled" && (
            <NotificationCancelControl id={id} title={notification.title} />
          )}
          {notification.status === "draft" && (
            <NotificationDeleteControl id={id} title={notification.title} />
          )}
        </div>
      </div>

      <NotificationForm
        formAction={updateWithId}
        submitLabel="Save changes"
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
        locations={locations.map((l) => ({
          id: l.id,
          business_id: l.business_id,
          label: l.label,
          formatted_address: l.formatted_address,
          location_type: l.location_type,
        }))}
        initial={{
          title: notification.title,
          body: notification.body,
          notification_type: notification.notification_type,
          linked_business_id: notification.linked_business_id,
          linked_offer_id: notification.linked_offer_id,
          audience_type: notification.audience_type,
          audience_member_id: notification.audience_member_id,
          audience_radius_miles: notification.audience_radius_miles,
          audience_reference_business_id: notification.audience_reference_business_id,
          scheduled_at: notification.scheduled_at,
          expires_at: notification.expires_at,
          selectedLocationIds,
          requires_acknowledgement: notification.requires_acknowledgement,
          document_url: notification.document_url,
          action_label: notification.action_label,
          action_destination: notification.action_destination,
        }}
      />
    </div>
  );
}
