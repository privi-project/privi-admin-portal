import Stripe from "stripe";

/**
 * Server-only Stripe client. Returns null (not a thrown error) when unset,
 * so callers can render a clear "not configured yet" state instead of
 * crashing. Admin Portal only ever reads Stripe (subscription/payment
 * status, refunds) — Stripe remains the source of truth for billing, and
 * checkout/webhooks stay website's job (PRIVI_Backend_Schema_Reference.md).
 */
export function getStripeServerClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Mirrors website/src/lib/stripe-server.ts's getPriceId() — same env
 * vars, same shared Stripe account/products. */
export function getPriceId(plan: "monthly" | "annual"): string | null {
  return plan === "monthly"
    ? process.env.STRIPE_PRICE_ID_MONTHLY ?? null
    : process.env.STRIPE_PRICE_ID_ANNUAL ?? null;
}

/** Inverse of getPriceId() — used by resyncSubscriptionAction to re-derive
 * subscription_plan from a live Stripe subscription's price id, since
 * website's checkout only ever sets it once from client intent and never
 * re-derives it from Stripe's actual state afterward. */
export function planFromPriceId(priceId: string): "monthly" | "annual" | null {
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ID_ANNUAL) return "annual";
  return null;
}
