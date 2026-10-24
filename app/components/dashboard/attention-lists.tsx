// The two "what do I do today" lists on the dashboard.
import { ArrowRightIcon, CircleCheckIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ExpirationLabel } from "~/components/reports/expiration-label";
import type { ExpirationRow, StalledApplicationRow } from "~/lib/reports";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { EXPIRING_SOON_DAYS, STALLED_AFTER_DAYS } from "~/lib/domain";
import { formatCompactCurrency, pluralize } from "~/lib/format";

function ListCard({
  title,
  description,
  count,
  footer,
  children,
}: {
  title: string;
  description: string;
  count: number;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">{count}</span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
      {footer && <CardFooter className="justify-end py-2">{footer}</CardFooter>}
    </Card>
  );
}

function AllClear({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      <CircleCheckIcon className="size-4 text-status-complete" aria-hidden />
      {children}
    </div>
  );
}

const ROW = "flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0";
const ROW_LINK = "-mx-2 rounded-md px-2 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 outline-none";

export function NeedsAttentionCard({ rows, total }: { rows: StalledApplicationRow[]; total: number }) {
  return (
    <ListCard
      title="Needs attention"
      description={`Stalled: missing documents and nothing new in ${STALLED_AFTER_DAYS}+ days. Longest-waiting first.`}
      count={total}
      footer={
        total > 0 && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/applications?health=stalled">
              View all {pluralize(total, "stalled application")}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <AllClear>No stalled applications. Nice work.</AllClear>
      ) : (
        <ul className="divide-y">
          {rows.map((a) => (
            <li key={a.applicationId}>
              <Link to={`/applications/${a.applicationId}`} className={`${ROW} ${ROW_LINK}`}>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.businessName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.processor} · {pluralize(a.outstandingDocs, "document")} outstanding ·{" "}
                    {formatCompactCurrency(a.loanAmount)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end text-right">
                  <span className="text-sm font-semibold text-status-expired tabular-nums">
                    {a.daysSinceActivity} days
                  </span>
                  <span className="text-xs text-muted-foreground">since last activity</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}

export function UpcomingExpirationsCard({ rows, total }: { rows: ExpirationRow[]; total: number }) {
  return (
    <ListCard
      title="Upcoming expirations"
      description={`Documents expiring in the next ${EXPIRING_SOON_DAYS} days or that expired recently. These need a fresh copy from the borrower.`}
      count={total}
      footer={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link to="/documents?expiration=expired">Expired documents</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/documents?expiration=expiring">
              All expiring soon
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <AllClear>Nothing expiring in the next {EXPIRING_SOON_DAYS} days.</AllClear>
      ) : (
        <ul className="divide-y">
          {rows.map((d) => (
            <li key={d.id}>
              <Link to={`/applications/${d.applicationId}`} className={`${ROW} ${ROW_LINK}`}>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.documentType}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {d.businessName} · {d.processor}
                  </span>
                </span>
                <ExpirationLabel row={d} className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ListCard>
  );
}
