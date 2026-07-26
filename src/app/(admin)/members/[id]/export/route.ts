import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { getMember } from "@/lib/members/queries";

// Fulfils a data-subject access request — the practical minimum (their
// own profiles + basic auth data as a downloadable file), not a formatted
// legal report.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await params;

  const member = await getMember(id);
  if (!member) notFound();

  // admin_notes/is_suspended are internal records about the member, not
  // data from/about them in the GDPR sense — excluded from their export.
  const exportable = {
    id: member.id,
    email: member.email,
    email_confirmed: member.email_confirmed,
    created_at: member.created_at,
    first_name: member.first_name,
    last_name: member.last_name,
    preferred_area: member.preferred_area,
    subscription_status: member.subscription_status,
    subscription_plan: member.subscription_plan,
    is_complimentary: member.is_complimentary,
  };

  return new NextResponse(JSON.stringify(exportable, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="member-${id}-data.json"`,
    },
  });
}
