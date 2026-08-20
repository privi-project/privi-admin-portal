"use client";

import { useActionState, useMemo, useState } from "react";
import { NOTIFICATION_TYPES, AUDIENCE_TYPES, ACTION_DESTINATIONS } from "@/lib/notification-config";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";
import { MemberCombobox } from "@/components/member-combobox";
import { BusinessCombobox } from "@/components/business-combobox";

type NotificationFormState = { error?: string } | undefined;

type BusinessOption = { id: string; name: string };
type OfferOption = { id: string; business_id: string; title: string; business_name: string };
type MemberOption = { id: string; email: string; first_name: string; last_name: string };
type LocationOption = {
  id: string;
  business_id: string;
  label: string | null;
  formatted_address: string | null;
  location_type: string;
};

type NotificationFormProps = {
  formAction: (
    prevState: NotificationFormState,
    formData: FormData,
  ) => Promise<NotificationFormState>;
  submitLabel: string;
  businesses: BusinessOption[];
  offers: OfferOption[];
  members: MemberOption[];
  locations: LocationOption[];
  initial?: {
    title?: string;
    body?: string;
    notification_type?: string;
    linked_business_id?: string | null;
    linked_offer_id?: string | null;
    audience_type?: string;
    audience_member_id?: string | null;
    audience_radius_miles?: number | null;
    audience_reference_business_id?: string | null;
    scheduled_at?: string | null;
    expires_at?: string | null;
    selectedLocationIds?: string[];
    requires_acknowledgement?: boolean;
    document_url?: string | null;
    action_label?: string | null;
    action_destination?: string | null;
  };
};

// datetime-local inputs need "YYYY-MM-DDTHH:mm", not a full ISO timestamp.
function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 16);
}

// Scheduling only ever cares about the day (see below) — a plain <input
// type="date"> just needs "YYYY-MM-DD".
function toDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function NotificationForm({
  formAction,
  submitLabel,
  businesses,
  offers,
  members,
  locations,
  initial,
}: NotificationFormProps) {
  const [state, action, isPending] = useActionState(formAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  // "general" retired from NOTIFICATION_TYPES (2026-08-20) — "announcement"
  // is its closest replacement as a neutral default for a brand-new form.
  const [notificationType, setNotificationType] = useState(
    initial?.notification_type ?? "announcement",
  );
  const [audienceType, setAudienceType] = useState(initial?.audience_type ?? "area");
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(
    initial?.requires_acknowledgement ?? false,
  );

  const isOfferType = notificationType === "new_offer" || notificationType === "offer_ending_soon";
  const isLocationType = notificationType === "new_location";
  const isAccountAlertType = notificationType === "account_alert";

  // Business the offer picker is currently scoped to — keeps the offer
  // dropdown short (that business's offers only) instead of every offer
  // across the whole platform.
  const [offerBusinessId, setOfferBusinessId] = useState(
    (isOfferType ? initial?.linked_business_id : null) ??
      offers.find((o) => o.id === initial?.linked_offer_id)?.business_id ??
      "",
  );

  const businessOffers = useMemo(
    () => offers.filter((o) => o.business_id === offerBusinessId),
    [offers, offerBusinessId],
  );

  // Same idea as offerBusinessId above — scopes the location checkbox
  // list to one business at a time (2026-08-13, "New location" type).
  const [locationBusinessId, setLocationBusinessId] = useState(
    (isLocationType ? initial?.linked_business_id : null) ??
      locations.find((l) => initial?.selectedLocationIds?.includes(l.id))?.business_id ??
      "",
  );

  const businessLocations = useMemo(
    () => locations.filter((l) => l.business_id === locationBusinessId),
    [locations, locationBusinessId],
  );

  // A notification linked to a business or offer already has a natural
  // centre point — no need to make the admin pick it again for area
  // targeting. Only "General" notifications (no linked entity) need the
  // standalone reference-business picker. "New location" also counts as
  // linked (to locationBusinessId) even though its actual area-targeting
  // math uses the SPECIFIC selected locations, not every location the
  // business has — see linkedLocationIds in audience.ts.
  const linkedBusinessId =
    notificationType === "new_business"
      ? initial?.linked_business_id
      : isOfferType
        ? offerBusinessId
        : isLocationType
          ? locationBusinessId
          : null;
  const showsReferencePicker = audienceType === "area" && !linkedBusinessId;

  return (
    <form
      action={action}
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
          className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          type="text"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="e.g. Hollywood Bowl has joined Privi"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Body
        <textarea
          name="body"
          rows={3}
          required
          defaultValue={initial?.body}
          placeholder="e.g. Discover Member Benefits"
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          name="notification_type"
          defaultValue={initial?.notification_type ?? "announcement"}
          onChange={(e) => {
            setNotificationType(e.target.value);
            setIsDirty(true);
          }}
          className="rounded-lg border border-border-hairline px-3 py-2"
        >
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {notificationType === "new_business" && (
        <div className="flex flex-col gap-1 text-sm">
          <BusinessCombobox
            businesses={businesses}
            name="linked_business_id"
            defaultValue={initial?.linked_business_id ?? undefined}
            label="Business"
            required
            helpText="Start typing a business name…"
          />
        </div>
      )}

      {isOfferType && (
        <>
          <div className="flex flex-col gap-1 text-sm">
            <BusinessCombobox
              businesses={businesses}
              name="linked_business_id"
              defaultValue={initial?.linked_business_id ?? undefined}
              label="Business"
              required
              helpText="Start typing a business name…"
              onSelect={(id) => {
                setOfferBusinessId(id);
                setIsDirty(true);
              }}
            />
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Offer
            <select
              name="linked_offer_id"
              required
              defaultValue={initial?.linked_offer_id ?? ""}
              disabled={!offerBusinessId}
              className="rounded-lg border border-border-hairline px-3 py-2 disabled:opacity-60"
            >
              <option value="" disabled>
                {offerBusinessId ? "Select an offer" : "Select a business first"}
              </option>
              {businessOffers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
            {offerBusinessId && businessOffers.length === 0 && (
              <span className="text-xs text-muted-dark">
                This business has no offers yet.
              </span>
            )}
          </label>
        </>
      )}

      {isLocationType && (
        <>
          <div className="flex flex-col gap-1 text-sm">
            <BusinessCombobox
              businesses={businesses}
              name="linked_business_id"
              defaultValue={initial?.linked_business_id ?? undefined}
              label="Business"
              required
              helpText="Start typing a business name…"
              onSelect={(id) => {
                setLocationBusinessId(id);
                setIsDirty(true);
              }}
            />
          </div>

          <fieldset className="flex flex-col gap-1 text-sm">
            <legend>Which location(s) — audience targeting matches only these, not the business's other locations</legend>
            <div className="grid grid-cols-1 gap-1 rounded-lg border border-border-hairline p-3">
              {!locationBusinessId && (
                <p className="text-xs text-muted-dark">Select a business first.</p>
              )}
              {locationBusinessId && businessLocations.length === 0 && (
                <p className="text-xs text-muted-dark">This business has no locations yet.</p>
              )}
              {businessLocations.map((loc) => (
                <label key={loc.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="locationIds"
                    value={loc.id}
                    defaultChecked={initial?.selectedLocationIds?.includes(loc.id)}
                  />
                  {loc.label ?? loc.formatted_address ?? loc.location_type}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {isAccountAlertType && (
        <fieldset className="flex flex-col gap-3 rounded-lg border border-border-hairline p-3">
          <legend className="text-sm">Action button (optional)</legend>

          <label className="flex flex-col gap-1 text-sm">
            Document link (optional)
            <input
              type="url"
              name="document_url"
              defaultValue={initial?.document_url ?? ""}
              placeholder="https://privi.info/legal/terms-and-conditions"
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
            <span className="text-xs text-muted-dark">
              Opens in the member&apos;s browser from inside the app — the
              website page stays the one place this content actually lives.
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requires_acknowledgement"
              checked={requiresAcknowledgement}
              onChange={(e) => {
                setRequiresAcknowledgement(e.target.checked);
                setIsDirty(true);
              }}
            />
            Requires acknowledgement
          </label>

          {requiresAcknowledgement ? (
            <label className="flex flex-col gap-1 text-sm">
              Button label
              <input
                type="text"
                name="action_label"
                defaultValue={initial?.action_label ?? ""}
                placeholder="I Accept"
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
              <span className="text-xs text-muted-dark">
                Tapping this records the member&apos;s acceptance (who, when)
                — that&apos;s a real, timestamped record, not just closing
                the alert. Leave blank to use &quot;I Accept&quot;.
              </span>
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Button label
                <input
                  type="text"
                  name="action_label"
                  defaultValue={initial?.action_label ?? ""}
                  placeholder="e.g. Update Payment Method"
                  className="rounded-lg border border-border-hairline px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Takes the member to
                <select
                  name="action_destination"
                  defaultValue={initial?.action_destination ?? ""}
                  className="rounded-lg border border-border-hairline px-3 py-2"
                >
                  <option value="">No button — informational only</option>
                  {ACTION_DESTINATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">Audience</legend>
        <div className="flex flex-col gap-1 rounded-lg border border-border-hairline p-3">
          {AUDIENCE_TYPES.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="audience_type"
                value={opt.value}
                checked={audienceType === opt.value}
                onChange={() => {
                  setAudienceType(opt.value);
                  setIsDirty(true);
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>

        {audienceType === "area" && (
          <div className="flex flex-col gap-3 rounded-lg border border-border-hairline p-3">
            {showsReferencePicker ? (
              <div className="flex flex-col gap-1 text-sm">
                <BusinessCombobox
                  businesses={businesses}
                  name="audience_reference_business_id"
                  defaultValue={initial?.audience_reference_business_id ?? undefined}
                  label="Reference business (centre of the radius)"
                  required
                  helpText="Start typing a business name…"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-dark">
                Centred on{" "}
                {businesses.find((b) => b.id === linkedBusinessId)?.name ?? "the linked business"}
                {isOfferType
                  ? " — for offers only available at specific locations, this automatically matches just those locations, not the whole business."
                  : isLocationType
                    ? " — matches only the location(s) selected above, not every branch this business has."
                    : "."}
              </p>
            )}
            <label className="flex flex-col gap-1 text-sm">
              Radius (miles)
              <input
                type="number"
                name="audience_radius_miles"
                min={1}
                defaultValue={initial?.audience_radius_miles ?? 20}
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
            </label>
          </div>
        )}

        {audienceType === "individual" && (
          <div className="rounded-lg border border-border-hairline p-3">
            <MemberCombobox members={members} defaultValue={initial?.audience_member_id ?? undefined} />
          </div>
        )}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Schedule for (optional)
        <input
          type="date"
          name="scheduled_at"
          defaultValue={toDateOnly(initial?.scheduled_at)}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">
          Sends at 7:00am on this day — informational only, you still need to
          click Send when the time comes.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Expires at (optional)
        <input
          type="datetime-local"
          name="expires_at"
          defaultValue={toDatetimeLocal(initial?.expires_at)}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
        <span className="text-xs text-muted-dark">
          For time-sensitive deals. Once the App exists, members without a
          saved area who haven&apos;t opened the app by this time will be
          skipped rather than shown a stale offer. Leave blank for anything
          without a natural expiry, like a new-business announcement.
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="privi-gold-border self-start rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
