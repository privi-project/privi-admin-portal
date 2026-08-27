// Shared status vocabulary (Admin_Portal_Structure.docx Section 14: "Clear
// record statuses — Draft/Active/Scheduled/Inactive/Expired/Archived — only
// relevant ones per record type"). Not every entity uses every value — e.g.
// Members use active/cancelled/past_due/complimentary (their own
// subscription_status vocabulary from the shared schema) rather than this
// list. StatusBadge below accepts any string and falls back to a neutral
// style for anything not in the common map, so entity-specific statuses
// added in later tasks don't require editing this file each time.
export type CommonRecordStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "inactive"
  | "expired"
  | "archived";

export const STATUS_TONE: Record<
  string,
  "success" | "warning" | "danger" | "neutral"
> = {
  draft: "neutral",
  scheduled: "warning",
  active: "success",
  inactive: "neutral",
  expired: "danger",
  archived: "neutral",
  // Member/subscription-specific (schema's subscription_status vocabulary)
  pending: "warning",
  past_due: "warning",
  canceled: "danger",
  cancelled: "danger",
  complimentary: "success",
  suspended: "danger",
  // Notification-specific
  sent: "success",
  failed: "danger",
  // Featured payment tracking-specific
  paid: "success",
  unpaid: "warning",
  // Offer report-specific
  open: "warning",
  resolved: "success",
};

export function toneForStatus(status: string) {
  return STATUS_TONE[status.toLowerCase()] ?? "neutral";
}

export function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
