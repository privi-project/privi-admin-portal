"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import type { LiveArea } from "@/lib/live-areas/queries";
import { sendAreaInviteAction, deleteLiveAreaAction, updateLiveAreaAction, type LiveAreaActionState } from "./actions";

const initialUpdateState: LiveAreaActionState = undefined;

export function LiveAreaCard({ area, pendingInvite }: { area: LiveArea; pendingInvite: number }) {
  const [busy, setBusy] = useState<"invite" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updateLiveAreaAction, initialUpdateState);

  // updateState is `{}` (truthy, no error) on a successful save, vs bare
  // `undefined` before any submission — see actions.ts's comment on why
  // it can't just return undefined on success.
  useEffect(() => {
    if (updateState !== undefined && !updateState.error) {
      setEditing(false);
    }
  }, [updateState]);

  async function handleInvite() {
    setBusy("invite");
    setMessage(null);
    const result = await sendAreaInviteAction(area.id, area.latitude, area.longitude, area.radiusMiles, area.label);
    setBusy(null);
    if (result?.error) setMessage(result.error);
    else setMessage(`Sent to ${result?.sentCount ?? 0} people.`);
  }

  async function handleDelete() {
    if (!confirm(`Remove "${area.label}" from live areas? Postcodes here will fall back to the waitlist.`)) return;
    setBusy("delete");
    await deleteLiveAreaAction(area.id, area.label);
  }

  if (editing) {
    return (
      <form
        action={updateAction}
        className="flex flex-col gap-2.5 rounded-2xl border border-border-hairline bg-white p-5"
      >
        <input type="hidden" name="area_id" value={area.id} />
        <div className="flex flex-col gap-1 text-sm">
          Area name
          <input
            type="text"
            name="label"
            defaultValue={area.label}
            required
            className="rounded-lg border border-border-hairline px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-1 text-sm">
          Radius (miles)
          <input
            type="number"
            name="radius_miles"
            defaultValue={area.radiusMiles}
            min={1}
            required
            className="w-32 rounded-lg border border-border-hairline px-3 py-2"
          />
        </div>
        <p className="text-xs text-muted-dark">
          Anchor business ({area.referenceBusinessName ?? "unknown"}) can&apos;t be changed here — remove and
          recreate the area if you need a different centre point.
        </p>
        {updateState?.error && <p className="text-sm text-status-danger">{updateState.error}</p>}
        <div className="mt-1 flex gap-2">
          <button
            type="submit"
            disabled={updatePending}
            className="rounded-lg privi-gold-border border bg-teal px-3.5 py-1.5 text-xs font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
          >
            {updatePending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-border-hairline px-3.5 py-1.5 text-xs font-medium hover:border-gold"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border-hairline bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium">{area.label}</h3>
          <p className="text-xs text-muted-dark">
            {area.radiusMiles} mile radius
            {area.referenceBusinessName ? ` around ${area.referenceBusinessName}` : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-gold hover:underline">
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy === "delete"}
            className="text-xs text-status-danger hover:underline disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleInvite}
          disabled={busy !== null || pendingInvite === 0}
          className="rounded-lg privi-gold-border border bg-teal px-3.5 py-1.5 text-xs font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
        >
          {busy === "invite" ? "Sending…" : `Send invite to ${pendingInvite} waiting`}
        </button>
      </div>

      {message && <p className="text-xs text-status-success">{message}</p>}
    </div>
  );
}
