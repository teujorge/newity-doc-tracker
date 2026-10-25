// "Edit" dialog for one checklist row: status, dates and notes in one place.
import { Loader2Icon, PencilIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { DocumentStatusBadge } from "~/components/status-badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useAsOf } from "~/hooks/use-as-of";
import {
  DOCUMENT_STATUSES,
  type DerivedDocument,
  type DocumentStatus,
  EXPIRATION_RULES,
  computeExpirationDate,
  formatDisplayDate,
  isDocumentStatus,
  isTimeSensitive,
  validateReceivedDate,
} from "~/lib/domain";
import {
  type DocumentFetcher,
  UPDATE_DOCUMENT_INTENT,
  useDocumentFetcher,
  useOnFetcherSettled,
} from "./use-document-fetcher";

/** Statuses with nothing on file: the dates get cleared on save. */
const NO_FILE_STATUSES: DocumentStatus[] = ["Pending", "Not Required"];

export function EditDocumentDialog({ doc }: { doc: DerivedDocument }) {
  const [open, setOpen] = useState(false);
  const fetcher = useDocumentFetcher(doc.id);

  // Close once the save has landed; the row's status cell shows the "Saved" toast.
  useOnFetcherSettled(fetcher, (data) => {
    if (data.ok) setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Edit ${doc.documentType}`}>
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{doc.documentType}</DialogTitle>
          <DialogDescription>
            {doc.businessName} · {doc.applicationId}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the fields always start from the latest saved values. */}
        <EditDocumentForm doc={doc} fetcher={fetcher} />
      </DialogContent>
    </Dialog>
  );
}

function EditDocumentForm({ doc, fetcher }: { doc: DerivedDocument; fetcher: DocumentFetcher }) {
  const asOf = useAsOf();
  const [status, setStatus] = useState<DocumentStatus>(doc.effectiveStatus);
  const [dateReceived, setDateReceived] = useState(doc.dateReceived ?? "");
  const [expirationDate, setExpirationDate] = useState(doc.expirationDate ?? "");
  const [expirationEdited, setExpirationEdited] = useState(false);

  const timeSensitive = isTimeSensitive(doc.documentType);
  const noFile = NO_FILE_STATUSES.includes(status);
  const saving = fetcher.state !== "idle";
  const errors = fetcher.data && !fetcher.data.ok ? fetcher.data.errors : undefined;
  const stillExpired = !noFile && status !== "Expired" && expirationDate !== "" && expirationDate < asOf;
  // Validate as they type so a future date never reaches the server (which checks again).
  const receivedError = (!noFile && validateReceivedDate(dateReceived, asOf)) || errors?.dateReceived;

  return (
    <fetcher.Form method="post" className="grid gap-4">
      <input type="hidden" name="intent" value={UPDATE_DOCUMENT_INTENT} />
      <input type="hidden" name="documentId" value={doc.id} />

      <div className="grid gap-1.5">
        <Label htmlFor="edit-status">Status</Label>
        <Select name="status" value={status} onValueChange={(v) => isDocumentStatus(v) && setStatus(v)}>
          <SelectTrigger id="edit-status" className="w-full" aria-invalid={!!errors?.status}>
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
        <FieldError message={errors?.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-1.5">
          <Label htmlFor="edit-received">Date received</Label>
          <Input
            id="edit-received"
            type="date"
            name="dateReceived"
            value={noFile ? "" : dateReceived}
            max={asOf}
            disabled={noFile}
            aria-invalid={!!receivedError}
            onChange={(event) => {
              const next = event.target.value;
              setDateReceived(next);
              // Keep the expiration date in step with the received date until the user overrides it.
              if (timeSensitive && !expirationEdited) setExpirationDate(computeExpirationDate(doc.documentType, next) ?? "");
            }}
          />
          <p className="text-xs text-muted-foreground">
            {noFile ? "Cleared for Pending / Not Required." : `Leave blank for today (${formatDisplayDate(asOf)}).`}
          </p>
          <FieldError message={receivedError || undefined} />
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor="edit-expiration">Expiration date</Label>
          <Input
            id="edit-expiration"
            type="date"
            name="expirationDate"
            value={noFile ? "" : expirationDate}
            disabled={noFile}
            aria-invalid={!!errors?.expirationDate}
            onChange={(event) => {
              setExpirationDate(event.target.value);
              setExpirationEdited(true);
            }}
          />
          <p className="text-xs text-muted-foreground">
            {noFile
              ? "Cleared for Pending / Not Required."
              : timeSensitive
                ? `Leave blank to calculate automatically (bank statements 90 days, tax returns 3 years, insurance 1 year). This one: ${EXPIRATION_RULES[doc.documentType]} days.`
                : "Usually not needed for this document."}
          </p>
          <FieldError message={errors?.expirationDate} />
        </div>
      </div>

      {stillExpired && (
        <p className="flex gap-1.5 rounded-md bg-status-outstanding/10 p-2 text-xs">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0 text-status-outstanding" aria-hidden />
          This expiration date has already passed, so the document will still show as Expired. If a new copy came in,
          update the date received.
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea id="edit-notes" name="notes" defaultValue={doc.notes} rows={3} placeholder="e.g. Requested updated copy from borrower" />
      </div>

      <FieldError message={errors?.form} />

      <DialogFooter>
        <Button type="submit" disabled={saving || (!noFile && !!validateReceivedDate(dateReceived, asOf))}>
          {saving && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </fetcher.Form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}
