// Privi's own registered company and payment details — used on generated
// invoices (see lib/invoice/). Not admin-editable from the UI, same
// reasoning as featured-config.ts: these are fixed legal/banking facts,
// not day-to-day settings, and changing them is a deliberate one-line
// edit here rather than a form someone could fat-finger.
//
// VAT: Privi isn't VAT-registered yet (no UTR as of 2026-09-01) — vatNumber
// stays null until that changes, and invoice-pdf.tsx omits any VAT line
// entirely while it's null rather than showing a blank/zero one.

export const COMPANY_DETAILS = {
  legalName: "PRIVI APP LTD",
  companyNumber: "17429272",
  registeredAddress: {
    line1: "128 City Road",
    line2: null as string | null,
    city: "London",
    postcode: "EC1V 2NX",
    country: "United Kingdom",
  },
  vatNumber: null as string | null,
  bank: {
    name: "Monzo",
    accountName: "Privi",
    sortCode: "04-00-05",
    accountNumber: "56769823",
  },
  // Proforma: a request for payment before the service (Featured
  // Placement going live) actually starts — not a VAT invoice, which
  // Privi can't legally issue without VAT registration anyway. Matches
  // how the admin flow already works (Featured only switches on once
  // marked Paid), so this is describing an existing mechanic, not
  // inventing a new policy.
  defaultTerms:
    "Payment due within 7 days of invoice date. Featured Placement will begin once payment has been received in full.",
} as const;
