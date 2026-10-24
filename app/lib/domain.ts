// Domain model + pure business rules for the SBA document checklist.
// Everything here is framework-free and safe to import on client or server.
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

export const DOCUMENT_STATUSES = [
  "Pending",
  "Received",
  "Under Review",
  "Approved",
  "Expired",
  "Not Required",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "SBA Form 1919",
  "SBA Form 912",
  "Personal Tax Returns (3yr)",
  "Business Tax Returns (3yr)",
  "Business Financial Statements",
  "Bank Statements (90 day)",
  "Debt Schedule",
  "Ownership Verification",
  "Articles of Incorporation",
  "Business Licenses & Permits",
  "Lease Agreement",
  "Insurance Verification",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Validity window (days after receipt) for time-sensitive documents. Verified against the sample data. */
export const EXPIRATION_RULES: Partial<Record<string, number>> = {
  "Bank Statements (90 day)": 90,
  "Personal Tax Returns (3yr)": 1095,
  "Business Tax Returns (3yr)": 1095,
  "Insurance Verification": 365,
};

/** Documents within this many days of expiring are flagged "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;
/** Applications with outstanding docs and no activity for this many days are "stalled". */
export const STALLED_AFTER_DAYS = 14;
/** The sample data was exported around Feb 12, 2026, so the demo defaults to the day after. */
export const DEFAULT_AS_OF = "2026-02-13";

export type StatusGroup = "outstanding" | "in-progress" | "complete";

export const STATUS_GROUP: Record<DocumentStatus, StatusGroup> = {
  Pending: "outstanding",
  Expired: "outstanding",
  Received: "in-progress",
  "Under Review": "in-progress",
  Approved: "complete",
  "Not Required": "complete",
};

/** One row of the CSV. Dates are ISO `yyyy-MM-dd` strings (or null). */
export interface DocumentRecord {
  /** Stable key: `${applicationId}::${documentType}` (unique in the data). */
  id: string;
  applicationId: string;
  businessName: string;
  borrowerName: string;
  loanAmount: number;
  applicationDate: string;
  processor: string;
  documentType: string;
  status: DocumentStatus;
  dateReceived: string | null;
  expirationDate: string | null;
  notes: string;
}

/** A document with status/flags derived for a given as-of date. */
export interface DerivedDocument extends DocumentRecord {
  /** Status after applying the as-of date (a passed expiration date ⇒ "Expired"). */
  effectiveStatus: DocumentStatus;
  group: StatusGroup;
  /** Stored status was not "Expired" but the expiration date has passed. */
  autoExpired: boolean;
  /** Stored status is "Expired" but the expiration date is still in the future. */
  statusConflict: boolean;
  /** Days until expiration (negative = already expired). Null when no expiration date. */
  daysUntilExpiration: number | null;
  expiringSoon: boolean;
}

export type ApplicationHealth = "stalled" | "at-risk" | "on-track" | "complete";

export interface ApplicationSummary {
  applicationId: string;
  businessName: string;
  borrowerName: string;
  loanAmount: number;
  applicationDate: string;
  processor: string;
  totalDocs: number;
  completeDocs: number;
  inProgressDocs: number;
  outstandingDocs: number;
  expiredDocs: number;
  expiringSoonDocs: number;
  /** 0–100, share of documents in the "complete" group. */
  progressPct: number;
  /** Latest date_received on or before as-of, else the application date. */
  lastActivityDate: string;
  daysSinceActivity: number;
  daysOpen: number;
  isStalled: boolean;
  health: ApplicationHealth;
}

// ---------- dates ----------

export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Accepts `M/D/YYYY` (CSV format) or ISO; returns ISO or null. */
export function normalizeDate(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return parseDate(v) ? v.slice(0, 10) : null;
}

/** ISO → `M/D/YYYY`, matching the original spreadsheet export. */
export function toCsvDate(iso: string | null): string {
  const d = parseDate(iso);
  return d ? format(d, "M/d/yyyy") : "";
}

export function formatDisplayDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? format(d, "MMM d, yyyy") : "—";
}

export function daysBetween(fromIso: string, toIso: string): number {
  return differenceInCalendarDays(parseISO(toIso), parseISO(fromIso));
}

export function computeExpirationDate(documentType: string, dateReceived: string | null): string | null {
  const days = EXPIRATION_RULES[documentType];
  const received = parseDate(dateReceived);
  if (!days || !received) return null;
  return toIsoDate(addDays(received, days));
}

export function isTimeSensitive(documentType: string): boolean {
  return EXPIRATION_RULES[documentType] !== undefined;
}

// ---------- derivation ----------

export function deriveDocument(doc: DocumentRecord, asOf: string): DerivedDocument {
  const daysUntilExpiration = doc.expirationDate ? daysBetween(asOf, doc.expirationDate) : null;
  const pastExpiration = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const canAutoExpire = doc.status === "Received" || doc.status === "Under Review" || doc.status === "Approved";
  const autoExpired = canAutoExpire && pastExpiration;
  const effectiveStatus: DocumentStatus = autoExpired ? "Expired" : doc.status;
  return {
    ...doc,
    effectiveStatus,
    group: STATUS_GROUP[effectiveStatus],
    autoExpired,
    statusConflict: doc.status === "Expired" && daysUntilExpiration !== null && daysUntilExpiration >= 0,
    daysUntilExpiration,
    expiringSoon:
      effectiveStatus !== "Expired" &&
      daysUntilExpiration !== null &&
      daysUntilExpiration >= 0 &&
      daysUntilExpiration <= EXPIRING_SOON_DAYS,
  };
}

export function deriveDocuments(docs: DocumentRecord[], asOf: string): DerivedDocument[] {
  return docs.map((d) => deriveDocument(d, asOf));
}

export function summarizeApplication(docs: DerivedDocument[], asOf: string): ApplicationSummary {
  const first = docs[0];
  const count = (pred: (d: DerivedDocument) => boolean) => docs.filter(pred).length;
  const completeDocs = count((d) => d.group === "complete");
  const inProgressDocs = count((d) => d.group === "in-progress");
  const outstandingDocs = count((d) => d.group === "outstanding");
  const expiredDocs = count((d) => d.effectiveStatus === "Expired");
  const expiringSoonDocs = count((d) => d.expiringSoon);

  const lastActivityDate = docs
    .map((d) => d.dateReceived)
    .filter((d): d is string => !!d && d <= asOf)
    .reduce((max, d) => (d > max ? d : max), first.applicationDate);
  const daysSinceActivity = Math.max(0, daysBetween(lastActivityDate, asOf));
  const isStalled = outstandingDocs > 0 && daysSinceActivity >= STALLED_AFTER_DAYS;

  let health: ApplicationHealth = "on-track";
  if (outstandingDocs === 0 && inProgressDocs === 0) health = "complete";
  else if (isStalled) health = "stalled";
  else if (expiredDocs > 0 || expiringSoonDocs > 0) health = "at-risk";

  return {
    applicationId: first.applicationId,
    businessName: first.businessName,
    borrowerName: first.borrowerName,
    loanAmount: first.loanAmount,
    applicationDate: first.applicationDate,
    processor: first.processor,
    totalDocs: docs.length,
    completeDocs,
    inProgressDocs,
    outstandingDocs,
    expiredDocs,
    expiringSoonDocs,
    progressPct: docs.length ? Math.round((completeDocs / docs.length) * 100) : 0,
    lastActivityDate,
    daysSinceActivity,
    daysOpen: Math.max(0, daysBetween(first.applicationDate, asOf)),
    isStalled,
    health,
  };
}

export function groupByApplication<T extends { applicationId: string }>(docs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const d of docs) {
    const list = map.get(d.applicationId);
    if (list) list.push(d);
    else map.set(d.applicationId, [d]);
  }
  return map;
}

export function summarizeApplications(docs: DerivedDocument[], asOf: string): ApplicationSummary[] {
  return [...groupByApplication(docs).values()]
    .map((group) => summarizeApplication(group, asOf))
    .sort((a, b) => a.applicationId.localeCompare(b.applicationId));
}

// ---------- pipeline (dashboard / weekly summary / alerts) ----------

export interface PipelineSummary {
  asOf: string;
  totalApplications: number;
  activeApplications: number;
  completeApplications: number;
  stalledApplications: number;
  atRiskApplications: number;
  applicationsWithOutstanding: number;
  totalLoanVolume: number;
  stalledLoanVolume: number;
  totalDocuments: number;
  documentsByStatus: Record<DocumentStatus, number>;
  documentsByGroup: Record<StatusGroup, number>;
  expiredDocuments: number;
  expiringSoonDocuments: number;
  /** Share of all documents in the "complete" group, 0–100. */
  completionPct: number;
  byProcessor: {
    processor: string;
    applications: number;
    stalled: number;
    outstandingDocs: number;
    inProgressDocs: number;
    completeDocs: number;
  }[];
  byDocumentType: {
    documentType: string;
    outstanding: number;
    inProgress: number;
    complete: number;
    expired: number;
  }[];
}

export function summarizePipeline(
  docs: DerivedDocument[],
  apps: ApplicationSummary[],
  asOf: string,
): PipelineSummary {
  const documentsByStatus = Object.fromEntries(DOCUMENT_STATUSES.map((s) => [s, 0])) as Record<DocumentStatus, number>;
  const documentsByGroup: Record<StatusGroup, number> = { outstanding: 0, "in-progress": 0, complete: 0 };
  for (const d of docs) {
    documentsByStatus[d.effectiveStatus]++;
    documentsByGroup[d.group]++;
  }

  const processors = [...new Set(apps.map((a) => a.processor))].sort();
  const byProcessor = processors.map((processor) => {
    const mine = apps.filter((a) => a.processor === processor);
    return {
      processor,
      applications: mine.length,
      stalled: mine.filter((a) => a.isStalled).length,
      outstandingDocs: mine.reduce((n, a) => n + a.outstandingDocs, 0),
      inProgressDocs: mine.reduce((n, a) => n + a.inProgressDocs, 0),
      completeDocs: mine.reduce((n, a) => n + a.completeDocs, 0),
    };
  });

  const byDocumentType = DOCUMENT_TYPES.map((documentType) => {
    const mine = docs.filter((d) => d.documentType === documentType);
    return {
      documentType,
      outstanding: mine.filter((d) => d.group === "outstanding").length,
      inProgress: mine.filter((d) => d.group === "in-progress").length,
      complete: mine.filter((d) => d.group === "complete").length,
      expired: mine.filter((d) => d.effectiveStatus === "Expired").length,
    };
  }).sort((a, b) => b.outstanding - a.outstanding);

  const stalled = apps.filter((a) => a.isStalled);
  return {
    asOf,
    totalApplications: apps.length,
    activeApplications: apps.filter((a) => a.health !== "complete").length,
    completeApplications: apps.filter((a) => a.health === "complete").length,
    stalledApplications: stalled.length,
    atRiskApplications: apps.filter((a) => a.health === "at-risk").length,
    applicationsWithOutstanding: apps.filter((a) => a.outstandingDocs > 0).length,
    totalLoanVolume: apps.reduce((n, a) => n + a.loanAmount, 0),
    stalledLoanVolume: stalled.reduce((n, a) => n + a.loanAmount, 0),
    totalDocuments: docs.length,
    documentsByStatus,
    documentsByGroup,
    expiredDocuments: documentsByStatus.Expired,
    expiringSoonDocuments: docs.filter((d) => d.expiringSoon).length,
    completionPct: docs.length ? Math.round((documentsByGroup.complete / docs.length) * 100) : 0,
    byProcessor,
    byDocumentType,
  };
}

// ---------- updates ----------

export interface DocumentUpdate {
  status: DocumentStatus;
  dateReceived?: string | null;
  expirationDate?: string | null;
  notes?: string;
}

export function isDocumentStatus(value: unknown): value is DocumentStatus {
  return typeof value === "string" && (DOCUMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Apply an edit from the UI, filling in the obvious fields so processors don't have to:
 * - Pending / Not Required clear the received + expiration dates (nothing on file).
 * - Received / Under Review / Approved default the received date to `asOf` if missing.
 * - Time-sensitive docs get an expiration date computed from the received date unless one is given.
 */
export function applyDocumentUpdate(doc: DocumentRecord, update: DocumentUpdate, asOf: string): DocumentRecord {
  const next: DocumentRecord = {
    ...doc,
    status: update.status,
    notes: update.notes !== undefined ? update.notes.trim() : doc.notes,
  };

  if (update.status === "Pending" || update.status === "Not Required") {
    next.dateReceived = null;
    next.expirationDate = null;
    return next;
  }

  // Expired: keep whatever dates are on file (or explicitly given) — don't invent a fresh receipt.
  if (update.status === "Expired") {
    if (update.dateReceived !== undefined) next.dateReceived = update.dateReceived;
    if (update.expirationDate !== undefined) next.expirationDate = update.expirationDate;
    return next;
  }

  // An expired doc marked Received (or moved off a stored "Expired") without a date means a fresh copy
  // came in today. Reviewing/approving a doc that merely passed its date is not a new copy.
  // (A stored "Expired" whose expiration is still in the future is a correction — keep its dates.)
  const wasExpired = doc.expirationDate ? doc.expirationDate < asOf : doc.status === "Expired";
  const freshCopy = wasExpired && (doc.status === "Expired" || update.status === "Received");
  const dateReceived =
    update.dateReceived !== undefined ? update.dateReceived : freshCopy ? asOf : doc.dateReceived;
  const receivedChanged = dateReceived !== doc.dateReceived;
  next.dateReceived = dateReceived || asOf;

  if (update.expirationDate) {
    next.expirationDate = update.expirationDate;
  } else if (isTimeSensitive(doc.documentType)) {
    // Explicitly cleared, received date changed, or nothing on file ⇒ recalculate.
    if (update.expirationDate === null || receivedChanged || !doc.expirationDate) {
      next.expirationDate = computeExpirationDate(doc.documentType, next.dateReceived);
    }
  } else if (update.expirationDate === null) {
    next.expirationDate = null;
  }
  return next;
}
