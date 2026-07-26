import { NavLink } from "@/components/nav-link";
import { listMembers } from "@/lib/members/queries";
import { MEMBER_STATUSES } from "@/lib/members/config";
import { StatusBadge } from "@/components/status-badge";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; complimentary?: string; suspended?: string }>;
}) {
  const params = await searchParams;
  const members = await listMembers({
    q: params.q,
    status: params.status,
    complimentary: params.complimentary === "on",
    suspended: params.suspended === "on",
  });

  const exportQuery = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Members</h1>
        <div className="flex items-center gap-3">
          <a
            href={`/members/export.csv${exportQuery ? `?${exportQuery}` : ""}`}
            className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
          >
            Export CSV
          </a>
          <NavLink
            href="/members/new"
            className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)]"
          >
            Add member
          </NavLink>
        </div>
      </div>

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-hairline bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Search
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name or email"
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-lg border border-border-hairline px-3 py-2"
          >
            <option value="">All statuses</option>
            {MEMBER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="complimentary" defaultChecked={params.complimentary === "on"} />
          Complimentary only
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="suspended" defaultChecked={params.suspended === "on"} />
          Suspended only
        </label>

        <button
          type="submit"
          className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
        >
          Apply
        </button>
      </form>

      <div className="mt-6 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {members.length === 0 && (
          <p className="p-6 text-sm text-muted-dark">No members found.</p>
        )}

        {members.map((member) => (
          <NavLink
            key={member.id}
            href={`/members/${member.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-border-hairline-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.first_name} {member.last_name}
              </p>
              <p className="truncate text-xs text-muted-dark">
                {member.email} {member.email_confirmed ? "🟢" : "🟡"}
              </p>
            </div>

            {!member.is_complimentary && <StatusBadge status={member.subscription_status} />}
            {member.is_complimentary && <StatusBadge status="complimentary" />}
            {member.is_suspended && <StatusBadge status="suspended" />}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
