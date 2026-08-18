import { NavLink } from "@/components/nav-link";
import { listApplicationStatuses, listBusinessApplications } from "@/lib/business-applications/queries";
import { StatusRow } from "./status-row";
import { AddStatusForm } from "./add-status-form";

export default async function BusinessApplicationStatusesPage() {
  const [statuses, applications] = await Promise.all([
    listApplicationStatuses(),
    listBusinessApplications(),
  ]);

  const countsBySlug = new Map<string, number>();
  for (const application of applications) {
    countsBySlug.set(application.status, (countsBySlug.get(application.status) ?? 0) + 1);
  }

  return (
    <div className="p-6">
      <NavLink href="/business-applications" className="text-sm text-gold">
        ← Back to applications
      </NavLink>

      <h1 className="mt-2 text-lg font-medium">Manage columns</h1>
      <p className="mt-1 text-sm text-muted-dark">
        Rename, reorder, add, or retire the pipeline stages on the
        applications board. Reorder and rename freely — deactivating hides
        a column from new use but keeps any applications already in it
        visible; deleting is only possible for an empty, non-protected
        column.
      </p>

      <div className="mt-6 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {statuses.map((status, index) => (
          <StatusRow
            key={status.id}
            status={status}
            applicationCount={countsBySlug.get(status.slug) ?? 0}
            isFirst={index === 0}
            isLast={index === statuses.length - 1}
          />
        ))}
      </div>

      <AddStatusForm />
    </div>
  );
}
