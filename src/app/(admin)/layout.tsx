import { requireAdminSession } from "@/lib/auth/session";
import { NavigationBlockerProvider } from "@/lib/navigation-blocker";
import { AdminShell } from "@/components/admin-shell";
import { countNewApplications } from "@/lib/business-applications/queries";
import { getActionCentreCount } from "@/lib/dashboard/queries";
import { countUnpaidFeaturedPayments } from "@/lib/featured/payment-queries";
import { countOpenOfferReports } from "@/lib/offer-reports/queries";
import { signOutAction } from "./actions";

// Everything under (admin) is gated by requireAdminSession(), the
// authoritative DAL check (Proxy's aal2 check is only optimistic).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();
  const [newApplicationsCount, actionCentreCount, unpaidFeaturedCount, openOfferReportsCount] = await Promise.all([
    countNewApplications(),
    getActionCentreCount(),
    countUnpaidFeaturedPayments(),
    countOpenOfferReports(),
  ]);

  return (
    <NavigationBlockerProvider>
      <AdminShell
        newApplicationsCount={newApplicationsCount}
        actionCentreCount={actionCentreCount}
        unpaidFeaturedCount={unpaidFeaturedCount}
        openOfferReportsCount={openOfferReportsCount}
        signedInAsEmail={session.email}
        logoutForm={
          <form action={signOutAction}>
            <button type="submit" className="shrink-0 text-gold">
              Log out
            </button>
          </form>
        }
      >
        {children}
      </AdminShell>
    </NavigationBlockerProvider>
  );
}
