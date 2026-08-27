"use client";

import { useActionState, useTransition } from "react";
import { NavLink } from "@/components/nav-link";
import { StatusBadge } from "@/components/status-badge";
import { REASON_LABELS, type OfferReportRow } from "@/lib/offer-reports/queries";
import { resolveOfferReportAction, reopenOfferReportAction, type OfferReportActionState } from "./actions";

const initialState: OfferReportActionState = undefined;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ReportCard({ report }: { report: OfferReportRow }) {
  const resolveWithId = resolveOfferReportAction.bind(
    null,
    report.id,
    `${report.business_name} — ${report.offer_title}`,
  );
  const [state, formAction, isPending] = useActionState(resolveWithId, initialState);
  const [isReopening, startReopen] = useTransition();

  const handleReopen = () => {
    startReopen(() => {
      reopenOfferReportAction(report.id, `${report.business_name} — ${report.offer_title}`);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-hairline bg-white p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <NavLink href={`/businesses/${report.business_id}/edit`} className="min-w-0 truncate font-medium hover:text-gold">
          {report.business_name}
        </NavLink>
        <StatusBadge status={report.status} />
      </div>

      <p className="text-xs text-muted-dark">{report.offer_title}</p>

      <p className="text-sm font-medium">{REASON_LABELS[report.reason]}</p>

      {report.note && (
        <p className="rounded-lg bg-border-hairline-2 p-2 text-xs text-charcoal">&quot;{report.note}&quot;</p>
      )}

      <p className="text-xs text-muted-dark">
        Reported by {report.member_name} · {formatDate(report.created_at)}
      </p>

      {report.admin_notes && (
        <p className="rounded-lg bg-border-hairline-2 p-2 text-xs text-charcoal">
          <span className="font-medium">Outcome: </span>
          {report.admin_notes}
        </p>
      )}

      {state?.error && (
        <p className="text-xs text-status-danger" role="alert">
          {state.error}
        </p>
      )}

      {report.status === "open" ? (
        <form action={formAction} className="mt-1 flex flex-col gap-2">
          <textarea
            name="admin_notes"
            rows={2}
            placeholder="What did you do about this? (optional, shown here as the outcome)"
            className="rounded-lg border border-border-hairline px-3 py-2 text-xs"
          />
          <button
            type="submit"
            disabled={isPending}
            className="self-start rounded-lg privi-gold-border border bg-teal px-3 py-1.5 text-xs font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Mark resolved"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleReopen}
          disabled={isReopening}
          className="mt-1 self-start text-xs text-gold disabled:opacity-60"
        >
          {isReopening ? "Working…" : "Reopen"}
        </button>
      )}
    </div>
  );
}
