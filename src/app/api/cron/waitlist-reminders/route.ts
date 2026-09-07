import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/emails/resend";
import { waitlistReminderEmail } from "@/lib/emails/waitlist";

/**
 * Runs once daily (see vercel.json). Founder feedback 2026-09-06:
 * "saves me trying to remember to send things" — the invite itself
 * fires immediately when an area goes live (see live-areas/actions.ts's
 * createLiveAreaAction); this is the automatic second half, sending one
 * reminder to anyone still on the waitlist 5 days after their invite
 * who hasn't signed up.
 *
 * Deliberately NOT scoped per-area — notified_at/reminded_at live on
 * the waitlist_signups row itself, not per-area, so a person covered
 * by more than one overlapping live area has no single "which area"
 * answer anyway (see waitlistReminderEmail's own comment on why the
 * copy doesn't name an area). This just asks "was this person invited
 * 5+ days ago and never reminded", full stop.
 *
 * Same CRON_SECRET pattern as the existing featured-expiry cron in
 * this project.
 */
const REMINDER_DELAY_DAYS = 5;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const cutoff = new Date(Date.now() - REMINDER_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await adminClient
    .from("waitlist_signups")
    .select("id, email")
    .not("notified_at", "is", null)
    .lte("notified_at", cutoff)
    .is("reminded_at", null);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ remindedCount: 0 });
  }

  const { data: signedUpUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const signedUpEmails = new Set((signedUpUsers?.users ?? []).map((u) => (u.email ?? "").toLowerCase()));

  const { subject, html } = waitlistReminderEmail();
  let remindedCount = 0;
  for (const row of rows) {
    if (signedUpEmails.has(row.email.toLowerCase())) continue;
    const sent = await sendTransactionalEmail({ to: row.email, subject, html });
    if (sent) {
      await adminClient
        .from("waitlist_signups")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", row.id);
      remindedCount++;
    }
  }

  return NextResponse.json({ remindedCount });
}
