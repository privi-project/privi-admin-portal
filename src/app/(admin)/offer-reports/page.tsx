import { listOfferReports } from "@/lib/offer-reports/queries";
import { getSystemSettings } from "@/lib/system-settings/queries";
import { ReportCard } from "./report-card";

export default async function OfferReportsPage() {
  const [reports, settings] = await Promise.all([listOfferReports(), getSystemSettings()]);
  const open = reports.filter((r) => r.status === "open");
  const resolved = reports.filter((r) => r.status === "resolved");

  const openCounts = new Map<string, number>();
  for (const r of open) {
    openCounts.set(r.business_id, (openCounts.get(r.business_id) ?? 0) + 1);
  }
  const flaggedBusinessIds = new Set(
    [...openCounts.entries()].filter(([, count]) => count >= settings.offer_report_flag_threshold).map(([id]) => id),
  );

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Offer reports</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-dark">
        Members can flag an offer with a specific reason from OfferScreen — the App has no
        general complaint channel, this is the one narrow exception (Procedures Manual §6).
        Nothing here is ever actioned automatically. A business hitting{" "}
        {settings.offer_report_flag_threshold} or more open reports is highlighted below and
        surfaced on the Dashboard, as a signal worth a look — not a verdict. Review each one the
        same way as any other complaint and record what you did in the outcome field.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium">Open</h2>
            <span className="text-xs text-muted-dark">{open.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {open.length === 0 ? (
              <p className="px-1 text-xs text-muted-dark">Nothing open right now.</p>
            ) : (
              open.map((report) => (
                <div key={report.id} className="flex flex-col gap-1">
                  {flaggedBusinessIds.has(report.business_id) && (
                    <p className="px-1 text-xs font-medium text-status-danger">
                      {openCounts.get(report.business_id)} open reports for this business — worth a look
                    </p>
                  )}
                  <ReportCard report={report} />
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium">Resolved</h2>
            <span className="text-xs text-muted-dark">{resolved.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {resolved.length === 0 ? (
              <p className="px-1 text-xs text-muted-dark">None yet.</p>
            ) : (
              resolved.map((report) => <ReportCard key={report.id} report={report} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
