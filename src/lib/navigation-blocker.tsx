"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Shared unsaved-changes guard (Admin_Portal_Structure.docx Section 14:
// "unsaved-changes warning"). Two halves, per Next's own documented
// pattern (node_modules/next/dist/docs/.../link.md, "Blocking navigation"):
// this context tracks whether in-app Link navigation should be blocked;
// NavLink (src/components/nav-link.tsx) is the Link wrapper that actually
// checks it. Tab close/refresh is a separate browser mechanism
// (beforeunload), wired up by useUnsavedChangesGuard below.
type NavigationBlockerContextType = {
  isBlocked: boolean;
  setIsBlocked: (isBlocked: boolean) => void;
};

const NavigationBlockerContext = createContext<NavigationBlockerContextType>({
  isBlocked: false,
  setIsBlocked: () => {},
});

export function NavigationBlockerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBlocked, setIsBlocked] = useState(false);
  return (
    <NavigationBlockerContext.Provider value={{ isBlocked, setIsBlocked }}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  return useContext(NavigationBlockerContext);
}

/**
 * Call from any form with local dirty state:
 *   const [isDirty, setIsDirty] = useState(false);
 *   useUnsavedChangesGuard(isDirty);
 * Covers both in-app navigation (via NavLink) and tab close/refresh (via
 * beforeunload).
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const { setIsBlocked } = useNavigationBlocker();

  useEffect(() => {
    setIsBlocked(isDirty);
    return () => setIsBlocked(false);
  }, [isDirty, setIsBlocked]);

  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
