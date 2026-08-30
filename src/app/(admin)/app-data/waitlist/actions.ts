"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";

export type WaitlistActionState = { error?: string; sentCount?: number } | undefined;

const WEBSITE_URL = "https://privi.info";

async function getSignedUpEmailSet(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<Set<string>> {
  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  return new Set((data?.users ?? []).map((u) => (u.email ?? "").toLowerCase()));
}

/**
 * Actual sending happens in the WEBSITE repo (api/admin/waitlist-email)
 * — this repo has no Resend integration of its own, deliberately, so
 * there's only ever one place Privi's email styling lives. Needs
 * ADMIN_ACTIONS_SECRET set as an env var here (same value as website's
 * copy) — see that route's own comment for the full reasoning.
 */
async function callWaitlistEmailEndpoint(
  type: "live" | "reminder",
  emails: string[],
): Promise<{ sentCount: number } | { error: string }> {
  const secret = process.env.ADMIN_ACTIONS_SECRET;
  if (!secret) return { error: "ADMIN_ACTIONS_SECRET is not configured." };
  if (emails.length === 0) return { sentCount: 0 };

  try {
    const res = await fetch(`${WEBSITE_URL}/api/admin/waitlist-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type, emails }),
    });
    if (!res.ok) return { error: `Website returned an error (${res.status}).` };
    const body = await res.json();
    return { sentCount: body.sentCount ?? 0 };
  } catch (err) {
    console.error("callWaitlistEmailEndpoint failed", err);
    return { error: "Could not reach the website to send the emails." };
  }
}

/**
 * The one deliberate manual trigger for this whole feature — see
 * schema.sql's comment on waitlist_signups.notified_at. Sends to
 * everyone not yet notified who hasn't already signed up some other
 * way (e.g. a business contact who separately became a member). Safe
 * to click more than once: notified_at is only set on rows the website
 * confirmed it actually sent to, so a second click only ever reaches
 * anyone who joined the waitlist since the first click.
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
  const result = await callWaitlistEmailEndpoint(
    "live",
    targets.map((t) => t.email),
  );
  if ("error" in result) return { error: result.error };

  // Website doesn't report which individual addresses succeeded, only a
  // count — best-effort marking of the whole batch as notified, same
  // "don't over-engineer a one-time feature" reasoning as the rest of
  // this build. A handful of silent failures here (rare — Resend is
  // reliable) just means that address never gets the follow-up either,
  // which is a minor miss, not a broken system.
  if (targets.length > 0) {
    await adminClient
      .from("waitlist_signups")
      .update({ notified_at: new Date().toISOString() })
      .in("id", targets.map((t) => t.id));
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "sent the 'we're live' email to",
    entityType: "waitlist",
    entityLabel: `${result.sentCount} waitlist member${result.sentCount === 1 ? "" : "s"}`,
  });

  revalidatePath("/app-data/waitlist");
  return { sentCount: result.sentCount };
}

/**
 * The second and last manual trigger — one reminder, not a repeating
 * nudge. Only reaches people who were sent the live email above AND
 * still haven't signed up.
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
  const result = await callWaitlistEmailEndpoint(
    "reminder",
    targets.map((t) => t.email),
  );
  if ("error" in result) return { error: result.error };

  if (targets.length > 0) {
    await adminClient
      .from("waitlist_signups")
      .update({ reminded_at: new Date().toISOString() })
      .in("id", targets.map((t) => t.id));
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "sent the reminder email to",
    entityType: "waitlist",
    entityLabel: `${result.sentCount} waitlist member${result.sentCount === 1 ? "" : "s"}`,
  });

  revalidatePath("/app-data/waitlist");
  return { sentCount: result.sentCount };
}
