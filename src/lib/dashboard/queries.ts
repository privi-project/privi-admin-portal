import { listMembers } from "@/lib/members/queries";
import { listBusinesses, effectiveFeaturedLevel } from "@/lib/businesses/queries";
import { listFeaturedHistory } from "@/lib/featured/queries";
import { listAllOffers, effectiveStatus, type OfferWithBusinessName } from "@/lib/offers/queries";
import { getSubscriptionOverview, getAllTimeRevenueCollected } from "@/lib/subscriptions/queries";
import { getSystemSettings } from "@/lib/system-settings/queries";
import { listActivity, type ActivityLogRow } from "@/lib/activity/queries";
import { listFlaggedBusinesses, type FlaggedBusiness } from "@/lib/offer-reports/queries";

export type DashboardSummary = {
  members: {
    active: number;
    monthly: number;
    annual: number;
    complimentary: number;
    cancelled: number;
    newInPeriod: number;
  };
  businesses: { active: number; inactive: number };
  offers: { active: number; scheduled: number; expired: number };
  featured: { active: number; earningsAllTimeGbp: number };
  monthlyMrr: number;
  annualRevenueGbp: number;
  totalRevenueCollectedGbp: number;
  actionCentre: {
    expiringOffers: OfferWithBusinessName[];
    expiredOffers: OfferWithBusinessName[];
    scheduledOffers: OfferWithBusinessName[];
    pastDueMembers: { id: string; name: string; email: string }[];
    deletionRequests: { id: string; name: string; requestedAt: string }[];
    featuredExpiringSoon: { id: string; name: string; expires_at: string }[];
    featuredLapsed: { id: string; name: string; expired_at: string }[];
    flaggedOfferBusinesses: FlaggedBusiness[];
  };
  recentActivity: ActivityLogRow[];
};

export async function getDashboardSummary(periodDays: number): Promise<DashboardSummary> {
  // system_settings fetched up front (not inside the batch below) — the
  // flagged-businesses threshold lives on it and is needed to kick off
  // that lookup in the same parallel batch as everything else.
  const systemSettings = await getSystemSettings();

  const [
    members,
    businesses,
    offers,
    subscriptionOverview,
    recentActivity,
    featuredHistory,
    totalRevenueCollectedGbp,
    flaggedOfferBusinesses,
  ] = await Promise.all([
    listMembers(),
    listBusinesses(),
    listAllOffers(),
    getSubscriptionOverview(),
    listActivity({ limit: 10 }),
    listFeaturedHistory(),
    getAllTimeRevenueCollected(),
    listFlaggedBusinesses(systemSettings.offer_report_flag_threshold),
  ]);

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  const memberSummary = {
    active: members.filter((m) => m.subscription_status === "active" || m.is_complimentary).length,
    monthly: members.filter((m) => m.subscription_status === "active" && m.subscription_plan === "monthly")
      .length,
    annual: members.filter((m) => m.subscription_status === "active" && m.subscription_plan === "annual")
      .length,
    complimentary: members.filter((m) => m.is_complimentary).length,
    cancelled: members.filter((m) => m.subscription_status === "canceled").length,
    newInPeriod: members.filter((m) => new Date(m.created_at) >= periodStart).length,
  };

  const businessSummary = {
    active: businesses.filter((b) => b.status === "active").length,
    inactive: businesses.filter((b) => b.status === "inactive").length,
  };

  const offersWithStatus = offers.map((o) => ({ ...o, effective: effectiveStatus(o) }));
  const offerSummary = {
    active: offersWithStatus.filter((o) => o.effective === "active").length,
    scheduled: offersWithStatus.filter((o) => o.effective === "scheduled").length,
    expired: offersWithStatus.filter((o) => o.effective === "expired").length,
  };

  const warningDays = systemSettings.default_expiry_warning_days;
  const warningCutoff = new Date();
  warningCutoff.setDate(warningCutoff.getDate() + warningDays);
  const warningCutoffStr = warningCutoff.toISOString().slice(0, 10);

  const expiringOffers = offersWithStatus.filter(
    (o) => o.effective === "active" && o.expiry_date && o.expiry_date <= warningCutoffStr,
  );
  const expiredOffers = offersWithStatus.filter((o) => o.effective === "expired");
  const scheduledOffers = offersWithStatus.filter(
    (o) => o.effective === "scheduled" && o.start_date && o.start_date <= warningCutoffStr,
  );

  const warningCutoffFull = warningCutoff.toISOString();
  const featuredBusinesses = businesses.filter((b) => b.featured_level !== "none");
  const featuredSummary = {
    active: featuredBusinesses.filter((b) => effectiveFeaturedLevel(b) !== "none").length,
    earningsAllTimeGbp: featuredHistory.reduce((sum, h) => sum + (h.amount_charged ?? 0), 0),
  };
  const featuredExpiringSoon = featuredBusinesses
    .filter(
      (b) =>
        effectiveFeaturedLevel(b) !== "none" &&
        b.featured_expires_at &&
        b.featured_expires_at <= warningCutoffFull,
    )
    .map((b) => ({ id: b.id, name: b.name, expires_at: b.featured_expires_at as string }));
  const featuredLapsed = featuredBusinesses
    .filter((b) => effectiveFeaturedLevel(b) === "none" && b.featured_expires_at)
    .map((b) => ({ id: b.id, name: b.name, expired_at: b.featured_expires_at as string }));

  const deletionRequests = members
    .filter((m) => m.deletion_requested_at)
    .map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`.trim() || m.email,
      requestedAt: m.deletion_requested_at as string,
    }));

  return {
    members: memberSummary,
    businesses: businessSummary,
    offers: offerSummary,
    featured: featuredSummary,
    monthlyMrr: subscriptionOverview.monthlyMrr,
    annualRevenueGbp: subscriptionOverview.annualRevenueGbp,
    totalRevenueCollectedGbp,
    actionCentre: {
      expiringOffers,
      expiredOffers,
      scheduledOffers,
      pastDueMembers: subscriptionOverview.pastDueMembers,
      deletionRequests,
      featuredExpiringSoon,
      featuredLapsed,
      flaggedOfferBusinesses,
    },
    recentActivity,
  };
}

/**
 * Nav-badge count for the Dashboard link, mirroring the "Applications"
 * badge. Deliberately NOT built on getDashboardSummary() — that pulls
 * Stripe (MRR, refunds, all-time revenue) and would add a live Stripe
 * round-trip to every single admin page load via the layout. Everything
 * the Action Centre actually flags (expiring/expired/scheduled offers,
 * past-due members, deletion requests, featured expiring/lapsed,
 * flagged offer-report businesses) is derivable from Supabase alone —
 * past-due status lives on `profiles`
 * directly, no Stripe lookup needed for the count. Kept in sync by hand
 * with the equivalent block in getDashboardSummary() above.
 */
export async function getActionCentreCount(): Promise<number> {
  const systemSettings = await getSystemSettings();
  const [members, businesses, offers, flaggedOfferBusinesses] = await Promise.all([
    listMembers(),
    listBusinesses(),
    listAllOffers(),
    listFlaggedBusinesses(systemSettings.offer_report_flag_threshold),
  ]);

  const warningDays = systemSettings.default_expiry_warning_days;
  const warningCutoff = new Date();
  warningCutoff.setDate(warningCutoff.getDate() + warningDays);
  const warningCutoffStr = warningCutoff.toISOString().slice(0, 10);
  const warningCutoffFull = warningCutoff.toISOString();

  const offersWithStatus = offers.map((o) => ({ ...o, effective: effectiveStatus(o) }));
  const expiringOffersCount = offersWithStatus.filter(
    (o) => o.effective === "active" && o.expiry_date && o.expiry_date <= warningCutoffStr,
  ).length;
  const expiredOffersCount = offersWithStatus.filter((o) => o.effective === "expired").length;
  const scheduledOffersCount = offersWithStatus.filter(
    (o) => o.effective === "scheduled" && o.start_date && o.start_date <= warningCutoffStr,
  ).length;

  const pastDueMembersCount = members.filter((m) => m.subscription_status === "past_due").length;
  const deletionRequestsCount = members.filter((m) => m.deletion_requested_at).length;

  const featuredBusinesses = businesses.filter((b) => b.featured_level !== "none");
  const featuredExpiringSoonCount = featuredBusinesses.filter(
    (b) =>
      effectiveFeaturedLevel(b) !== "none" &&
      b.featured_expires_at &&
      b.featured_expires_at <= warningCutoffFull,
  ).length;
  const featuredLapsedCount = featuredBusinesses.filter(
    (b) => effectiveFeaturedLevel(b) === "none" && b.featured_expires_at,
  ).length;

  return (
    expiringOffersCount +
    expiredOffersCount +
    scheduledOffersCount +
    pastDueMembersCount +
    deletionRequestsCount +
    featuredExpiringSoonCount +
    featuredLapsedCount +
    flaggedOfferBusinesses.length
  );
}
