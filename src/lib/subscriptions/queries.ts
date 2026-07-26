import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe-server";

// Current published prices (Privi_updated.docx Section 2.2) — used for
// MRR/ARR math directly rather than a live Stripe price lookup. If
// pricing ever changes, this needs updating too; there's no historical
// price tracking to derive it from automatically.
const MONTHLY_PRICE_GBP = 4.99;
const ANNUAL_PRICE_GBP = 49.99;

export type SubscriptionOverview = {
  activeCount: number;
  pastDueCount: number;
  cancelledCount: number;
  complimentaryCount: number;
  mrr: number;
  arr: number;
  cancellationRate: number;
  refundCount: number;
  refundTotalGbp: number;
  pastDueMembers: { id: string; name: string; email: string }[];
};

export async function getSubscriptionOverview(): Promise<SubscriptionOverview> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      activeCount: 0,
      pastDueCount: 0,
      cancelledCount: 0,
      complimentaryCount: 0,
      mrr: 0,
      arr: 0,
      cancellationRate: 0,
      refundCount: 0,
      refundTotalGbp: 0,
      pastDueMembers: [],
    };
  }

  const { data: profileRows } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, subscription_status, subscription_plan, is_complimentary");

  const rows = profileRows ?? [];

  const activeCount = rows.filter((r) => r.subscription_status === "active").length;
  const pastDueCount = rows.filter((r) => r.subscription_status === "past_due").length;
  const cancelledCount = rows.filter((r) => r.subscription_status === "canceled").length;
  const complimentaryCount = rows.filter((r) => r.is_complimentary).length;

  // Revenue-generating members only — complimentary members never pay.
  const payingActive = rows.filter((r) => r.subscription_status === "active" && !r.is_complimentary);
  const mrr =
    payingActive.filter((r) => r.subscription_plan === "monthly").length * MONTHLY_PRICE_GBP +
    payingActive.filter((r) => r.subscription_plan === "annual").length * (ANNUAL_PRICE_GBP / 12);
  const arr = mrr * 12;

  // Snapshot ratio, not a time-windowed rate — no historical subscription-
  // event log exists to compute one properly.
  const cancellationRate =
    activeCount + pastDueCount + cancelledCount > 0
      ? cancelledCount / (activeCount + pastDueCount + cancelledCount)
      : 0;

  const pastDueMembers = rows
    .filter((r) => r.subscription_status === "past_due")
    .map((r) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      email: "", // filled in by the page if needed; profiles has no email column
    }));

  let refundCount = 0;
  let refundTotalGbp = 0;
  const stripe = getStripeServerClient();
  if (stripe) {
    const refunds = await stripe.refunds.list({ limit: 100 });
    refundCount = refunds.data.length;
    refundTotalGbp = refunds.data.reduce((sum, r) => sum + r.amount, 0) / 100;
  }

  return {
    activeCount,
    pastDueCount,
    cancelledCount,
    complimentaryCount,
    mrr,
    arr,
    cancellationRate,
    refundCount,
    refundTotalGbp,
    pastDueMembers,
  };
}

export type MemberSubscription = {
  status: "not_configured" | "no_customer" | "no_subscription" | "ok";
  subscriptionId?: string;
  stripeStatus?: string;
  plan?: string | null;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  invoices?: {
    id: string;
    created: string;
    amountGbp: number;
    status: string;
    paymentIntentId: string | null;
  }[];
};

export async function getMemberSubscription(
  stripeCustomerId: string | null,
): Promise<MemberSubscription> {
  const stripe = getStripeServerClient();
  if (!stripe) return { status: "not_configured" };
  if (!stripeCustomerId) return { status: "no_customer" };

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    limit: 1,
    status: "all",
  });

  const subscription = subscriptions.data[0];

  const invoicesResponse = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit: 10,
    // "payments" is includable, not returned by default — needed to find
    // the payment_intent id for the refund action.
    expand: ["data.payments"],
  });

  const invoices = invoicesResponse.data.map((inv) => ({
    id: inv.id ?? "",
    created: new Date(inv.created * 1000).toISOString(),
    amountGbp: inv.amount_paid / 100,
    status: inv.status ?? "unknown",
    paymentIntentId:
      typeof inv.payments?.data?.[0]?.payment?.payment_intent === "string"
        ? inv.payments.data[0].payment.payment_intent
        : null,
  }));

  if (!subscription) {
    return { status: "no_subscription", invoices };
  }

  const priceId = subscription.items.data[0]?.price?.id;

  return {
    status: "ok",
    subscriptionId: subscription.id,
    stripeStatus: subscription.status,
    plan: priceId,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    invoices,
  };
}
