"use client";

import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";

// Wraps the sidebar + top header so the sidebar can become a slide-in
// drawer on mobile instead of squeezing every page's content into
// whatever's left of a 375px screen. Desktop behavior is unchanged — the
// sidebar is permanently visible and the hamburger button never renders.
export function AdminShell({
  newApplicationsCount,
  actionCentreCount,
  unpaidFeaturedCount,
  openOfferReportsCount,
  signedInAsEmail,
  logoutForm,
  children,
}: {
  newApplicationsCount: number;
  actionCentreCount: number;
  unpaidFeaturedCount: number;
  openOfferReportsCount: number;
  signedInAsEmail: string;
  logoutForm: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col border-r border-border-hairline bg-white transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-4 text-sm font-medium">Privi Admin</div>
        <AdminNav
          newApplicationsCount={newApplicationsCount}
          actionCentreCount={actionCentreCount}
          unpaidFeaturedCount={unpaidFeaturedCount}
          openOfferReportsCount={openOfferReportsCount}
          onNavigate={() => setIsOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border-hairline px-4 py-3 text-sm md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-charcoal hover:bg-border-hairline-2 md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <span className="truncate">Signed in as {signedInAsEmail}</span>
          </div>
          {logoutForm}
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
