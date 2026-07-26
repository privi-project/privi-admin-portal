// Filter dropdown options for /businesses. Not the full status vocabulary
// used everywhere (draft is a valid businesses.status but rarely useful to
// filter by, since new businesses start there and move on quickly).
export const BUSINESS_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
] as const;
