import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only admin client using the service_role key — bypasses Row Level
 * Security. Never import this into a client component or expose the key to
 * the browser. This is how nearly all Admin Portal data access works: RLS
 * on `profiles` only grants members access to their own row, so business,
 * offer, member and subscription management all go through this client
 * instead (see PRIVI_Backend_Schema_Reference.md).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
