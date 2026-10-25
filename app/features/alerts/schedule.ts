// Pure scheduling helpers + rule metadata. No browser APIs here, so it's safe anywhere and easy to test.
import { format } from "date-fns";
import type { AlertFrequency, AlertKind, AlertRule } from "./types";

export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  "every-minute": "Every minute (demo)",
  daily: "Daily",
  weekly: "Weekly",
};

export const KIND_INFO: Record<AlertKind, { label: string; description: string; href: string }> = {
  "expiring-documents": {
    label: "Documents expiring soon",
    description:
      "Lists documents that will expire within the window you choose, plus a count of expired ones (past their date or marked Expired).",
    href: "/documents?expiration=expiring",
  },
  "stalled-applications": {
    label: "Stalled applications",
    description: "Applications with missing documents and no activity for 14 or more days.",
    href: "/applications?health=stalled",
  },
  "weekly-summary": {
    label: "Weekly pipeline summary",
    description: "A quick snapshot of the whole pipeline: active loans, completion, stalled and expiring items.",
    href: "/reports/weekly",
  },
};

export const DEFAULT_WINDOW_DAYS = 30;
export const DEFAULT_TIME = "09:00";

function parseTime(time: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  if (!match) return [9, 0];
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return [h, m];
}

/**
 * The next time (strictly after `from`) a rule should fire, in local wall-clock time.
 * - every-minute: the start of the next minute
 * - daily: the next occurrence of `time`
 * - weekly: the next `dayOfWeek` at `time`
 */
export function computeNextRun(rule: Pick<AlertRule, "frequency" | "dayOfWeek" | "time">, from: Date): Date {
  const next = new Date(from.getTime());
  if (rule.frequency === "every-minute") {
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    return next;
  }

  const [hours, minutes] = parseTime(rule.time);
  next.setHours(hours, minutes, 0, 0);

  if (rule.frequency === "daily") {
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }

  const dayOfWeek = Number.isInteger(rule.dayOfWeek) && rule.dayOfWeek >= 0 && rule.dayOfWeek <= 6 ? rule.dayOfWeek : 1;
  next.setDate(next.getDate() + ((dayOfWeek - next.getDay() + 7) % 7));
  if (next <= from) next.setDate(next.getDate() + 7);
  return next;
}

/** "9:00 AM" from "09:00". */
export function formatTime(time: string): string {
  const [h, m] = parseTime(time);
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
}

/** Plain-language schedule, e.g. "Every Monday at 9:00 AM". */
export function describeSchedule(rule: Pick<AlertRule, "frequency" | "dayOfWeek" | "time">): string {
  switch (rule.frequency) {
    case "every-minute":
      return "Every minute (for demos)";
    case "daily":
      return `Every day at ${formatTime(rule.time)}`;
    case "weekly":
      return `Every ${DAYS_OF_WEEK[rule.dayOfWeek] ?? "Monday"} at ${formatTime(rule.time)}`;
  }
}

/** "Mon, Feb 16 at 9:00 AM" (or "Today at …" / "Tomorrow at …"). */
export function formatRunTime(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const time = format(d, d.getSeconds() ? "h:mm:ss a" : "h:mm a");
  const dayDiff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  if (dayDiff === 0) return `Today at ${time}`;
  if (dayDiff === 1) return `Tomorrow at ${time}`;
  if (dayDiff === -1) return `Yesterday at ${time}`;
  return `${format(d, "EEE, MMM d")} at ${time}`;
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

/** A new rule of the given kind with sensible defaults, scheduled from `now`. */
export function createRule(kind: AlertKind, overrides: Partial<AlertRule> = {}, now: Date = new Date()): AlertRule {
  const base: Omit<AlertRule, "nextRunAt"> = {
    id: newId("rule"),
    name: KIND_INFO[kind].label,
    kind,
    frequency: kind === "stalled-applications" ? "daily" : "weekly",
    dayOfWeek: 1,
    time: DEFAULT_TIME,
    windowDays: kind === "expiring-documents" ? DEFAULT_WINDOW_DAYS : undefined,
    enabled: true,
    ...overrides,
  };
  return { ...base, nextRunAt: computeNextRun(base, now).toISOString() };
}

/** Rules seeded on first visit: what the team asked for (expirations) + leadership's Monday summary. */
export function defaultRules(now: Date = new Date()): AlertRule[] {
  return [
    createRule("expiring-documents", { id: "default-expiring" }, now),
    createRule("weekly-summary", { id: "default-weekly-summary" }, now),
    createRule("stalled-applications", { id: "default-stalled" }, now),
  ];
}
