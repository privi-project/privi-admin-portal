"use client";

import { useActionState, useState } from "react";
import { updateCategoryAction, type CategoryFormState } from "../../actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";
import type { Category } from "@/lib/categories/queries";

const initialState: CategoryFormState = undefined;

export function EditCategoryForm({ category }: { category: Category }) {
  const updateWithId = updateCategoryAction.bind(null, category.id);
  const [state, formAction, isPending] = useActionState(
    updateWithId,
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
          value={category.slug}
          disabled
          className="rounded-lg border border-border-hairline bg-border-hairline-2 px-3 py-2 text-muted-dark"
        />
        <span className="text-xs text-muted-dark">
          Slug can&apos;t be changed after creation — it's tied to the icon
          filename.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Label
        <input
          type="text"
          name="label"
          required
          defaultValue={category.label}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
