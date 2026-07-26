// Fixed by the product spec (Admin_Portal_Structure.docx Section 4) — not
// admin-editable, same pattern as src/lib/offer-config.ts.
export const LOCATION_TYPES = [
  { value: "physical", label: "Physical" },
  { value: "online_only", label: "Online only" },
  { value: "national", label: "National" },
  { value: "regional", label: "Regional" },
  { value: "mobile", label: "Mobile" },
  { value: "service_area", label: "Service area" },
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number]["value"];

// Location types that don't need a single physical pin — address/coordinate
// fields are optional for these, not "missing data."
export const LOCATION_TYPES_WITHOUT_ADDRESS: LocationType[] = [
  "online_only",
  "national",
];
