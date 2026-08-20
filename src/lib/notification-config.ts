// Admin_Portal_Structure.docx Section 8b's own vocabulary for both fields —
// mirrors the offer-config.ts pattern (src/lib/offer-config.ts): fixed by
// spec, not admin-editable.
//
// 2026-08-20: 'general' retired from this list (still valid at the DB
// level for historic rows — see schema.sql — just not offered for new
// notifications) in favour of two real categories that actually map to
// something on the App side: 'account_alert' (legal/price/security,
// always delivered — App's locked "Account Alerts" toggle) and
// 'announcement' (app updates etc., also always delivered, no dedicated
// toggle).
export const NOTIFICATION_TYPES = [
  { value: "new_business", label: "New business" },
  { value: "new_location", label: "New location" },
  { value: "new_offer", label: "New offer" },
  { value: "offer_ending_soon", label: "Offer ending soon" },
  { value: "account_alert", label: "Account alert" },
  { value: "announcement", label: "Announcement" },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]["value"];

// The one action-button destination that currently exists — there's no
// dedicated Billing screen in the App, "Manage Subscription" lives on
// Personal Information, so that's what "Update Payment Method" routes to.
// Extend this list (not the field's shape) when a second real destination
// shows up.
export const ACTION_DESTINATIONS = [
  { value: "personal_information", label: "Personal Information (Manage Subscription)" },
] as const;

export type ActionDestination = (typeof ACTION_DESTINATIONS)[number]["value"];

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
