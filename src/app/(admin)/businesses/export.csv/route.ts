import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { listBusinesses } from "@/lib/businesses/queries";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);
  const businesses = await listBusinesses({
    q: searchParams.get("q") ?? undefined,
    categoryId: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    sort: (searchParams.get("sort") as never) ?? undefined,
  });

  const headers = [
    "Name",
    "Status",
    "Categories",
    "Search keywords",
    "Locations",
    "Contact name",
    "Contact email",
    "Contact phone",
    "Created",
  ];

  const rows = businesses.map((b) =>
    [
      b.name,
      b.status,
      b.categories.map((c) => c.label).join("; "),
      b.search_keywords ?? "",
      String(b.location_count),
      b.contact_name,
      b.contact_email,
      b.contact_phone ?? "",
      b.created_at,
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="businesses-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
