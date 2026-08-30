import { emailShell, linkButton } from "./shell";

const SIGNUP_URL = "https://privi.info/signup";
const STANDARD_FOOTER =
  "Need help? Visit our Help Centre.<br />This is an automated message from Privi — please don't reply to this email.";

// No first name is captured on the waitlist (waitlist_signups only ever
// stored an email — see that table's own schema comment), so neither of
// these greets by name, matching waitlistJoinedEmail's own existing
// no-name pattern rather than introducing an inconsistent "Hi there".
export function waitlistLiveEmail(): { subject: string; html: string } {
  return {
    subject: "Privi is live — you can sign up now",
    html: emailShell(
      "We're live",
      `<p style="margin:0;">You joined the Privi waitlist a while back, and membership sign-up is now officially open. Thanks for your patience — we'd love to have you.</p>
       ${linkButton("Sign up now", SIGNUP_URL)}`,
      STANDARD_FOOTER,
    ),
  };
}

// Sent once, only to whoever hasn't signed up since the live email
// above — deliberately a single reminder, not a repeating nudge (see
// schema.sql's own comment on reminded_at: this is a one-time-use
// feature, not an ongoing campaign).
export function waitlistReminderEmail(): { subject: string; html: string } {
  return {
    subject: "Still time to join Privi",
    html: emailShell(
      "Still on the list",
      `<p style="margin:0;">Just a friendly reminder — Privi membership sign-up is open, and your spot is still here whenever you're ready.</p>
       ${linkButton("Sign up now", SIGNUP_URL)}`,
      STANDARD_FOOTER,
    ),
  };
}
