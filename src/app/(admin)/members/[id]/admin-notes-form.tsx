"use client";

import { useActionState, useState } from "react";
import { updateAdminNotesAction, type MemberActionState } from "./actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";

const initialState: MemberActionState = undefined;

export function AdminNotesForm({
  memberId,
  label,
  notes,
}: {
  memberId: string;
  label: string;
  notes: string | null;
}) {
  const action = updateAdminNotesAction.bind(null, memberId, label);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty && !state?.saved);

  return (
    <form
      action={formAction}
      onChange={() => setIsDirty(true)}
      className="flex flex-col gap-2"
    >
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.saved && <p className="text-sm text-status-success">Saved.</p>}

      <textarea
        name="admin_notes"
        rows={4}
        defaultValue={notes ?? ""}
        placeholder="Internal notes — not shown to the member"
        className="rounded-lg border border-border-hairline px-3 py-2 text-sm"
      />

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
