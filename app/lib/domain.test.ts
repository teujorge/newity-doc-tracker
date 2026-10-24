import { describe, expect, it } from "vitest";
import {
  type DocumentRecord,
  applyDocumentUpdate,
  computeExpirationDate,
  deriveDocument,
  normalizeDate,
  summarizeApplication,
  toCsvDate,
} from "./domain";

const AS_OF = "2026-02-13";

function doc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "APP-1::Bank Statements (90 day)",
    applicationId: "APP-1",
    businessName: "Metro Dental Group",
    borrowerName: "Elena Williams",
    loanAmount: 390000,
    applicationDate: "2025-12-01",
    processor: "Aisha Patel",
    documentType: "Bank Statements (90 day)",
    status: "Received",
    dateReceived: "2025-10-30",
    expirationDate: "2026-01-28",
    notes: "",
    ...overrides,
  };
}

describe("deriveDocument", () => {
  it("auto-expires a Received bank statement whose expiration date has passed", () => {
    const d = deriveDocument(doc({ status: "Received", expirationDate: "2026-01-28" }), AS_OF);
    expect(d.effectiveStatus).toBe("Expired");
    expect(d.autoExpired).toBe(true);
    expect(d.group).toBe("outstanding");
    expect(d.daysUntilExpiration).toBe(-16);
    expect(d.expiringSoon).toBe(false);
    expect(d.statusConflict).toBe(false);
  });

  it("auto-expires Under Review and Approved docs too", () => {
    for (const status of ["Under Review", "Approved"] as const) {
      const d = deriveDocument(doc({ status, expirationDate: "2026-02-12" }), AS_OF);
      expect(d.effectiveStatus).toBe("Expired");
      expect(d.autoExpired).toBe(true);
    }
  });

  it("is not expired on the expiration day itself", () => {
    const d = deriveDocument(doc({ expirationDate: AS_OF }), AS_OF);
    expect(d.effectiveStatus).toBe("Received");
    expect(d.autoExpired).toBe(false);
    expect(d.daysUntilExpiration).toBe(0);
  });

  it("flags a stored Expired status whose expiration is still in the future as a conflict", () => {
    const d = deriveDocument(doc({ status: "Expired", expirationDate: "2026-04-01" }), AS_OF);
    expect(d.statusConflict).toBe(true);
    expect(d.effectiveStatus).toBe("Expired");
    expect(d.autoExpired).toBe(false);
  });

  it("does not flag a conflict for a stored Expired status with a past expiration date", () => {
    const d = deriveDocument(doc({ status: "Expired", expirationDate: "2026-01-01" }), AS_OF);
    expect(d.statusConflict).toBe(false);
  });

  it("marks expiringSoon at 0 and 30 days, but not at 31", () => {
    expect(deriveDocument(doc({ expirationDate: "2026-02-13" }), AS_OF).expiringSoon).toBe(true); // 0
    expect(deriveDocument(doc({ expirationDate: "2026-03-15" }), AS_OF).daysUntilExpiration).toBe(30);
    expect(deriveDocument(doc({ expirationDate: "2026-03-15" }), AS_OF).expiringSoon).toBe(true); // 30
    expect(deriveDocument(doc({ expirationDate: "2026-03-16" }), AS_OF).expiringSoon).toBe(false); // 31
  });

  it("never auto-expires Pending or Not Required docs", () => {
    for (const status of ["Pending", "Not Required"] as const) {
      const d = deriveDocument(doc({ status, expirationDate: "2025-01-01" }), AS_OF);
      expect(d.effectiveStatus).toBe(status);
      expect(d.autoExpired).toBe(false);
    }
  });

  it("has null daysUntilExpiration and no flags when there is no expiration date", () => {
    const d = deriveDocument(doc({ documentType: "Debt Schedule", expirationDate: null }), AS_OF);
    expect(d.daysUntilExpiration).toBeNull();
    expect(d.expiringSoon).toBe(false);
    expect(d.autoExpired).toBe(false);
    expect(d.statusConflict).toBe(false);
  });
});

describe("computeExpirationDate", () => {
  it("adds 90 days for bank statements", () => {
    expect(computeExpirationDate("Bank Statements (90 day)", "2025-10-30")).toBe("2026-01-28");
  });

  it("adds 1095 days for personal and business tax returns", () => {
    expect(computeExpirationDate("Personal Tax Returns (3yr)", "2026-01-29")).toBe("2029-01-28");
    expect(computeExpirationDate("Business Tax Returns (3yr)", "2026-01-29")).toBe("2029-01-28");
  });

  it("adds 365 days for insurance verification", () => {
    expect(computeExpirationDate("Insurance Verification", "2026-01-15")).toBe("2027-01-15");
  });

  it("returns null for document types without an expiration rule", () => {
    expect(computeExpirationDate("SBA Form 1919", "2026-01-15")).toBeNull();
    expect(computeExpirationDate("Debt Schedule", "2026-01-15")).toBeNull();
  });

  it("returns null when there is no received date", () => {
    expect(computeExpirationDate("Bank Statements (90 day)", null)).toBeNull();
  });
});

describe("summarizeApplication", () => {
  const derive = (docs: DocumentRecord[], asOf = AS_OF) => docs.map((d) => deriveDocument(d, asOf));
  const nonExpiring = (overrides: Partial<DocumentRecord>) =>
    doc({ documentType: "Debt Schedule", expirationDate: null, ...overrides });

  it("is stalled when docs are outstanding and nothing was received for 14 days", () => {
    const docs = derive([
      nonExpiring({ documentType: "Debt Schedule", status: "Approved", dateReceived: "2026-01-30" }),
      nonExpiring({ documentType: "SBA Form 1919", status: "Pending", dateReceived: null }),
    ]);
    const s = summarizeApplication(docs, AS_OF);
    expect(s.daysSinceActivity).toBe(14);
    expect(s.isStalled).toBe(true);
    expect(s.health).toBe("stalled");
  });

  it("is not stalled after only 13 days without activity", () => {
    const docs = derive([
      nonExpiring({ documentType: "Debt Schedule", status: "Approved", dateReceived: "2026-01-31" }),
      nonExpiring({ documentType: "SBA Form 1919", status: "Pending", dateReceived: null }),
    ]);
    const s = summarizeApplication(docs, AS_OF);
    expect(s.daysSinceActivity).toBe(13);
    expect(s.isStalled).toBe(false);
    expect(s.health).toBe("on-track");
  });

  it("is not stalled when nothing is outstanding, even with old activity", () => {
    const docs = derive([
      nonExpiring({ status: "Under Review", dateReceived: "2025-12-01" }),
      nonExpiring({ documentType: "SBA Form 1919", status: "Approved", dateReceived: "2025-12-01" }),
    ]);
    const s = summarizeApplication(docs, AS_OF);
    expect(s.isStalled).toBe(false);
    expect(s.health).toBe("on-track");
  });

  it("is complete when every doc is Approved or Not Required", () => {
    const docs = derive([
      nonExpiring({ status: "Approved", dateReceived: "2025-12-05" }),
      nonExpiring({ documentType: "Lease Agreement", status: "Not Required", dateReceived: null }),
    ]);
    const s = summarizeApplication(docs, AS_OF);
    expect(s.health).toBe("complete");
    expect(s.progressPct).toBe(100);
  });

  it("is at risk when a doc is expired or expiring soon (but not stalled)", () => {
    const expired = derive([
      doc({ status: "Received", dateReceived: "2026-02-10", expirationDate: "2026-02-01" }),
      nonExpiring({ documentType: "SBA Form 1919", status: "Approved", dateReceived: "2026-02-10" }),
    ]);
    expect(summarizeApplication(expired, AS_OF).health).toBe("at-risk");

    const expiringSoon = derive([
      doc({ status: "Received", dateReceived: "2026-02-10", expirationDate: "2026-03-01" }),
      nonExpiring({ documentType: "SBA Form 1919", status: "Approved", dateReceived: "2026-02-10" }),
    ]);
    const s = summarizeApplication(expiringSoon, AS_OF);
    expect(s.expiringSoonDocs).toBe(1);
    expect(s.health).toBe("at-risk");
  });

  it("ignores received dates after the as-of date when finding last activity", () => {
    const docs = derive([
      nonExpiring({ status: "Approved", dateReceived: "2026-01-20" }),
      nonExpiring({ documentType: "SBA Form 1919", status: "Received", dateReceived: "2026-03-01" }),
      nonExpiring({ documentType: "Lease Agreement", status: "Pending", dateReceived: null }),
    ]);
    const s = summarizeApplication(docs, AS_OF);
    expect(s.lastActivityDate).toBe("2026-01-20");
    expect(s.daysSinceActivity).toBe(24);
  });

  it("falls back to the application date when nothing has been received", () => {
    const docs = derive([nonExpiring({ status: "Pending", dateReceived: null, applicationDate: "2026-02-05" })]);
    const s = summarizeApplication(docs, AS_OF);
    expect(s.lastActivityDate).toBe("2026-02-05");
    expect(s.daysOpen).toBe(8);
  });

  it("computes progressPct as the rounded share of complete docs", () => {
    const docs = derive([
      nonExpiring({ documentType: "A", status: "Approved", dateReceived: "2026-02-10" }),
      nonExpiring({ documentType: "B", status: "Pending", dateReceived: null }),
      nonExpiring({ documentType: "C", status: "Received", dateReceived: "2026-02-10" }),
    ]);
    const s = summarizeApplication(docs, AS_OF);
    expect(s.progressPct).toBe(33);
    expect(s.completeDocs).toBe(1);
    expect(s.outstandingDocs).toBe(1);
    expect(s.inProgressDocs).toBe(1);
    expect(s.totalDocs).toBe(3);
  });
});

describe("applyDocumentUpdate", () => {
  it("clears dates when set to Pending or Not Required", () => {
    for (const status of ["Pending", "Not Required"] as const) {
      const next = applyDocumentUpdate(doc(), { status }, AS_OF);
      expect(next.status).toBe(status);
      expect(next.dateReceived).toBeNull();
      expect(next.expirationDate).toBeNull();
    }
  });

  it("keeps existing dates (and invents none) when marked Expired", () => {
    const pending = doc({ status: "Pending", dateReceived: null, expirationDate: null });
    const next = applyDocumentUpdate(pending, { status: "Expired" }, AS_OF);
    expect(next.dateReceived).toBeNull();
    expect(next.expirationDate).toBeNull();

    const received = doc({ status: "Received", dateReceived: "2025-10-30", expirationDate: "2026-01-28" });
    const expired = applyDocumentUpdate(received, { status: "Expired" }, AS_OF);
    expect(expired.dateReceived).toBe("2025-10-30");
    expect(expired.expirationDate).toBe("2026-01-28");
  });

  it("treats re-receiving an expired doc as a fresh copy dated as-of", () => {
    const stale = doc({ status: "Received", dateReceived: "2025-10-01", expirationDate: "2025-12-30" });
    const next = applyDocumentUpdate(stale, { status: "Received" }, AS_OF);
    expect(next.dateReceived).toBe(AS_OF);
    expect(next.expirationDate).toBe("2026-05-14");
  });

  it("keeps dates when correcting a mislabelled Expired doc whose date is still in the future", () => {
    const mislabelled = doc({ status: "Expired", dateReceived: "2026-01-10", expirationDate: "2026-04-10" });
    const next = applyDocumentUpdate(mislabelled, { status: "Approved" }, AS_OF);
    expect(next.dateReceived).toBe("2026-01-10");
    expect(next.expirationDate).toBe("2026-04-10");
  });

  it("recalculates a time-sensitive expiration when the field is explicitly cleared", () => {
    const received = doc({ status: "Received", dateReceived: "2026-01-10", expirationDate: "2026-12-31" });
    const next = applyDocumentUpdate(received, { status: "Received", expirationDate: null }, AS_OF);
    expect(next.expirationDate).toBe("2026-04-10");
  });

  it("defaults dateReceived to as-of and computes expiration for time-sensitive docs", () => {
    const pending = doc({ status: "Pending", dateReceived: null, expirationDate: null });
    const next = applyDocumentUpdate(pending, { status: "Received" }, AS_OF);
    expect(next.dateReceived).toBe(AS_OF);
    expect(next.expirationDate).toBe("2026-05-14"); // +90 days
  });

  it("computes a 3-year expiration for tax returns", () => {
    const pending = doc({ documentType: "Personal Tax Returns (3yr)", status: "Pending", dateReceived: null, expirationDate: null });
    const next = applyDocumentUpdate(pending, { status: "Received", dateReceived: "2026-01-29" }, AS_OF);
    expect(next.expirationDate).toBe("2029-01-28");
  });

  it("does not invent an expiration for non-time-sensitive docs", () => {
    const pending = doc({ documentType: "Debt Schedule", status: "Pending", dateReceived: null, expirationDate: null });
    const next = applyDocumentUpdate(pending, { status: "Received" }, AS_OF);
    expect(next.dateReceived).toBe(AS_OF);
    expect(next.expirationDate).toBeNull();
  });

  it("recomputes expiration when the received date changes", () => {
    const next = applyDocumentUpdate(doc(), { status: "Received", dateReceived: "2026-02-01" }, AS_OF);
    expect(next.expirationDate).toBe("2026-05-02");
  });

  it("keeps the existing expiration when only the status changes", () => {
    const next = applyDocumentUpdate(doc(), { status: "Under Review" }, AS_OF);
    expect(next.dateReceived).toBe("2025-10-30");
    expect(next.expirationDate).toBe("2026-01-28");
  });

  it("uses an explicit expirationDate over the computed one", () => {
    const pending = doc({ status: "Pending", dateReceived: null, expirationDate: null });
    const next = applyDocumentUpdate(
      pending,
      { status: "Received", dateReceived: "2026-02-01", expirationDate: "2026-12-31" },
      AS_OF,
    );
    expect(next.expirationDate).toBe("2026-12-31");
  });

  it("trims notes, and leaves notes alone when not provided", () => {
    expect(applyDocumentUpdate(doc(), { status: "Received", notes: "  Called borrower  " }, AS_OF).notes).toBe(
      "Called borrower",
    );
    expect(applyDocumentUpdate(doc({ notes: "keep me" }), { status: "Received" }, AS_OF).notes).toBe("keep me");
  });

  it("does not mutate the original record", () => {
    const original = doc();
    const copy = { ...original };
    applyDocumentUpdate(original, { status: "Pending", notes: "x" }, AS_OF);
    expect(original).toEqual(copy);
  });
});

describe("normalizeDate / toCsvDate", () => {
  it("converts M/D/YYYY to ISO and back", () => {
    expect(normalizeDate("1/5/2026")).toBe("2026-01-05");
    expect(toCsvDate("2026-01-05")).toBe("1/5/2026");
    expect(toCsvDate(normalizeDate("12/31/2025"))).toBe("12/31/2025");
  });

  it("passes ISO dates through and trims whitespace", () => {
    expect(normalizeDate("2026-01-05")).toBe("2026-01-05");
    expect(normalizeDate("  2/3/2026 ")).toBe("2026-02-03");
  });

  it("returns null / empty for blank or invalid input", () => {
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate("not a date")).toBeNull();
    expect(toCsvDate(null)).toBe("");
  });
});
