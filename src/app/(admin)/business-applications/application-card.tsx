"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  moveApplicationStatusAction,
  saveApplicationNotesAction,
  deleteApplicationAction,
} from "./actions";
import { NEW_APPLICATION_STATUS_SLUG } from "@/lib/business-applications/config";
import type {
  ApplicationStatusRow,
  BusinessApplicationWithCategory,
} from "@/lib/business-applications/queries";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// updated_at is set equal to created_at on insert, so a plain string
// comparison is enough to tell "actually edited" apart from "untouched".
function wasUpdatedSinceCreation(application: BusinessApplicationWithCategory): boolean {
  return application.updated_at > application.created_at;
}

// Collapsed by default — a column can hold several of these, and most of
// the detail (contact info, message, notes) only matters while you're
// actually actioning that one application. Click the name to expand.
export function ApplicationCard({
  application,
  statuses,
}: {
  application: BusinessApplicationWithCategory;
  /** Every status (active + inactive) — filtered below to "active, plus
   * this card's own current one" so a card sitting in a since-deactivated
   * column still shows its real status instead of a blank/wrong one. */
  statuses: ApplicationStatusRow[];
}) {
  const selectableStatuses = statuses.filter((s) => s.is_active || s.slug === application.status);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(application.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    startTransition(() => {
      moveApplicationStatusAction(application.id, application.business_name, newStatus);
    });
  };

  const handleSaveNotes = () => {
    startTransition(async () => {
      await saveApplicationNotesAction(application.id, notes);
      setNotesDirty(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteApplicationAction(application.id, application.business_name);
      setDeleteOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-hairline bg-white p-3 text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide details" : "Show details"}
        className="flex items-center justify-between gap-2 text-left"
      >
        <p className="min-w-0 flex-1 truncate font-medium">{application.business_name}</p>
        {application.source === "manual" && (
          <span className="shrink-0 rounded-full bg-border-hairline-2 px-2 py-0.5 text-[10px] font-medium text-muted-dark">
            Added manually
          </span>
        )}
        <span
          className={`shrink-0 text-gold transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {expanded && (
        <>
          <p className="text-xs text-muted-dark">
            {application.category_label ?? "No category"}
            {" · "}
            {application.location_type === "multi" ? "Multi-location" : "Single location"}
            {" · "}
            {formatDate(application.created_at)}
            {wasUpdatedSinceCreation(application) && (
              <>
                {" · "}
                <span className="text-gold">Updated {formatDate(application.updated_at)}</span>
              </>
            )}
          </p>

          <div className="text-xs">
            <p>{application.contact_name}</p>
            <p className="text-muted-dark">{application.contact_email}</p>
            {application.contact_phone && <p className="text-muted-dark">{application.contact_phone}</p>}
          </div>

          {application.message && (
            <p className="rounded-lg bg-border-hairline-2 p-2 text-xs text-charcoal">{application.message}</p>
          )}

          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(true);
            }}
            placeholder="Notes to yourself…"
            rows={2}
            className="rounded-lg border border-border-hairline px-2 py-1 text-xs"
          />
          {notesDirty && (
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={isPending}
              className="self-start text-xs text-gold disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save note"}
            </button>
          )}

          <select
            value={application.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-border-hairline px-2 py-1 text-xs"
          >
            {selectableStatuses.map((s) => (
              <option key={s.slug} value={s.slug}>
                Move to: {s.label}
                {!s.is_active ? " (inactive)" : ""}
              </option>
            ))}
          </select>

          {application.status === NEW_APPLICATION_STATUS_SLUG && (
            <>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="self-start text-xs text-status-danger"
              >
                Delete
              </button>
              <ConfirmDialog
                open={deleteOpen}
                title={`Delete ${application.business_name}?`}
                description="This removes the application outright — only possible while it's still New. Once you've moved it on to Reviewing, Contacted, Signed up, or Declined it's kept as a record instead."
                confirmLabel="Delete"
                destructive
                isPending={isPending}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
