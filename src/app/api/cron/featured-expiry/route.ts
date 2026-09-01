import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/emails/resend";
import { featuredExpiringSoonEmail, featuredLapsedEmail, PARTNERS_EMAIL } from "@/lib/emails/featured";

/**
 * The automated half of the Featured Placement lifecycle emails (the
 * third, activation, fires directly from activateFeaturedPlacement
 * instead — see that file). Runs once daily (see vercel.json). Per
 * business currently holding a featured_level other than 'none' with a
 * real featured_expires_at:
 *  - Exactly 7 days before expiry: sends the "ending soon" reminder.
 *  - Exactly 3 days after expiry, still unrenewed: sends the "lapsed"
 *    follow-up.
 *
 * Deliberately does NOT touch featured_level/featured_expires_at itself —
 * that's a separate, existing, founder-controlled decision (see
 * schema.sql's own comment: effectiveFeaturedLevel() already treats a
 * business whose expiry has passed as effectively unfeatured everywhere
 * it's read, without this needing to reset anything). This route only
 * ever sends emails.
 *
 * Same CRON_SECRET pattern as website's complimentary-expiry cron —
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically
 * once that's set as an env var on this project's Vercel deployment.
 *
 * Renewal safety: both checks compare against the business's CURRENT
 * featured_expires_at each time this runs, not a snapshot from an
 * earlier day. A renewal moves that date into the future, so a
 * previously-matching business simply stops matching on the next run —
 * no separate "cancel the pending email" step needed.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((targetDay - nowDay) / DAY_MS);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ ok: false, reason: "Supabase not configured" }, { status: 500 });
  }

  const { data: businesses, error } = await adminClient
    .from("businesses")
    .select("id, name, contact_name, contact_email, featured_expires_at")
    .neq("featured_level", "none")
    .not("featured_expires_at", "is", null);

  if (error) {
    console.error("featured-expiry cron: failed to list businesses", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let expiringSoon = 0;
  let lapsed = 0;
  let skippedNoEmail = 0;

  for (const business of businesses ?? []) {
    const expiresAt = business.featured_expires_at as string;
    const days = daysUntil(expiresAt);
    if (days !== 7 && days !== -3) continue;

    if (!business.contact_email) {
      skippedNoEmail++;
      continue;
    }

    const recipientName = business.contact_name || business.name;
    const expiryLabel = formatDate(expiresAt);

    const { subject, html } =
      days === 7
        ? featuredExpiringSoonEmail({ businessName: recipientName, expiryDate: expiryLabel })
        : featuredLapsedEmail({ businessName: recipientName, expiryDate: expiryLabel });

    await sendTransactionalEmail({ to: business.contact_email, subject, html, replyTo: PARTNERS_EMAIL });

    if (days === 7) expiringSoon++;
    else lapsed++;
  }

  return NextResponse.json({
    ok: true,
    checked: businesses?.length ?? 0,
    expiringSoon,
    lapsed,
    skippedNoEmail,
    ranAt: new Date().toISOString(),
  });
}
