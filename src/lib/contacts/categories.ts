// The dropdown of what an additional business contact can be tagged
// for. Deliberately just a plain list, not admin-editable — same
// reasoning as featured-config.ts: adding a new automated email type is
// already a code change, so adding its category here at the same time
// costs nothing extra. Start with just Featured Placement (2026-09-02) —
// more get appended here as more automated sends exist to route.
export const CONTACT_CATEGORIES = [{ value: "featured", label: "Featured Placement" }] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number]["value"];

export function contactCategoryLabel(value: string): string {
  return CONTACT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
