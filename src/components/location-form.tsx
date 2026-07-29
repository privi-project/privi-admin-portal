"use client";

import { useActionState, useState, useTransition } from "react";
import { LOCATION_TYPES, LOCATION_TYPES_WITHOUT_ADDRESS } from "@/lib/locations/config";
import { LocationMapPicker } from "@/components/location-map-picker";
import { useUnsavedChangesGuard } from "@/lib/navigation-blocker";
import { isWithinUkBounds } from "@/lib/google-maps/bounds";
import type { GeocodeResult } from "@/lib/google-maps/geocode";
import {
  DAY_KEYS,
  DAY_LABELS,
  emptyOpeningHours,
  type DayKey,
  type OpeningHours,
} from "@/lib/locations/opening-hours";

type LocationFormState = { error?: string } | undefined;

type LocationFormValues = {
  label: string;
  location_type: string;
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  phone: string;
};

type LocationFormProps = {
  formAction: (
    prevState: LocationFormState,
    formData: FormData,
  ) => Promise<LocationFormState>;
  geocodeAction: (address: string) => Promise<GeocodeResult>;
  submitLabel: string;
  initial?: Partial<LocationFormValues> & {
    formatted_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    geocode_status?: string;
    opening_hours?: OpeningHours | null;
  };
};

const EMPTY_VALUES: LocationFormValues = {
  label: "",
  location_type: "physical",
  address_line1: "",
  address_line2: "",
  city: "",
  region: "",
  postcode: "",
  country: "",
  phone: "",
};

export function LocationForm({
  formAction,
  geocodeAction,
  submitLabel,
  initial,
}: LocationFormProps) {
  const [values, setValues] = useState<LocationFormValues>({
    ...EMPTY_VALUES,
    ...initial,
  });
  const [formattedAddress, setFormattedAddress] = useState(
    initial?.formatted_address ?? "",
  );
  const [latitude, setLatitude] = useState<number | null>(initial?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initial?.longitude ?? null);
  const [geocodeStatus, setGeocodeStatus] = useState(initial?.geocode_status ?? "pending");
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [isGeocoding, startGeocode] = useTransition();
  const [hasOpeningHours, setHasOpeningHours] = useState(!!initial?.opening_hours);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    initial?.opening_hours ?? emptyOpeningHours(),
  );

  function updateDayHours(day: DayKey, patch: Partial<OpeningHours[DayKey]>) {
    setOpeningHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
    setIsDirty(true);
  }

  const [state, action, isPending] = useActionState(formAction, undefined);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  const needsAddress = !LOCATION_TYPES_WITHOUT_ADDRESS.includes(values.location_type as never);

  function updateField<K extends keyof LocationFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  function handleFindOnMap() {
    const address = [
      values.address_line1,
      values.address_line2,
      values.city,
      values.region,
      values.postcode,
      values.country || "UK",
    ]
      .filter(Boolean)
      .join(", ");

    if (!address) {
      setGeocodeMessage("Enter an address first.");
      return;
    }

    startGeocode(async () => {
      const result = await geocodeAction(address);

      if (result.status === "not_configured") {
        setGeocodeMessage("Address lookup isn't configured yet (missing Google Maps API key).");
        return;
      }
      if (result.status === "not_found") {
        setGeocodeMessage("Address not found — check the details or place the pin manually.");
        setGeocodeStatus("failed");
        return;
      }
      if (result.status === "error") {
        setGeocodeMessage(result.message);
        return;
      }

      setFormattedAddress(result.formattedAddress);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setGeocodeStatus("ok");
      setIsDirty(true);

      setGeocodeMessage(
        isWithinUkBounds(result.latitude, result.longitude)
          ? null
          : "This location geocoded outside the expected UK area — check the address or adjust the pin.",
      );
    });
  }

  function handlePositionChange(lat: number, lng: number) {
    setLatitude(lat);
    setLongitude(lng);
    setGeocodeStatus("manual");
    setIsDirty(true);
    setGeocodeMessage(
      isWithinUkBounds(lat, lng)
        ? null
        : "This pin is outside the expected UK area — double check placement.",
    );
  }

  return (
    <form
      action={action}
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
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Label (optional — useful for telling multiple locations apart)
        <input
          type="text"
          name="label"
          value={values.label}
          onChange={(e) => updateField("label", e.target.value)}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Location type
        <select
          name="location_type"
          value={values.location_type}
          onChange={(e) => updateField("location_type", e.target.value)}
          className="rounded-lg border border-border-hairline px-3 py-2"
        >
          {LOCATION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      {needsAddress && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Address line 1
            <input
              type="text"
              name="address_line1"
              value={values.address_line1}
              onChange={(e) => updateField("address_line1", e.target.value)}
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Address line 2
            <input
              type="text"
              name="address_line2"
              value={values.address_line2}
              onChange={(e) => updateField("address_line2", e.target.value)}
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              City
              <input
                type="text"
                name="city"
                value={values.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Region
              <input
                type="text"
                name="region"
                value={values.region}
                onChange={(e) => updateField("region", e.target.value)}
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Postcode
              <input
                type="text"
                name="postcode"
                value={values.postcode}
                onChange={(e) => updateField("postcode", e.target.value)}
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Country
              <input
                type="text"
                name="country"
                value={values.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="UK"
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleFindOnMap}
            disabled={isGeocoding}
            className="self-start rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isGeocoding ? "Looking up…" : "Find on map"}
          </button>

          {geocodeMessage && (
            <p className="text-sm text-status-warning">{geocodeMessage}</p>
          )}
          {formattedAddress && (
            <p className="text-xs text-muted-dark">Matched: {formattedAddress}</p>
          )}

          <LocationMapPicker
            latitude={latitude}
            longitude={longitude}
            onPositionChange={handlePositionChange}
          />
        </>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Phone (shown to members on the Business Page)
        <input
          type="tel"
          name="phone"
          value={values.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          className="rounded-lg border border-border-hairline px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-2 border-t border-border-hairline pt-4 text-sm">
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={hasOpeningHours}
            onChange={(e) => {
              setHasOpeningHours(e.target.checked);
              setIsDirty(true);
            }}
          />
          Set opening hours
        </label>
        <p className="text-xs text-muted-dark">
          Shown on the Business Page as &quot;Open today HH:MM – HH:MM&quot;
          (or &quot;Closed today&quot;), computed from whichever day it is.
          Leave unchecked to hide the Opening Times row entirely.
        </p>

        {hasOpeningHours && (
          <div className="flex flex-col gap-2 rounded-lg border border-border-hairline p-3">
            {DAY_KEYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-24 shrink-0">{DAY_LABELS[day]}</span>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={!openingHours[day].closed}
                    onChange={(e) => updateDayHours(day, { closed: !e.target.checked })}
                  />
                  Open
                </label>
                {!openingHours[day].closed && (
                  <>
                    <input
                      type="time"
                      value={openingHours[day].open}
                      onChange={(e) => updateDayHours(day, { open: e.target.value })}
                      className="rounded border border-border-hairline px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-muted-dark">to</span>
                    <input
                      type="time"
                      value={openingHours[day].close}
                      onChange={(e) => updateDayHours(day, { close: e.target.value })}
                      className="rounded border border-border-hairline px-2 py-1 text-xs"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden fields carrying derived/state values into the form submit */}
      <input type="hidden" name="formatted_address" value={formattedAddress} />
      <input type="hidden" name="latitude" value={latitude ?? ""} />
      <input type="hidden" name="longitude" value={longitude ?? ""} />
      <input type="hidden" name="geocode_status" value={geocodeStatus} />
      <input
        type="hidden"
        name="opening_hours"
        value={hasOpeningHours ? JSON.stringify(openingHours) : ""}
      />

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
