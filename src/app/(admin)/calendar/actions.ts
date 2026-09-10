"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";

export type CalendarActionState = { error?: string; ok?: boolean } | undefined;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function readEventFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const startTimeRaw = String(formData.get("start_time") ?? "").trim();
  const endTimeRaw = String(formData.get("end_time") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!title) return { error: "Give the event a title." as const };
  if (!DATE_RE.test(eventDate)) return { error: "Pick a valid date." as const };
  if (startTimeRaw && !TIME_RE.test(startTimeRaw)) return { error: "Start time isn't valid." as const };
  if (endTimeRaw && !TIME_RE.test(endTimeRaw)) return { error: "End time isn't valid." as const };
  if (startTimeRaw && endTimeRaw && endTimeRaw < startTimeRaw) {
    return { error: "End time is before start time." as const };
  }

  return {
    values: {
      title,
      event_date: eventDate,
      start_time: startTimeRaw || null,
      end_time: endTimeRaw || null,
      notes: notes || null,
      is_done: formData.get("is_done") === "on",
    },
  };
}

/**
 * One dispatcher for the add/edit modal. An "id" in the form means edit
 * an existing event; no id means create a new one. Keeps the modal
 * bound to a single useActionState action rather than swapping the
 * action between renders.
 */
export async function saveEventAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Admin Supabase client is not configured." };

  const parsed = readEventFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    const { error } = await adminClient
      .from("calendar_events")
      .update({ ...parsed.values, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: "Something went wrong saving changes." };
  } else {
    const { error } = await adminClient
      .from("calendar_events")
      .insert({ ...parsed.values, created_by: session.userId });
    if (error) return { error: "Something went wrong saving the event." };
  }

  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteEventAction(id: string): Promise<void> {
  await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) return;

  await adminClient.from("calendar_events").delete().eq("id", id);
  revalidatePath("/calendar");
}
