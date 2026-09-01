import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdminSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureInvoiceNumberAction } from "../../actions";
import { InvoicePdf } from "@/lib/invoice/invoice-pdf";
import type { FeaturedPaymentRequest } from "@/lib/featured/payment-queries";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Admin Supabase client is not configured." }, { status: 500 });
  }

  const { data: payment } = await adminClient
    .from("featured_payment_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle<FeaturedPaymentRequest>();

  if (!payment) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  // A billing address is the one thing genuinely required to produce a
  // sendable document — everything else on the record already has a
  // sensible fallback or default.
  if (!payment.billing_address) {
    return NextResponse.json(
      { error: "Add a billing address to this invoice first (edit it from the Featured Payments list)." },
      { status: 400 },
    );
  }

  const invoiceNumber = await ensureInvoiceNumberAction(id);

  const buffer = await renderToBuffer(<InvoicePdf payment={payment} invoiceNumber={invoiceNumber} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceNumber}.pdf"`,
    },
  });
}
