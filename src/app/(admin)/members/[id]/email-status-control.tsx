"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendVerificationEmailAction,
  markEmailVerifiedAction,
  updateEmailAction,
  type MemberActionState,
} from "./actions";

const initialState: MemberActionState = undefined;

export function EmailStatusControl({
  memberId,
  label,
  email,
  emailConfirmed,
}: {
  memberId: string;
  label: string;
  email: string;
  emailConfirmed: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingEmail, setEditingEmail] = useState(false);
  const [sentMessage, setSentMessage] = useState(false);

  const updateWithId = updateEmailAction.bind(null, memberId);
  const [state, formAction, isSaving] = useActionState(updateWithId, initialState);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p>
        {email} — {emailConfirmed ? "🟢 Verified" : "🟡 Pending verification"}
      </p>

      {sentMessage && (
        <p className="text-sm text-status-success">
          Verification email sent to {email}.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!emailConfirmed && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await sendVerificationEmailAction(memberId, email);
                  setSentMessage(true);
                  router.refresh();
                })
              }
              className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Send verification email
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await markEmailVerifiedAction(memberId, label);
                  router.refresh();
                })
              }
              className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Mark as verified
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setEditingEmail((v) => !v)}
          className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
        >
          {editingEmail ? "Cancel" : "Update email address"}
        </button>
      </div>

      {editingEmail && (
        <form action={formAction} className="flex flex-col gap-2">
          {state?.error && (
            <p className="text-sm text-status-danger" role="alert">
              {state.error}
            </p>
          )}
          <input
            type="email"
            name="email"
            required
            defaultValue={email}
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save new email"}
          </button>
        </form>
      )}
    </div>
  );
}
