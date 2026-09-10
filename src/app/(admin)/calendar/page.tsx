import { listEventsInRange } from "@/lib/calendar/queries";
import { CalendarView } from "./calendar-view";

// All date maths here is done on UTC-midnight Dates and emitted as plain
// YYYY-MM-DD strings, so the grid is stable regardless of server
// timezone. "Today" highlighting is decided client-side from the
// browser's own date (see calendar-view.tsx).
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;

  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1; // 1-12
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    year = Number(m.slice(0, 4));
    month = Number(m.slice(5, 7));
  }

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // Monday-start grid: JS getUTCDay is 0=Sun..6=Sat.
  const mondayOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = addDays(firstOfMonth, -mondayOffset);
  const gridEnd = addDays(gridStart, 41); // always 6 rows

  const events = await listEventsInRange(iso(gridStart), iso(gridEnd));

  const prevMonth = month === 1 ? { y: year - 1, mo: 12 } : { y: year, mo: month - 1 };
  const nextMonth = month === 12 ? { y: year + 1, mo: 1 } : { y: year, mo: month + 1 };
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Calendar</h1>
      <p className="mt-1 text-sm text-muted-dark">
        Your diary. Click any day to add something, click an event to edit it.
      </p>

      <CalendarView
        year={year}
        month={month}
        gridStartIso={iso(gridStart)}
        events={events}
        prevHref={`/calendar?m=${prevMonth.y}-${pad(prevMonth.mo)}`}
        nextHref={`/calendar?m=${nextMonth.y}-${pad(nextMonth.mo)}`}
        todayHref="/calendar"
      />
    </div>
  );
}
