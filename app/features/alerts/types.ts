// Shared types for the in-app alerts feature (client scheduler + /api/alerts).

export type AlertKind =
  | "expiring-documents"
  | "stalled-applications"
  | "weekly-summary";
export type AlertFrequency = "every-minute" | "daily" | "weekly";

export interface AlertRule {
  id: string;
  name: string;
  kind: AlertKind;
  frequency: AlertFrequency;
  /** 0 = Sunday … 6 = Saturday. Used when frequency is "weekly". */
  dayOfWeek: number;
  /** Local wall-clock time, "HH:mm". Used for daily/weekly. */
  time: string;
  /** Look-ahead window for the expiring-documents rule. */
  windowDays?: number;
  enabled: boolean;
  /** ISO timestamps (wall clock, not the as-of date). */
  lastRunAt?: string;
  nextRunAt: string;
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  kind?: AlertKind;
  title: string;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  read: boolean;
  href: string;
  /** The as-of date the check ran against (the app's "today"). */
  asOf?: string;
  /** "Nothing to report" results: recorded, but not toasted loudly. */
  quiet?: boolean;
}

// ---------- /api/alerts response ----------

export interface AlertDocumentItem {
  applicationId: string;
  businessName: string;
  documentType: string;
  expirationDate: string | null;
  daysUntilExpiration: number | null;
  processor: string;
}

export interface AlertStalledItem {
  applicationId: string;
  businessName: string;
  processor: string;
  daysSinceActivity: number;
  outstandingDocs: number;
}

export interface AlertsData {
  asOf: string;
  windowDays: number;
  expiring: AlertDocumentItem[];
  expired: AlertDocumentItem[];
  stalled: AlertStalledItem[];
  summary: {
    activeApplications: number;
    stalledApplications: number;
    expiringSoonDocuments: number;
    expiredDocuments: number;
    completionPct: number;
    totalLoanVolume: number;
  };
}
