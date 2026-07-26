import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { listMembers } from "@/lib/members/queries";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);
  const members = await listMembers({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    plan: searchParams.get("plan") ?? undefined,
    complimentary: searchParams.get("complimentary") === "on",
    suspended: searchParams.get("suspended") === "on",
  });

  const headers = [
    "First name",
    "Last name",
    "Email",
    "Email verified",
    "Subscription status",
    "Plan",
    "Complimentary",
    "Suspended",
    "Joined",
  ];

  const rows = members.map((m) =>
    [
      m.first_name,
      m.last_name,
      m.email,
      m.email_confirmed ? "Yes" : "No",
      m.subscription_status,
      m.subscription_plan ?? "",
      m.is_complimentary ? "Yes" : "No",
      m.is_suspended ? "Yes" : "No",
      m.created_at,
    ]
      .map((v) => csvEscape(String(v)))
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="members-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
