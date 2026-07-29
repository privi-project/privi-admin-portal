// Small, generic validation helpers (Admin_Portal_Structure.docx Section
// 14: "required fields, format checks"). Entity-specific checks
// (date-conflict, duplicate business/member) belong alongside the entity
// they validate, built when that entity exists — not guessed at here.

export function isRequired(value: string | null | undefined): boolean {
  return value != null && value.trim().length > 0;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Lowercase-kebab-case only — category slugs double as icon filenames
// (category_icons/README.md), so the format has to stay filename-safe.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value.trim());
}
