"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { isRequired, isValidEmail } from "@/lib/validation";
import { getStripeServerClient, planFromPriceId } from "@/lib/stripe-server";

export type MemberActionState = { error?: string; saved?: boolean } | undefined;

function memberLabel(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export async function updateAdminNotesAction(
  memberId: string,
  label: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const notes = String(formData.get("admin_notes") ?? "").trim() || null;

  const { error } = await adminClient
    .from("profiles")
    .update({ admin_notes: notes, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated notes for",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath(`/members/${memberId}`);
  return { saved: true };
}

export async function grantComplimentaryAction(
  memberId: string,
  label: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireAdminSession();
  const reason = String(formData.get("complimentary_reason") ?? "").trim();
  const expiresAt = String(formData.get("complimentary_expires_at") ?? "").trim() || null;

  if (!isRequired(reason)) {
    return { error: "A reason is required for complimentary membership." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient
    .from("profiles")
    .update({
      is_complimentary: true,
      complimentary_reason: reason,
      complimentary_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "granted complimentary membership to",
    entityType: "member",
    entityId: memberId,
    entityLabel: `${label} (${reason})`,
  });

  revalidatePath(`/members/${memberId}`);
  return { saved: true };
}

export async function revokeComplimentaryAction(memberId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("profiles")
    .update({
      is_complimentary: false,
      complimentary_reason: null,
      complimentary_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "revoked complimentary membership from",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath(`/members/${memberId}`);
}

export async function suspendMemberAction(memberId: string, firstName: string, lastName: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  // ~100 years — effectively indefinite until explicitly restored.
  await adminClient.auth.admin.updateUserById(memberId, { ban_duration: "876000h" });
  await adminClient
    .from("profiles")
    .update({ is_suspended: true, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "suspended",
    entityType: "member",
    entityId: memberId,
    entityLabel: memberLabel(firstName, lastName),
  });

  revalidatePath(`/members/${memberId}`);
}

export async function restoreMemberAction(memberId: string, firstName: string, lastName: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient.auth.admin.updateUserById(memberId, { ban_duration: "none" });
  await adminClient
    .from("profiles")
    .update({ is_suspended: false, updated_at: new Date().toISOString() })
    .eq("id", memberId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "restored",
    entityType: "member",
    entityId: memberId,
    entityLabel: memberLabel(firstName, lastName),
  });

  revalidatePath(`/members/${memberId}`);
}

export async function sendVerificationEmailAction(memberId: string, email: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient.auth.resend({ type: "signup", email });

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "sent verification email to",
    entityType: "member",
    entityId: memberId,
    entityLabel: email,
  });

  revalidatePath(`/members/${memberId}`);
}

/**
 * For a member created via /members/new (invite-based, no admin-typed
 * password — see createMemberAction) whose original invite link expired
 * or was lost before they set a password. Safe to call again on the same
 * email — Supabase resends a fresh invite rather than erroring, as long
 * as the member hasn't already completed setup (confirmed their email).
 * Distinct from "Send verification email" above, which only re-confirms
 * an address — it doesn't help someone who never set a password at all.
 */
export async function resendInviteAction(memberId: string, email: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  // Same redirectTo fix as the initial invite (members/new/actions.ts) —
  // resending had the identical missing-destination bug.
  await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://privi.info/auth/confirm",
  });

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "resent invite email to",
    entityType: "member",
    entityId: memberId,
    entityLabel: email,
  });

  revalidatePath(`/members/${memberId}`);
}

/**
 * Bypasses email entirely — sets a password directly via the admin API,
 * same escape hatch already used once to bootstrap the founder's own
 * admin account when its reset link didn't work end to end (see
 * admin_portal_auth_bootstrap memory). Needed because there's currently
 * nowhere for a MEMBER invite/reset link to land at all (no such page
 * exists on the website or App yet) — this isn't a shortcut around a
 * working flow, it's the only way to get a member logged in for testing
 * until that page exists. Use sparingly; this is a support/testing tool,
 * not a replacement for members setting their own password once the real
 * flow exists.
 */
export async function setMemberPasswordAction(
  memberId: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireAdminSession();
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient.auth.admin.updateUserById(memberId, {
    password,
    email_confirm: true,
  });

  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "set a password directly for",
    entityType: "member",
    entityId: memberId,
  });

  revalidatePath(`/members/${memberId}`);
  return { saved: true };
}

export async function markEmailVerifiedAction(memberId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient.auth.admin.updateUserById(memberId, { email_confirm: true });

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "manually marked email verified for",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath(`/members/${memberId}`);
}

export async function updateEmailAction(
  memberId: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireAdminSession();
  const newEmail = String(formData.get("email") ?? "").trim();

  if (!isValidEmail(newEmail)) {
    return { error: "Enter a valid email address." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  const { error } = await adminClient.auth.admin.updateUserById(memberId, { email: newEmail });
  if (error) return { error: error.message };

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "updated email address for",
    entityType: "member",
    entityId: memberId,
    entityLabel: newEmail,
  });

  revalidatePath(`/members/${memberId}`);
  return { saved: true };
}

/**
 * Deletion requests arrive by email to the privacy contact address, not
 * through any in-app flow (Section 9 removed ticket-raising entirely) — so
 * there's nothing to auto-detect. This just lets the admin record that one
 * came in, so it surfaces on the Dashboard's Action Centre as a to-do
 * until anonymize/delete below actually resolves it.
 */
export async function flagDeletionRequestedAction(memberId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("profiles")
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq("id", memberId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deletion_requested",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath(`/members/${memberId}`);
}

export async function clearDeletionRequestAction(memberId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("profiles")
    .update({ deletion_requested_at: null })
    .eq("id", memberId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deletion_request_cleared",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath(`/members/${memberId}`);
}

/**
 * Scrubs PII, keeps the row (and Stripe linkage) for financial-record
 * continuity — Data Retention Policy Sections 5/10/11 require retaining
 * payment/subscription records even after a membership ends, and
 * explicitly sanction anonymisation as a valid deletion method.
 */
export async function anonymizeMemberAction(memberId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await adminClient
    .from("profiles")
    .update({
      first_name: "Deleted",
      last_name: "Member",
      preferred_area: null,
      admin_notes: `Anonymised ${new Date().toISOString()}`,
      // Resolved now — clear it so it stops showing as a pending to-do on
      // the Dashboard's Action Centre.
      deletion_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "anonymised",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath("/members");
  redirect("/members");
}

/**
 * Hard delete — removes the auth.users row, which cascades to profiles
 * automatically. Irreversible; severs the Stripe linkage's audit trail.
 * Data Retention Policy Section 11 sanctions this ("permanently erased
 * where appropriate") as one of two valid deletion methods alongside
 * anonymisation.
 */
export async function deleteMemberAction(memberId: string, label: string) {
  const session = await requireAdminSession();
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin Supabase client is not configured.");

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "deleted",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  await adminClient.auth.admin.deleteUser(memberId);

  revalidatePath("/members");
  redirect("/members");
}

/**
 * "Confirm status" and "resync after error" are the same operation —
 * re-derives subscription_status/subscription_plan from Stripe's live
 * state (same status mapping the webhook uses:
 * website/src/app/api/stripe/webhook/route.ts) rather than trusting
 * whatever profiles currently has. Closes the gap where subscription_plan
 * is only ever set once at checkout and never re-derived afterward.
 */
export async function resyncSubscriptionAction(memberId: string, stripeCustomerId: string) {
  const session = await requireAdminSession();
  const stripe = getStripeServerClient();
  const adminClient = createAdminClient();
  if (!stripe || !adminClient) throw new Error("Stripe or Supabase admin client is not configured.");

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    limit: 1,
    status: "all",
  });
  const subscription = subscriptions.data[0];

  if (!subscription) {
    revalidatePath(`/members/${memberId}`);
    return;
  }

  const status =
    subscription.status === "active"
      ? "active"
      : subscription.status === "past_due"
        ? "past_due"
        : subscription.status === "canceled"
          ? "canceled"
          : "pending";

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? planFromPriceId(priceId) : null;

  await adminClient
    .from("profiles")
    .update({
      subscription_status: status,
      ...(plan ? { subscription_plan: plan } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "resynced subscription for",
    entityType: "member",
    entityId: memberId,
  });

  revalidatePath(`/members/${memberId}`);
}

/**
 * Schedules cancellation at the end of the current paid period — NOT an
 * immediate cancel. Confirmed against Privi_updated.docx Section 2.2
 * ("Membership remains active until the end of the paid billing period")
 * and Admin_Portal_Structure.docx Section 7 ("access continues until the
 * original next-payment date, then restricts automatically"). The real
 * status flip to 'canceled' still happens later via the existing webhook,
 * at the real customer.subscription.deleted event — this action doesn't
 * touch profiles.subscription_status itself.
 */
export async function cancelSubscriptionAction(
  memberId: string,
  subscriptionId: string,
  label: string,
) {
  const session = await requireAdminSession();
  const stripe = getStripeServerClient();
  if (!stripe) throw new Error("Stripe is not configured.");

  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "scheduled cancellation for",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath(`/members/${memberId}`);
}

/**
 * Reverses a scheduled cancellation (cancelSubscriptionAction above) before
 * the period ends — e.g. the member emails asking to stay after all. No
 * automatic member-facing "click here to stay" email exists for this yet;
 * that would need new transactional-email infrastructure and is out of
 * this project's scope. This is the admin-side manual reversal.
 */
export async function resumeSubscriptionAction(
  memberId: string,
  subscriptionId: string,
  label: string,
) {
  const session = await requireAdminSession();
  const stripe = getStripeServerClient();
  if (!stripe) throw new Error("Stripe is not configured.");

  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "undid scheduled cancellation for",
    entityType: "member",
    entityId: memberId,
    entityLabel: label,
  });

  revalidatePath(`/members/${memberId}`);
}

export type RefundActionState = { error?: string; saved?: boolean } | undefined;

export async function recordRefundAction(
  memberId: string,
  label: string,
  _prevState: RefundActionState,
  formData: FormData,
): Promise<RefundActionState> {
  const session = await requireAdminSession();
  const stripe = getStripeServerClient();
  if (!stripe) return { error: "Stripe is not configured." };

  const paymentIntentId = String(formData.get("payment_intent_id") ?? "").trim();
  const amountRaw = String(formData.get("amount_gbp") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isRequired(paymentIntentId)) {
    return { error: "Select an invoice to refund." };
  }
  if (!isRequired(reason)) {
    return { error: "A reason is required to record a refund." };
  }

  const amount = amountRaw ? Math.round(Number(amountRaw) * 100) : undefined;
  if (amountRaw && (!Number.isFinite(amount) || (amount ?? 0) <= 0)) {
    return { error: "Enter a valid refund amount, or leave blank for a full refund." };
  }

  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount ? { amount } : {}),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the refund." };
  }

  await logActivity({
    adminId: session.userId,
    adminEmail: session.email,
    action: "recorded a refund for",
    entityType: "member",
    entityId: memberId,
    entityLabel: `${label} — ${reason}`,
  });

  revalidatePath(`/members/${memberId}`);
  // Redirect with a query flag rather than returning { saved: true } —
  // more robust than relying on this nested form's local state surviving
  // the Server Component re-fetch triggered by revalidatePath (confirmed
  // by testing: the inline "Refund recorded" message wasn't reliably
  // shown even though the refund itself always succeeded).
  redirect(`/members/${memberId}?refunded=1`);
}
