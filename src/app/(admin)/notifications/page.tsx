import { NavLink } from "@/components/nav-link";
import { StatusBadge } from "@/components/status-badge";
import { listNotifications } from "@/lib/notifications/queries";
import { NOTIFICATION_TYPES, AUDIENCE_TYPES } from "@/lib/notification-config";

const STATUSES = ["draft", "scheduled", "sent", "cancelled", "failed"];

function labelFor(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const notifications = await listNotifications({ status: params.status });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Notifications</h1>
        <NavLink
          href="/notifications/new"
          className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
        >
          Add notification
        </NavLink>
      </div>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-hairline bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-lg border border-border-hairline px-3 py-2"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
        >
          Apply
        </button>
      </form>

      <div className="mt-6 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {notifications.length === 0 && (
          <p className="p-6 text-sm text-muted-dark">No notifications found.</p>
        )}

        {notifications.map((n) => (
          <div key={n.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{n.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-dark">
                <span>{labelFor(NOTIFICATION_TYPES, n.notification_type)}</span>
                <span>·</span>
                <span>{labelFor(AUDIENCE_TYPES, n.audience_type)}</span>
                {n.status === "scheduled" && n.scheduled_at && (
                  <>
                    <span>·</span>
                    <span>Scheduled for {new Date(n.scheduled_at).toLocaleString()}</span>
                  </>
                )}
                {n.status === "sent" && n.sent_at && (
                  <>
                    <span>·</span>
                    <span>
                      Sent {new Date(n.sent_at).toLocaleString()} — {n.targeted_count ?? 0} targeted
                    </span>
                  </>
                )}
              </div>
            </div>

            <StatusBadge status={n.status} />

            {n.status === "draft" || n.status === "scheduled" ? (
              <>
                <NavLink href={`/notifications/${n.id}/edit`} className="text-sm text-gold">
                  Edit
                </NavLink>
                <NavLink href={`/notifications/${n.id}/preview`} className="text-sm text-gold">
                  Preview &amp; send
                </NavLink>
              </>
            ) : (
              <NavLink href={`/notifications/${n.id}/preview`} className="text-sm text-gold">
                View
              </NavLink>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
