// GET /api/alerts?windowDays=30 → the numbers the in-browser alert scheduler turns into notifications.
// Uses the same as-of cookie as the rest of the app, so alerts match what the user sees on screen.
import type { AlertDocumentItem, AlertsData } from "~/features/alerts/types";
import { loadPipeline } from "~/lib/pipeline.server";
import { selectExpired } from "~/lib/reports";
import type { Route } from "./+types/api.alerts";

const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 365;

function parseWindowDays(value: string | null): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_WINDOW_DAYS;
  return Math.min(n, MAX_WINDOW_DAYS);
}

function toItem(d: AlertDocumentItem): AlertDocumentItem {
  return {
    applicationId: d.applicationId,
    businessName: d.businessName,
    documentType: d.documentType,
    expirationDate: d.expirationDate,
    daysUntilExpiration: d.daysUntilExpiration,
    processor: d.processor,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const windowDays = parseWindowDays(new URL(request.url).searchParams.get("windowDays"));
  const { asOf, documents, applications, summary } = await loadPipeline(request);

  const expiring = documents
    .filter(
      (d) =>
        d.effectiveStatus !== "Expired" &&
        d.daysUntilExpiration !== null &&
        d.daysUntilExpiration >= 0 &&
        d.daysUntilExpiration <= windowDays,
    )
    .sort((a, b) => a.daysUntilExpiration! - b.daysUntilExpiration!)
    .map(toItem);

  // Same definition as the rest of the app: effective status "Expired" — past its expiration date
  // or marked Expired in the tracker. Matches summary.expiredDocuments.
  const expired = selectExpired(documents).map(toItem);

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
