"use client";

import { useActionState, useState } from "react";
import { OFFER_TYPES, REDEMPTION_METHODS } from "@/lib/offer-config";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";

type OfferFormState = { error?: string } | undefined;

type LocationOption = {
  id: string;
  label: string | null;
  formatted_address: string | null;
  location_type: string;
};

type OfferFormProps = {
  formAction: (
    prevState: OfferFormState,
    formData: FormData,
  ) => Promise<OfferFormState>;
  submitLabel: string;
  locations: LocationOption[];
  initial?: {
    title?: string;
    description?: string | null;
    value_summary?: string | null;
    offer_type?: string;
    terms?: string | null;
    availability?: string | null;
    redemption_method?: string;
    redemption_value?: string | null;
    location_scope?: string;
    start_date?: string | null;
    expiry_date?: string | null;
    selectedLocationIds?: string[];
  };
};

const LOCATION_SCOPE_OPTIONS = [
  { value: "all", label: "All locations" },
  { value: "selected", label: "Selected locations" },
  { value: "online", label: "Online-only locations" },
  { value: "national", label: "National locations" },
  { value: "regional", label: "Regional locations" },
];

export function OfferForm({
  formAction,
  submitLabel,
  locations,
  initial,
}: OfferFormProps) {
  const [state, action, isPending] = useActionState(formAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  const [locationScope, setLocationScope] = useState(initial?.location_scope ?? "all");

  return (
    <form
      action={action}
      onChange={() => setIsDirty(true)}
      className="mt-6 flex max-w-xl flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6"
    >
      <div className="flex items-center justify-between">
        {state?.error ? (
          <p className="text-sm text-status-danger" role="alert">
            {state.error}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isPending}
          className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Offer title
        <input
          type="text"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="e.g. 20% Off Daytime Bowling"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Offer type
        <select
          name="offer_type"
          required
          defaultValue={initial?.offer_type ?? ""}
          className="rounded-lg border border-border-hairline px-3 py-2"
        >
          <option value="" disabled>
            Select a type
          </option>
          {OFFER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Value (shown on the offer card)
        <input
          type="text"
          name="value_summary"
          defaultValue={initial?.value_summary ?? ""}
          placeholder="e.g. 20% off, Free dessert, 2-for-1"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Terms &amp; conditions (incl. exclusions and restrictions)
        <textarea
          name="terms"
          rows={3}
          defaultValue={initial?.terms ?? ""}
          placeholder="e.g. Weekdays only, dine-in only, not combinable with other offers"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Availability
        <input
          type="text"
          name="availability"
          defaultValue={initial?.availability ?? ""}
          placeholder="e.g. Mon–Fri, 10am–4pm"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Start date (optional)
          <input
            type="date"
            name="start_date"
            defaultValue={initial?.start_date ?? ""}
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Expiry date (optional)
          <input
            type="date"
            name="expiry_date"
            defaultValue={initial?.expiry_date ?? ""}
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Redemption method
        <select
          name="redemption_method"
          required
          defaultValue={initial?.redemption_method ?? ""}
          className="rounded-lg border border-border-hairline px-3 py-2"
        >
          <option value="" disabled>
            Select a method
          </option>
          {REDEMPTION_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Redemption code / barcode value
        <input
          type="text"
          name="redemption_value"
          defaultValue={initial?.redemption_value ?? ""}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">Applies to</legend>
        <div className="flex flex-col gap-1 rounded-lg border border-border-hairline p-3">
          {LOCATION_SCOPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="location_scope"
                value={opt.value}
                checked={locationScope === opt.value}
                onChange={() => {
                  setLocationScope(opt.value);
                  setIsDirty(true);
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {locationScope === "selected" && (
          <div className="grid grid-cols-1 gap-1 rounded-lg border border-border-hairline p-3">
            {locations.length === 0 && (
              <p className="text-xs text-muted-dark">
                This business has no locations yet.
              </p>
            )}
            {locations.map((loc) => (
              <label key={loc.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="locationIds"
                  value={loc.id}
                  defaultChecked={initial?.selectedLocationIds?.includes(loc.id)}
                />
                {loc.label ?? loc.formatted_address ?? loc.location_type}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="privi-gold-border self-start rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
