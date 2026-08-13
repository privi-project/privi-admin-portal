// Admin_Portal_Structure.docx Section 8b's own vocabulary for both fields —
// mirrors the offer-config.ts pattern (src/lib/offer-config.ts): fixed by
// spec, not admin-editable.
export const NOTIFICATION_TYPES = [
  { value: "new_business", label: "New business" },
  { value: "new_location", label: "New location" },
  { value: "new_offer", label: "New offer" },
  { value: "offer_ending_soon", label: "Offer ending soon" },
  { value: "general", label: "General" },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]["value"];

// Area-based listed first — it's the default and the common case (most
// notifications are tied to a specific business/offer's location). "All
// active members" is for the rare whole-membership announcement.
export const AUDIENCE_TYPES = [
  { value: "area", label: "Area-based (radius from a business)" },
  { value: "all", label: "All active members" },
  { value: "monthly", label: "Monthly subscribers" },
  { value: "annual", label: "Annual subscribers" },
  { value: "complimentary", label: "Complimentary members" },
  { value: "individual", label: "Individual member" },
] as const;

export type NotificationAudienceType = (typeof AUDIENCE_TYPES)[number]["value"];
