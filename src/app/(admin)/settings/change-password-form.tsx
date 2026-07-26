"use client";

import { useActionState } from "react";
import { updateOwnPasswordAction, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = undefined;

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(updateOwnPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.saved && <p className="text-sm text-status-success">Password updated.</p>}

      <label className="flex flex-col gap-1 text-sm">
        New password
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Confirm new password
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
