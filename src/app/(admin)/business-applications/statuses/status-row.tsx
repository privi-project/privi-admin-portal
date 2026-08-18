"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  updateStatusLabelAction,
  toggleStatusActiveAction,
  moveStatusAction,
  deleteStatusAction,
} from "./actions";
import { NEW_APPLICATION_STATUS_SLUG } from "@/lib/business-applications/config";
import type { ApplicationStatusRow } from "@/lib/business-applications/queries";

export function StatusRow({
  status,
  applicationCount,
  isFirst,
  isLast,
}: {
  status: ApplicationStatusRow;
  /** How many applications currently sit in this column — drives whether
   * Delete is offered at all (server re-checks this regardless). */
  applicationCount: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [label, setLabel] = useState(status.label);
  const [labelDirty, setLabelDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isProtected = status.slug === NEW_APPLICATION_STATUS_SLUG;
  const canDelete = !isProtected && applicationCount === 0;

  const handleSaveLabel = () => {
    startTransition(async () => {
      await updateStatusLabelAction(status.id, label);
      setLabelDirty(false);
    });
  };

  const handleToggleActive = () => {
    startTransition(() => {
      toggleStatusActiveAction(status.id, status.slug, status.label, !status.is_active);
    });
  };

  const handleMove = (direction: "up" | "down") => {
    startTransition(() => {
      moveStatusAction(status.id, direction);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteStatusAction(status.id, status.slug, status.label);
      setDeleteOpen(false);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleMove("up")}
          disabled={isFirst || isPending}
          aria-label="Move up"
          className="rounded border border-border-hairline px-2 py-1 text-xs disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => handleMove("down")}
          disabled={isLast || isPending}
          aria-label="Move down"
          className="rounded border border-border-hairline px-2 py-1 text-xs disabled:opacity-30"
        >
          ↓
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setLabelDirty(true);
            }}
            className="min-w-0 flex-1 rounded-lg border border-border-hairline px-2 py-1 text-sm"
          />
          {labelDirty && (
            <button
              type="button"
              onClick={handleSaveLabel}
              disabled={isPending}
              className="shrink-0 text-xs text-gold disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-dark">
          {status.slug}
          {isProtected && " · protected — always on, since new submissions land here"}
        </p>
      </div>

      <span className="shrink-0 text-xs text-muted-dark">
        {applicationCount} application{applicationCount === 1 ? "" : "s"}
      </span>

      <StatusBadge status={status.is_active ? "active" : "inactive"} />

      <button
        type="button"
        onClick={handleToggleActive}
        disabled={isPending || isProtected}
        title={isProtected ? "Can't deactivate the protected New column" : undefined}
        className="shrink-0 text-sm text-gold disabled:opacity-30"
      >
        {status.is_active ? "Deactivate" : "Activate"}
      </button>

      {canDelete && (
        <>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="shrink-0 text-sm text-status-danger"
          >
            Delete
          </button>
          <ConfirmDialog
            open={deleteOpen}
            title={`Delete "${status.label}"?`}
            description="This column is empty, so it can be removed outright. This can't be undone — you'd need to add it again from scratch."
            confirmLabel="Delete"
            destructive
            isPending={isPending}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}
