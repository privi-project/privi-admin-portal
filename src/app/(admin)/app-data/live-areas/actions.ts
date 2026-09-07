"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { sendTransactionalEmail } from "@/lib/emails/resend";
import { liveAreaInviteEmail, liveAreaReminderEmail } from "@/lib/emails/waitlist";
import { getWaitlistWithinRadius } from "@/lib/live-areas/queries";

export type LiveAreaActionState = { error?: string; sentCount?: number } | undefined;

/**
 * Marking an area live — resolves the chosen business's own location as
 * the area's anchor point (denormalized onto the row at creation time,
 * see schema.sql's comment on live_areas). Doesn't send anything by
 * itself; sending is a separate, explicit action below so the founder
 * can create an area, look at who it would reach, and only then decide
 * to actually email them.
 */
export async function createLiveAreaAction(
  _prevState: LiveAreaActionState,
  formData: FormData,
): Promise<LiveAreaActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Admin Supabase client is not configured." };

  const label = String(formData.get("label") ?? "").trim();
  const businessId = String(formData.get("business_id") ?? "").trim();
  const radiusMiles = Number(formData.get("radius_miles") ?? 10);

  if (!label) return { error: "Give this area a name." };
  if (!businessId) return { error: "Pick a business to anchor this area on." };
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) return { error: "Radius must be a positive number." };

  const { data: location } = await adminClient
    .from("business_locations")
    .select("latitude, longitude")
    .eq("business_id", businessId)
    .not("latitude", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!location?.latitude || !location?.longitude) {
    return { error: "That business doesn't have a geocoded location yet — add/fix its address first." };
  }

  const { error } = await adminClient.from("live_areas").insert({
    label,
    reference_business_id: businessId,
    latitude: location.latitude,
    longitude: location.longitude,
    radius_miles: Math.round(radiusMiles),
  });
  if (error) return { error: "Something went wrong creating this area." };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "marked live",
    entityType: "live_area",
    entityLabel: label,
  });

  revalidatePath("/app-data/live-areas");
  revalidatePath("/"); // homepage "where we operate" section reads this table too
  return undefined;
}

export async function deleteLiveAreaAction(areaId: string, label: string): Promise<void> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return;

  await adminClient.from("live_areas").delete().eq("id", areaId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "removed",
    entityType: "live_area",
    entityLabel: label,
  });

  revalidatePath("/app-data/live-areas");
  revalidatePath("/");
}

/**
 * Sends the "we've reached you" email to everyone within this area's
 * radius who hasn't already been notified and hasn't independently
 * signed up. Safe to click more than once — only reaches whoever's new
 * since the last send, same idempotency pattern as the original
 * global waitlist buttons this replaces.
 */
export async function sendAreaInviteAction(
  areaId: string,
  latitude: number,
  longitude: number,
  radiusMiles: number,
  label: string,
): Promise<LiveAreaActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Admin Supabase client is not configured." };

  const targets = await getWaitlistWithinRadius(latitude, longitude, radiusMiles, { onlyNotYetNotified: true });

  const { subject, html } = liveAreaInviteEmail(label);
  let sentCount = 0;
  for (const row of targets) {
    const sent = await sendTransactionalEmail({ to: row.email, subject, html });
    if (sent) {
      await adminClient
        .from("waitlist_signups")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", row.id);
      sentCount++;
    }
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: `sent the '${label} is live' email to`,
    entityType: "live_area",
    entityId: areaId,
    entityLabel: `${sentCount} waitlist member${sentCount === 1 ? "" : "s"}`,
  });

  revalidatePath("/app-data/live-areas");
  return { sentCount };
}

/** One follow-up reminder, only to people this area already invited who
 * still haven't signed up — mirrors the original global reminder. */
export async function sendAreaReminderAction(
  areaId: string,
  latitude: number,
  longitude: number,
  radiusMiles: number,
  label: string,
): Promise<LiveAreaActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Admin Supabase client is not configured." };

  const withinRadius = await getWaitlistWithinRadius(latitude, longitude, radiusMiles);
  const targets = withinRadius.filter((row) => row.notified_at); // already invited, still no reminder sent is checked below

  const { data: alreadyReminded } = await adminClient
    .from("waitlist_signups")
    .select("id")
    .in("id", targets.map((t) => t.id))
    .not("reminded_at", "is", null);
  const remindedIds = new Set((alreadyReminded ?? []).map((r) => r.id));
  const dueForReminder = targets.filter((t) => !remindedIds.has(t.id));

  const { subject, html } = liveAreaReminderEmail(label);
  let sentCount = 0;
  for (const row of dueForReminder) {
    const sent = await sendTransactionalEmail({ to: row.email, subject, html });
    if (sent) {
      await adminClient
        .from("waitlist_signups")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", row.id);
      sentCount++;
    }
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: `sent the '${label}' reminder email to`,
    entityType: "live_area",
    entityId: areaId,
    entityLabel: `${sentCount} waitlist member${sentCount === 1 ? "" : "s"}`,
  });

  revalidatePath("/app-data/live-areas");
  return { sentCount };
}
