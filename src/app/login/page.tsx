"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signInAction, type LoginState } from "./actions";

const initialState: LoginState = undefined;

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialState,
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <Image src="/brand/privi-logo.png" alt="Privi" width={48} height={48} />
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6 shadow-sm"
      >
        <h1 className="text-center text-lg font-medium">Admin sign in</h1>

        {state?.error && (
          <p className="text-sm text-status-danger" role="alert">
            {state.error}
          </p>
        )}

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

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg privi-gold-border border bg-teal px-4 py-2 font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>

        <Link
          href="/forgot-password"
          className="text-center text-sm text-gold"
        >
          Forgot password?
        </Link>
      </form>
    </div>
  );
}
