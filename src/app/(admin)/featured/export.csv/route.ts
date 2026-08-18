import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { listFeaturedBusinesses, effectiveFeaturedLevel } from "@/lib/businesses/queries";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Intended for the founder's own invoicing/renewal bookkeeping — includes
// lapsed placements too, not just currently-active ones, since a lapsed
// entry is exactly the kind of thing worth having a paper trail of when
// reconciling who's actually paid for what.
export async function GET() {
  await requireAdminSession();

  const businesses = await listFeaturedBusinesses();

  const headers = ["Business", "Tier", "Status", "Started", "Expires", "Contact email"];

  const rows = businesses.map((b) =>
    [
      b.name,
      b.featured_level === "global" ? "Sitewide" : "Category",
      effectiveFeaturedLevel(b) === "none" ? "Lapsed" : "Active",
      b.featured_at ?? "",
      b.featured_expires_at ?? "",
      b.contact_email,
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="featured-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
