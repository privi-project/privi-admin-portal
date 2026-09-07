"use client";

import { useActionState } from "react";
import { BusinessCombobox, type BusinessComboboxOption } from "@/components/business-combobox";
import { createLiveAreaAction, type LiveAreaActionState } from "./actions";

const initialState: LiveAreaActionState = undefined;

export function LiveAreaForm({ businesses }: { businesses: BusinessComboboxOption[] }) {
  const [state, formAction, isPending] = useActionState(createLiveAreaAction, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-5">
      <h2 className="text-sm font-medium">Mark a new area live</h2>
      <p className="text-xs text-muted-dark">
        Pick a business that's roughly central to the area you want to open — its address becomes the
        centre point, and everything within the radius below counts as covered.
      </p>

      <div className="flex flex-col gap-1 text-sm">
        Area name (your own label, e.g. &quot;Clapham&quot;)
        <input
          type="text"
          name="label"
          required
          placeholder="e.g. Clapham, South London"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </div>

      <BusinessCombobox
        businesses={businesses}
        name="business_id"
        label="Anchor business"
        helpText="This business's address becomes the centre point for the radius below."
        required
      />

      <div className="flex flex-col gap-1 text-sm">
        Radius (miles)
        <input
          type="number"
          name="radius_miles"
          defaultValue={10}
          min={1}
          required
          className="w-32 rounded-lg border border-border-hairline px-3 py-2"
        />
      </div>

      {state?.error && <p className="text-sm text-status-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Mark area live"}
      </button>
    </form>
  );
}
