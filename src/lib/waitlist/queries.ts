import { createAdminClient } from "@/lib/supabase/admin";

export type WaitlistOverview = {
  total: number;
  pendingLiveEmail: number; // notified_at is null, hasn't signed up yet
  pendingReminder: number; // notified but not reminded, still hasn't signed up
};

// waitlist_signups only ever stores an email (see that table's own
// schema comment) — there's no direct link to auth.users, so "has this
// address already signed up" is answered by listing users and matching
// on email, same pattern already used in src/lib/members/queries.ts.
// Fine at this scale (a one-time pre-launch list, not an ongoing
// growing table) — not built to scale past the 1000-user page size.
async function getSignedUpEmailSet(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<Set<string>> {
  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  return new Set((data?.users ?? []).map((u) => (u.email ?? "").toLowerCase()));
}

export async function getWaitlistOverview(): Promise<WaitlistOverview> {
  const adminClient = createAdminClient();
  if (!adminClient) return { total: 0, pendingLiveEmail: 0, pendingReminder: 0 };

  const [{ data: rows }, signedUpEmails] = await Promise.all([
    adminClient.from("waitlist_signups").select("email, notified_at, reminded_at"),
    getSignedUpEmailSet(adminClient),
  ]);

  const list = rows ?? [];
  const isSignedUp = (email: string) => signedUpEmails.has(email.toLowerCase());

  return {
    total: list.length,
    pendingLiveEmail: list.filter((r) => !r.notified_at && !isSignedUp(r.email)).length,
    pendingReminder: list.filter((r) => r.notified_at && !r.reminded_at && !isSignedUp(r.email)).length,
  };
}
