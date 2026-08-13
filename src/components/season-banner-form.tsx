"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";

type SeasonBannerFormState = { error?: string } | undefined;

type SeasonBannerFormProps = {
  formAction: (
    prevState: SeasonBannerFormState,
    formData: FormData,
  ) => Promise<SeasonBannerFormState>;
  submitLabel: string;
  categoryMultiselect: ReactNode;
  initial?: {
    title?: string;
    message?: string;
    action_type?: string;
    action_url?: string | null;
  };
};

const ACTION_TYPES = [
  { value: "none", label: "None — just an information card" },
  { value: "categories", label: "Go to categories" },
  { value: "external_link", label: "Open a link in the in-app browser" },
];

export function SeasonBannerForm({
  formAction,
  submitLabel,
  categoryMultiselect,
  initial,
}: SeasonBannerFormProps) {
  const [state, action, isPending] = useActionState(formAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  const [actionType, setActionType] = useState(initial?.action_type ?? "none");

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
        Title
        <input
          type="text"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="e.g. Summer offers are live"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Message
        <textarea
          name="message"
          rows={3}
          required
          defaultValue={initial?.message}
          placeholder="e.g. Save across dining, fitness and days out this season with your Privi membership."
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">When tapped</legend>
        <div className="flex flex-col gap-1 rounded-lg border border-border-hairline p-3">
          {ACTION_TYPES.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="action_type"
                value={opt.value}
                checked={actionType === opt.value}
                onChange={() => {
                  setActionType(opt.value);
                  setIsDirty(true);
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {actionType === "categories" && (
          <div className="rounded-lg border border-border-hairline p-3">{categoryMultiselect}</div>
        )}

        {actionType === "external_link" && (
          <label className="flex flex-col gap-1 rounded-lg border border-border-hairline p-3 text-sm">
            URL
            <input
              type="url"
              name="action_url"
              required
              defaultValue={initial?.action_url ?? ""}
              placeholder="e.g. https://privi.info/legal/privacy-policy"
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
            <span className="text-xs text-muted-dark">
              Opens in the App&apos;s in-app browser — works for legal pages
              or any other page you want to point at.
            </span>
          </label>
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
