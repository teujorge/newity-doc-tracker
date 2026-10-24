// The per-application checklist: where processors update document status (replaces editing the spreadsheet).
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { type ColumnDef, DataTable } from "~/components/data-table";
import { DocumentStatusBadge } from "~/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import {
  DOCUMENT_STATUSES,
  type DerivedDocument,
  type StatusGroup,
  formatDisplayDate,
  isDocumentStatus,
  isTimeSensitive,
} from "~/lib/domain";
import type { CsvColumn } from "~/lib/export-csv";
import { cn } from "~/lib/utils";
import { EditDocumentDialog } from "./edit-document-dialog";
import { formatExpiresIn } from "./health";
import { UPDATE_DOCUMENT_INTENT, firstError, useDocumentFetcher, useOnFetcherSettled } from "./use-document-fetcher";

const GROUP_RANK: Record<StatusGroup, number> = { outstanding: 0, "in-progress": 1, complete: 2 };

/** Outstanding first, then in progress, then complete (stable within each group). */
export function sortChecklist(docs: DerivedDocument[]): DerivedDocument[] {
  return [...docs].sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group]);
}

const columns: ColumnDef<DerivedDocument>[] = [
  {
    accessorKey: "documentType",
    header: "Document",
    cell: ({ row }) => <span className="font-medium">{row.original.documentType}</span>,
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (doc) => GROUP_RANK[doc.group],
    cell: ({ row }) => <StatusCell doc={row.original} />,
  },
  {
    accessorKey: "dateReceived",
    header: "Received",
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDisplayDate(row.original.dateReceived)}</span>,
  },
  {
    accessorKey: "daysUntilExpiration",
    header: "Expires",
    sortUndefined: "last",
    cell: ({ row }) => <ExpiresCell doc={row.original} />,
  },
  {
    accessorKey: "notes",
    header: "Notes",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.notes ? (
        <span className="line-clamp-2 max-w-64 text-muted-foreground" title={row.original.notes}>
          {row.original.notes}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-right">
        <EditDocumentDialog doc={row.original} />
      </div>
    ),
  },
];

export function DocumentChecklist({ documents }: { documents: DerivedDocument[] }) {
  return <DataTable columns={columns} data={documents} getRowId={(doc) => doc.id} pageSize={50} />;
}

/** Inline status select: saves immediately and shows the new status optimistically. */
function StatusCell({ doc }: { doc: DerivedDocument }) {
  const fetcher = useDocumentFetcher(doc.id);
  const pendingStatus = fetcher.formData?.get("status");
  const optimistic = isDocumentStatus(pendingStatus) ? pendingStatus : null;
  const status = optimistic ?? doc.effectiveStatus;
  const saving = fetcher.state !== "idle";

  // One toast per save, whether it came from this select or the Edit dialog (they share the fetcher).
  useOnFetcherSettled(fetcher, (data) => {
    if (data.ok) {
      const saved = data.document;
      const expires = saved.expirationDate ? ` · expires ${formatDisplayDate(saved.expirationDate)}` : "";
      toast.success("Saved", { description: `${saved.documentType}: ${saved.status}${expires}` });
    } else {
      toast.error("Couldn't save", { description: firstError(data) ?? "Please try again." });
    }
  });

  return (
    <div className="min-w-44 space-y-1">
      <div className="flex items-center gap-1.5">
        <Select
          value={status}
          onValueChange={(next) =>
            fetcher.submit({ intent: UPDATE_DOCUMENT_INTENT, documentId: doc.id, status: next }, { method: "post" })
          }
        >
          <SelectTrigger size="sm" className="w-40" aria-label={`Status of ${doc.documentType}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <DocumentStatusBadge status={s} className="border-transparent bg-transparent px-0" />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Saving" />
        ) : (
          doc.statusConflict && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-status-outstanding" aria-label="Status needs confirming">
                  <TriangleAlertIcon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Marked Expired but expiration date is in the future — please confirm</TooltipContent>
            </Tooltip>
          )
        )}
      </div>
      {!optimistic && doc.autoExpired && (
        <p className="text-xs text-status-expired">
          Expired on {formatDisplayDate(doc.expirationDate)} — status was {doc.status}
        </p>
      )}
    </div>
  );
}

function ExpiresCell({ doc }: { doc: DerivedDocument }) {
  if (!doc.expirationDate) {
    return (
      <span className="text-muted-foreground" title={isTimeSensitive(doc.documentType) ? "Set when the document is received" : undefined}>
        —
      </span>
    );
  }
  const days = doc.daysUntilExpiration ?? 0;
  const expired = days < 0;
  return (
    <div className="whitespace-nowrap">
      <div>{formatDisplayDate(doc.expirationDate)}</div>
      <div
        className={cn(
          "w-fit text-xs",
          expired
            ? "font-medium text-status-expired"
            : doc.expiringSoon
              ? "rounded bg-status-outstanding/15 px-1 font-medium"
              : "text-muted-foreground",
        )}
      >
        {formatExpiresIn(days)}
      </div>
    </div>
  );
}

export const checklistCsvColumns: CsvColumn<DerivedDocument>[] = [
  { header: "Application ID", value: (d) => d.applicationId },
  { header: "Business Name", value: (d) => d.businessName },
  { header: "Document", value: (d) => d.documentType },
  { header: "Status", value: (d) => d.effectiveStatus },
  { header: "Recorded Status", value: (d) => d.status },
  { header: "Date Received", value: (d) => d.dateReceived },
  { header: "Expiration Date", value: (d) => d.expirationDate },
  { header: "Days Until Expiration", value: (d) => d.daysUntilExpiration },
  { header: "Notes", value: (d) => d.notes },
];
