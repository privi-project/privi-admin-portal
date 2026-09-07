"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { sendTransactionalEmail } from "@/lib/emails/resend";
import { liveAreaInviteEmail } from "@/lib/emails/waitlist";
import { getWaitlistWithinRadius } from "@/lib/live-areas/queries";

export type LiveAreaActionState = { error?: string; sentCount?: number } | undefined;

/**
 * Shared by both the auto-send on area creation and the manual
 * "catch up" button — one function, so the two can never disagree on
 * who counts as a target. Only ever reaches someone once (notified_at
 * is set as each email actually sends), so calling this again later
 * only reaches people newly eligible since the last call — e.g.
 * someone who joined the waitlist from /where-we-operate with a
 * postcode that happens to already be covered.
 */
async function sendInviteToArea(
  areaId: string,
  latitude: number,
  longitude: number,
  radiusMiles: number,
  label: string,
  session: { userId: string; email: string },
): Promise<LiveAreaActionState> {
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

  if (sentCount > 0) {
    await logActivity({
      adminId: session.userId,
      adminEmail: session.email,
      action: `sent the '${label} is live' email to`,
      entityType: "live_area",
      entityId: areaId,
      entityLabel: `${sentCount} waitlist member${sentCount === 1 ? "" : "s"}`,
    });
  }

  revalidatePath("/app-data/live-areas");
  return { sentCount };
}

/**
 * Marking an area live — resolves the chosen business's own location as
 * the area's anchor point (denormalized onto the row at creation time,
 * see schema.sql's comment on live_areas). Also fires the invite email
 * immediately to everyone already waiting in range (2026-09-06, founder
 * feedback: "saves me trying to remember to send things") — the manual
 * button on each card still exists for catching up anyone who joins the
 * waitlist after the area's already live.
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

  const { data: inserted, error } = await adminClient
    .from("live_areas")
    .insert({
      label,
      reference_business_id: businessId,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_miles: Math.round(radiusMiles),
    })
    .select("id")
    .single();
  if (error || !inserted) return { error: "Something went wrong creating this area." };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "marked live",
    entityType: "live_area",
    entityLabel: label,
  });

  const sendResult = await sendInviteToArea(
    inserted.id,
    location.latitude,
    location.longitude,
    Math.round(radiusMiles),
    label,
    session,
  );

  revalidatePath("/app-data/live-areas");
  revalidatePath("/"); // homepage "where we operate" section reads this table too
  return sendResult; // { sentCount } on success, or { error } if the send itself failed
}

/**
 * Radius/label only — deliberately doesn't let you change the anchor
 * business. Changing the anchor means a genuinely different centre
 * point, which is closer to "this is a different area" than "edit this
 * one"; delete and recreate for that instead. Widening or narrowing the
 * radius on the same business, though, is a normal thing to want to
 * tweak after seeing how the coverage looks.
 */
export async function updateLiveAreaAction(
  _prevState: LiveAreaActionState,
  formData: FormData,
): Promise<LiveAreaActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Admin Supabase client is not configured." };

  const areaId = String(formData.get("area_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const radiusMiles = Number(formData.get("radius_miles") ?? 0);

  if (!areaId) return { error: "Missing area." };
  if (!label) return { error: "Give this area a name." };
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) return { error: "Radius must be a positive number." };

  const { error } = await adminClient
    .from("live_areas")
    .update({ label, radius_miles: Math.round(radiusMiles) })
    .eq("id", areaId);
  if (error) return { error: "Something went wrong saving changes." };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated",
    entityType: "live_area",
    entityId: areaId,
    entityLabel: label,
  });

  revalidatePath("/app-data/live-areas");
  revalidatePath("/");
  // An empty object (not bare undefined) on success — useActionState's
  // initial state is also undefined, so the card needs a way to tell
  // "just succeeded" apart from "never submitted yet" to know when to
  // close the edit form.
  return {};
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
 * The manual "catch up" button on each card — same underlying send as
 * the automatic one on creation, callable again any time to reach
 * anyone newly eligible since. Reminders are no longer manual — see
 * api/cron/waitlist-reminders, which fires 5 days after notified_at
 * automatically.
 */
export async function sendAreaInviteAction(
  areaId: string,
  latitude: number,
  longitude: number,
  radiusMiles: number,
  label: string,
): Promise<LiveAreaActionState> {
  const session = await requireAdminSession();
  return sendInviteToArea(areaId, latitude, longitude, radiusMiles, label, session);
}
