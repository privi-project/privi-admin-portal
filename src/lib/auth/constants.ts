// Idle timeout — separate from Supabase's own refresh-token expiry. This is
// the fallback used before Settings (task #11) has ever been saved, or if
// system_settings is unreachable — the real value now lives in
// system_settings.session_timeout_minutes, fetched once per session by
// src/proxy.ts and cached in ADMIN_TIMEOUT_MINUTES_COOKIE.
export const ADMIN_IDLE_TIMEOUT_MINUTES = 30;
export const ADMIN_ACTIVITY_COOKIE = "admin_last_activity";
export const ADMIN_TIMEOUT_MINUTES_COOKIE = "admin_timeout_minutes";

// Failed-login protection (Admin_Portal_Structure.docx Section 1) — the
// attempt threshold and lockout duration are editable via Settings (task
// #11), see system_settings.max_failed_login_attempts / lockout_minutes
// and src/lib/system-settings/queries.ts's DEFAULTS for the fallback
// values.

export const GENERIC_LOGIN_ERROR = "Invalid email or password.";
