import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSession = {
  userId: string;
  email: string;
  displayName: string | null;
};

/**
 * The authoritative "is this actually an admin" check — a real Postgres
 * lookup against admin_users via the service-role client, bypassing RLS.
 * Proxy (src/proxy.ts) only ever does cheap, optimistic session/aal2
 * checks; this is what actually gates every protected page/action, per
 * Next's own recommended two-layer pattern. A valid Supabase session with
 * no matching admin_users row is treated as an intruder, not an error:
 * signed out immediately, no exceptions.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("Admin Supabase client is not configured.");
  }

  const { data: adminUser } = await adminClient
    .from("admin_users")
    .select("id, email, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminUser) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    userId: adminUser.id,
    email: adminUser.email,
    displayName: adminUser.display_name,
  };
}
