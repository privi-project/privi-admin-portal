"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions (archive, remove, cancel) use the danger tone
   * instead of the standard teal/gold button styling. */
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Shared confirmation dialog for destructive/significant actions
 * (Admin_Portal_Structure.docx Section 14: "confirm destructive actions").
 * Built on the native <dialog> element for free focus-trapping and
 * backdrop handling.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      onClose={onCancel}
      className="w-full max-w-sm rounded-2xl border border-border-hairline bg-white p-6 shadow-lg backdrop:bg-charcoal/40"
    >
      <h2 className="text-base font-medium text-charcoal">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-muted-dark">{description}</p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          style={destructive ? undefined : ({ "--gold-border-bg": "var(--color-teal)" } as React.CSSProperties)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium text-ivory disabled:opacity-60 ${
            destructive
              ? "border-status-danger bg-status-danger"
              : "privi-gold-border bg-teal"
          }`}
        >
          {isPending ? "Working…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
