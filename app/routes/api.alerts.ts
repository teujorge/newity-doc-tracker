// GET /api/alerts?windowDays=30 → the numbers the in-browser alert scheduler turns into notifications.
// Uses the same as-of cookie as the rest of the app, so alerts match what the user sees on screen.
import type { AlertDocumentItem, AlertsData } from "~/features/alerts/types";
import type { DerivedDocument } from "~/lib/domain";
import { loadPipeline } from "~/lib/pipeline.server";
import type { Route } from "./+types/api.alerts";

const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 365;

function parseWindowDays(value: string | null): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_WINDOW_DAYS;
  return Math.min(n, MAX_WINDOW_DAYS);
}

function toItem(d: DerivedDocument): AlertDocumentItem {
  return {
    applicationId: d.applicationId,
    businessName: d.businessName,
    documentType: d.documentType,
    expirationDate: d.expirationDate!,
    daysUntilExpiration: d.daysUntilExpiration!,
    processor: d.processor,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const windowDays = parseWindowDays(new URL(request.url).searchParams.get("windowDays"));
  const { asOf, documents, applications, summary } = await loadPipeline(request);

  const withExpiration = documents.filter((d) => d.expirationDate && d.daysUntilExpiration !== null);

  const expiring = withExpiration
    .filter((d) => d.effectiveStatus !== "Expired" && d.daysUntilExpiration! >= 0 && d.daysUntilExpiration! <= windowDays)
    .sort((a, b) => a.daysUntilExpiration! - b.daysUntilExpiration!)
    .map(toItem);

  // Only documents whose expiration date has actually passed (not "Expired" rows with a future date,
  // which are data-entry conflicts flagged elsewhere). Most recently expired first.
  const expired = withExpiration
    .filter((d) => d.effectiveStatus === "Expired" && d.daysUntilExpiration! < 0)
    .sort((a, b) => b.daysUntilExpiration! - a.daysUntilExpiration!)
    .map(toItem);

  const stalled = applications
    .filter((a) => a.isStalled)
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
    .map((a) => ({
      applicationId: a.applicationId,
      businessName: a.businessName,
      processor: a.processor,
      daysSinceActivity: a.daysSinceActivity,
      outstandingDocs: a.outstandingDocs,
    }));

  const body: AlertsData = {
    asOf,
    windowDays,
    expiring,
    expired,
    stalled,
    summary: {
      activeApplications: summary.activeApplications,
      stalledApplications: summary.stalledApplications,
      expiringSoonDocuments: summary.expiringSoonDocuments,
      expiredDocuments: summary.expiredDocuments,
      completionPct: summary.completionPct,
      totalLoanVolume: summary.totalLoanVolume,
    },
  };

  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
