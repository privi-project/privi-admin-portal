"use client";

import { useActionState } from "react";
import { recordRefundAction, type RefundActionState } from "./actions";

const initialState: RefundActionState = undefined;

export function RefundForm({
  memberId,
  label,
  invoices,
}: {
  memberId: string;
  label: string;
  invoices: { id: string; created: string; amountGbp: number; status: string; paymentIntentId: string | null }[];
}) {
  const action = recordRefundAction.bind(null, memberId, label);
  const [state, formAction, isPending] = useActionState(action, initialState);

  const refundable = invoices.filter((inv) => inv.status === "paid" && inv.paymentIntentId);

  if (refundable.length === 0) {
    return <p className="text-sm text-muted-dark">No paid invoices available to refund.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.saved && <p className="text-sm text-status-success">Refund recorded.</p>}

      <label className="flex flex-col gap-1 text-sm">
        Invoice
        <select
          name="payment_intent_id"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        >
          {refundable.map((inv) => (
            <option key={inv.id} value={inv.paymentIntentId ?? ""}>
              {new Date(inv.created).toLocaleDateString()} — £{inv.amountGbp.toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Refund amount (£, leave blank for full refund)
        <input
          type="number"
          name="amount_gbp"
          step="0.01"
          min="0"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Reason (required, internal only)
        <input
          type="text"
          name="reason"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Processing…" : "Record refund"}
      </button>
    </form>
  );
}
