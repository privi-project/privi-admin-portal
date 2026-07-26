import { getMemberSubscription } from "@/lib/subscriptions/queries";
import { ResyncControl } from "./resync-control";
import { CancelSubscriptionControl } from "./cancel-subscription-control";
import { RefundForm } from "./refund-form";

export async function SubscriptionPanel({
  memberId,
  label,
  stripeCustomerId,
}: {
  memberId: string;
  label: string;
  stripeCustomerId: string | null;
}) {
  const subscription = await getMemberSubscription(stripeCustomerId);

  if (subscription.status === "not_configured") {
    return (
      <p className="text-sm text-muted-dark">
        Stripe isn&apos;t configured yet — add STRIPE_SECRET_KEY to see live
        subscription data.
      </p>
    );
  }

  if (subscription.status === "no_customer") {
    return (
      <p className="text-sm text-muted-dark">
        No Stripe customer on this member yet — they haven&apos;t reached
        payment on the website.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {subscription.status === "no_subscription" ? (
            <p className="text-muted-dark">No subscription found on Stripe for this customer.</p>
          ) : (
            <>
              <p>
                Plan: {subscription.plan ?? "—"} · Stripe status: {subscription.stripeStatus}
              </p>
              {subscription.cancelAtPeriodEnd && (
                <p className="text-status-warning">
                  Cancellation scheduled — access continues until{" "}
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : "the end of the current period"}
                  .
                </p>
              )}
            </>
          )}
        </div>
        <a
          href={`https://dashboard.stripe.com/test/customers/${stripeCustomerId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gold"
        >
          Open in Stripe →
        </a>
      </div>

      <div className="flex flex-wrap gap-3">
        <ResyncControl memberId={memberId} stripeCustomerId={stripeCustomerId!} />
        {subscription.status === "ok" && subscription.subscriptionId && (
          <CancelSubscriptionControl
            memberId={memberId}
            subscriptionId={subscription.subscriptionId}
            label={label}
            isCancelScheduled={Boolean(subscription.cancelAtPeriodEnd)}
          />
        )}
      </div>

      {subscription.invoices && subscription.invoices.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-dark">Recent invoices</h3>
          <div className="mt-2 divide-y divide-border-hairline rounded-lg border border-border-hairline">
            {subscription.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{new Date(inv.created).toLocaleDateString()}</span>
                <span>£{inv.amountGbp.toFixed(2)}</span>
                <span className="text-muted-dark">{inv.status}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-medium text-muted-dark">Record a refund</h3>
            <RefundForm memberId={memberId} label={label} invoices={subscription.invoices} />
          </div>
        </div>
      )}
    </div>
  );
}
