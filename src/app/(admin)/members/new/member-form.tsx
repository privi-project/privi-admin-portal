"use client";

import { useActionState, useState } from "react";
import { createMemberAction, type CreateMemberState } from "./actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";

const initialState: CreateMemberState = undefined;

export function NewMemberForm() {
  const [state, formAction, isPending] = useActionState(createMemberAction, initialState);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);
  const [isComplimentary, setIsComplimentary] = useState(false);

  return (
    <form
      action={formAction}
      onChange={() => setIsDirty(true)}
      className="mt-6 flex max-w-md flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6"
    >
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}

      <p className="text-xs text-muted-dark">
        Sends a real invite so they set their own password — you never see
        or choose it. Use this for family, friends, internal testing, or
        anyone who shouldn&apos;t go through the paid website sign-up.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        First name
        <input
          type="text"
          name="first_name"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Last name
        <input
          type="text"
          name="last_name"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          name="email"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_complimentary"
          checked={isComplimentary}
          onChange={(e) => setIsComplimentary(e.target.checked)}
        />
        Grant complimentary membership immediately
      </label>

      {isComplimentary && (
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
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Add member"}
      </button>
    </form>
  );
}
