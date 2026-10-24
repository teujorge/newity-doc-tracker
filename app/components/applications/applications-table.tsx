import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { type ColumnDef, DataTable } from "~/components/data-table";
import { HEALTH_LABEL, HealthBadge } from "~/components/status-badge";
import { Progress } from "~/components/ui/progress";
import { type ApplicationSummary, STALLED_AFTER_DAYS, formatDisplayDate } from "~/lib/domain";
import type { CsvColumn } from "~/lib/export-csv";
import { formatCurrency } from "~/lib/format";
import { cn } from "~/lib/utils";
import { HEALTH_RANK, formatDaysAgo } from "./health";

export const applicationHref = (applicationId: string) => `/applications/${encodeURIComponent(applicationId)}`;

const columns: ColumnDef<ApplicationSummary>[] = [
  {
    id: "application",
    header: "Application",
    accessorFn: (app) => app.businessName,
    cell: ({ row }) => {
      const app = row.original;
      return (
        <div className="min-w-48">
          <Link
            to={applicationHref(app.applicationId)}
            className="font-semibold hover:underline"
            // The whole row is clickable too; don't navigate twice.
            onClick={(event) => event.stopPropagation()}
          >
            {app.businessName}
          </Link>
          <div className="text-xs text-muted-foreground">
            {app.applicationId} · {app.borrowerName}
          </div>
        </div>
      );
    },
  },
  { accessorKey: "processor", header: "Processor" },
  {
    accessorKey: "progressPct",
    header: "Progress",
    cell: ({ row }) => {
      const app = row.original;
      return (
        <div className="flex min-w-32 items-center gap-2">
          <Progress value={app.progressPct} className="h-1.5 w-20" aria-label={`${app.progressPct}% complete`} />
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {app.completeDocs}/{app.totalDocs} done
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "outstandingDocs",
    header: "Outstanding",
    cell: ({ row }) => {
      const n = row.original.outstandingDocs;
      return <span className={cn("tabular-nums", n === 0 ? "text-muted-foreground" : "font-medium")}>{n}</span>;
    },
  },
  {
    id: "expiration",
    header: "Expiring / expired",
    // Expired outweighs expiring when sorting.
    accessorFn: (app) => app.expiredDocs * 1000 + app.expiringSoonDocs,
    cell: ({ row }) => <ExpirationFlags app={row.original} />,
  },
  {
    accessorKey: "daysSinceActivity",
    header: "Last activity",
    cell: ({ row }) => {
      const app = row.original;
      const overdue = app.outstandingDocs > 0 && app.daysSinceActivity >= STALLED_AFTER_DAYS;
      return (
        <span
          className={cn("whitespace-nowrap", overdue ? "font-medium text-status-expired" : "text-muted-foreground")}
          title={`Last document received ${formatDisplayDate(app.lastActivityDate)}`}
        >
          {formatDaysAgo(app.daysSinceActivity)}
        </span>
      );
    },
  },
  {
    accessorKey: "health",
    header: "Status",
    sortingFn: (a, b) => HEALTH_RANK[a.original.health] - HEALTH_RANK[b.original.health],
    cell: ({ row }) => <HealthBadge health={row.original.health} />,
  },
  {
    accessorKey: "loanAmount",
    header: "Loan amount",
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatCurrency(row.original.loanAmount)}</span>,
  },
];

function ExpirationFlags({ app }: { app: ApplicationSummary }) {
  if (!app.expiredDocs && !app.expiringSoonDocs) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {app.expiredDocs > 0 && (
        <span className="rounded-full bg-status-expired/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-status-expired">
          {app.expiredDocs} expired
        </span>
      )}
      {app.expiringSoonDocs > 0 && (
        <span className="rounded-full bg-status-outstanding/15 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
          {app.expiringSoonDocs} expiring
        </span>
      )}
    </div>
  );
}

export function ApplicationsTable({ rows, emptyMessage }: { rows: ApplicationSummary[]; emptyMessage?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <DataTable
      columns={columns}
      data={rows}
      initialSorting={[
        { id: "health", desc: false },
        { id: "daysSinceActivity", desc: true },
      ]}
      getRowId={(app) => app.applicationId}
      onRowClick={(app) => navigate(applicationHref(app.applicationId))}
      rowClassName={(app) => (app.health === "stalled" ? "bg-status-expired/[0.03]" : undefined)}
      emptyMessage={emptyMessage}
    />
  );
}

export const applicationCsvColumns: CsvColumn<ApplicationSummary>[] = [
  { header: "Application ID", value: (a) => a.applicationId },
  { header: "Business Name", value: (a) => a.businessName },
  { header: "Borrower", value: (a) => a.borrowerName },
  { header: "Processor", value: (a) => a.processor },
  { header: "Status", value: (a) => HEALTH_LABEL[a.health] },
  { header: "Documents Done", value: (a) => a.completeDocs },
  { header: "Total Documents", value: (a) => a.totalDocs },
  { header: "Progress %", value: (a) => a.progressPct },
  { header: "Outstanding", value: (a) => a.outstandingDocs },
  { header: "Expired", value: (a) => a.expiredDocs },
  { header: "Expiring Soon", value: (a) => a.expiringSoonDocs },
  { header: "Last Activity", value: (a) => a.lastActivityDate },
  { header: "Days Since Activity", value: (a) => a.daysSinceActivity },
  { header: "Loan Amount", value: (a) => a.loanAmount },
  { header: "Application Date", value: (a) => a.applicationDate },
];
