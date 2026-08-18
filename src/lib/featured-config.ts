// Featured placement pricing/policy constants — see the founder's finance
// project for the actual pricing plan this implements. Not admin-editable
// from the UI (same reasoning as OFFER_TYPES): these are business
// decisions, not day-to-day config, and changing them is a one-line edit
// here when actually needed rather than a settings screen for numbers
// that shouldn't change casually.

export const FEATURED_DURATIONS = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
] as const;

export type FeaturedDuration = (typeof FEATURED_DURATIONS)[number]["value"];

export const GLOBAL_FEATURED_CAP = 3;

// Revised 2026-08-19 — originally left uncapped (reasoning: at launch
// scale, most categories only hold 2-4 businesses anyway, so scarcity
// barely mattered). Founder correctly flagged that as short-sighted: once
// a category grows, unlimited category-featured dilutes the value of
// what businesses already paid for, and introducing a cap retroactively
// is the exact awkward walk-back this whole system is trying to avoid.
// Capped from day one instead, same number as the global cap for a
// single, consistent story to sell ("3 featured spots per category, 3
// sitewide") — genuinely true in both directions, see
// countActiveFeaturedInCategory: a category's 3 slots are shared by
// BOTH category-tier AND global-tier businesses that belong to it, not
// just category-tier ones, so "3 spots" stays literally true regardless
// of which tier filled them.
export const CATEGORY_FEATURED_CAP = 3;
