// Small, framework-free helpers shared by the applications list + detail pages.
import {
  type ApplicationHealth,
  type ApplicationSummary,
  EXPIRING_SOON_DAYS,
  STALLED_AFTER_DAYS,
} from "~/lib/domain";
import { pluralize } from "~/lib/format";

export const HEALTH_FILTERS = ["stalled", "at-risk", "on-track", "complete"] as const satisfies readonly ApplicationHealth[];

export function isApplicationHealth(value: unknown): value is ApplicationHealth {
  return typeof value === "string" && (HEALTH_FILTERS as readonly string[]).includes(value);
}

/** Sort order: the things that need attention first. */
export const HEALTH_RANK: Record<ApplicationHealth, number> = {
  stalled: 0,
  "at-risk": 1,
  "on-track": 2,
  complete: 3,
};

/** Default list order: stalled first, then longest without activity. */
export function compareByAttention(a: ApplicationSummary, b: ApplicationSummary): number {
  return HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || b.daysSinceActivity - a.daysSinceActivity;
}

/** One plain-language sentence explaining why an application has its status. */
export function healthReason(app: ApplicationSummary): string {
  switch (app.health) {
    case "stalled":
      return `${pluralize(app.outstandingDocs, "document")} outstanding and nothing received in ${pluralize(app.daysSinceActivity, "day")}.`;
    case "at-risk": {
      const parts: string[] = [];
      if (app.expiredDocs) parts.push(`${pluralize(app.expiredDocs, "document")} expired`);
      if (app.expiringSoonDocs) parts.push(`${app.expiringSoonDocs} expiring within ${EXPIRING_SOON_DAYS} days`);
      return `${parts.join(", ")}.`;
    }
    case "complete":
      return "Every document is approved or not required.";
    default:
      return app.outstandingDocs
        ? `${pluralize(app.outstandingDocs, "document")} outstanding, last document received ${formatDaysAgo(app.daysSinceActivity).toLowerCase()}.`
        : "All documents are in — waiting on review.";
  }
}

export const STALLED_LEGEND = `Stalled = has outstanding documents and nothing received in ${STALLED_AFTER_DAYS}+ days.`;
export const AT_RISK_LEGEND = `At risk = a document has expired or expires within ${EXPIRING_SOON_DAYS} days.`;

export function formatDaysAgo(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** "in 12 days" / "expires today" / "expired 5 days ago". */
export function formatExpiresIn(days: number): string {
  if (days === 0) return "expires today";
  if (days > 0) return `in ${pluralize(days, "day")}`;
  return `expired ${pluralize(-days, "day")} ago`;
}
