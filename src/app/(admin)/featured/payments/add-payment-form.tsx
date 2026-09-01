"use client";

import { useActionState } from "react";
import { createPaymentRequestAction, type PaymentFormState } from "./actions";
import { FEATURED_DURATIONS } from "@/lib/featured-config";
import { BusinessCombobox } from "@/components/business-combobox";

const initialState: PaymentFormState = undefined;

export function AddPaymentForm({ businesses }: { businesses: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createPaymentRequestAction, initialState);

  return (
    <form
      action={formAction}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-hairline bg-white p-4"
    >
      {state?.error && (
        <p className="w-full text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Business name
        <input
          type="text"
          name="business_name"
          required
          placeholder="e.g. The Coffee House"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        {/* Invisible spacer matching the combobox's help-text line below it,
            so both input boxes land on the same row despite items-end. */}
        <span aria-hidden="true" className="invisible text-xs">
          spacer
        </span>
      </label>

      <BusinessCombobox
        businesses={businesses}
        helpText={`Link it if it's already a real business here — that unlocks one-click "mark paid & go live" below. Leave blank if not yet added.`}
      />

      <label className="flex flex-col gap-1 text-sm">
        Tier
        <select name="featured_level" required className="rounded-lg border border-border-hairline px-3 py-2">
          <option value="category">Category only</option>
          <option value="global">Homepage and category</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Duration
        <select name="duration_months" required className="rounded-lg border border-border-hairline px-3 py-2">
          {FEATURED_DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Amount (£)
        <input
          type="number"
          name="amount_gbp"
          required
          min="0"
          step="0.01"
          placeholder="e.g. 40.00"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Invoice number
        <input
          type="text"
          name="invoice_number"
          placeholder="auto-generated if left blank"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <fieldset className="flex min-w-[20rem] flex-1 flex-wrap gap-2 rounded-lg border border-border-hairline p-3">
        <legend className="px-1 text-xs text-muted-dark">Billing address (optional — needed to generate a PDF invoice)</legend>
        <input
          type="text"
          name="billing_address_line1"
          placeholder="Address line 1"
          className="min-w-[10rem] flex-1 rounded-lg border border-border-hairline px-3 py-2 text-sm"
        />
        <input
          type="text"
          name="billing_address_line2"
          placeholder="Address line 2 (optional)"
          className="min-w-[10rem] flex-1 rounded-lg border border-border-hairline px-3 py-2 text-sm"
        />
        <input
          type="text"
          name="billing_address_city"
          placeholder="Town / City"
          className="min-w-[8rem] flex-1 rounded-lg border border-border-hairline px-3 py-2 text-sm"
        />
        <input
          type="text"
          name="billing_address_postcode"
          placeholder="Postcode"
          className="w-32 rounded-lg border border-border-hairline px-3 py-2 text-sm"
        />
      </fieldset>

      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
        Notes
        <input
          type="text"
          name="notes"
          placeholder="optional"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add invoice"}
      </button>
    </form>
  );
}
