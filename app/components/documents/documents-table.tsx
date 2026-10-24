import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { type ColumnDef, DataTable } from "~/components/data-table";
import { DocumentStatusBadge } from "~/components/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, formatDisplayDate } from "~/lib/domain";
import type { CsvColumn } from "~/lib/export-csv";
import { pluralize } from "~/lib/format";
import { cn } from "~/lib/utils";
import type { DocumentRow } from "./filters";

/** "in 12 days" / "expires today" / "expired 5 days ago". */
export function describeExpiration(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "expires today";
  if (days > 0) return `in ${pluralize(days, "day")}`;
  return `expired ${pluralize(-days, "day")} ago`;
}

const statusOrder = (row: DocumentRow) => DOCUMENT_STATUSES.indexOf(row.effectiveStatus);
const typeOrder = (row: DocumentRow) => {
  const i = (DOCUMENT_TYPES as readonly string[]).indexOf(row.documentType);
  return i === -1 ? DOCUMENT_TYPES.length : i;
};

const columns: ColumnDef<DocumentRow>[] = [
  {
    id: "application",
    header: "Application",
    accessorFn: (row) => row.applicationId,
    cell: ({ row: { original: d } }) => (
      <div className="min-w-44">
        <Link
          to={`/applications/${d.applicationId}`}
          className="font-medium underline-offset-4 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {d.businessName}
        </Link>
        <div className="text-xs text-muted-foreground">
          {d.applicationId} · {d.borrowerName}
        </div>
      </div>
    ),
  },
  {
    id: "document",
    header: "Document",
    accessorFn: typeOrder,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.documentType}</span>,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: statusOrder,
    cell: ({ row }) => <StatusCell doc={row.original} />,
  },
  {
    id: "received",
    header: "Received",
    accessorFn: (row) => row.dateReceived ?? undefined,
    sortUndefined: "last",
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">{formatDisplayDate(row.original.dateReceived)}</span>
    ),
  },
  {
    id: "expires",
    header: "Expires",
    accessorFn: (row) => row.expirationDate ?? undefined,
    sortUndefined: "last",
    cell: ({ row }) => <ExpiresCell doc={row.original} />,
  },
  {
    id: "processor",
    header: "Processor",
    accessorKey: "processor",
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.processor}</span>,
  },
  {
    id: "notes",
    header: "Notes",
    accessorKey: "notes",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.notes ? (
        <span className="block max-w-64 truncate text-muted-foreground" title={row.original.notes}>
          {row.original.notes}
        </span>
      ) : null,
  },
];

function StatusCell({ doc }: { doc: DocumentRow }) {
  let flag: ReactNode = null;
  if (doc.autoExpired) {
    flag = (
      <FlagMarker icon={<TriangleAlertIcon className="size-4 text-status-expired" />} label="Expired automatically">
        The tracker says “{doc.status}”, but this document expired on {formatDisplayDate(doc.expirationDate)}. Treat
        it as expired and request a fresh copy from the borrower.
      </FlagMarker>
    );
  } else if (doc.statusConflict) {
    flag = (
      <FlagMarker icon={<CircleAlertIcon className="size-4 text-status-outstanding" />} label="Status conflict">
        Marked “Expired”, but the expiration date ({formatDisplayDate(doc.expirationDate)}) hasn’t passed yet.
        Double-check the status or the date.
      </FlagMarker>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <DocumentStatusBadge status={doc.effectiveStatus} />
      {flag}
    </div>
  );
}

function FlagMarker({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} className="inline-flex rounded-sm" onClick={(e) => e.stopPropagation()}>
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <p className="font-medium">{label}</p>
        <p>{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ExpiresCell({ doc }: { doc: DocumentRow }) {
  if (!doc.expirationDate) return <span className="text-muted-foreground">—</span>;
  const days = doc.daysUntilExpiration;
  const expired = days !== null && days < 0;
  return (
    <div className="whitespace-nowrap tabular-nums">
      <div>{formatDisplayDate(doc.expirationDate)}</div>
      <div
        className={cn(
          "text-xs",
          expired
            ? "font-medium text-status-expired"
            : doc.expiringSoon
              ? "font-medium text-status-outstanding"
              : "text-muted-foreground",
        )}
      >
        {describeExpiration(days)}
      </div>
    </div>
  );
}

/** Columns for "Export CSV" — dates as ISO so they sort/parse cleanly in Excel. */
export const DOCUMENT_CSV_COLUMNS: CsvColumn<DocumentRow>[] = [
  { header: "Application ID", value: (d) => d.applicationId },
  { header: "Business", value: (d) => d.businessName },
  { header: "Borrower", value: (d) => d.borrowerName },
  { header: "Processor", value: (d) => d.processor },
  { header: "Document", value: (d) => d.documentType },
  { header: "Status", value: (d) => d.effectiveStatus },
  { header: "Status in tracker", value: (d) => d.status },
  {
    header: "Flag",
    value: (d) => (d.autoExpired ? "Expired automatically" : d.statusConflict ? "Status conflict" : ""),
  },
  { header: "Date received", value: (d) => d.dateReceived },
  { header: "Expiration date", value: (d) => d.expirationDate },
  { header: "Days until expiration", value: (d) => d.daysUntilExpiration },
  { header: "Expiring soon", value: (d) => (d.expiringSoon ? "Yes" : "") },
  { header: "Notes", value: (d) => d.notes },
];

export type DocumentsSort = "application" | "expires";

export function DocumentsTable({
  rows,
  sort,
  emptyMessage,
}: {
  rows: DocumentRow[];
  sort: DocumentsSort;
  emptyMessage?: ReactNode;
}) {
  return (
    <DataTable
      // Remount when the default sort changes so `initialSorting` takes effect.
      key={sort}
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      initialSorting={[{ id: sort, desc: false }]}
      pageSize={50}
      emptyMessage={emptyMessage}
      rowClassName={(row) => (row.effectiveStatus === "Expired" ? "bg-status-expired/5" : undefined)}
    />
  );
}
