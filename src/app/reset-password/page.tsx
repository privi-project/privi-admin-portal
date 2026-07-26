"use client";

import { useActionState } from "react";
import { updatePasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = undefined;

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6 shadow-sm"
      >
        <h1 className="text-center text-lg font-medium">Set a new password</h1>

        {state?.error && (
          <p className="text-sm text-status-danger" role="alert">
            {state.error}
          </p>
        )}

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
          className="rounded-lg privi-gold-border border bg-teal px-4 py-2 font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
