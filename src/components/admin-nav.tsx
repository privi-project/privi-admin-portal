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
  { href: "/featured", label: "Featured" },
  { href: "/members", label: "Members" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/notifications", label: "Notifications" },
  { href: "/activity-log", label: "Activity Log" },
  { href: "/app-data", label: "App Data" },
  { href: "/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <NavLink
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              isActive ? "privi-gold-border border bg-teal text-ivory [--gold-border-bg:var(--color-teal)]" : "text-charcoal hover:bg-border-hairline-2"
            }`}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
