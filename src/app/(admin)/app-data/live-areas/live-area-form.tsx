"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { BusinessCombobox, type BusinessComboboxOption } from "@/components/business-combobox";
import { CoverageMap, type CoverageCircle } from "@/components/coverage-map";
import type { BusinessMapPoint } from "@/lib/live-areas/queries";
import { createLiveAreaAction, type LiveAreaActionState } from "./actions";

const initialState: LiveAreaActionState = undefined;
const DEFAULT_RADIUS = 10;

export function LiveAreaForm({
  businesses,
  businessPoints,
  liveCircles,
}: {
  businesses: BusinessComboboxOption[];
  businessPoints: BusinessMapPoint[];
  liveCircles: CoverageCircle[];
}) {
  const [state, formAction, isPending] = useActionState(createLiveAreaAction, initialState);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS);

  const selectedPoint = useMemo(
    () => businessPoints.find((p) => p.id === selectedBusinessId) ?? null,
    [businessPoints, selectedBusinessId],
  );

  return (
    <div className="mt-6 rounded-2xl border border-border-hairline bg-white p-5">
      <h2 className="mb-1 text-sm font-medium">Coverage map</h2>
      <p className="mb-3 text-xs text-muted-dark">
        Teal circles are areas already live. Pick a business and a radius below to preview a gold dashed
        circle here before committing — a good way to spot gaps as you add more.
      </p>
      <CoverageMap
        liveCircles={liveCircles}
        previewCircle={selectedPoint ? { latitude: selectedPoint.latitude, longitude: selectedPoint.longitude, radiusMiles } : null}
      />

      <form action={formAction} className="mt-5 flex flex-col gap-3 border-t border-border-hairline pt-5">
        <h2 className="text-sm font-medium">Mark a new area live</h2>
        <p className="text-xs text-muted-dark">
          Pick a business that&apos;s roughly central to the area you want to open — its address becomes
          the centre point, and everything within the radius below counts as covered.
        </p>

        <div className="flex flex-col gap-1 text-sm">
          Area name (your own label, e.g. &quot;Clapham&quot;)
          <input
            type="text"
            name="label"
            required
            placeholder="e.g. Clapham, South London"
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </div>

        <BusinessCombobox
          businesses={businesses}
          name="business_id"
          label="Anchor business"
          helpText="This business's address becomes the centre point for the radius below."
          required
          onSelect={setSelectedBusinessId}
        />
        {selectedBusinessId && !selectedPoint && (
          <p className="text-xs text-status-danger">
            That business doesn&apos;t have a geocoded location yet — pick a different one, or add/fix its
            address first.
          </p>
        )}

        <div className="flex flex-col gap-1 text-sm">
          Radius (miles)
          <input
            type="number"
            name="radius_miles"
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value) || 0)}
            min={1}
            required
            className="w-32 rounded-lg border border-border-hairline px-3 py-2"
          />
        </div>

        {state?.error && <p className="text-sm text-status-danger">{state.error}</p>}
        {state?.sentCount !== undefined && (
          <p className="text-sm text-status-success">
            Area created — invite sent to {state.sentCount} {state.sentCount === 1 ? "person" : "people"} already
            waiting nearby.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-1 self-start rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Mark area live"}
        </button>
      </form>
    </div>
  );
}
