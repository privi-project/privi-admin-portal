import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { getNotification, getNotificationLocationIds } from "@/lib/notifications/queries";
import { computeAudience, type AudienceType } from "@/lib/notifications/audience";
import { getBusiness } from "@/lib/businesses/queries";
import { getOffer } from "@/lib/offers/queries";
import { getLocation } from "@/lib/locations/queries";
import {
  sendNotificationAction,
  scheduleNotificationAction,
  duplicateNotificationAction,
} from "../../actions";

export default async function NotificationPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notification = await getNotification(id);
  if (!notification) notFound();

  const locationIds = await getNotificationLocationIds(id);

  const [audience, linkedBusiness, linkedOffer, linkedLocations] = await Promise.all([
    computeAudience({
      audienceType: notification.audience_type as AudienceType,
      audienceMemberId: notification.audience_member_id,
      audienceRadiusMiles: notification.audience_radius_miles,
      audienceReferenceBusinessId: notification.audience_reference_business_id,
      linkedOfferId: notification.linked_offer_id,
      linkedLocationIds: locationIds,
    }),
    notification.linked_business_id ? getBusiness(notification.linked_business_id) : null,
    notification.linked_offer_id ? getOffer(notification.linked_offer_id) : null,
    Promise.all(locationIds.map((locationId) => getLocation(locationId))),
  ]);

  const isEditable = notification.status === "draft" || notification.status === "scheduled";

  return (
    <div className="p-6">
      {isEditable ? (
        <NavLink href={`/notifications/${id}/edit`} className="text-sm text-gold">
          ← Back to edit
        </NavLink>
      ) : (
        <NavLink href="/notifications" className="text-sm text-gold">
          ← Back to notifications
        </NavLink>
      )}

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">Preview</h1>
        <StatusBadge status={notification.status} />
      </div>
      <p className="text-sm text-muted-dark">
        A simplified read-only view of how this will read in the Activity Panel.
      </p>

      <div className="privi-gold-border mt-6 max-w-md rounded-2xl border bg-charcoal p-6 text-ivory [--gold-border-bg:var(--color-charcoal)]">
        <h2 className="text-lg font-medium">{notification.title}</h2>
        <p className="mt-1 text-sm text-ivory/80">{notification.body}</p>
        {linkedBusiness && (
          <p className="mt-3 text-xs text-ivory/60">Linked business: {linkedBusiness.name}</p>
        )}
        {linkedOffer && (
          <p className="mt-3 text-xs text-ivory/60">Linked offer: {linkedOffer.title}</p>
        )}
        {linkedLocations.length > 0 && (
          <p className="mt-3 text-xs text-ivory/60">
            Location(s):{" "}
            {linkedLocations
              .filter((l): l is NonNullable<typeof l> => l !== null)
              .map((l) => l.label ?? l.formatted_address ?? l.location_type)
              .join(", ")}
          </p>
        )}
        {notification.expires_at && (
          <p className="mt-3 text-xs text-ivory/60">
            Expires {new Date(notification.expires_at).toLocaleString()}
          </p>
        )}
      </div>

      {notification.expires_at && new Date(notification.expires_at) < new Date() && (
        <p className="mt-4 max-w-md text-sm text-status-warning">
          This notification&apos;s expiry has already passed — sending it now would
          reach members with stale information.
        </p>
      )}

      <div className="mt-6 max-w-md rounded-2xl border border-border-hairline bg-white p-4">
        <p className="text-sm font-medium">
          Audience: {audience.count} member{audience.count === 1 ? "" : "s"}
        </p>
        {notification.audience_type === "area" && audience.count === 0 && (
          <p className="mt-1 text-xs text-muted-dark">
            Expected to be 0 or near-0 right now — area targeting matches against
            members&apos; preferred area, which the App doesn&apos;t collect yet.
          </p>
        )}
        {notification.status === "sent" && (
          <p className="mt-1 text-xs text-muted-dark">
            Snapshot at send time: {notification.targeted_count ?? 0} targeted,{" "}
            {notification.sent_count ?? 0} sent, {notification.failed_count ?? 0} failed.
          </p>
        )}
      </div>

      {(notification.status === "draft" || notification.status === "scheduled") && (
        <div className="mt-6 flex max-w-md gap-3">
          <form action={sendNotificationAction.bind(null, id, notification.title)}>
            <button
              type="submit"
              className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
            >
              Send now
            </button>
          </form>
          {notification.status === "draft" && notification.scheduled_at && (
            <form action={scheduleNotificationAction.bind(null, id, notification.title)}>
              <button
                type="submit"
                className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
              >
                Schedule for {new Date(notification.scheduled_at).toLocaleString()}
              </button>
            </form>
          )}
        </div>
      )}

      {["sent", "cancelled", "failed"].includes(notification.status) && (
        <form action={duplicateNotificationAction.bind(null, id)} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
          >
            Duplicate as new draft
          </button>
        </form>
      )}
    </div>
  );
}
