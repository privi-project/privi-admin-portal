"use client";

import { useActionState } from "react";
import { createStatusAction, type StatusFormState } from "./actions";

const initialState: StatusFormState = undefined;

export function AddStatusForm() {
  const [state, formAction, isPending] = useActionState(createStatusAction, initialState);

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
        Slug
        <input
          type="text"
          name="slug"
          required
          placeholder="e.g. awaiting-contract"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Label
        <input
          type="text"
          name="label"
          required
          placeholder="e.g. Awaiting contract"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add column"}
      </button>
    </form>
  );
}
