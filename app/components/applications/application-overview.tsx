// Summary card at the top of the application detail page.
import type { ReactNode } from "react";
import { HealthBadge } from "~/components/status-badge";
import { Card, CardContent } from "~/components/ui/card";
import { type ApplicationSummary, formatDisplayDate } from "~/lib/domain";
import { formatCurrency, pluralize } from "~/lib/format";
import { cn } from "~/lib/utils";
import { formatDaysAgo, healthReason } from "./health";

export function ApplicationOverview({ application: app }: { application: ApplicationSummary }) {
  const segments = [
    { label: "done", count: app.completeDocs, className: "bg-status-complete" },
    { label: "in progress", count: app.inProgressDocs, className: "bg-status-in-progress" },
    { label: "outstanding", count: app.outstandingDocs, className: "bg-status-outstanding" },
  ];

  return (
    <Card>
      <CardContent className="space-y-5">
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 text-sm",
            app.health === "stalled" && "font-medium text-status-expired",
          )}
        >
          <HealthBadge health={app.health} />
          <span>{healthReason(app)}</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
          <Fact label="Loan amount">{formatCurrency(app.loanAmount)}</Fact>
          <Fact label="Processor">{app.processor}</Fact>
          <Fact label="Application date">{formatDisplayDate(app.applicationDate)}</Fact>
          <Fact label="Days open">{app.daysOpen}</Fact>
          <Fact label="Last document received">
            {formatDaysAgo(app.daysSinceActivity)}
            <span className="block text-xs font-normal text-muted-foreground">{formatDisplayDate(app.lastActivityDate)}</span>
          </Fact>
        </dl>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {app.completeDocs} of {pluralize(app.totalDocs, "document")} done
            </span>
            <span className="text-muted-foreground tabular-nums">{app.progressPct}%</span>
          </div>
          <div
            className="flex h-2 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={segments.map((s) => `${s.count} ${s.label}`).join(", ")}
          >
            {segments.map((s) =>
              s.count ? (
                <div key={s.label} className={s.className} style={{ width: `${(s.count / app.totalDocs) * 100}%` }} />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {segments.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", s.className)} aria-hidden />
                <span className="font-medium text-foreground tabular-nums">{s.count}</span> {s.label}
              </span>
            ))}
            {app.expiredDocs > 0 && (
              <span className="font-medium text-status-expired">{app.expiredDocs} expired</span>
            )}
            {app.expiringSoonDocs > 0 && <span>{app.expiringSoonDocs} expiring soon</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
