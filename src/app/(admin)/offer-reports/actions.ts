"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";

export type OfferReportActionState = { error?: string; saved?: boolean } | undefined;

/**
 * "Record the outcome" (Procedures Manual §6 / Ops Manual §8) — the note
 * here is the outcome, not a verdict the system enforces. Resolving a
 * report never touches the business or offer itself; whatever action was
 * actually taken (removed an offer, contacted the business, decided it
 * was unfounded) happens separately, the normal way, from that business's
 * own edit page.
 */
export async function resolveOfferReportAction(
  reportId: string,
  label: string,
  _prevState: OfferReportActionState,
  formData: FormData,
): Promise<OfferReportActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const adminNotes = String(formData.get("admin_notes") ?? "").trim() || null;

  const { error } = await adminClient
    .from("offer_reports")
    .update({
      status: "resolved",
      admin_notes: adminNotes,
      resolved_at: new Date().toISOString(),
      resolved_by: session.userId,
    })
    .eq("id", reportId);

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "resolved offer report for",
    entityType: "offer_report",
    entityId: reportId,
    entityLabel: label,
  });

  revalidatePath("/offer-reports");
  revalidatePath("/home");
  return { saved: true };
}

/** Undoes an accidental resolve — puts it back in the review queue. */
export async function reopenOfferReportAction(reportId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("offer_reports")
    .update({ status: "open", resolved_at: null, resolved_by: null })
    .eq("id", reportId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "reopened offer report for",
    entityType: "offer_report",
    entityId: reportId,
    entityLabel: label,
  });

  revalidatePath("/offer-reports");
  revalidatePath("/home");
}
