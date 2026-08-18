"use client";

import { useActionState, useState } from "react";
import { setFeaturedAction, clearFeaturedAction, type FeaturedActionState } from "../../../featured/actions";
import { FEATURED_DURATIONS } from "@/lib/featured-config";
import type { Business } from "@/lib/businesses/queries";
import { effectiveFeaturedLevel } from "@/lib/businesses/queries";

const initialState: FeaturedActionState = undefined;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function FeaturedControl({ business }: { business: Business }) {
  const setFeaturedWithId = setFeaturedAction.bind(null, business.id, business.name);
  const [state, formAction, isPending] = useActionState(setFeaturedWithId, initialState);
  const [clearing, setClearing] = useState(false);

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
