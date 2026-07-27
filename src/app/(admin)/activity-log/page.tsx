import { NavLink } from "@/components/nav-link";
import { listActivity } from "@/lib/activity/queries";

const PAGE_SIZE = 50;

const ENTITY_TYPES = [
  "business",
  "location",
  "offer",
  "member",
  "notification",
  "category",
  "settings",
  "banner",
];

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Fetch one extra row to know whether a "Next" page actually exists,
  // without maintaining a separate total count (Section 11 explicitly
  // scopes this as a simple chronological log, not a reporting feature).
  const rows = await listActivity({
    limit: PAGE_SIZE + 1,
    offset,
    entityType: params.entityType,
  });
  const hasNextPage = rows.length > PAGE_SIZE;
  const entries = rows.slice(0, PAGE_SIZE);

  const baseQuery = params.entityType ? `entityType=${params.entityType}&` : "";

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Activity Log</h1>
      <p className="text-sm text-muted-dark">
        A chronological record of every change made across the portal.
      </p>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-hairline bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Record type
          <select
            name="entityType"
            defaultValue={params.entityType ?? ""}
            className="rounded-lg border border-border-hairline px-3 py-2"
          >
            <option value="">All types</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
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
        {entries.length === 0 && (
          <p className="p-6 text-sm text-muted-dark">No activity found.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="truncate">
              {entry.admin_email} {entry.action} {entry.entity_type}
              {entry.entity_label ? ` — ${entry.entity_label}` : ""}
            </span>
            <span className="shrink-0 text-xs text-muted-dark">
              {new Date(entry.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        {page > 1 ? (
          <NavLink href={`/activity-log?${baseQuery}page=${page - 1}`} className="text-gold">
            ← Previous
          </NavLink>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-dark">Page {page}</span>
        {hasNextPage ? (
          <NavLink href={`/activity-log?${baseQuery}page=${page + 1}`} className="text-gold">
            Next →
          </NavLink>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
