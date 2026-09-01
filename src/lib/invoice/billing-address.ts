// billing_address is stored as one newline-joined string (invoice-pdf.tsx
// already splits on "\n" and renders each line separately) — these two
// helpers are the only place that knows the field order, so the create
// form, the inline editor, and any future caller all agree on it.

export type BillingAddressFields = {
  line1: string;
  line2: string;
  city: string;
  postcode: string;
};

export function joinBillingAddress(fields: BillingAddressFields): string | null {
  const lines = [fields.line1, fields.line2, fields.city, fields.postcode]
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Best-effort split back into fields for the inline editor. Assumes the
 * joinBillingAddress order (line1, optional line2, city, postcode) —
 * correct for every address this feature has ever saved, since
 * joinBillingAddress is the only writer. A pre-existing free-text entry
 * that doesn't follow this shape just lands entirely in line1, which is
 * still editable/fixable rather than lost.
 */
export function splitBillingAddress(value: string | null): BillingAddressFields {
  const lines = (value ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { line1: "", line2: "", city: "", postcode: "" };
  if (lines.length === 1) return { line1: lines[0], line2: "", city: "", postcode: "" };
  if (lines.length === 2) return { line1: lines[0], line2: "", city: lines[1], postcode: "" };
  if (lines.length === 3) return { line1: lines[0], line2: "", city: lines[1], postcode: lines[2] };
  return { line1: lines[0], line2: lines[1], city: lines[2], postcode: lines[3] };
}
