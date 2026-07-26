"use client";

import Link from "next/link";
import { useNavigationBlocker } from "@/lib/navigation-blocker";

type NavLinkProps = React.ComponentProps<typeof Link>;

/**
 * Drop-in replacement for next/link everywhere inside the (admin) area —
 * checks the shared unsaved-changes guard before allowing in-app
 * navigation. Use this instead of next/link once forms exist (task #5+).
 */
export function NavLink({ children, ...props }: NavLinkProps) {
  const { isBlocked } = useNavigationBlocker();

  return (
    <Link
      onNavigate={(e) => {
        if (isBlocked && !window.confirm("You have unsaved changes. Leave anyway?")) {
          e.preventDefault();
        }
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
