"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { updateBusinessAction, type BusinessFormState } from "../../actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";
import type { Business } from "@/lib/businesses/queries";

const initialState: BusinessFormState = undefined;

export function EditBusinessForm({
  business,
  categoryMultiselect,
}: {
  business: Business;
  categoryMultiselect: ReactNode;
}) {
  const updateWithId = updateBusinessAction.bind(null, business.id);
  const [state, formAction, isPending] = useActionState(updateWithId, initialState);
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
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Business name
        <input
          type="text"
          name="name"
          required
          defaultValue={business.name}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Logo
        {business.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt=""
            className="h-16 w-16 rounded-lg object-cover"
          />
        )}
        <input
          type="file"
          name="logo_file"
          accept="image/png,image/jpeg,image/webp"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">
          PNG, JPEG or WEBP, up to 5MB. Leave blank to keep the current logo.
        </span>
      </label>
      <input type="hidden" name="current_logo_url" value={business.logo_url ?? ""} />

      {categoryMultiselect}

      <label className="flex flex-col gap-1 text-sm">
        Short description
        <textarea
          name="short_description"
          rows={3}
          defaultValue={business.short_description ?? ""}
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
          defaultValue={business.about_description ?? ""}
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
          defaultValue={business.search_keywords ?? ""}
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
          location has its own public phone number, managed in the
          Locations section below.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Contact name
        <input
          type="text"
          name="contact_name"
          required
          defaultValue={business.contact_name}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact email
        <input
          type="email"
          name="contact_email"
          required
          defaultValue={business.contact_email}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact phone
        <input
          type="tel"
          name="contact_phone"
          defaultValue={business.contact_phone ?? ""}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_accessible" defaultChecked={business.is_accessible} />
        Accessible venue
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">Featured</legend>
        <div className="flex flex-col gap-1 rounded-lg border border-border-hairline p-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="featured_level"
              value="none"
              defaultChecked={business.featured_level === "none"}
            />
            Not featured
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="featured_level"
              value="category"
              defaultChecked={business.featured_level === "category"}
            />
            Featured in its categories
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="featured_level"
              value="global"
              defaultChecked={business.featured_level === "global"}
            />
            Featured everywhere
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Internal notes (not shown to members)
        <textarea
          name="internal_notes"
          rows={2}
          defaultValue={business.internal_notes ?? ""}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
