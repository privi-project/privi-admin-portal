import { emailShell } from "./shell";

// Business-facing, not member-facing — replies go to partners@privi.info
// (see PARTNERS_EMAIL / sendTransactionalEmail's replyTo), so the footer
// actively invites a reply rather than the member-emails' "please don't
// reply to this email" — these two audiences want opposite framing.
export const PARTNERS_EMAIL = "partners@privi.info";
const PARTNER_FOOTER = "Questions? Just reply to this email — it comes straight to us.";

function tierLabel(level: "category" | "global"): string {
  return level === "global" ? "your category and the Privi homepage" : "the top of your category";
}

function locationsLine(locations?: string[]): string {
  if (!locations || locations.length === 0) return "";
  return `<p style="margin:12px 0 0 0;">This covers: ${locations.join(", ")}.</p>`;
}

/**
 * Sent the moment a Featured term actually goes live — hooked into
 * activateFeaturedPlacement itself (lib/featured/activate.ts), so it
 * fires identically whichever of the two paths triggered activation
 * (a business's own edit page, or "mark paid & activate" on an
 * invoice) rather than needing to be wired twice.
 */
export function featuredActivatedEmail({
  businessName,
  tier,
  term,
  startDate,
  endDate,
  locations,
}: {
  businessName: string;
  tier: "category" | "global";
  term: string;
  startDate: string;
  endDate: string;
  locations?: string[];
}): { subject: string; html: string } {
  return {
    subject: "Your Featured Placement on Privi is now live",
    html: emailShell(
      "You're now Featured",
      `<p style="margin:0;">Hi ${businessName},</p>
       <p style="margin:12px 0 0 0;">Good news — your Featured Placement on Privi is now live. You're featured at ${tierLabel(
         tier,
       )} for ${term}, running from ${startDate} to ${endDate}.</p>
       ${locationsLine(locations)}
       <p style="margin:12px 0 0 0;">If you'd ever like to add more locations, change tier, or extend the term, just let us know.</p>
       <p style="margin:12px 0 0 0;">Thanks for supporting Privi — we'll be in touch again nearer the end of your term.</p>`,
      PARTNER_FOOTER,
    ),
  };
}

/**
 * Sent automatically 7 days before a live Featured term's expiry (see
 * cron/featured-expiry). If a renewal lands before that date,
 * featured_expires_at moves into the future and this simply stops
 * matching on later runs — nothing to cancel or track separately.
 */
export function featuredExpiringSoonEmail({
  businessName,
  expiryDate,
}: {
  businessName: string;
  expiryDate: string;
}): { subject: string; html: string } {
  return {
    subject: "Your Featured Placement on Privi is ending soon",
    html: emailShell(
      "Ending soon",
      `<p style="margin:0;">Hi ${businessName},</p>
       <p style="margin:12px 0 0 0;">Just a heads-up that your Featured Placement on Privi is coming to an end on ${expiryDate}.</p>
       <p style="margin:12px 0 0 0;">If you'd like to keep your visibility going, let us know and we'll get it renewed — happy to run through the tier and term options again, or simply carry on with what you have now.</p>
       <p style="margin:12px 0 0 0;">If we don't hear back before then, your placement will end on ${expiryDate} as planned and your listing will carry on as normal, just without the featured boost.</p>`,
      PARTNER_FOOTER,
    ),
  };
}

/**
 * Sent automatically 3 days after a Featured term's expiry if it still
 * hasn't been renewed by then (see cron/featured-expiry) — a softer,
 * after-the-fact follow-up to the warning above, not a second warning.
 */
export function featuredLapsedEmail({
  businessName,
  expiryDate,
}: {
  businessName: string;
  expiryDate: string;
}): { subject: string; html: string } {
  return {
    subject: "Your Featured Placement on Privi has ended",
    html: emailShell(
      "Placement ended",
      `<p style="margin:0;">Hi ${businessName},</p>
       <p style="margin:12px 0 0 0;">Your Featured Placement on Privi came to an end on ${expiryDate} and hasn't been renewed yet. Your listing is still live and visible as normal — just without the featured boost for now.</p>
       <p style="margin:12px 0 0 0;">If you'd like to pick it back up, we're happy to get you set up again whenever suits, at the current rate.</p>
       <p style="margin:12px 0 0 0;">Let us know if you have any questions, or if now just isn't the right time — either way, thanks for being part of Privi.</p>`,
      PARTNER_FOOTER,
    ),
  };
}
