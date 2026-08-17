// Fixed by the product spec (Privi_updated.docx Phase 3.5, Admin_Portal_
// Structure.docx Section 5) — not admin-editable. The founder picks from
// this list per offer, but doesn't add/remove entries from it.
export const OFFER_TYPES = [
  { value: "percentage_discount", label: "Percentage discount" },
  { value: "fixed_amount_discount", label: "Fixed amount discount" },
  { value: "fixed_member_price", label: "Fixed member price" },
  { value: "bundle", label: "Bundle offer" },
  { value: "bogo", label: "Buy One Get One" },
  { value: "free_item", label: "Free item" },
  { value: "upgrade", label: "Upgrade" },
] as const;

export type OfferType = (typeof OFFER_TYPES)[number]["value"];

// Redemption method scope corrected in Admin_Portal_Structure.docx Section
// 5 — Discount Code and Barcode only. "Show active membership screen,"
// "Follow agreed booking instructions," etc. are not separate system
// methods, just how a business chooses to honour the code/barcode.
export const REDEMPTION_METHODS = [
  { value: "discount_code", label: "Discount Code" },
  { value: "barcode", label: "Barcode" },
] as const;

export type RedemptionMethod = (typeof REDEMPTION_METHODS)[number]["value"];

// Where the code/barcode can actually be used — separate from
// REDEMPTION_METHODS above, which is about how it's presented, not where.
// A physical-location business can still take bookings/orders online.
// Defaults to "in_store" everywhere it's read (matches the schema default).
export const REDEEM_WHERE_OPTIONS = [
  { value: "in_store", label: "In person only" },
  { value: "online", label: "Online only" },
  { value: "both", label: "In person or online" },
] as const;

export type RedeemWhere = (typeof REDEEM_WHERE_OPTIONS)[number]["value"];
