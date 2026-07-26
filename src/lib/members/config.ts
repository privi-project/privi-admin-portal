// Filter dropdown options — reuses profiles.subscription_status values
// directly (pending/active/past_due/canceled), already established by the
// website's schema, not something this admin portal invents.
export const MEMBER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Cancelled" },
] as const;
