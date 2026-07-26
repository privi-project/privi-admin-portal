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
