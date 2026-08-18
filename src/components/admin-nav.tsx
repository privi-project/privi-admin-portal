"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "@/components/nav-link";

// Admin_Portal_Structure.docx's "Final v1 Navigation" list, in order.
// Reports is dashboard-level only at v1 (no separate page, folded into
// Dashboard's summary figures) so it's not a nav item. "Featured" added
// 2026-08-19 — post-v1, once featured placement became a real paid
// product needing its own management view rather than a per-business
// setting.
const NAV_ITEMS = [
  { href: "/home", label: "Dashboard" },
  { href: "/businesses", label: "Businesses" },
  { href: "/business-applications", label: "Applications" },
  { href: "/featured", label: "Featured" },
  { href: "/members", label: "Members" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/notifications", label: "Notifications" },
  { href: "/activity-log", label: "Activity Log" },
  { href: "/app-data", label: "App Data" },
  { href: "/settings", label: "Settings" },
];

// href -> live count for the small gold pill badge next to a nav item's
// label. Zero/absent counts render no badge at all. Plain helper, not a
// hook — no "use" prefix, it calls no hooks of its own.
function navBadgeCounts(
  newApplicationsCount: number,
  actionCentreCount: number,
  unpaidFeaturedCount: number,
): Record<string, number> {
  return {
    "/business-applications": newApplicationsCount,
    "/home": actionCentreCount,
    "/featured": unpaidFeaturedCount,
  };
}

export function AdminNav({
  newApplicationsCount = 0,
  actionCentreCount = 0,
  unpaidFeaturedCount = 0,
}: {
  newApplicationsCount?: number;
  actionCentreCount?: number;
  unpaidFeaturedCount?: number;
}) {
  const pathname = usePathname();
  const badges = navBadgeCounts(newApplicationsCount, actionCentreCount, unpaidFeaturedCount);

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badgeCount = badges[item.href] ?? 0;
        return (
          <NavLink
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
              isActive ? "privi-gold-border border bg-teal text-ivory [--gold-border-bg:var(--color-teal)]" : "text-charcoal hover:bg-border-hairline-2"
            }`}
          >
            {item.label}
            {badgeCount > 0 && (
              <span
                className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  isActive ? "bg-ivory text-teal" : "privi-gold-fill text-charcoal"
                }`}
              >
                {badgeCount}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
