"use client";

import { useActionState, useTransition } from "react";
import { grantComplimentaryAction, revokeComplimentaryAction, type MemberActionState } from "./actions";

const initialState: MemberActionState = undefined;

export function ComplimentaryControl({
  memberId,
  label,
  isComplimentary,
  reason,
  expiresAt,
}: {
  memberId: string;
  label: string;
  isComplimentary: boolean;
  reason: string | null;
  expiresAt: string | null;
}) {
  const grantWithId = grantComplimentaryAction.bind(null, memberId, label);
  const [state, formAction, isPending] = useActionState(grantWithId, initialState);
  const [isRevoking, startRevoke] = useTransition();

  if (isComplimentary) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p>
          <span className="font-medium">Reason:</span> {reason}
        </p>
        {expiresAt && (
          <p>
            <span className="font-medium">Expires:</span> {expiresAt}
          </p>
        )}
        <button
          type="button"
          disabled={isRevoking}
          onClick={() => startRevoke(() => revokeComplimentaryAction(memberId, label))}
          className="self-start rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isRevoking ? "Working…" : "Revoke complimentary membership"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Reason (required)
        <input
          type="text"
          name="complimentary_reason"
          required
          placeholder="e.g. Founder's family, internal testing"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Expires (optional — leave blank for permanent)
        <input
          type="date"
          name="complimentary_expires_at"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Grant complimentary membership"}
      </button>
    </form>
  );
}
