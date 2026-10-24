// Application detail: the document checklist, and the place processors update document status.
import { ArrowLeftIcon, FileQuestionIcon } from "lucide-react";
import { Link, data, isRouteErrorResponse } from "react-router";
import { ApplicationOverview } from "~/components/applications/application-overview";
import { DocumentChecklist, checklistCsvColumns, sortChecklist } from "~/components/applications/document-checklist";
import { UPDATE_DOCUMENT_INTENT } from "~/components/applications/use-document-fetcher";
import type { RouteHandle } from "~/components/app-header";
import { ExportCsvButton } from "~/components/export-csv-button";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { getAsOf } from "~/lib/as-of.server";
import { readApplicationDocuments, updateDocument } from "~/lib/csv-store.server";
import {
  type DocumentUpdate,
  deriveDocuments,
  isDocumentStatus,
  normalizeDate,
  summarizeApplication,
} from "~/lib/domain";
import type { Route } from "./+types/application-detail";

export const handle: RouteHandle = {
  breadcrumb: (loaderData?: { application?: { businessName: string } }) =>
    loaderData?.application?.businessName ?? "Application",
  parent: { label: "Applications", to: "/applications" },
};

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.application.businessName ?? "Application not found"} · Doc Tracker` },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const asOf = await getAsOf(request);
  const records = await readApplicationDocuments(params.applicationId);
  if (records.length === 0) throw data("Application not found", { status: 404 });

  const documents = deriveDocuments(records, asOf);
  return { asOf, application: summarizeApplication(documents, asOf), documents: sortChecklist(documents) };
}

type FieldErrors = Partial<Record<"status" | "dateReceived" | "expirationDate" | "form", string>>;
const fail = (errors: FieldErrors, status = 400) => data({ ok: false as const, errors }, { status });

/** Statuses meaning "we have a copy on file". */

export async function action({ request, params }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") !== UPDATE_DOCUMENT_INTENT) return fail({ form: "Unknown action." });

  const documentId = String(form.get("documentId") ?? "");
  const status = form.get("status");
  const errors: FieldErrors = {};
  if (!isDocumentStatus(status)) errors.status = "Choose a status.";

  // Only fields that were actually submitted are updated (the inline select sends just the status).
  // Empty date fields mean "clear / work it out for me" → null.
  const readDate = (field: "dateReceived" | "expirationDate", label: string) => {
    if (!form.has(field)) return undefined;
    const raw = String(form.get(field) ?? "").trim();
    if (!raw) return null;
    const iso = normalizeDate(raw);
    if (!iso) errors[field] = `${label} isn't a valid date.`;
    return iso;
  };
  const dateReceived = readDate("dateReceived", "Date received");
  const expirationDate = readDate("expirationDate", "Expiration date");
  if (dateReceived && expirationDate && expirationDate < dateReceived) {
    errors.expirationDate = "Expiration date can't be before the date received.";
  }
  if (Object.keys(errors).length > 0 || !isDocumentStatus(status)) return fail(errors);

  // The document must belong to the application in the URL.
  const current = (await readApplicationDocuments(params.applicationId)).find((d) => d.id === documentId);
  if (!current) return fail({ form: "That document isn't on this application." }, 404);

  const asOf = await getAsOf(request);
  const update: DocumentUpdate = { status };
  if (dateReceived !== undefined) update.dateReceived = dateReceived;
  if (expirationDate !== undefined) update.expirationDate = expirationDate;
  if (form.has("notes")) update.notes = String(form.get("notes") ?? "");

  const document = await updateDocument(documentId, update, asOf);
  if (!document) return fail({ form: "That document no longer exists." }, 404);
  return { ok: true as const, document };
}

export default function ApplicationDetailPage({ loaderData }: Route.ComponentProps) {
  const { application, documents, asOf } = loaderData;
  return (
    <>
      <PageHeader
        title={application.businessName}
        description={`${application.borrowerName} · ${application.applicationId}`}
        actions={
          <ExportCsvButton
            filename={`${application.applicationId}-checklist-${asOf}`}
            rows={documents}
            columns={checklistCsvColumns}
          />
        }
      />
      <ApplicationOverview application={application} />
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Document checklist</h2>
          <p className="text-sm text-muted-foreground">
            Change a status from the dropdown — it saves right away. Use Edit for dates and notes.
          </p>
        </div>
        <DocumentChecklist documents={documents} />
      </section>
    </>
  );
}

export function ErrorBoundary({ error, params }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <FileQuestionIcon className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">{notFound ? "Application not found" : "Something went wrong"}</h1>
      <p className="text-sm text-muted-foreground">
        {notFound
          ? `We couldn't find an application with the ID “${params.applicationId}”. It may have been typed incorrectly.`
          : "This application couldn't be loaded. Please try again in a moment."}
      </p>
      <Button asChild variant="outline">
        <Link to="/applications">
          <ArrowLeftIcon data-icon="inline-start" />
          Back to applications
        </Link>
      </Button>
    </div>
  );
}
