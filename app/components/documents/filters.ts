// URL-driven filters for the Documents page. Pure + framework-free: the loader parses and
// applies them on the server, the filter bar reads the parsed values back to render state.
import { type DerivedDocument, type DocumentStatus, isDocumentStatus, isTimeSensitive } from "~/lib/domain";

export const EXPIRATION_FILTERS = ["expiring", "expired", "conflicts", "time-sensitive"] as const;
export type ExpirationFilter = (typeof EXPIRATION_FILTERS)[number];

export interface DocumentFilters {
  q: string;
  type: string | null;
  status: DocumentStatus | null;
  processor: string | null;
  expiration: ExpirationFilter | null;
}

/** The search-param names, so links elsewhere (e.g. the dashboard) can build URLs safely. */
export const FILTER_PARAMS = ["q", "type", "status", "processor", "expiration"] as const;

function isExpirationFilter(value: unknown): value is ExpirationFilter {
  return typeof value === "string" && (EXPIRATION_FILTERS as readonly string[]).includes(value);
}

/** Unknown / malformed values are ignored rather than erroring, so an old bookmark still loads. */
export function parseDocumentFilters(params: URLSearchParams): DocumentFilters {
  const text = (key: string) => params.get(key)?.trim() || null;
  const status = text("status");
  const expiration = text("expiration");
  return {
    q: text("q") ?? "",
    type: text("type"),
    status: isDocumentStatus(status) ? status : null,
    processor: text("processor"),
    expiration: isExpirationFilter(expiration) ? expiration : null,
  };
}

export function hasActiveFilters(f: DocumentFilters): boolean {
  return Boolean(f.q || f.type || f.status || f.processor || f.expiration);
}

export function matchesSearch(doc: DerivedDocument, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [doc.businessName, doc.borrowerName, doc.applicationId, doc.documentType, doc.processor, doc.notes].some(
    (field) => field.toLowerCase().includes(needle),
  );
}

export function matchesExpiration(doc: DerivedDocument, expiration: ExpirationFilter | null): boolean {
  switch (expiration) {
    case null:
      return true;
    case "expiring":
      return doc.expiringSoon;
    case "expired":
      return doc.effectiveStatus === "Expired";
    case "conflicts":
      return doc.statusConflict;
    case "time-sensitive":
      return isTimeSensitive(doc.documentType);
  }
}

/** Search + type + processor: the "scope" the quick-filter chip counts are computed over. */
export function matchesScope(doc: DerivedDocument, f: DocumentFilters): boolean {
  return (
    matchesSearch(doc, f.q) &&
    (!f.type || doc.documentType === f.type) &&
    (!f.processor || doc.processor === f.processor)
  );
}

export function matchesFilters(doc: DerivedDocument, f: DocumentFilters): boolean {
  return (
    matchesScope(doc, f) &&
    (!f.status || doc.effectiveStatus === f.status) &&
    matchesExpiration(doc, f.expiration)
  );
}

export interface QuickFilterCounts {
  expiring: number;
  expired: number;
  pending: number;
  conflicts: number;
  timeSensitive: number;
}

export function countQuickFilters(docs: DerivedDocument[]): QuickFilterCounts {
  const counts: QuickFilterCounts = { expiring: 0, expired: 0, pending: 0, conflicts: 0, timeSensitive: 0 };
  for (const d of docs) {
    if (d.expiringSoon) counts.expiring++;
    if (d.effectiveStatus === "Expired") counts.expired++;
    if (d.effectiveStatus === "Pending") counts.pending++;
    if (d.statusConflict) counts.conflicts++;
    if (isTimeSensitive(d.documentType)) counts.timeSensitive++;
  }
  return counts;
}

/** Just the fields the table + CSV export need (keeps the loader payload small). */
export function toDocumentRow(d: DerivedDocument) {
  return {
    id: d.id,
    applicationId: d.applicationId,
    businessName: d.businessName,
    borrowerName: d.borrowerName,
    processor: d.processor,
    documentType: d.documentType,
    status: d.status,
    effectiveStatus: d.effectiveStatus,
    autoExpired: d.autoExpired,
    statusConflict: d.statusConflict,
    dateReceived: d.dateReceived,
    expirationDate: d.expirationDate,
    daysUntilExpiration: d.daysUntilExpiration,
    expiringSoon: d.expiringSoon,
    notes: d.notes,
  };
}
export type DocumentRow = ReturnType<typeof toDocumentRow>;
