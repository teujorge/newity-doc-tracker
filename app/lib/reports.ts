// Pure "report" selectors shared by the dashboard and the weekly summary.
// Loaders call these to ship small, page-ready lists instead of all 620 documents.
import { addDays, format, parseISO } from "date-fns";
import {
  type ApplicationHealth,
  type ApplicationSummary,
  type DerivedDocument,
  type PipelineSummary,
  EXPIRING_SOON_DAYS,
  STALLED_AFTER_DAYS,
  formatDisplayDate,
} from "~/lib/domain";
import { formatCurrency } from "~/lib/format";

// ---------- stalled applications ----------

export interface StalledApplicationRow {
  applicationId: string;
  businessName: string;
  borrowerName: string;
  processor: string;
  loanAmount: number;
  outstandingDocs: number;
  daysSinceActivity: number;
  lastActivityDate: string;
}

/** Stalled applications, longest-quiet first. */
export function selectStalledApplications(apps: ApplicationSummary[], limit?: number): StalledApplicationRow[] {
  const rows = apps
    .filter((a) => a.isStalled)
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity || b.loanAmount - a.loanAmount)
    .map((a) => ({
      applicationId: a.applicationId,
      businessName: a.businessName,
      borrowerName: a.borrowerName,
      processor: a.processor,
      loanAmount: a.loanAmount,
      outstandingDocs: a.outstandingDocs,
      daysSinceActivity: a.daysSinceActivity,
      lastActivityDate: a.lastActivityDate,
    }));
  return limit === undefined ? rows : rows.slice(0, limit);
}

// ---------- expirations ----------

export interface ExpirationRow {
  id: string;
  applicationId: string;
  businessName: string;
  processor: string;
  documentType: string;
  expirationDate: string | null;
  daysUntilExpiration: number | null;
  expired: boolean;
}

function toExpirationRow(d: DerivedDocument): ExpirationRow {
  return {
    id: d.id,
    applicationId: d.applicationId,
    businessName: d.businessName,
    processor: d.processor,
    documentType: d.documentType,
    expirationDate: d.expirationDate,
    daysUntilExpiration: d.daysUntilExpiration,
    expired: d.effectiveStatus === "Expired",
  };
}

/** Plain-language "Expires in 12 days" / "Expired 3 days ago" for an expiration row. */
export function describeExpiration(row: Pick<ExpirationRow, "expired" | "daysUntilExpiration">): string {
  const days = row.daysUntilExpiration;
  if (row.expired) {
    if (days === null) return "Marked expired";
    // Stored as "Expired" although the date hasn't passed: a data-entry conflict worth a look.
    if (days >= 0) return "Marked expired — check date";
    if (days === -1) return "Expired yesterday";
    return `Expired ${-days} days ago`;
  }
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

const byExpirationAsc =(a: ExpirationRow, b: ExpirationRow) =>
  (a.expirationDate ?? "9999").localeCompare(b.expirationDate ?? "9999");

/** Documents expiring within the next 30 days (not yet expired), soonest first. */
export function selectExpiringSoon(docs: DerivedDocument[]): ExpirationRow[] {
  return docs.filter((d) => d.expiringSoon).map(toExpirationRow).sort(byExpirationAsc);
}

/**
 * Every expired document: past-date expirations (most recent first), then docs marked
 * "Expired" whose date hasn't passed (data conflicts), then docs marked expired with no date.
 */
export function selectExpired(docs: DerivedDocument[]): ExpirationRow[] {
  const rank = (r: ExpirationRow) => (r.daysUntilExpiration === null ? 2 : r.daysUntilExpiration < 0 ? 0 : 1);
  return docs
    .filter((d) => d.effectiveStatus === "Expired")
    .map(toExpirationRow)
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (rank(a) === 0
          ? (b.expirationDate ?? "").localeCompare(a.expirationDate ?? "")
          : byExpirationAsc(a, b)) ||
        a.businessName.localeCompare(b.businessName),
    );
}

/**
 * Dashboard list: expiring soon plus expired within the last `pastDays` days, ordered by date.
 * Docs marked "Expired" whose date is still in the future (data conflicts) are left to the expired list.
 */
export function selectUpcomingExpirations(docs: DerivedDocument[], pastDays = 30): ExpirationRow[] {
  const recentlyExpired = (d: DerivedDocument) =>
    d.effectiveStatus === "Expired" &&
    d.daysUntilExpiration !== null &&
    d.daysUntilExpiration < 0 &&
    d.daysUntilExpiration >= -pastDays;
  return docs
    .filter((d) => d.expiringSoon || recentlyExpired(d))
    .map(toExpirationRow)
    .sort(byExpirationAsc);
}

export interface ExpirationWeekBucket {
  weekStart: string;
  label: string;
  count: number;
}

/** Documents that will expire over the next `weeks` weeks, one bucket per week starting at as-of. */
export function bucketExpirationsByWeek(docs: DerivedDocument[], asOf: string, weeks = 13): ExpirationWeekBucket[] {
  const start = parseISO(asOf);
  const buckets: ExpirationWeekBucket[] = Array.from({ length: weeks }, (_, i) => {
    const d = addDays(start, i * 7);
    return { weekStart: format(d, "yyyy-MM-dd"), label: format(d, "MMM d"), count: 0 };
  });
  for (const d of docs) {
    if (d.effectiveStatus === "Expired" || d.effectiveStatus === "Not Required") continue;
    if (d.daysUntilExpiration === null || d.daysUntilExpiration < 0) continue;
    const i = Math.floor(d.daysUntilExpiration / 7);
    if (i < weeks) buckets[i].count++;
  }
  return buckets;
}

// ---------- health ----------

export const HEALTH_ORDER: ApplicationHealth[] = ["stalled", "at-risk", "on-track", "complete"];

export interface HealthCount {
  health: ApplicationHealth;
  count: number;
}

export function countByHealth(apps: ApplicationSummary[]): HealthCount[] {
  return HEALTH_ORDER.map((health) => ({ health, count: apps.filter((a) => a.health === health).length }));
}

// ---------- plain-text email ----------

export interface WeeklyReportData {
  asOf: string;
  summary: PipelineSummary;
  stalled: StalledApplicationRow[];
  expiringSoon: ExpirationRow[];
  expired: ExpirationRow[];
}

export function topBottlenecks(summary: PipelineSummary, limit = 5) {
  return summary.byDocumentType.filter((t) => t.outstanding > 0).slice(0, limit);
}

/** Keep the email skimmable; the page has the full list. */
const EMAIL_EXPIRED_LIMIT = 10;

/** Plain-text version of the weekly summary, ready to paste into an email. */
export function buildWeeklyEmail({ asOf, summary: s, stalled, expiringSoon, expired }: WeeklyReportData): string {
  const lines: string[] = [];
  const bullet = (text: string) => lines.push(`  - ${text}`);
  const section = (title: string) => lines.push("", title.toUpperCase(), "-".repeat(title.length));

  lines.push(`Pipeline summary — week of ${formatDisplayDate(asOf)}`);

  section("Pipeline snapshot");
  bullet(`Total loan volume: ${formatCurrency(s.totalLoanVolume)} across ${s.totalApplications} applications`);
  bullet(`Active applications: ${s.activeApplications}`);
  bullet(
    `Stalled applications: ${s.stalledApplications} (${formatCurrency(s.stalledLoanVolume)}) — missing documents, no activity in ${STALLED_AFTER_DAYS}+ days`,
  );
  bullet(`Complete applications: ${s.completeApplications}`);
  bullet(`Document completion: ${s.completionPct}% (${s.documentsByGroup.complete} of ${s.totalDocuments})`);
  bullet(`Documents expiring in the next ${EXPIRING_SOON_DAYS} days: ${s.expiringSoonDocuments}`);
  bullet(`Expired documents: ${s.expiredDocuments}`);

  section(`Stalled applications (${stalled.length})`);
  if (stalled.length === 0) bullet("None — every application with missing documents has recent activity.");
  for (const a of stalled) {
    bullet(
      `${a.businessName} (${a.applicationId}) — ${formatCurrency(a.loanAmount)}, ${a.processor}, ${a.outstandingDocs} outstanding, ${a.daysSinceActivity} days since last activity`,
    );
  }

  section(`Expiring in the next ${EXPIRING_SOON_DAYS} days (${expiringSoon.length})`);
  if (expiringSoon.length === 0) bullet("None.");
  const expirationLine = (d: ExpirationRow) => {
    const date = d.expirationDate ? `, ${formatDisplayDate(d.expirationDate)}` : "";
    return `${d.businessName} — ${d.documentType}: ${describeExpiration(d).toLowerCase()}${date} (${d.processor})`;
  };
  for (const d of expiringSoon) bullet(expirationLine(d));

  section(`Expired documents (${expired.length})`);
  if (expired.length === 0) bullet("None.");
  for (const d of expired.slice(0, EMAIL_EXPIRED_LIMIT)) bullet(expirationLine(d));
  if (expired.length > EMAIL_EXPIRED_LIMIT) {
    bullet(`…and ${expired.length - EMAIL_EXPIRED_LIMIT} more (full list on the Weekly Summary page in Doc Tracker)`);
  }

  section("Workload by processor");
  for (const p of s.byProcessor) {
    bullet(
      `${p.processor}: ${p.applications} applications (${p.stalled} stalled) — ${p.outstandingDocs} outstanding, ${p.inProgressDocs} in progress, ${p.completeDocs} complete docs`,
    );
  }

  section("Top bottleneck document types");
  for (const t of topBottlenecks(s)) {
    bullet(`${t.documentType}: ${t.outstanding} outstanding${t.expired ? ` (${t.expired} expired)` : ""}`);
  }

  lines.push(
    "",
    "Note: week-over-week changes are not included yet because the tracker does not keep history.",
  );
  return lines.join("\n");
}
