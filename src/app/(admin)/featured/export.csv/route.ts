import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { listFeaturedHistory } from "@/lib/featured/queries";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Permanent accounting export — every set/renew ever recorded, matched
// against what was actually charged, same headers-and-plain-ISO-dates
// convention as members/export.csv and businesses/export.csv. `from`/`to`
// (plain YYYY-MM-DD from a date input) filter on started_at, so the
// founder isn't stuck re-exporting all history every time — `to` is
// pushed to the end of that day so the whole day is actually included,
// not cut off at midnight.
export async function GET(request: NextRequest) {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const toParam = searchParams.get("to");
  const to = toParam ? `${toParam}T23:59:59.999Z` : undefined;

  const history = await listFeaturedHistory({ from, to });

  const headers = ["Business", "Tier", "Duration (months)", "Amount charged", "Started", "Expires"];

  const rows = history.map((h) =>
    [
      h.business_name,
      h.featured_level === "global" ? "Homepage and category" : "Category only",
      String(h.duration_months),
      h.amount_charged != null ? h.amount_charged.toFixed(2) : "",
      h.started_at,
      h.expires_at,
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  const rangeSuffix = from || to ? `-${from ?? "start"}_to_${toParam ?? "now"}` : "";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="featured${rangeSuffix}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
