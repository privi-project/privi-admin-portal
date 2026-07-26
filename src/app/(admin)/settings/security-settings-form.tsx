"use client";

import { useActionState, useState } from "react";
import { updateSecuritySettingsAction, type SettingsFormState } from "./actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";

const initialState: SettingsFormState = undefined;

export function SecuritySettingsForm({
  sessionTimeoutMinutes,
  maxFailedLoginAttempts,
  lockoutMinutes,
}: {
  sessionTimeoutMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutMinutes: number;
}) {
  const [state, formAction, isPending] = useActionState(updateSecuritySettingsAction, initialState);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty && !state?.saved);

  return (
    <form action={formAction} onChange={() => setIsDirty(true)} className="flex flex-col gap-3">
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}
      {state?.saved && <p className="text-sm text-status-success">Security settings saved.</p>}

      <label className="flex flex-col gap-1 text-sm">
        Session timeout (minutes of inactivity before automatic sign-out)
        <input
          type="number"
          name="session_timeout_minutes"
          min={1}
          defaultValue={sessionTimeoutMinutes}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>
      <p className="-mt-2 text-xs text-muted-dark">
        Takes effect on your next fresh sign-in, not instantly mid-session.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Failed-login attempts before lockout
        <input
          type="number"
          name="max_failed_login_attempts"
          min={1}
          defaultValue={maxFailedLoginAttempts}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Lockout duration (minutes)
        <input
          type="number"
          name="lockout_minutes"
          min={1}
          defaultValue={lockoutMinutes}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save security settings"}
      </button>
    </form>
  );
}
