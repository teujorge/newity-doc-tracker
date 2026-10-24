import { describe, expect, it } from "vitest";
import { buildNotification } from "./messages";
import { computeNextRun, defaultRules } from "./schedule";
import type { AlertsData } from "./types";

// Local-time constructor so tests don't depend on the machine's time zone.
const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);

describe("computeNextRun", () => {
  it("every-minute fires at the start of the next minute", () => {
    expect(computeNextRun({ frequency: "every-minute", dayOfWeek: 1, time: "09:00" }, at(2026, 2, 13, 10, 15, 42))).toEqual(
      at(2026, 2, 13, 10, 16),
    );
  });

  it("daily fires later today, or tomorrow once the time has passed", () => {
    const rule = { frequency: "daily" as const, dayOfWeek: 1, time: "09:00" };
    expect(computeNextRun(rule, at(2026, 2, 13, 8, 0))).toEqual(at(2026, 2, 13, 9, 0));
    expect(computeNextRun(rule, at(2026, 2, 13, 9, 0))).toEqual(at(2026, 2, 14, 9, 0));
    expect(computeNextRun(rule, at(2026, 2, 28, 17, 0))).toEqual(at(2026, 3, 1, 9, 0));
  });

  it("weekly fires on the chosen weekday", () => {
    const monday9 = { frequency: "weekly" as const, dayOfWeek: 1, time: "09:00" };
    // Fri Feb 13 2026 → Mon Feb 16
    expect(computeNextRun(monday9, at(2026, 2, 13, 12, 0))).toEqual(at(2026, 2, 16, 9, 0));
    // Monday before 9 → same day; Monday after 9 → next week
    expect(computeNextRun(monday9, at(2026, 2, 16, 8, 59))).toEqual(at(2026, 2, 16, 9, 0));
    expect(computeNextRun(monday9, at(2026, 2, 16, 9, 30))).toEqual(at(2026, 2, 23, 9, 0));
  });

  it("seeds three enabled default rules scheduled in the future", () => {
    const now = at(2026, 2, 13, 12, 0);
    const rules = defaultRules(now);
    expect(rules.map((r) => r.kind)).toEqual(["expiring-documents", "weekly-summary", "stalled-applications"]);
    expect(rules.every((r) => r.enabled && new Date(r.nextRunAt) > now)).toBe(true);
  });
});

describe("buildNotification", () => {
  const data: AlertsData = {
    asOf: "2026-02-13",
    windowDays: 30,
    expiring: [
      { applicationId: "A1", businessName: "Metro Dental Group", documentType: "Bank Statements (90 day)", expirationDate: "2026-02-20", daysUntilExpiration: 7, processor: "Sam" },
    ],
    expired: [],
    stalled: [],
    summary: { activeApplications: 10, stalledApplications: 0, expiringSoonDocuments: 1, expiredDocuments: 0, completionPct: 50, totalLoanVolume: 1_000_000 },
  };

  it("describes expiring documents in plain language", () => {
    const n = buildNotification({ ...defaultRules()[0] }, data);
    expect(n.title).toBe("1 document expires in the next 30 days");
    expect(n.body).toContain("Metro Dental Group: Bank Statements (90 day) (Feb 20)");
    expect(n.quiet).toBe(false);
  });

  it("records a quiet all-clear when nothing matches", () => {
    const n = buildNotification({ ...defaultRules()[2] }, data);
    expect(n.quiet).toBe(true);
    expect(n.title).toMatch(/all clear/i);
  });
});
