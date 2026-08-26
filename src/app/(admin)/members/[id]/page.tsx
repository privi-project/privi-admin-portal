import { NavLink } from "@/components/nav-link";
import { notFound } from "next/navigation";
import { getMember } from "@/lib/members/queries";
import { StatusBadge } from "@/components/status-badge";
import { AdminNotesForm } from "./admin-notes-form";
import { ComplimentaryControl } from "./complimentary-control";
import { SuspendControl } from "./suspend-control";
import { EmailStatusControl } from "./email-status-control";
import { SetPasswordControl } from "./set-password-control";
import { DangerZone } from "./danger-zone";
import { SubscriptionPanel } from "./subscription-panel";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ refunded?: string }>;
}) {
  const { id } = await params;
  const { refunded } = await searchParams;
  const member = await getMember(id);
  if (!member) notFound();

  const label = `${member.first_name} ${member.last_name}`.trim();

  return (
    <div className="p-6">
      <NavLink href="/members" className="text-sm text-gold">
        ← Back to members
      </NavLink>

      {refunded === "1" && (
        <p className="mt-2 rounded-lg bg-status-success/10 px-4 py-2 text-sm text-status-success">
          Refund recorded.
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-lg font-medium">{label || member.email}</h1>
        <div className="flex items-center gap-2">
          {/* Subscription status is meaningless for complimentary members
              — they never go through Stripe, so it would sit at whatever
              default it started at forever. The Complimentary badge is
              the only status that actually applies to them. */}
          {!member.is_complimentary && <StatusBadge status={member.subscription_status} />}
          {member.is_complimentary && <StatusBadge status="complimentary" />}
          {member.is_suspended && <StatusBadge status="suspended" />}
        </div>
      </div>

      <div className="mt-6 flex max-w-xl flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Identity &amp; email</h2>
          <EmailStatusControl
            memberId={id}
            label={label}
            email={member.email}
            emailConfirmed={member.email_confirmed}
          />
          <SetPasswordControl memberId={id} />
          <p className="text-xs text-muted-dark">
            Preferred area: {member.preferred_area ?? "Not set yet (expected until first app launch)"}
          </p>
          <p className="text-xs text-muted-dark">Joined: {member.created_at}</p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Subscription</h2>
          {member.is_complimentary && member.stripe_customer_id ? (
            // 2026-08-26: a complimentary member can now set up payment in
            // advance via the app (continue-membership), ahead of their
            // complimentary_expires_at date — this is why is_complimentary
            // and stripe_customer_id can both be set at once, which used
            // to be impossible. Nothing to manage here yet (no real
            // subscription exists until the trial converts), just make
            // that state legible rather than confusing.
            <p className="text-sm text-muted-dark">
              Payment already set up — this member&apos;s membership will
              convert automatically and be charged for the first time on
              their complimentary expiry date (see below). Nothing to
              manage here until then.
            </p>
          ) : member.is_complimentary ? (
            <p className="text-sm text-muted-dark">
              No Stripe subscription — this member has complimentary access
              instead (see below).
            </p>
          ) : (
            <SubscriptionPanel
              memberId={id}
              label={label}
              stripeCustomerId={member.stripe_customer_id}
            />
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Complimentary membership</h2>
          <ComplimentaryControl
            memberId={id}
            label={label}
            isComplimentary={member.is_complimentary}
            reason={member.complimentary_reason}
            expiresAt={member.complimentary_expires_at}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Admin notes</h2>
          <AdminNotesForm memberId={id} label={label} notes={member.admin_notes} />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border-hairline bg-white p-6">
          <h2 className="text-sm font-medium text-muted-dark">Account status</h2>
          <SuspendControl
            memberId={id}
            firstName={member.first_name}
            lastName={member.last_name}
            isSuspended={member.is_suspended}
          />
          <a
            href={`/members/${id}/export`}
            className="self-start rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium"
          >
            Export personal data
          </a>
        </section>

        <DangerZone
          memberId={id}
          label={label}
          hasActiveSubscription={member.subscription_status === "active"}
          deletionRequestedAt={member.deletion_requested_at}
        />
      </div>
    </div>
  );
}
