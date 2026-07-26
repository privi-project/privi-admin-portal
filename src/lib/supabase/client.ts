import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client — safe to use in client components. Used
 * for the admin's own sign-in form; everything after auth goes through
 * `createAdminClient` (service_role) for actual portal data. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
