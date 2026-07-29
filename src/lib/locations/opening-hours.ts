// Structured per-weekday opening hours for a business_locations row
// (schema.sql's business_locations.opening_hours jsonb column) — the App's
// Business Page computes "Open today 7:00am – 8:00pm" / "Closed today"
// from this rather than the admin having to keep that phrasing in sync by
// hand every day.

export type DayHours = { open: string; close: string; closed: boolean };

export type OpeningHours = Record<DayKey, DayHours>;

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DEFAULT_DAY_HOURS: DayHours = { open: "09:00", close: "17:00", closed: false };

export function emptyOpeningHours(): OpeningHours {
  return DAY_KEYS.reduce((acc, key) => {
    acc[key] = { ...DEFAULT_DAY_HOURS };
    return acc;
  }, {} as OpeningHours);
}
