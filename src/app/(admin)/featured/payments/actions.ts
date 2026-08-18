"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired } from "@/lib/validation";
import { FEATURED_DURATIONS } from "@/lib/featured-config";
import { activateFeaturedPlacement } from "@/lib/featured/activate";

export type PaymentFormState = { error?: string } | undefined;

const DURATION_VALUES = FEATURED_DURATIONS.map((d) => Number(d.value));

export async function createPaymentRequestAction(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const session = await requireAdminSession();

  const businessName = String(formData.get("business_name") ?? "").trim();
  const businessId = String(formData.get("business_id") ?? "").trim() || null;
  const featuredLevel = String(formData.get("featured_level") ?? "");
  const durationMonths = Number(formData.get("duration_months"));
  const amountGbp = Number(formData.get("amount_gbp"));
  const invoiceNumber = String(formData.get("invoice_number") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!isRequired(businessName)) return { error: "Business name is required." };
  if (!["category", "global"].includes(featuredLevel)) return { error: "Choose a featured tier." };
  if (!DURATION_VALUES.includes(durationMonths)) return { error: "Choose a duration." };
  if (!Number.isFinite(amountGbp) || amountGbp <= 0) return { error: "Enter a valid amount." };

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient.from("featured_payment_requests").insert({
    business_name: businessName,
    business_id: businessId,
    featured_level: featuredLevel,
    duration_months: durationMonths,
    amount_gbp: amountGbp,
    invoice_number: invoiceNumber,
    notes,
  });

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "created",
    entityType: "featured_payment_request",
    entityLabel: `${businessName} — £${amountGbp.toFixed(2)}`,
  });

  revalidatePath("/featured/payments");
  revalidatePath("/featured");
}

export async function markPaymentStatusAction(
  id: string,
  businessName: string,
  nextStatus: "unpaid" | "paid",
) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("featured_payment_requests")
    .update({
      status: nextStatus,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: nextStatus === "paid" ? "marked paid" : "marked unpaid",
    entityType: "featured_payment_request",
    entityId: id,
    entityLabel: businessName,
  });

  revalidatePath("/featured/payments");
  revalidatePath("/featured");
}

export type MarkPaidResult = { error?: string } | undefined;

/**
 * The one-click path: marks the invoice Paid AND switches Featured on for
 * the linked business in the same action, reusing activateFeaturedPlacement
 * (the exact same cap-checked logic the business edit page's manual form
 * uses) instead of re-asking for tier/duration/amount a second time. Only
 * available when the invoice was linked to a real business at creation —
 * falls back to a plain error telling the admin to link one, rather than
 * silently doing nothing.
 */
export async function markPaidAndActivateFeaturedAction(paymentId: string): Promise<MarkPaidResult> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: payment } = await adminClient
    .from("featured_payment_requests")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { error: "Invoice not found." };
  if (payment.status !== "unpaid") return { error: "This invoice isn't unpaid anymore." };
  if (!payment.business_id) {
    return { error: "This invoice isn't linked to a business yet — add the link, or activate Featured manually from the business's edit page." };
  }

  const result = await activateFeaturedPlacement({
    businessId: payment.business_id,
    businessName: payment.business_name,
    tier: payment.featured_level,
    durationMonths: payment.duration_months,
    amountCharged: payment.amount_gbp,
    adminId: session.userId,
    adminEmail: session.email,
  });

  if (result.error) return result;

  await adminClient
    .from("featured_payment_requests")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", paymentId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "marked paid & activated",
    entityType: "featured_payment_request",
    entityId: paymentId,
    entityLabel: payment.business_name,
  });

  revalidatePath("/featured/payments");
  revalidatePath("/featured");
  revalidatePath(`/businesses/${payment.business_id}/edit`);
  revalidatePath("/businesses");
  return undefined;
}

/** Hard delete — only while still unpaid. A payment once marked Paid is a
 * real financial record and stays put, same rule used everywhere else in
 * this project (only undecided/unactioned things are removable). */
export async function deletePaymentRequestAction(id: string, businessName: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { data: row } = await adminClient
    .from("featured_payment_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!row || row.status !== "unpaid") return;

  await adminClient.from("featured_payment_requests").delete().eq("id", id);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "featured_payment_request",
    entityId: id,
    entityLabel: businessName,
  });

  revalidatePath("/featured/payments");
  revalidatePath("/featured");
}
