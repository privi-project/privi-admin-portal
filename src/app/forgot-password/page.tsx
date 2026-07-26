"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = undefined;

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6 shadow-sm"
      >
        <h1 className="text-center text-lg font-medium">Reset your password</h1>

        {state?.message ? (
          <p className="text-center text-sm text-charcoal">{state.message}</p>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>
        )}

        {!state?.message && (
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg privi-gold-border border bg-teal px-4 py-2 font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        )}

        <Link href="/login" className="text-center text-sm text-gold">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
