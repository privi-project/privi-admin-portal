import { createAdminClient } from "@/lib/supabase/admin";

export type CalendarEvent = {
  id: string;
  title: string;
  eventDate: string; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  notes: string | null;
  isDone: boolean;
};

type Row = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  is_done: boolean;
};

// Postgres time comes back as "HH:MM:SS" — trim to "HH:MM" for the UI.
function trimTime(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

function toEvent(row: Row): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    startTime: trimTime(row.start_time),
    endTime: trimTime(row.end_time),
    notes: row.notes,
    isDone: row.is_done,
  };
}

/**
 * Events with event_date between startDate and endDate inclusive (both
 * YYYY-MM-DD). The calendar page passes the visible grid's full span,
 * which usually bleeds a few days either side of the month.
 */
export async function listEventsInRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data, error } = await adminClient
    .from("calendar_events")
    .select("id, title, event_date, start_time, end_time, notes, is_done")
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("listEventsInRange failed", error);
    return [];
  }
  return ((data as Row[]) ?? []).map(toEvent);
}

/** Just today's events — for the small "Today" strip at the top of the
 * calendar page. dateStr is the admin's local today as YYYY-MM-DD. */
export async function listEventsOn(dateStr: string): Promise<CalendarEvent[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const { data } = await adminClient
    .from("calendar_events")
    .select("id, title, event_date, start_time, end_time, notes, is_done")
    .eq("event_date", dateStr)
    .order("start_time", { ascending: true, nullsFirst: true });

  return ((data as Row[]) ?? []).map(toEvent);
}
