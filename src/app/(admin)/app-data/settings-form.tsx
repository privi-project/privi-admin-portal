"use client";

import { useActionState, useState } from "react";
import { updateSystemSettingsAction, type SettingsFormState } from "./actions";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";
import type { SystemSettings } from "@/lib/system-settings/queries";

const initialState: SettingsFormState = undefined;

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string | number | null;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="rounded-lg border border-border-hairline px-3 py-2"
      />
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SystemSettings }) {
  const [state, formAction, isPending] = useActionState(
    updateSystemSettingsAction,
    initialState,
  );
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty && !state?.saved);

  return (
    <form
      action={formAction}
      onChange={() => setIsDirty(true)}
      className="mt-6 flex max-w-xl flex-col gap-6"
    >
      <div className="flex items-center justify-between">
        <div>
          {state?.error && (
            <p className="text-sm text-status-danger" role="alert">
              {state.error}
            </p>
          )}
          {state?.saved && (
            <p className="text-sm text-status-success">Settings saved.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save settings"}
        </button>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6">
        <h2 className="text-sm font-medium text-muted-dark">Offers</h2>
        <Field
          name="default_expiry_warning_days"
          label="Offer expiry-warning period (days)"
          defaultValue={settings.default_expiry_warning_days}
          type="number"
        />
        <p className="-mt-2 text-xs text-muted-dark">
          How many days before an offer&apos;s expiry date it gets flagged on
          the Dashboard. Applies only to offers that have an expiry date set
          — not related to notifications.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6">
        <h2 className="text-sm font-medium text-muted-dark">App links</h2>
        <Field name="help_faq_url" label="Help & FAQ URL" defaultValue={settings.help_faq_url} />
        <Field name="privacy_policy_url" label="Privacy Policy URL" defaultValue={settings.privacy_policy_url} />
        <Field name="terms_url" label="Terms & Conditions URL" defaultValue={settings.terms_url} />
        <Field name="subscription_terms_url" label="Subscription Terms URL" defaultValue={settings.subscription_terms_url} />
        <Field name="member_rules_url" label="Member Rules URL" defaultValue={settings.member_rules_url} />
        <Field name="app_store_url" label="App Store URL" defaultValue={settings.app_store_url} />
        <Field name="google_play_url" label="Google Play URL" defaultValue={settings.google_play_url} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border-hairline bg-white p-6">
        <h2 className="text-sm font-medium text-muted-dark">
          Support details (legal/privacy contact points only — not a live
          support channel)
        </h2>
        <Field name="support_email" label="Support email" defaultValue={settings.support_email} type="email" />
        <Field name="business_contact_email" label="Business contact email" defaultValue={settings.business_contact_email} type="email" />
        <Field name="privacy_contact_email" label="Privacy contact email" defaultValue={settings.privacy_contact_email} type="email" />
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
