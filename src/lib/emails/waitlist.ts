import { emailShell, linkButton } from "./shell";

const SIGNUP_URL = "https://privi.info/signup";
const STANDARD_FOOTER =
  "Need help? Visit our Help Centre.<br />This is an automated message from Privi — please don't reply to this email.";

// Area-scoped versions (2026-09-06) — see admin-portal/supabase/
// schema.sql's live_areas comment. Sent from the Live Areas page
// (src/app/(admin)/app-data/live-areas/), not the old blunt "everyone"
// buttons below, which are now retired in favour of these. The
// /signup link still works exactly the same way for these recipients —
// they'll pass the postcode-coverage check by construction, since
// they're only ever targeted because their stored postcode already
// falls inside the area's radius.
export function liveAreaInviteEmail(areaLabel: string): { subject: string; html: string } {
  return {
    subject: `Privi is live in ${areaLabel} — join now`,
    html: emailShell(
      "We've reached you",
      `<p style="margin:0;">You joined the Privi waitlist a while back, and we've now launched in ${areaLabel} — membership sign-up is open for your area.</p>
       ${linkButton("Sign up now", SIGNUP_URL)}`,
      STANDARD_FOOTER,
    ),
  };
}

// No area name here deliberately — notified_at/reminded_at live on the
// waitlist row itself, not per-area, so a person covered by more than
// one overlapping area has no single "which area sent this" answer.
// Matches the original global reminder's own copy for the same reason.
// Sent automatically 5 days after the invite by
// api/cron/waitlist-reminders, not manually — see that route.
export function waitlistReminderEmail(): { subject: string; html: string } {
  return {
    subject: "Still time to join Privi",
    html: emailShell(
      "Still on the list",
      `<p style="margin:0;">Just a friendly reminder — Privi membership sign-up is open for your area, and your spot is still here whenever you're ready.</p>
       ${linkButton("Sign up now", SIGNUP_URL)}`,
      STANDARD_FOOTER,
    ),
  };
}
