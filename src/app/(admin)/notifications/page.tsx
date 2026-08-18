import { NavLink } from "@/components/nav-link";
import { listNotifications } from "@/lib/notifications/queries";
import { NotificationsList } from "./notifications-list";

const STATUSES = ["draft", "scheduled", "sent", "cancelled", "failed"];

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

      <NotificationsList notifications={notifications} />
    </div>
  );
}
