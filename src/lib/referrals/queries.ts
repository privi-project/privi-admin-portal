import { createAdminClient } from "@/lib/supabase/admin";

// referral_rewards/profiles.referral_code/referred_by all live in the
// WEBSITE repo's schema.sql, not this one — same shared Supabase
// project, so a plain admin-client query reaches it fine, same pattern
// already used for every other cross-repo table in this codebase.
export type ReferralReward = {
  id: string;
  reward_type: "new_member_discount" | "referrer_reward";
  amount_gbp: number;
  created_at: string;
  referrer_name: string;
  referred_name: string;
  // Added 2026-08-31 alongside the accumulation cap — without these, a
  // capped or complimentary-referrer row (always amount_gbp: 0) showed
  // as an unexplained "£0.00" in the list, indistinguishable from
  // something having gone wrong. Totals were never actually affected
  // (a £0 row contributes nothing either way), only the display was
  // misleading.
  capped: boolean;
  complimentaryReferrer: boolean;
};

export type ReferralSummary = {
  totalReferrals: number; // distinct successful referrals (referrer_reward rows)
  totalCreditedGbp: number; // both reward types combined — the real cost of the programme so far
  rewards: ReferralReward[];
};

export async function getReferralSummary(): Promise<ReferralSummary> {
  const adminClient = createAdminClient();
  if (!adminClient) return { totalReferrals: 0, totalCreditedGbp: 0, rewards: [] };

  const { data } = await adminClient
    .from("referral_rewards")
    .select(
      `id, reward_type, amount_gbp, created_at, capped, complimentary_referrer,
       referrer:profiles!referral_rewards_referrer_id_fkey(first_name, last_name),
       referred:profiles!referral_rewards_referred_id_fkey(first_name, last_name)`,
    )
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    reward_type: "new_member_discount" | "referrer_reward";
    amount_gbp: number;
    created_at: string;
    capped: boolean | null;
    complimentary_referrer: boolean | null;
    referrer: { first_name: string; last_name: string } | null;
    referred: { first_name: string; last_name: string } | null;
  };

  const rows = (data as unknown as Row[]) ?? [];

  const rewards: ReferralReward[] = rows.map((r) => ({
    id: r.id,
    reward_type: r.reward_type,
    amount_gbp: r.amount_gbp,
    created_at: r.created_at,
    referrer_name: r.referrer ? `${r.referrer.first_name} ${r.referrer.last_name}`.trim() : "—",
    referred_name: r.referred ? `${r.referred.first_name} ${r.referred.last_name}`.trim() : "—",
    capped: Boolean(r.capped),
    complimentaryReferrer: Boolean(r.complimentary_referrer),
  }));

  return {
    // Counts new_member_discount rows, not referrer_reward — every
    // successful referral produces exactly one of the former regardless
    // of referrer type, but a complimentary referrer never earns the
    // latter (by design, see the webhook). Counting referrer_reward here
    // would silently undercount real, successful referrals that came
    // through a complimentary member.
    totalReferrals: rewards.filter((r) => r.reward_type === "new_member_discount").length,
    totalCreditedGbp: rewards.reduce((sum, r) => sum + r.amount_gbp, 0),
    rewards,
  };
}
