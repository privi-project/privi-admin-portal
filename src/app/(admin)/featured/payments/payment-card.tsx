"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import {
  markPaymentStatusAction,
  markPaidAndActivateFeaturedAction,
  deletePaymentRequestAction,
  updateBillingAddressAction,
} from "./actions";
import { splitBillingAddress, type BillingAddressFields } from "@/lib/invoice/billing-address";
import type { FeaturedPaymentRequest } from "@/lib/featured/payment-queries";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PaymentCard({ payment }: { payment: FeaturedPaymentRequest }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<BillingAddressFields>(() =>
    splitBillingAddress(payment.billing_address),
  );

  const openEditor = () => {
    setAddressDraft(splitBillingAddress(payment.billing_address));
    setEditingAddress(true);
  };

  const handleSaveAddress = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateBillingAddressAction(payment.id, addressDraft);
      if (result?.error) setError(result.error);
      else setEditingAddress(false);
    });
  };

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
      setActivateOpen(false);
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

      {editingAddress ? (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={addressDraft.line1}
            onChange={(e) => setAddressDraft((d) => ({ ...d, line1: e.target.value }))}
            placeholder="Address line 1"
            className="rounded-lg border border-border-hairline px-2 py-1.5 text-xs"
          />
          <input
            type="text"
            value={addressDraft.line2}
            onChange={(e) => setAddressDraft((d) => ({ ...d, line2: e.target.value }))}
            placeholder="Address line 2 (optional)"
            className="rounded-lg border border-border-hairline px-2 py-1.5 text-xs"
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={addressDraft.city}
              onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Town / City"
              className="min-w-0 flex-1 rounded-lg border border-border-hairline px-2 py-1.5 text-xs"
            />
            <input
              type="text"
              value={addressDraft.postcode}
              onChange={(e) => setAddressDraft((d) => ({ ...d, postcode: e.target.value }))}
              placeholder="Postcode"
              className="w-24 rounded-lg border border-border-hairline px-2 py-1.5 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveAddress}
              disabled={isPending}
              className="text-xs font-medium text-gold disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save address"}
            </button>
            <button type="button" onClick={() => setEditingAddress(false)} className="text-xs text-muted-dark">
              Cancel
            </button>
          </div>
        </div>
      ) : payment.billing_address ? (
        <div className="flex items-center gap-3">
          <a
            href={`/featured/payments/${payment.id}/invoice.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gold underline underline-offset-2"
          >
            Download invoice (PDF)
          </a>
          <button type="button" onClick={openEditor} className="text-xs text-muted-dark underline underline-offset-2">
            Edit address
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className="w-fit text-xs italic text-muted-dark underline underline-offset-2"
        >
          Add a billing address to generate a PDF invoice
        </button>
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
                onClick={() => setActivateOpen(true)}
                disabled={isPending}
                className="rounded-lg privi-gold-border border bg-teal px-3 py-1.5 text-xs font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
              >
                {isPending ? "Working…" : "Mark paid & activate Featured"}
              </button>
              <ConfirmDialog
                open={activateOpen}
                title={`Mark paid & switch on Featured for ${payment.business_name}?`}
                description="This does two things at once, and neither undoes automatically: it goes live as Featured immediately, and it's recorded as real earnings. Double-check this is the right invoice before continuing — if it isn't, you'd need to turn Featured back off from the business's own page afterward."
                confirmLabel={isPending ? "Working…" : "Yes, mark paid & activate"}
                isPending={isPending}
                onCancel={() => setActivateOpen(false)}
                onConfirm={handleMarkPaidAndActivate}
              />
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
