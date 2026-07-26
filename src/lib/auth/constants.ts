// Idle timeout — separate from Supabase's own refresh-token expiry. This is
// how long an admin can sit inactive before being signed out. Task #11's
// real Settings UI will eventually read this from a system_settings table
// instead of this constant.
export const ADMIN_IDLE_TIMEOUT_MINUTES = 30;
export const ADMIN_ACTIVITY_COOKIE = "admin_last_activity";

// Failed-login protection (Admin_Portal_Structure.docx Section 1). A
// single-admin login isn't a public brute-force target, so this is a
// proportionate per-account counter, not a CAPTCHA/IP-rate-limit system.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export const GENERIC_LOGIN_ERROR = "Invalid email or password.";
