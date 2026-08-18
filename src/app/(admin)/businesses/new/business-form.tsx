"use client";

import { useActionState, useState } from "react";
import { createBusinessAction, type BusinessFormState } from "../actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";
import type { ReactNode } from "react";

const initialState: BusinessFormState = undefined;

export function NewBusinessForm({
  categoryMultiselect,
}: {
  categoryMultiselect: ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(
    createBusinessAction,
    initialState,
  );
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  return (
    <form
      action={formAction}
      onChange={() => setIsDirty(true)}
      className="mt-6 flex max-w-xl flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6"
    >
      <div className="flex items-center justify-between">
        {state?.error ? (
          <p className="text-sm text-status-danger" role="alert">
            {state.error}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Add business"}
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Business name
        <input
          type="text"
          name="name"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Logo
        <input
          type="file"
          name="logo_file"
          accept="image/png,image/jpeg,image/webp"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">PNG, JPEG or WEBP, up to 5MB.</span>
      </label>

      {categoryMultiselect}

      <label className="flex flex-col gap-1 text-sm">
        Short description
        <textarea
          name="short_description"
          rows={3}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">
          One line shown right under the business name on the Business Page,
          e.g. &quot;Italian coffee house&quot;.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        About
        <textarea
          name="about_description"
          rows={4}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">
          The longer paragraph shown under the Business Page&apos;s ABOUT
          heading.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Search keywords
        <input
          type="text"
          name="search_keywords"
          placeholder="e.g. golf, driving range, mini golf, family fun"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">
          Comma-separated words members might search for that aren&apos;t in
          the business name — helps them find this business even if they
          search &quot;golf&quot; and the name is &quot;Fairway Park&quot;.
        </span>
      </label>

      <div className="border-t border-border-hairline pt-4">
        <p className="text-sm font-medium">Your contact at this business</p>
        <p className="text-xs text-muted-dark">
          For your own reference only — never shown to members. Each
          location gets its own public phone number, added separately once
          the business is saved.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Contact name
        <input
          type="text"
          name="contact_name"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact email
        <input
          type="email"
          name="contact_email"
          required
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact phone
        <input
          type="tel"
          name="contact_phone"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <p className="text-xs text-muted-dark">
        Featured placement can be set up once this business is saved — it's
        a paid product with its own term, managed from the edit page.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Internal notes (not shown to members)
        <textarea
          name="internal_notes"
          rows={2}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add business"}
      </button>
      <p className="text-xs text-muted-dark">
        You&apos;ll add locations (address, map pin, public phone number) on
        the next screen.
      </p>
    </form>
  );
}
