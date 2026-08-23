"use client";

import { useActionState, useState } from "react";
import { setFeaturedAction, clearFeaturedAction, type FeaturedActionState } from "../../../featured/actions";
import { FEATURED_DURATIONS } from "@/lib/featured-config";
import type { Business } from "@/lib/businesses/queries";
import { effectiveFeaturedLevel } from "@/lib/businesses/queries";
import type { Location } from "@/lib/locations/queries";

const initialState: FeaturedActionState = undefined;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function FeaturedControl({
  business,
  locations,
  selectedFeaturedLocationIds,
}: {
  business: Business;
  locations: Location[];
  selectedFeaturedLocationIds: string[];
}) {
  const setFeaturedWithId = setFeaturedAction.bind(null, business.id, business.name);
  const [state, formAction, isPending] = useActionState(setFeaturedWithId, initialState);
  const [clearing, setClearing] = useState(false);
  // Per-location Featured pricing (2026-08-23) — for a founder who charges
  // per site, "which locations" needs its own answer, same 'all'/
  // 'selected' shape as offers' own location_scope. Only shown for
  // businesses with more than one location — a single-site business has
  // nothing to choose between.
  const [locationScope, setLocationScope] = useState(business.featured_location_scope);
  // Controlled (not defaultChecked) so "Select all"/"Select none" below
  // can drive every checkbox at once — needed once a business has enough
  // locations that hand-ticking each one gets tedious.
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(selectedFeaturedLocationIds);

  const effective = effectiveFeaturedLevel(business);
  const isRaw = business.featured_level !== "none";
  const isLapsed = isRaw && effective === "none";

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearFeaturedAction(business.id, business.name);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mt-6 flex max-w-xl flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-6">
      <h2 className="text-sm font-medium">Featured placement</h2>

      {isRaw ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            isLapsed ? "border-status-warning bg-note-bg" : "border-border-hairline"
          }`}
        >
          <p className="font-medium">
            {isLapsed ? "Term expired — " : "Currently featured — "}
            {business.featured_level === "global"
              ? "homepage and category"
              : "category only"}
          </p>
          {business.featured_expires_at && (
            <p className="mt-1 text-xs text-muted-dark">
              {isLapsed ? "Expired" : "Expires"} {formatDate(business.featured_expires_at)}
            </p>
          )}
          {isLapsed && (
            <p className="mt-1 text-xs text-status-warning">
              No longer boosted in the App — the term lapsed but the record is
              kept here until you renew or clear it.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-dark">Not currently featured.</p>
      )}

      {state?.error && (
        <p className="text-sm text-status-danger" role="alert">
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Tier
            <select
              name="featured_level"
              defaultValue={business.featured_level !== "none" ? business.featured_level : "category"}
              className="rounded-lg border border-border-hairline px-3 py-2"
            >
              <option value="category">Category only</option>
              <option value="global">Homepage and category</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Term
            <select name="duration" defaultValue="1" className="rounded-lg border border-border-hairline px-3 py-2">
              {FEATURED_DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {locations.length > 1 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Locations covered</legend>
            <div className="flex flex-col gap-1 rounded-lg border border-border-hairline p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="featured_location_scope"
                  value="all"
                  checked={locationScope === "all"}
                  onChange={() => setLocationScope("all")}
                />
                All locations
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="featured_location_scope"
                  value="selected"
                  checked={locationScope === "selected"}
                  onChange={() => setLocationScope("selected")}
                />
                Selected locations only
              </label>
            </div>

            {locationScope === "selected" && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    className="text-gold"
                    onClick={() => setSelectedLocationIds(locations.map((l) => l.id))}
                  >
                    Select all
                  </button>
                  <button type="button" className="text-gold" onClick={() => setSelectedLocationIds([])}>
                    Select none
                  </button>
                </div>
                {/* Capped height + 2-column grid, same fix as CategoryMultiselect
                    uses for the same problem — a business with a lot of sites
                    would otherwise turn this into one very long vertical list. */}
                <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-border-hairline p-3">
                  {locations.map((loc) => (
                    <label key={loc.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="locationIds"
                        value={loc.id}
                        checked={selectedLocationIds.includes(loc.id)}
                        onChange={(e) =>
                          setSelectedLocationIds((prev) =>
                            e.target.checked ? [...prev, loc.id] : prev.filter((id) => id !== loc.id)
                          )
                        }
                      />
                      {loc.label ?? loc.formatted_address ?? loc.location_type}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Amount charged (£)
          <input
            type="number"
            name="amount_charged"
            min="0.01"
            step="0.01"
            required
            placeholder="e.g. 15.00"
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="privi-gold-border rounded-lg border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {isPending ? "Saving…" : isRaw ? "Set / renew" : "Set featured"}
          </button>
          {isRaw && (
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {clearing ? "Clearing…" : "Clear featured"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
