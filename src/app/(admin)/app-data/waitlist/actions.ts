"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { sendTransactionalEmail } from "@/lib/emails/resend";
import { waitlistLiveEmail, waitlistReminderEmail } from "@/lib/emails/waitlist";

export type WaitlistActionState = { error?: string; sentCount?: number } | undefined;

async function getSignedUpEmailSet(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<Set<string>> {
  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  return new Set((data?.users ?? []).map((u) => (u.email ?? "").toLowerCase()));
}

/**
 * The one deliberate manual trigger for this whole feature — see
 * schema.sql's comment on waitlist_signups.notified_at. Sends to
 * everyone not yet notified who hasn't already signed up some other
 * way (e.g. a business contact who separately became a member). Safe
 * to click more than once: notified_at is set as each email actually
 * sends, so a second click only reaches anyone who joined the waitlist
 * since the first click, never a repeat send.
 */
export async function sendWaitlistLiveEmailAction(
  _prevState: WaitlistActionState,
  _formData: FormData,
): Promise<WaitlistActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Admin Supabase client is not configured." };

  const [{ data: rows }, signedUpEmails] = await Promise.all([
    adminClient.from("waitlist_signups").select("id, email").is("notified_at", null),
    getSignedUpEmailSet(adminClient),
  ]);

  const targets = (rows ?? []).filter((r) => !signedUpEmails.has(r.email.toLowerCase()));

  const { subject, html } = waitlistLiveEmail();
  let sentCount = 0;
  for (const row of targets) {
    const sent = await sendTransactionalEmail({ to: row.email, subject, html });
    if (sent) {
      await adminClient.from("waitlist_signups").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
      sentCount++;
    }
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "sent the 'we're live' email to",
    entityType: "waitlist",
    entityLabel: `${sentCount} waitlist member${sentCount === 1 ? "" : "s"}`,
  });

  revalidatePath("/app-data/waitlist");
  return { sentCount };
}

/**
 * The second and last manual trigger — one reminder, not a repeating
 * nudge (see waitlistReminderEmail's own comment). Only reaches people
 * who were sent the live email above AND still haven't signed up.
 */
export async function sendWaitlistReminderAction(
  _prevState: WaitlistActionState,
  _formData: FormData,
): Promise<WaitlistActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Admin Supabase client is not configured." };

  const [{ data: rows }, signedUpEmails] = await Promise.all([
    adminClient
      .from("waitlist_signups")
      .select("id, email")
      .not("notified_at", "is", null)
      .is("reminded_at", null),
    getSignedUpEmailSet(adminClient),
  ]);

  const targets = (rows ?? []).filter((r) => !signedUpEmails.has(r.email.toLowerCase()));

  const { subject, html } = waitlistReminderEmail();
  let sentCount = 0;
  for (const row of targets) {
    const sent = await sendTransactionalEmail({ to: row.email, subject, html });
    if (sent) {
      await adminClient.from("waitlist_signups").update({ reminded_at: new Date().toISOString() }).eq("id", row.id);
      sentCount++;
    }
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "sent the reminder email to",
    entityType: "waitlist",
    entityLabel: `${sentCount} waitlist member${sentCount === 1 ? "" : "s"}`,
  });

  revalidatePath("/app-data/waitlist");
  return { sentCount };
}
