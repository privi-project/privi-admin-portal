import { getReferralSummary } from "@/lib/referrals/queries";

const REWARD_TYPE_LABELS: Record<string, string> = {
  new_member_discount: "New member's month-2 discount",
  referrer_reward: "Referrer's free month",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ReferralsPage() {
  const { totalReferrals, totalCreditedGbp, rewards } = await getReferralSummary();

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium">Referrals</h1>
      <p className="mt-1 text-sm text-muted-dark">
        Fully automatic — every reward below was applied by the sign-up flow and the Stripe webhook with
        no admin action. This page is read-only, for visibility only.
      </p>

      <div className="mt-6 flex gap-4">
        <div className="rounded-2xl border border-border-hairline bg-white px-4 py-3">
          <p className="text-xs text-muted-dark">Successful referrals</p>
          <p className="mt-1 text-lg font-medium">{totalReferrals}</p>
        </div>
        <div className="rounded-2xl border border-border-hairline bg-white px-4 py-3">
          <p className="text-xs text-muted-dark">Total credited (all time)</p>
          <p className="mt-1 text-lg font-medium">£{totalCreditedGbp.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-6 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {rewards.length === 0 && <p className="p-6 text-sm text-muted-dark">No referrals yet.</p>}
        {rewards.map((reward) => (
          <div key={reward.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{REWARD_TYPE_LABELS[reward.reward_type]}</p>
              <p className="truncate text-xs text-muted-dark">
                {reward.reward_type === "referrer_reward"
                  ? `${reward.referrer_name} referred ${reward.referred_name}`
                  : `${reward.referred_name} — referred by ${reward.referrer_name}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {/* Capped/complimentary rows are always £0.00 by design —
                  a real referral that succeeded but earned nothing extra,
                  not a failure. Labelled explicitly so this never reads
                  as something having gone wrong (see this file's own
                  queries.ts comment). */}
              {reward.capped ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-muted-dark">
                  Capped — already at limit
                </span>
              ) : reward.complimentaryReferrer ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-muted-dark">
                  Complimentary — no billing to credit
                </span>
              ) : (
                <span className="text-xs text-muted-dark">£{reward.amount_gbp.toFixed(2)}</span>
              )}
              <span className="text-xs text-muted-dark">{formatDate(reward.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
