import { listBusinessApplications, listApplicationStatuses } from "@/lib/business-applications/queries";
import { listCategories } from "@/lib/categories/queries";
import { ApplicationCard } from "./application-card";
import { AddApplicationToggle } from "./add-application-toggle";

export default async function BusinessApplicationsPage() {
  const [applications, statuses, categories] = await Promise.all([
    listBusinessApplications(),
    listApplicationStatuses(),
    listCategories(),
  ]);

  // Columns shown = every active status, PLUS any inactive one that still
  // has a real application sitting in it — deactivating a column hides it
  // from new use without making existing cards silently disappear.
  const usedSlugs = new Set(applications.map((a) => a.status));
  const columns = statuses.filter((s) => s.is_active || usedSlugs.has(s.slug));

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Business applications</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-dark">
        Submissions from the (not yet public) &quot;apply to list your
        business&quot; form, plus anyone you&apos;ve added manually from a
        direct conversation. Move a card through the columns as you
        action it — notes are private, only visible here.
      </p>

      <div className="mt-4">
        <AddApplicationToggle
          categories={categories.filter((c) => c.is_active).map((c) => ({ id: c.id, label: c.label }))}
          statuses={statuses}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        {columns.map((status) => {
          const columnApplications = applications.filter((a) => a.status === status.slug);
          return (
            <div key={status.id} className="flex flex-col gap-3 rounded-2xl bg-border-hairline-2 p-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-medium">
                  {status.label}
                  {!status.is_active && <span className="ml-1 text-xs text-muted-dark">(inactive)</span>}
                </h2>
                <span className="text-xs text-muted-dark">{columnApplications.length}</span>
              </div>
              {columnApplications.length === 0 ? (
                <p className="px-1 text-xs text-muted-dark">Nothing here.</p>
              ) : (
                columnApplications.map((application) => (
                  <ApplicationCard key={application.id} application={application} statuses={statuses} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
