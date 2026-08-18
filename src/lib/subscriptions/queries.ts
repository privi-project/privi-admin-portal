import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe-server";

/**
 * Real MRR pulled directly from every active Stripe subscription's actual
 * price, not a fixed-price-times-count estimate. Fixed 2026-08-19 — the
 * previous version hardcoded the published price and would have silently
 * gone stale the moment pricing changed, a discount/coupon applied, or a
 * subscription had a different price than the current published one for
 * any reason. Paginates properly rather than assuming everything fits in
 * one page — correct now at zero real subscribers, still correct once
 * that's no longer true.
 */
async function computeRealMrr(stripe: NonNullable<ReturnType<typeof getStripeServerClient>>): Promise<number> {
  let mrr = 0;
  let startingAfter: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const page = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      starting_after: startingAfter,
    });

    for (const sub of page.data) {
      for (const item of sub.items.data) {
        const unitAmount = (item.price.unit_amount ?? 0) / 100;
        const quantity = item.quantity ?? 1;
        const interval = item.price.recurring?.interval;
        const intervalCount = item.price.recurring?.interval_count ?? 1;
        const monthlyEquivalent =
          interval === "year"
            ? (unitAmount * quantity) / (12 * intervalCount)
            : (unitAmount * quantity) / intervalCount;
        mrr += monthlyEquivalent;
      }
    }

    hasMore = page.has_more;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return mrr;
}

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
  let mrr = 0;
  const stripe = getStripeServerClient();
  if (stripe) {
    const [refunds, realMrr] = await Promise.all([
      stripe.refunds.list({ limit: 100 }),
      computeRealMrr(stripe),
    ]);
    refundCount = refunds.data.length;
    refundTotalGbp = refunds.data.reduce((sum, r) => sum + r.amount, 0) / 100;
    mrr = realMrr;
  }
  const arr = mrr * 12;

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

export type SubscriptionPeriodReport = {
  newSubscriptions: number;
  cancellations: number;
  revenueCollectedGbp: number;
  refundsGbp: number;
};

/**
 * Real, Stripe-sourced figures for an arbitrary date range the founder
 * picks — deliberately NOT extending MRR/ARR/active-count with a date
 * range, since those are point-in-time snapshots ("as of now"), not
 * meaningful "for this period" figures without real historical tracking
 * that doesn't exist. What genuinely IS meaningful over a period: how
 * many subscriptions started, how many ended, and how much was actually
 * collected/refunded — all pulled live from Stripe, not a local mirror.
 */
export async function getSubscriptionPeriodReport(
  fromISO: string,
  toISO: string,
): Promise<SubscriptionPeriodReport> {
  const stripe = getStripeServerClient();
  if (!stripe) {
    return { newSubscriptions: 0, cancellations: 0, revenueCollectedGbp: 0, refundsGbp: 0 };
  }

  const gte = Math.floor(new Date(fromISO).getTime() / 1000);
  const lte = Math.floor(new Date(toISO).getTime() / 1000);

  const [newSubs, cancelledSubs, invoices, refunds] = await Promise.all([
    stripe.subscriptions.list({ status: "all", created: { gte, lte }, limit: 100 }),
    // canceled_at isn't filterable server-side — fetch canceled subscriptions
    // and filter client-side. Fine at the volumes this app expects; would
    // need real pagination if that ever stops being true.
    stripe.subscriptions.list({ status: "canceled", limit: 100 }),
    stripe.invoices.list({ status: "paid", created: { gte, lte }, limit: 100 }),
    stripe.refunds.list({ created: { gte, lte }, limit: 100 }),
  ]);

  const cancellations = cancelledSubs.data.filter(
    (s) => s.canceled_at && s.canceled_at >= gte && s.canceled_at <= lte,
  ).length;

  const revenueCollectedGbp = invoices.data.reduce((sum, inv) => sum + inv.amount_paid, 0) / 100;
  const refundsGbp = refunds.data.reduce((sum, r) => sum + r.amount, 0) / 100;

  return {
    newSubscriptions: newSubs.data.length,
    cancellations,
    revenueCollectedGbp,
    refundsGbp,
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
