"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CalendarEvent } from "@/lib/calendar/queries";
import { saveEventAction, deleteEventAction, type CalendarActionState } from "./actions";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Advance a YYYY-MM-DD string by n days, staying on UTC midnight so DST
// and local-timezone offsets can't shift the result.
function addDaysIso(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

type ModalState =
  | { mode: "closed" }
  | { mode: "add"; date: string }
  | { mode: "edit"; event: CalendarEvent };

export function CalendarView({
  year,
  month,
  gridStartIso,
  events,
  prevHref,
  nextHref,
  todayHref,
}: {
  year: number;
  month: number;
  gridStartIso: string;
  events: CalendarEvent[];
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.eventDate) ?? [];
      list.push(e);
      map.set(e.eventDate, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => {
        const dateIso = addDaysIso(gridStartIso, i);
        return {
          dateIso,
          dayNum: Number(dateIso.slice(8, 10)),
          inMonth: Number(dateIso.slice(5, 7)) === month,
        };
      }),
    [gridStartIso, month],
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link
            href={prevHref}
            aria-label="Previous month"
            className="rounded-lg border border-border-hairline px-2.5 py-1 text-sm hover:border-gold"
          >
            {"‹"}
          </Link>
          <span className="min-w-40 text-center text-sm font-medium">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Link
            href={nextHref}
            aria-label="Next month"
            className="rounded-lg border border-border-hairline px-2.5 py-1 text-sm hover:border-gold"
          >
            {"›"}
          </Link>
        </div>
        <Link
          href={todayHref}
          className="rounded-lg border border-border-hairline px-3 py-1 text-sm font-medium hover:border-gold"
        >
          Today
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-dark">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border-hairline bg-border-hairline">
        {cells.map((cell) => {
          const dayEvents = eventsByDate.get(cell.dateIso) ?? [];
          const isToday = cell.dateIso === todayIso;
          return (
            <div
              key={cell.dateIso}
              role="button"
              tabIndex={0}
              onClick={() => setModal({ mode: "add", date: cell.dateIso })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setModal({ mode: "add", date: cell.dateIso });
                }
              }}
              className={`min-h-24 cursor-pointer p-1.5 text-left ${
                cell.inMonth ? "bg-white" : "bg-border-hairline-2 text-muted"
              }`}
            >
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center text-xs ${
                  isToday ? "privi-gold-border rounded-full border bg-teal px-1 text-ivory [--gold-border-bg:var(--color-teal)]" : ""
                }`}
              >
                {cell.dayNum}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({ mode: "edit", event: ev });
                    }}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[11px] ${
                      ev.isDone
                        ? "bg-border-hairline-2 text-muted line-through"
                        : "privi-gold-fill text-charcoal"
                    }`}
                  >
                    {ev.startTime ? `${ev.startTime} ` : ""}
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <EventModal state={modal} onClose={() => setModal({ mode: "closed" })} />
    </div>
  );
}

function EventModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saveState, saveAction, savePending] = useActionState<CalendarActionState, FormData>(
    saveEventAction,
    undefined,
  );
  const [deletePending, setDeletePending] = useState(false);
  const wasPending = useRef(false);

  const open = state.mode !== "closed";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close only right after a submit that succeeded, not when reopened.
  useEffect(() => {
    if (wasPending.current && !savePending && saveState?.ok) {
      onClose();
    }
    wasPending.current = savePending;
  }, [savePending, saveState, onClose]);

  const editing = state.mode === "edit";
  const ev = editing ? state.event : null;
  const dateValue = state.mode === "add" ? state.date : ev?.eventDate ?? "";
  // Remount the form on each open so uncontrolled inputs pick up new defaults.
  const formKey = state.mode === "edit" ? state.event.id : state.mode === "add" ? state.date : "closed";

  async function handleDelete() {
    if (!ev) return;
    if (!confirm(`Delete "${ev.title}"?`)) return;
    setDeletePending(true);
    await deleteEventAction(ev.id);
    setDeletePending(false);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClose={onClose}
      className="w-full max-w-md rounded-2xl border border-border-hairline bg-white p-6 shadow-lg backdrop:bg-charcoal/40"
    >
      {open && (
        <form key={formKey} action={saveAction} className="flex flex-col gap-3">
          {editing && <input type="hidden" name="id" value={ev!.id} />}

          <h2 className="text-base font-medium text-charcoal">{editing ? "Edit event" : "New event"}</h2>

          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              type="text"
              name="title"
              required
              autoFocus
              defaultValue={ev?.title ?? ""}
              placeholder="e.g. Visit Imagine Cafe, chase Ninja Warrior form"
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              name="event_date"
              required
              defaultValue={dateValue}
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Start time (optional)
              <input
                type="time"
                name="start_time"
                defaultValue={ev?.startTime ?? ""}
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              End time (optional)
              <input
                type="time"
                name="end_time"
                defaultValue={ev?.endTime ?? ""}
                className="rounded-lg border border-border-hairline px-3 py-2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Notes (optional)
            <textarea
              name="notes"
              rows={3}
              defaultValue={ev?.notes ?? ""}
              className="rounded-lg border border-border-hairline px-3 py-2"
            />
          </label>

          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_done" defaultChecked={ev!.isDone} />
              Done
            </label>
          )}

          {saveState?.error && <p className="text-sm text-status-danger">{saveState.error}</p>}

          <div className="mt-1 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savePending}
                className="rounded-lg privi-gold-border border bg-teal px-4 py-2 text-sm font-medium text-ivory [--gold-border-bg:var(--color-teal)] disabled:opacity-60"
              >
                {savePending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium hover:border-gold"
              >
                Cancel
              </button>
            </div>
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletePending}
                className="text-sm text-status-danger hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      )}
    </dialog>
  );
}
