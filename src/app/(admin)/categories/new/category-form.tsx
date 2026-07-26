"use client";

import { useActionState, useState } from "react";
import { createCategoryAction, type CategoryFormState } from "../actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";

const initialState: CategoryFormState = undefined;

export function NewCategoryForm() {
  const [state, formAction, isPending] = useActionState(
    createCategoryAction,
    initialState,
  );
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  return (
    <form
      action={formAction}
      onChange={() => setIsDirty(true)}
      className="mt-6 flex max-w-md flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6"
    >
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Slug
        <input
          type="text"
          name="slug"
          required
          placeholder="e.g. food-and-drink"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">
          Lowercase-kebab-case, matches the icon filename. Can&apos;t be
          changed after creation.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Label
        <input
          type="text"
          name="label"
          required
          placeholder="e.g. Food & Drink"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add category"}
      </button>
    </form>
  );
}
