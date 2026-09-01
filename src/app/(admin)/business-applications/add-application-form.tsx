"use client";

import { useActionState, useState } from "react";
import { createManualApplicationAction, type ManualApplicationFormState } from "./actions";
import type { ApplicationStatusRow } from "@/lib/business-applications/queries";

const initialState: ManualApplicationFormState = undefined;

const inputClass = "w-full rounded-lg border border-border-hairline px-3 py-2 text-sm";
const labelClass = "flex flex-col gap-1 text-sm";

export function AddApplicationForm({
  categories,
  statuses,
  onAdded,
}: {
  categories: { id: string; label: string }[];
  statuses: ApplicationStatusRow[];
  onAdded: () => void;
}) {
  const [state, formAction, isPending] = useActionState(async (prev: ManualApplicationFormState, fd: FormData) => {
    const result = await createManualApplicationAction(prev, fd);
    if (!result?.error) onAdded();
    return result;
  }, initialState);
  const activeStatuses = statuses.filter((s) => s.is_active);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-5">
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Business name
          <input type="text" name="business_name" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Category
          <select name="category_id" className={inputClass}>
            <option value="">No category yet</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Location type
          <select name="location_type" defaultValue="single" className={inputClass}>
            <option value="single">Single location</option>
            <option value="multi">Multi-location</option>
          </select>
        </label>
        <label className={labelClass}>
          Starting column
          <select name="status" defaultValue={activeStatuses[0]?.slug ?? ""} className={inputClass}>
            {activeStatuses.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Contact name
          <input type="text" name="contact_name" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Contact email
          <input type="email" name="contact_email" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Contact phone <span className="font-normal text-muted-dark">(optional)</span>
          <input type="tel" name="contact_phone" className={inputClass} />
        </label>
      </div>
      <label className={labelClass}>
        Note <span className="font-normal text-muted-dark">(optional — same as the notes field on any card)</span>
        <textarea name="message" rows={2} className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
