import { InfoIcon } from "lucide-react";
import { Link } from "react-router";
import type { RouteHandle } from "~/components/app-header";
import { ExportCsvButton } from "~/components/export-csv-button";
import { PageHeader } from "~/components/page-header";
import {
  type ExpirationRow,
  type StalledApplicationRow,
  buildWeeklyEmail,
  describeExpiration,
  selectExpired,
  selectExpiringSoon,
  selectStalledApplications,
  topBottlenecks,
} from "~/lib/reports";
import { CopyAsEmailButton, PrintButton } from "~/components/reports/report-actions";
import { ReportEmpty, ReportSection, ReportStat } from "~/components/reports/report-section";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import type { CsvColumn } from "~/lib/export-csv";
import { EXPIRING_SOON_DAYS, STALLED_AFTER_DAYS, formatDisplayDate } from "~/lib/domain";
import { formatCompactCurrency, formatCurrency, pluralize } from "~/lib/format";
import { loadPipeline } from "~/lib/pipeline.server";
import type { Route } from "./+types/weekly-summary";

export const handle: RouteHandle = { breadcrumb: "Weekly Summary" };

export const meta: Route.MetaFunction = () => [
  { title: "Weekly Summary · Doc Tracker" },
  { name: "description", content: "Weekly SBA pipeline summary for leadership." },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { asOf, documents, applications, summary } = await loadPipeline(request);
  return {
    asOf,
    summary,
    stalled: selectStalledApplications(applications),
    expiringSoon: selectExpiringSoon(documents),
    expired: selectExpired(documents),
  };
}

const STALLED_CSV: CsvColumn<StalledApplicationRow>[] = [
  { header: "Application ID", value: (r) => r.applicationId },
  { header: "Business", value: (r) => r.businessName },
  { header: "Borrower", value: (r) => r.borrowerName },
  { header: "Processor", value: (r) => r.processor },
  { header: "Loan amount", value: (r) => r.loanAmount },
  { header: "Outstanding documents", value: (r) => r.outstandingDocs },
  { header: "Last activity", value: (r) => r.lastActivityDate },
  { header: "Days since last activity", value: (r) => r.daysSinceActivity },
];

const NUM = "text-right tabular-nums";

export default function WeeklySummary({ loaderData }: Route.ComponentProps) {
  const { asOf, summary: s, stalled, expiringSoon, expired } = loaderData;
  const bottlenecks = topBottlenecks(s);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 print:max-w-none print:gap-4">
      <PageHeader
        title={`Pipeline summary — week of ${formatDisplayDate(asOf)}`}
        description="SBA loan document pipeline for leadership. Everything below is calculated live from the tracker."
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <CopyAsEmailButton getText={() => buildWeeklyEmail(loaderData)} />
            <PrintButton />
            <ExportCsvButton
              filename={`stalled-applications-${asOf}`}
              rows={stalled}
              columns={STALLED_CSV}
              label="Export stalled (CSV)"
            />
          </div>
        }
      />

      <Alert className="print:hidden">
        <InfoIcon />
        <AlertDescription>
          This shows where things stand on {formatDisplayDate(asOf)}. Week-over-week changes aren't available yet
          because the tracker doesn't keep history — that's planned for a later version.
        </AlertDescription>
      </Alert>

      <ReportSection title="Pipeline snapshot" className="print:break-inside-avoid">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-3">
          <ReportStat
            label="Total loan volume"
            value={formatCompactCurrency(s.totalLoanVolume)}
            detail={`${pluralize(s.totalApplications, "application")} · ${formatCurrency(s.totalLoanVolume)}`}
          />
          <ReportStat label="Active applications" value={s.activeApplications} detail="Still collecting or reviewing" />
          <ReportStat
            label="Stalled applications"
            value={<span className={s.stalledApplications ? "text-status-expired" : undefined}>{s.stalledApplications}</span>}
            detail={`${formatCompactCurrency(s.stalledLoanVolume)} in loans waiting on documents`}
          />
          <ReportStat label="Complete applications" value={s.completeApplications} detail="All documents in" />
          <ReportStat
            label="Document completion"
            value={`${s.completionPct}%`}
            detail={`${s.documentsByGroup.complete} of ${s.totalDocuments} documents`}
          />
          <ReportStat
            label="Expiring / expired"
            value={`${s.expiringSoonDocuments} / ${s.expiredDocuments}`}
            detail={`Expiring in ${EXPIRING_SOON_DAYS} days / already expired`}
          />
        </div>
      </ReportSection>

      <ReportSection
        title={`Stalled applications (${stalled.length})`}
        description={`Missing documents and nothing new received in ${STALLED_AFTER_DAYS}+ days. Longest-waiting first.`}
      >
        {stalled.length === 0 ? (
          <ReportEmpty>No stalled applications this week.</ReportEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Processor</TableHead>
                <TableHead className={NUM}>Loan amount</TableHead>
                <TableHead className={NUM}>Outstanding docs</TableHead>
                <TableHead className={NUM}>Days since activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stalled.map((a) => (
                <TableRow key={a.applicationId}>
                  <TableCell>
                    <Link to={`/applications/${a.applicationId}`} className="font-medium hover:underline">
                      {a.businessName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{a.applicationId}</div>
                  </TableCell>
                  <TableCell>{a.processor}</TableCell>
                  <TableCell className={NUM}>{formatCurrency(a.loanAmount)}</TableCell>
                  <TableCell className={NUM}>{a.outstandingDocs}</TableCell>
                  <TableCell className={NUM}>{a.daysSinceActivity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ReportSection>

      <ReportSection
        title="Document expirations"
        description="Expired documents count as missing until the borrower sends a fresh copy."
      >
        <div className="grid gap-6">
          <ExpirationTable
            title={`Expiring in the next ${EXPIRING_SOON_DAYS} days (${expiringSoon.length})`}
            rows={expiringSoon}
            empty={`Nothing expires in the next ${EXPIRING_SOON_DAYS} days.`}
          />
          <ExpirationTable title={`Expired (${expired.length})`} rows={expired} empty="No expired documents." />
        </div>
      </ReportSection>

      <ReportSection
        title="Workload by processor"
        className="print:break-inside-avoid"
        description="Documents across each processor's applications.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processor</TableHead>
              <TableHead className={NUM}>Applications</TableHead>
              <TableHead className={NUM}>Stalled</TableHead>
              <TableHead className={NUM}>Outstanding docs</TableHead>
              <TableHead className={NUM}>In progress</TableHead>
              <TableHead className={NUM}>Complete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.byProcessor.map((p) => (
              <TableRow key={p.processor}>
                <TableCell className="font-medium">{p.processor}</TableCell>
                <TableCell className={NUM}>{p.applications}</TableCell>
                <TableCell className={NUM}>{p.stalled}</TableCell>
                <TableCell className={NUM}>{p.outstandingDocs}</TableCell>
                <TableCell className={NUM}>{p.inProgressDocs}</TableCell>
                <TableCell className={NUM}>{p.completeDocs}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ReportSection>

      <ReportSection
        title="Top bottleneck document types"
        className="print:break-inside-avoid"
        description="The documents we are most often still waiting on (not received yet, or expired)."
      >
        {bottlenecks.length === 0 ? (
          <ReportEmpty>Nothing outstanding.</ReportEmpty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document type</TableHead>
                <TableHead className={NUM}>Outstanding</TableHead>
                <TableHead className={NUM}>Of which expired</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bottlenecks.map((t) => (
                <TableRow key={t.documentType}>
                  <TableCell className="font-medium">{t.documentType}</TableCell>
                  <TableCell className={NUM}>{t.outstanding}</TableCell>
                  <TableCell className={NUM}>{t.expired}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ReportSection>

      <p className="hidden text-xs text-muted-foreground print:block">
        Generated from Doc Tracker as of {formatDisplayDate(asOf)}. Week-over-week comparison not yet available.
      </p>
    </div>
  );
}

function ExpirationTable({ title, rows, empty }: { title: string; rows: ExpirationRow[]; empty: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <ReportEmpty>{empty}</ReportEmpty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead className="text-right">Expiration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link to={`/applications/${d.applicationId}`} className="font-medium hover:underline">
                    {d.businessName}
                  </Link>
                </TableCell>
                <TableCell>{d.documentType}</TableCell>
                <TableCell>{d.processor}</TableCell>
                <TableCell className="text-right">
                  <div className="tabular-nums">{formatDisplayDate(d.expirationDate)}</div>
                  <div className={d.expired ? "text-xs text-status-expired" : "text-xs text-muted-foreground"}>
                    {describeExpiration(d)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
