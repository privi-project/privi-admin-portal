"use client";

import { useActionState } from "react";
import {
  sendWaitlistLiveEmailAction,
  sendWaitlistReminderAction,
  type WaitlistActionState,
} from "./actions";

const initialState: WaitlistActionState = undefined;

function ResultLine({ state }: { state: WaitlistActionState }) {
  if (!state) return null;
  if (state.error) return <p className="text-sm text-status-danger">{state.error}</p>;
  if (state.sentCount !== undefined) {
    return (
      <p className="text-sm text-status-success">
        Sent to {state.sentCount} {state.sentCount === 1 ? "person" : "people"}.
      </p>
    );
  }
  return null;
}

export function WaitlistActions({
  pendingLiveEmail,
  pendingReminder,
}: {
  pendingLiveEmail: number;
  pendingReminder: number;
}) {
  const [liveState, liveAction, liveIsPending] = useActionState(sendWaitlistLiveEmailAction, initialState);
  const [reminderState, reminderAction, reminderIsPending] = useActionState(
    sendWaitlistReminderAction,
    initialState,
  );

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border-hairline bg-white p-5">
        <h2 className="text-sm font-medium">We&apos;re live — sign up now</h2>
        <p className="text-xs text-muted-dark">
          Sends to everyone on the waitlist who hasn&apos;t been notified yet ({pendingLiveEmail} right now).
          Only do this once you&apos;re genuinely ready — there&apos;s no undo for an email already sent.
        </p>
        <form action={liveAction} className="mt-1">
          <button
            type="submit"
            disabled={liveIsPending || pendingLiveEmail === 0}
            className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {liveIsPending ? "Sending…" : `Notify ${pendingLiveEmail} waiting`}
          </button>
        </form>
        <ResultLine state={liveState} />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border-hairline bg-white p-5">
        <h2 className="text-sm font-medium">Send the reminder</h2>
        <p className="text-xs text-muted-dark">
          One follow-up, only to people who were sent the live email above and still haven&apos;t signed up
          ({pendingReminder} right now). Best used a few days after the button above, not immediately.
        </p>
        <form action={reminderAction} className="mt-1">
          <button
            type="submit"
            disabled={reminderIsPending || pendingReminder === 0}
            className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {reminderIsPending ? "Sending…" : `Remind ${pendingReminder} people`}
          </button>
        </form>
        <ResultLine state={reminderState} />
      </div>
    </div>
  );
}
