import { createAdminClient } from "@/lib/supabase/admin";

export type Member = {
  id: string;
  email: string;
  email_confirmed: boolean;
  created_at: string;
  is_banned: boolean;
  first_name: string;
  last_name: string;
  preferred_area: string | null;
  stripe_customer_id: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  is_complimentary: boolean;
  complimentary_reason: string | null;
  complimentary_expires_at: string | null;
  admin_notes: string | null;
  is_suspended: boolean;
  deletion_requested_at: string | null;
};

export type MemberListFilters = {
  q?: string;
  status?: string;
  plan?: string;
  complimentary?: boolean;
  suspended?: boolean;
  // Filters on created_at (when they joined) — for monthly-style
  // reporting exports. Doesn't change the live member list itself, only
  // ever passed from the export route.
  from?: string;
  to?: string;
};

// Known v1 limitation: fetches up to 1000 auth.users in one call rather
// than true server-side pagination. Fine at current/expected early-stage
// member counts — would need revisiting if the member base grows into
// the thousands.
async function listAllMembersUnfiltered(): Promise<Member[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  const [{ data: userPage }, { data: profileRows }, { data: adminRows }] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    adminClient.from("profiles").select("*"),
    adminClient.from("admin_users").select("id"),
  ]);

  const profilesById = new Map((profileRows ?? []).map((row) => [row.id, row]));
  // Admin accounts get an auto-created profiles row too (harmless side
  // effect of the shared handle_new_user() trigger) — excluded here so
  // the founder's own login never shows up in the Members list.
  const adminIds = new Set((adminRows ?? []).map((row) => row.id));

  return (userPage?.users ?? [])
    .map((user) => {
      if (adminIds.has(user.id)) return null;
      const profile = profilesById.get(user.id);
      if (!profile) return null;

      return {
        id: user.id,
        email: user.email ?? "",
        email_confirmed: Boolean(user.email_confirmed_at),
        created_at: user.created_at,
        is_banned: Boolean(user.banned_until && new Date(user.banned_until) > new Date()),
        first_name: profile.first_name,
        last_name: profile.last_name,
        preferred_area: profile.preferred_area,
        stripe_customer_id: profile.stripe_customer_id,
        subscription_status: profile.subscription_status,
        subscription_plan: profile.subscription_plan,
        is_complimentary: profile.is_complimentary,
        complimentary_reason: profile.complimentary_reason,
        complimentary_expires_at: profile.complimentary_expires_at,
        admin_notes: profile.admin_notes,
        is_suspended: profile.is_suspended,
        deletion_requested_at: profile.deletion_requested_at,
      } satisfies Member;
    })
    .filter((m): m is Member => m !== null);
}

export async function listMembers(filters: MemberListFilters = {}): Promise<Member[]> {
  let members = await listAllMembersUnfiltered();

  if (filters.q) {
    const q = filters.q.toLowerCase();
    members = members.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q),
    );
  }
  if (filters.status) {
    members = members.filter((m) => m.subscription_status === filters.status);
  }
  if (filters.plan) {
    members = members.filter((m) => m.subscription_plan === filters.plan);
  }
  if (filters.complimentary) {
    members = members.filter((m) => m.is_complimentary);
  }
  if (filters.suspended) {
    members = members.filter((m) => m.is_suspended);
  }
  if (filters.from) {
    members = members.filter((m) => m.created_at >= filters.from!);
  }
  if (filters.to) {
    members = members.filter((m) => m.created_at <= filters.to!);
  }

  return members.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getMember(id: string): Promise<Member | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const [{ data: userData }, { data: profile }, { data: adminRow }] = await Promise.all([
    adminClient.auth.admin.getUserById(id),
    adminClient.from("profiles").select("*").eq("id", id).maybeSingle(),
    adminClient.from("admin_users").select("id").eq("id", id).maybeSingle(),
  ]);

  if (!userData?.user || !profile || adminRow) return null;

  const user = userData.user;

  return {
    id: user.id,
    email: user.email ?? "",
    email_confirmed: Boolean(user.email_confirmed_at),
    created_at: user.created_at,
    is_banned: Boolean(user.banned_until && new Date(user.banned_until) > new Date()),
    first_name: profile.first_name,
    last_name: profile.last_name,
    preferred_area: profile.preferred_area,
    stripe_customer_id: profile.stripe_customer_id,
    subscription_status: profile.subscription_status,
    subscription_plan: profile.subscription_plan,
    is_complimentary: profile.is_complimentary,
    complimentary_reason: profile.complimentary_reason,
    complimentary_expires_at: profile.complimentary_expires_at,
    admin_notes: profile.admin_notes,
    is_suspended: profile.is_suspended,
    deletion_requested_at: profile.deletion_requested_at,
  };
}
