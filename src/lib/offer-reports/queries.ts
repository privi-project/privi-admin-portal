import { createAdminClient } from "@/lib/supabase/admin";

export type OfferReportStatus = "open" | "resolved";
export type OfferReportReason = "not_honoured" | "not_as_described" | "already_expired" | "other";

export const REASON_LABELS: Record<OfferReportReason, string> = {
  not_honoured: "Business wouldn't honour it",
  not_as_described: "Offer wasn't as described",
  already_expired: "Offer had already expired",
  other: "Something else",
};

export type OfferReportRow = {
  id: string;
  offer_id: string;
  offer_title: string;
  business_id: string;
  business_name: string;
  member_id: string;
  member_name: string;
  reason: OfferReportReason;
  note: string | null;
  status: OfferReportStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

type Row = {
  id: string;
  offer_id: string;
  business_id: string;
  member_id: string;
  reason: OfferReportReason;
  note: string | null;
  status: OfferReportStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  offers: { title: string } | null;
  businesses: { name: string } | null;
};

/**
 * Deliberately not a nested profiles(...) embed — offer_reports.member_id
 * references auth.users, not public.profiles, so there's no FK for
 * PostgREST to embed through. A second lookup by id is the same pattern
 * members/queries.ts uses to attach a display name.
 */
export async function listOfferReports(filters: { status?: OfferReportStatus } = {}): Promise<OfferReportRow[]> {
  const adminClient = createAdminClient();
  if (!adminClient) return [];

  let query = adminClient
    .from("offer_reports")
    .select(
      "id, offer_id, business_id, member_id, reason, note, status, admin_notes, resolved_at, created_at, offers(title), businesses(name)",
    )
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data } = await query;
  if (!data) return [];

  const rows = data as unknown as Row[];
  const memberIds = [...new Set(rows.map((r) => r.member_id))];

  const { data: profileRows } = memberIds.length
    ? await adminClient.from("profiles").select("id, first_name, last_name").in("id", memberIds)
    : { data: [] as { id: string; first_name: string; last_name: string }[] };

  const namesById = new Map((profileRows ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));

  return rows.map((row) => ({
    id: row.id,
    offer_id: row.offer_id,
    offer_title: row.offers?.title ?? "Deleted offer",
    business_id: row.business_id,
    business_name: row.businesses?.name ?? "Deleted business",
    member_id: row.member_id,
    member_name: namesById.get(row.member_id) || "Unknown member",
    reason: row.reason,
    note: row.note,
    status: row.status,
    admin_notes: row.admin_notes,
    resolved_at: row.resolved_at,
    created_at: row.created_at,
  }));
}

export type FlaggedBusiness = {
  business_id: string;
  business_name: string;
  open_count: number;
};

/**
 * Businesses whose OPEN report count has crossed system_settings.
 * offer_report_flag_threshold — what surfaces on the Dashboard's Action
 * Centre. A flat count, not a rate: there's no redemption-volume data to
 * divide by (redemption codes/barcodes are deliberately untracked once
 * shown — a design choice, not a gap), so this is the founder's original
 * "N strikes" idea as-built, kept exactly that simple. Never actioned
 * automatically — purely a signal into the Offer Reports review list.
 */
export async function listFlaggedBusinesses(threshold: number): Promise<FlaggedBusiness[]> {
  const openReports = await listOfferReports({ status: "open" });

  const counts = new Map<string, { business_name: string; count: number }>();
  for (const r of openReports) {
    const existing = counts.get(r.business_id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(r.business_id, { business_name: r.business_name, count: 1 });
    }
  }

  return [...counts.entries()]
    .filter(([, v]) => v.count >= threshold)
    .map(([business_id, v]) => ({ business_id, business_name: v.business_name, open_count: v.count }))
    .sort((a, b) => b.open_count - a.open_count);
}

export async function countOpenOfferReports(): Promise<number> {
  const adminClient = createAdminClient();
  if (!adminClient) return 0;

  const { count } = await adminClient
    .from("offer_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return count ?? 0;
}
