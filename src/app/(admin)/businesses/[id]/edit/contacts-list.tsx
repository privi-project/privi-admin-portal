"use client";

import { useState, useTransition, useActionState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CONTACT_CATEGORIES, contactCategoryLabel } from "@/lib/contacts/categories";
import {
  addBusinessContactAction,
  deleteBusinessContactAction,
  type ContactFormState,
} from "./contacts-actions";
import type { BusinessContact } from "@/lib/contacts/queries";

const initialState: ContactFormState = undefined;

export function ContactsList({
  businessId,
  businessName,
  contacts,
}: {
  businessId: string;
  businessName: string;
  contacts: BusinessContact[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mt-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-dark">Contacts</h2>
          <p className="mt-0.5 text-xs text-muted-dark">
            The main contact above is always the default. Add someone here only if a specific kind of
            automated email should go to a different person instead (or as well).
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="shrink-0 text-sm text-gold">
          {showForm ? "Cancel" : "Add contact"}
        </button>
      </div>

      {showForm && (
        <AddContactForm businessId={businessId} businessName={businessName} onAdded={() => setShowForm(false)} />
      )}

      {contacts.length === 0 && !showForm && (
        <p className="mt-3 text-sm text-muted-dark">No additional contacts — using the main contact for everything.</p>
      )}

      {contacts.length > 0 && (
        <div className="mt-3 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
          {contacts.map((contact) => (
            <ContactRow key={contact.id} businessId={businessId} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddContactForm({
  businessId,
  businessName,
  onAdded,
}: {
  businessId: string;
  businessName: string;
  onAdded: () => void;
}) {
  const boundAction = addBusinessContactAction.bind(null, businessId, businessName);
  const [state, formAction, isPending] = useActionState(async (prev: ContactFormState, fd: FormData) => {
    const result = await boundAction(prev, fd);
    if (!result?.error) onAdded();
    return result;
  }, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-4">
      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input type="text" name="name" required className="rounded-lg border border-border-hairline px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input type="email" name="email" required className="rounded-lg border border-border-hairline px-3 py-2" />
        </label>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-dark">
          Send this contact automated emails for
        </p>
        <div className="flex flex-wrap gap-3">
          {CONTACT_CATEGORIES.map((cat) => (
            <label key={cat.value} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={`category_${cat.value}`} />
              {cat.label}
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add contact"}
      </button>
    </form>
  );
}

function ContactRow({ businessId, contact }: { businessId: string; contact: BusinessContact }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteBusinessContactAction(businessId, contact.id, contact.name);
      setDeleteOpen(false);
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{contact.name}</p>
        <p className="truncate text-xs text-muted-dark">{contact.email}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {contact.categories.length === 0 ? (
          <span className="text-xs italic text-muted-dark">No category</span>
        ) : (
          contact.categories.map((c) => (
            <span key={c} className="rounded-full bg-border-hairline-2 px-2 py-0.5 text-xs text-charcoal">
              {contactCategoryLabel(c)}
            </span>
          ))
        )}
      </div>
      <button type="button" onClick={() => setDeleteOpen(true)} className="shrink-0 text-xs text-status-danger">
        Remove
      </button>
      <ConfirmDialog
        open={deleteOpen}
        title={`Remove ${contact.name}?`}
        description="They'll stop receiving any automated emails they were tagged for."
        confirmLabel="Remove"
        destructive
        isPending={isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
