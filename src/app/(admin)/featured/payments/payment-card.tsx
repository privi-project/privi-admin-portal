"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  markPaymentStatusAction,
  markPaidAndActivateFeaturedAction,
  deletePaymentRequestAction,
} from "./actions";
import type { FeaturedPaymentRequest } from "@/lib/featured/payment-queries";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PaymentCard({ payment }: { payment: FeaturedPaymentRequest }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    setError(null);
    startTransition(() => {
      markPaymentStatusAction(payment.id, payment.business_name, payment.status === "paid" ? "unpaid" : "paid");
    });
  };

  const handleMarkPaidAndActivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await markPaidAndActivateFeaturedAction(payment.id);
      if (result?.error) setError(result.error);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deletePaymentRequestAction(payment.id, payment.business_name);
      setDeleteOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-hairline bg-white p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-medium">{payment.business_name}</p>
        <StatusBadge status={payment.status} />
      </div>

      <p className="text-xs text-muted-dark">
        {payment.featured_level === "global" ? "Homepage and category" : "Category only"}
        {" · "}
        {payment.duration_months} month{payment.duration_months === 1 ? "" : "s"}
        {payment.business_id && " · linked to business"}
      </p>

      <p className="text-lg font-medium">£{payment.amount_gbp.toFixed(2)}</p>

      {payment.invoice_number && (
        <p className="text-xs text-muted-dark">Invoice {payment.invoice_number}</p>
      )}

      {payment.notes && (
        <p className="rounded-lg bg-border-hairline-2 p-2 text-xs text-charcoal">{payment.notes}</p>
      )}

      <p className="text-xs text-muted-dark">
        Added {formatDate(payment.created_at)}
        {payment.paid_at && ` · Paid ${formatDate(payment.paid_at)}`}
      </p>

      {error && (
        <p className="text-xs text-status-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {payment.status === "unpaid" && payment.business_id ? (
            <>
              <button
                type="button"
                onClick={handleMarkPaidAndActivate}
                disabled={isPending}
                className="rounded-lg privi-gold-border border bg-teal px-3 py-1.5 text-xs font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
              >
                {isPending ? "Working…" : "Mark paid & activate Featured"}
              </button>
              <button
                type="button"
                onClick={handleToggle}
                disabled={isPending}
                className="text-xs text-gold disabled:opacity-60"
              >
                Just mark paid
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              className="rounded-lg privi-gold-border border bg-teal px-3 py-1.5 text-xs font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
            >
              {isPending ? "Working…" : payment.status === "paid" ? "Mark unpaid" : "Mark paid"}
            </button>
          )}
        </div>

        {payment.status === "unpaid" && (
          <>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="text-xs text-status-danger"
            >
              Delete
            </button>
            <ConfirmDialog
              open={deleteOpen}
              title={`Delete this invoice for ${payment.business_name}?`}
              description="Only possible while it's still unpaid — once marked Paid it's kept as a record."
              confirmLabel="Delete"
              destructive
              isPending={isPending}
              onCancel={() => setDeleteOpen(false)}
              onConfirm={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
