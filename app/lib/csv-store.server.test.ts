import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDocumentsCsv, serializeDocumentsCsv } from "./csv-store.server";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from "./domain";

const seed = fs.readFileSync(
  path.resolve(__dirname, "../../docs/NEWITY_Sample_Data_A_Document_Checklist.csv"),
  "utf8",
);

const normalize = (csv: string) => csv.replace(/\r\n/g, "\n").trimEnd();

describe("csv store", () => {
  const docs = parseDocumentsCsv(seed);

  it("parses all 620 rows across 60 applications", () => {
    expect(docs).toHaveLength(620);
    expect(new Set(docs.map((d) => d.applicationId)).size).toBe(60);
  });

  it("gives every row a unique id", () => {
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
  });

  it("only produces known statuses and document types, with ISO dates", () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of docs) {
      expect(DOCUMENT_STATUSES).toContain(d.status);
      expect(DOCUMENT_TYPES).toContain(d.documentType);
      expect(d.applicationDate).toMatch(iso);
      if (d.dateReceived) expect(d.dateReceived).toMatch(iso);
      if (d.expirationDate) expect(d.expirationDate).toMatch(iso);
    }
  });

  it("parses a known row correctly", () => {
    const row = docs.find((d) => d.id === "APP-2026-1001::Bank Statements (90 day)");
    expect(row).toMatchObject({
      businessName: "Metro Dental Group",
      borrowerName: "Elena Williams",
      loanAmount: 390000,
      applicationDate: "2025-12-01",
      processor: "Aisha Patel",
      status: "Under Review",
      dateReceived: "2026-01-28",
      expirationDate: "2026-04-28",
      notes: "Reviewing for completeness",
    });
  });

  it("round-trips the seed file unchanged", () => {
    expect(normalize(serializeDocumentsCsv(docs))).toBe(normalize(seed));
  });

  it("falls back to Pending for an unknown status", () => {
    const csv =
      "application_id,business_name,borrower_name,loan_amount,application_date,assigned_processor,document_type,document_status,date_received,expiration_date,notes\n" +
      "APP-X,Biz,Bob,100,1/1/2026,Pat,Debt Schedule,Lost,,,\n";
    expect(parseDocumentsCsv(csv)[0].status).toBe("Pending");
  });
});
