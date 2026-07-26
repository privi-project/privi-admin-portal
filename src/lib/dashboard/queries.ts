import { listMembers } from "@/lib/members/queries";
import { listBusinesses } from "@/lib/businesses/queries";
import { listAllOffers, effectiveStatus, type OfferWithBusinessName } from "@/lib/offers/queries";
import { getSubscriptionOverview } from "@/lib/subscriptions/queries";
import { getSystemSettings } from "@/lib/system-settings/queries";
import { listActivity, type ActivityLogRow } from "@/lib/activity/queries";

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
  mrr: number;
  arr: number;
  actionCentre: {
    expiringOffers: OfferWithBusinessName[];
    expiredOffers: OfferWithBusinessName[];
    scheduledOffers: OfferWithBusinessName[];
    pastDueMembers: { id: string; name: string; email: string }[];
    deletionRequests: { id: string; name: string; requestedAt: string }[];
  };
  recentActivity: ActivityLogRow[];
};

export async function getDashboardSummary(periodDays: number): Promise<DashboardSummary> {
  const [members, businesses, offers, subscriptionOverview, systemSettings, recentActivity] =
    await Promise.all([
      listMembers(),
      listBusinesses(),
      listAllOffers(),
      getSubscriptionOverview(),
      getSystemSettings(),
      listActivity(10),
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
    mrr: subscriptionOverview.mrr,
    arr: subscriptionOverview.arr,
    actionCentre: {
      expiringOffers,
      expiredOffers,
      scheduledOffers,
      pastDueMembers: subscriptionOverview.pastDueMembers,
      deletionRequests,
    },
    recentActivity,
  };
}
