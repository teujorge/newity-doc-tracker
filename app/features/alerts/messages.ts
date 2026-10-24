// Turns /api/alerts data into a plain-language notification for a rule. Pure (no browser APIs).
import { format, parseISO } from "date-fns";
import { formatDisplayDate } from "~/lib/domain";
import { formatCompactCurrency, pluralize } from "~/lib/format";
import { KIND_INFO } from "./schedule";
import type { AlertDocumentItem, AlertNotification, AlertRule, AlertsData } from "./types";

export type NotificationDraft = Omit<AlertNotification, "id" | "createdAt" | "read">;

const MAX_LISTED = 3;

function shortDate(iso: string): string {
  return format(parseISO(iso), "MMM d");
}

function listWithMore<T>(items: T[], render: (item: T) => string): string {
  const shown = items.slice(0, MAX_LISTED).map(render).join("; ");
  const more = items.length - MAX_LISTED;
  return more > 0 ? `${shown}; and ${more} more` : shown;
}

const docLine = (d: AlertDocumentItem) => `${d.businessName}: ${d.documentType} (${shortDate(d.expirationDate)})`;

export function buildNotification(rule: AlertRule, data: AlertsData): NotificationDraft {
  const href = KIND_INFO[rule.kind].href;
  const base = { ruleId: rule.id, kind: rule.kind, href, asOf: data.asOf };

  switch (rule.kind) {
    case "expiring-documents": {
      const window = rule.windowDays ?? data.windowDays;
      const { expiring, expired } = data;
      const expiredNote = expired.length
        ? `${pluralize(expired.length, "document has", "documents have")} already expired and need${expired.length === 1 ? "s" : ""} replacing.`
        : "";
      if (expiring.length === 0) {
        return {
          ...base,
          quiet: true,
          title: `All clear: no documents expire in the next ${pluralize(window, "day")}`,
          body: expiredNote || "Nothing needs attention right now.",
        };
      }
      const verb = expiring.length === 1 ? "expires" : "expire";
      return {
        ...base,
        quiet: false,
        title: `${pluralize(expiring.length, "document")} ${verb} in the next ${pluralize(window, "day")}`,
        body: [`${listWithMore(expiring, docLine)}.`, expiredNote].filter(Boolean).join(" "),
      };
    }

    case "stalled-applications": {
      const { stalled } = data;
      if (stalled.length === 0) {
        return {
          ...base,
          quiet: true,
          title: "All clear: no stalled applications",
          body: "Every application with missing documents has had activity in the last 14 days.",
        };
      }
      const verb = stalled.length === 1 ? "has" : "have";
      return {
        ...base,
        quiet: false,
        title: `${pluralize(stalled.length, "application")} ${verb} stalled`,
        body: `No activity for 14+ days and documents still missing: ${listWithMore(
          stalled,
          (a) => `${a.businessName} (${a.daysSinceActivity} days, ${a.processor})`,
        )}.`,
      };
    }

    case "weekly-summary": {
      const s = data.summary;
      return {
        ...base,
        quiet: false,
        title: `Weekly pipeline summary for ${formatDisplayDate(data.asOf)}`,
        body:
          `${pluralize(s.activeApplications, "active application")} (${formatCompactCurrency(s.totalLoanVolume)} total), ` +
          `${s.completionPct}% of documents complete. ` +
          `${s.stalledApplications} stalled, ${s.expiringSoonDocuments} expiring soon, ${s.expiredDocuments} expired.`,
      };
    }
  }
}
