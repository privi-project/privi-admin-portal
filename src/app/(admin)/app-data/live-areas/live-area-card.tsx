"use client";

import { useState } from "react";
import type { LiveArea } from "@/lib/live-areas/queries";
import { sendAreaInviteAction, sendAreaReminderAction, deleteLiveAreaAction } from "./actions";

export function LiveAreaCard({
  area,
  pendingInvite,
  pendingReminder,
}: {
  area: LiveArea;
  pendingInvite: number;
  pendingReminder: number;
}) {
  const [busy, setBusy] = useState<"invite" | "reminder" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleInvite() {
    setBusy("invite");
    setMessage(null);
    const result = await sendAreaInviteAction(area.id, area.latitude, area.longitude, area.radiusMiles, area.label);
    setBusy(null);
    if (result?.error) setMessage(result.error);
    else setMessage(`Sent to ${result?.sentCount ?? 0} people.`);
  }

  async function handleReminder() {
    setBusy("reminder");
    setMessage(null);
    const result = await sendAreaReminderAction(area.id, area.latitude, area.longitude, area.radiusMiles, area.label);
    setBusy(null);
    if (result?.error) setMessage(result.error);
    else setMessage(`Reminder sent to ${result?.sentCount ?? 0} people.`);
  }

  async function handleDelete() {
    if (!confirm(`Remove "${area.label}" from live areas? Postcodes here will fall back to the waitlist.`)) return;
    setBusy("delete");
    await deleteLiveAreaAction(area.id, area.label);
    // Page revalidates via the server action; no local state needed after.
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy === "delete"}
          className="text-xs text-status-danger hover:underline disabled:opacity-60"
        >
          Remove
        </button>
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
        <button
          type="button"
          onClick={handleReminder}
          disabled={busy !== null || pendingReminder === 0}
          className="rounded-lg border border-border-hairline px-3.5 py-1.5 text-xs font-medium hover:border-gold disabled:opacity-60"
        >
          {busy === "reminder" ? "Sending…" : `Remind ${pendingReminder} people`}
        </button>
      </div>

      {message && <p className="text-xs text-status-success">{message}</p>}
    </div>
  );
}
