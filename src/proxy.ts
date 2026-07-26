import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_ACTIVITY_COOKIE,
  ADMIN_IDLE_TIMEOUT_MINUTES,
  ADMIN_TIMEOUT_MINUTES_COOKIE,
} from "@/lib/auth/constants";

// Reachable with no session at all.
const FULLY_PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
];

// Reachable with a signed-in-but-not-yet-MFA-elevated (aal1) session — this
// is where that elevation actually happens, so they can't require aal2
// themselves.
const MFA_PATHS = ["/mfa/enroll", "/mfa/challenge"];

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// The authoritative "is this actually an admin" check happens separately in
// requireAdminSession() (src/lib/auth/session.ts), called from the (admin)
// layout — Proxy only ever does cheap, optimistic checks (no DB calls), per
// Next's own guidance in node_modules/next/dist/docs/.../authentication.md.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, supabase, user } = await updateSession(request);

  if (matches(pathname, FULLY_PUBLIC_PATHS)) {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (matches(pathname, MFA_PATHS)) {
    // Signed in, not yet aal2 — exactly what these routes are for.
    return response;
  }

  // Everything else requires MFA elevation. Local JWT decode, no network
  // round-trip, safe to run on every request.
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    return NextResponse.redirect(new URL("/mfa/challenge", request.url));
  }

  // Idle timeout — separate from Supabase's own refresh-token expiry. A
  // plain httpOnly cookie tracks last activity on protected routes only.
  const lastActivity = request.cookies.get(ADMIN_ACTIVITY_COOKIE)?.value;
  const now = Date.now();

  // The configured minutes travel in their own cookie, fetched from
  // system_settings ONCE per session (only when there's no activity cookie
  // yet, i.e. the first protected request after MFA elevation) rather than
  // on every request — keeps this "cheap and optimistic" in aggregate while
  // still letting Settings (task #11) actually control it. A change to the
  // setting takes effect on the admin's next fresh session, not instantly
  // mid-session — deliberate, documented tradeoff rather than adding a DB
  // call to every single request.
  let timeoutMinutes = Number(request.cookies.get(ADMIN_TIMEOUT_MINUTES_COOKIE)?.value);
  if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0) {
    timeoutMinutes = ADMIN_IDLE_TIMEOUT_MINUTES;
    if (!lastActivity) {
      const adminClient = createAdminClient();
      if (adminClient) {
        const { data } = await adminClient
          .from("system_settings")
          .select("session_timeout_minutes")
          .eq("id", 1)
          .maybeSingle();
        if (data?.session_timeout_minutes) timeoutMinutes = data.session_timeout_minutes;
      }
    }
  }
  const timeoutMs = timeoutMinutes * 60 * 1000;

  if (lastActivity && now - Number(lastActivity) > timeoutMs) {
    await supabase.auth.signOut();
    const redirectResponse = NextResponse.redirect(
      new URL("/login?reason=timeout", request.url),
    );
    redirectResponse.cookies.delete(ADMIN_ACTIVITY_COOKIE);
    redirectResponse.cookies.delete(ADMIN_TIMEOUT_MINUTES_COOKIE);
    return redirectResponse;
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  response.cookies.set(ADMIN_ACTIVITY_COOKIE, String(now), cookieOptions);
  response.cookies.set(ADMIN_TIMEOUT_MINUTES_COOKIE, String(timeoutMinutes), cookieOptions);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
