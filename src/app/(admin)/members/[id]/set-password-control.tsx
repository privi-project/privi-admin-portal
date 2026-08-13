"use client";

import { useActionState, useState } from "react";
import { setMemberPasswordAction, type MemberActionState } from "./actions";
import { PasswordInput } from "@/components/password-input";

const initialState: MemberActionState = undefined;

export function SetPasswordControl({ memberId }: { memberId: string }) {
  const [open, setOpen] = useState(false);
  const setPasswordWithId = setMemberPasswordAction.bind(null, memberId);
  const [state, formAction, isPending] = useActionState(setPasswordWithId, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-gold"
      >
        Set password directly
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-hairline p-3">
      <p className="text-xs text-muted-dark">
        Bypasses email entirely — for support/testing when a member can&apos;t
        complete the normal invite/reset flow. Use sparingly.
      </p>
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p className="text-sm text-status-success">Password set. They can log in with it now.</p>
      )}
      <form action={formAction} className="flex flex-col gap-2">
        <PasswordInput
          name="password"
          required
          minLength={8}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          className="rounded-lg border border-border-hairline px-3 py-2 text-sm"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Set password"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
