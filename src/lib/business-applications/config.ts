// Pipeline columns used to be a hardcoded list here. As of 2026-08-18
// they're admin-editable (see business_application_statuses table +
// /business-applications/statuses) — this file now only holds the one
// slug that has to keep meaning something at the DB level.

// business_applications.status defaults to this on insert (including the
// eventual public website form submissions), so it must always exist and
// always be selectable — protected from deactivation/deletion in
// statuses/actions.ts. Its label is still fully editable.
export const NEW_APPLICATION_STATUS_SLUG = "new";
