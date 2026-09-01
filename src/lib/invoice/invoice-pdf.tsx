import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { COMPANY_DETAILS } from "@/lib/company-details";
import type { FeaturedPaymentRequest } from "@/lib/featured/payment-queries";

const GOLD = "#B08D3E";
const TEAL = "#4E7C77";
const DARK = "#2B2B2B";
const GREY = "#6B6B6B";
const HAIRLINE = "#E3E0D6";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: DARK, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: GOLD, letterSpacing: 1 },
  docTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: TEAL, marginTop: 4, letterSpacing: 1 },
  fromBlock: { marginTop: 2, fontSize: 9, color: GREY, lineHeight: 1.5 },
  metaBlock: { alignItems: "flex-end" },
  metaLabel: { fontSize: 8, color: GREY, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, color: DARK, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  divider: { borderBottomWidth: 1, borderBottomColor: HAIRLINE, marginVertical: 20 },
  sectionLabel: {
    fontSize: 8,
    color: GOLD,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  billTo: { fontSize: 10, color: DARK, lineHeight: 1.5 },
  table: { marginTop: 24, borderTopWidth: 1, borderTopColor: DARK },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  colDescription: { flex: 1 },
  colAmount: { width: 90, textAlign: "right" },
  tableHeaderText: { fontSize: 8, color: GREY, textTransform: "uppercase", letterSpacing: 0.5 },
  itemTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK },
  itemSubtitle: { fontSize: 9, color: GREY, marginTop: 2 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 24,
    alignItems: "center",
  },
  totalLabel: { fontSize: 10, color: GREY },
  totalValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: TEAL },
  bottomGrid: { flexDirection: "row", marginTop: 36, gap: 40 },
  bottomCol: { flex: 1 },
  bankLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  bankLabel: { fontSize: 9, color: GREY },
  bankValue: { fontSize: 9, color: DARK, fontFamily: "Helvetica-Bold" },
  terms: { fontSize: 9, color: GREY, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: GREY,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 10,
  },
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function tierLabel(level: "category" | "global"): string {
  return level === "global" ? "Homepage and category" : "Category only";
}

export function InvoicePdf({
  payment,
  invoiceNumber,
}: {
  payment: FeaturedPaymentRequest;
  invoiceNumber: string;
}) {
  const { legalName, companyNumber, registeredAddress, vatNumber, bank, defaultTerms } = COMPANY_DETAILS;

  return (
    <Document title={`${invoiceNumber} — ${payment.business_name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>PRIVI</Text>
            <Text style={styles.docTitle}>PROFORMA INVOICE</Text>
            <View style={styles.fromBlock}>
              <Text>{legalName}</Text>
              <Text>Company No. {companyNumber}</Text>
              <Text>{registeredAddress.line1}</Text>
              {registeredAddress.line2 && <Text>{registeredAddress.line2}</Text>}
              <Text>
                {registeredAddress.city} {registeredAddress.postcode}
              </Text>
              <Text>{registeredAddress.country}</Text>
              {vatNumber && <Text>VAT No. {vatNumber}</Text>}
            </View>
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Invoice Number</Text>
            <Text style={styles.metaValue}>{invoiceNumber}</Text>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{formatDate(payment.created_at)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Bill To</Text>
        <View style={styles.billTo}>
          <Text>{payment.business_name}</Text>
          {payment.billing_address
            ?.split("\n")
            .map((line, i) => <Text key={i}>{line}</Text>)}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.colDescription}>
              <Text style={styles.itemTitle}>Featured Placement — {tierLabel(payment.featured_level)}</Text>
              <Text style={styles.itemSubtitle}>
                {payment.duration_months} month{payment.duration_months === 1 ? "" : "s"}
                {payment.notes ? ` · ${payment.notes}` : ""}
              </Text>
            </View>
            <Text style={[styles.colAmount, styles.itemTitle]}>£{payment.amount_gbp.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total due</Text>
          <Text style={styles.totalValue}>£{payment.amount_gbp.toFixed(2)}</Text>
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.bottomCol}>
            <Text style={styles.sectionLabel}>Payment Details</Text>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>Bank</Text>
              <Text style={styles.bankValue}>{bank.name}</Text>
            </View>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>Account Name</Text>
              <Text style={styles.bankValue}>{bank.accountName}</Text>
            </View>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>Sort Code</Text>
              <Text style={styles.bankValue}>{bank.sortCode}</Text>
            </View>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>Account Number</Text>
              <Text style={styles.bankValue}>{bank.accountNumber}</Text>
            </View>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>Reference</Text>
              <Text style={styles.bankValue}>{invoiceNumber}</Text>
            </View>
          </View>

          <View style={styles.bottomCol}>
            <Text style={styles.sectionLabel}>Terms</Text>
            <Text style={styles.terms}>{defaultTerms}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          This is a proforma invoice, not a VAT invoice — {legalName} is not currently VAT
          registered. Please quote the reference above with your payment.
        </Text>
      </Page>
    </Document>
  );
}
