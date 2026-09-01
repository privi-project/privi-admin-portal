"use client";

import { useActionState } from "react";
import { createPaymentRequestAction, type PaymentFormState } from "./actions";
import { FEATURED_DURATIONS } from "@/lib/featured-config";
import { BusinessCombobox } from "@/components/business-combobox";

const initialState: PaymentFormState = undefined;

const inputClass = "w-full rounded-lg border border-border-hairline px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

export function AddPaymentForm({ businesses }: { businesses: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createPaymentRequestAction, initialState);

  return (
    <form
      action={formAction}
      className="mt-6 flex flex-col gap-6 rounded-2xl border border-border-hairline bg-white p-5"
    >
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-dark">Deal</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>
            Business name
            <input
              type="text"
              name="business_name"
              required
              placeholder="e.g. The Coffee House"
              className={inputClass}
            />
          </label>

          <BusinessCombobox
            businesses={businesses}
            helpText={`Link it if it's already a real business here — that unlocks one-click "mark paid & go live" below. Leave blank if not yet added.`}
          />

          <label className={labelClass}>
            Tier
            <select name="featured_level" required className={inputClass}>
              <option value="category">Category only</option>
              <option value="global">Homepage and category</option>
            </select>
          </label>

          <label className={labelClass}>
            Duration
            <select name="duration_months" required className={inputClass}>
              {FEATURED_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Amount (£)
            <input
              type="number"
              name="amount_gbp"
              required
              min="0"
              step="0.01"
              placeholder="e.g. 40.00"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Invoice number
            <input
              type="text"
              name="invoice_number"
              placeholder="auto-generated if left blank"
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-dark">
          Billing address <span className="normal-case text-muted-dark/70">(needed to generate a PDF invoice)</span>
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            Address line 1
            <input type="text" name="billing_address_line1" placeholder="Street address" className={inputClass} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Address line 2 <span className="font-normal text-muted-dark">(optional)</span>
            <input type="text" name="billing_address_line2" className={inputClass} />
          </label>
          <label className={labelClass}>
            Town / City
            <input type="text" name="billing_address_city" className={inputClass} />
          </label>
          <label className={labelClass}>
            Postcode
            <input type="text" name="billing_address_postcode" className={inputClass} />
          </label>
        </div>
      </div>

      <label className={labelClass}>
        Notes <span className="font-normal text-muted-dark">(optional)</span>
        <input type="text" name="notes" className={inputClass} />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add invoice"}
      </button>
    </form>
  );
}
