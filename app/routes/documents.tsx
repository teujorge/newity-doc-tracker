import { useNavigation, useSearchParams } from "react-router";
import type { RouteHandle } from "~/components/app-header";
import { DocumentsFilterBar } from "~/components/documents/documents-filter-bar";
import { DOCUMENT_CSV_COLUMNS, DocumentsTable } from "~/components/documents/documents-table";
import {
  countQuickFilters,
  hasActiveFilters,
  matchesFilters,
  matchesScope,
  parseDocumentFilters,
  toDocumentRow,
} from "~/components/documents/filters";
import { ExportCsvButton } from "~/components/export-csv-button";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { DOCUMENT_TYPES, formatDisplayDate } from "~/lib/domain";
import { loadPipeline } from "~/lib/pipeline.server";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/documents";

export const handle: RouteHandle = { breadcrumb: "Documents" };

export const meta: Route.MetaFunction = () => [
  { title: "Documents · Doc Tracker" },
  { name: "description", content: "Every SBA loan document across all applications, with expiration tracking." },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { asOf, documents } = await loadPipeline(request);
  const filters = parseDocumentFilters(new URL(request.url).searchParams);

  // Chip counts reflect the current search / type / processor, so they match what a click will show.
  const inScope = documents.filter((d) => matchesScope(d, filters));
  const rows = inScope.filter((d) => matchesFilters(d, filters)).map(toDocumentRow);

  const knownTypes = new Set<string>(DOCUMENT_TYPES);
  const extraTypes = [...new Set(documents.map((d) => d.documentType))].filter((t) => !knownTypes.has(t)).sort();

  return {
    asOf,
    filters,
    rows,
    counts: countQuickFilters(inScope),
    totalDocuments: documents.length,
    documentTypes: [...DOCUMENT_TYPES, ...extraTypes],
    processors: [...new Set(documents.map((d) => d.processor))].filter(Boolean).sort(),
  };
}

export default function DocumentsPage({ loaderData }: Route.ComponentProps) {
  const { asOf, filters, rows, counts, totalDocuments, documentTypes, processors } = loaderData;
  const [, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isFiltering = navigation.state === "loading" && navigation.location?.pathname === "/documents";
  const filtered = hasActiveFilters(filters);
  const sortByExpiration = filters.expiration === "expiring" || filters.expiration === "expired";

  return (
    <>
      <PageHeader
        title="Documents"
        description={
          <>
            Every document across all applications, as of {formatDisplayDate(asOf)}.{" "}
            {filtered
              ? `Showing ${rows.length} of ${totalDocuments} documents.`
              : `${totalDocuments} documents in total.`}
          </>
        }
        actions={
          <ExportCsvButton
            filename={filtered ? `documents-filtered-${asOf}` : `documents-${asOf}`}
            rows={rows}
            columns={DOCUMENT_CSV_COLUMNS}
            label={filtered ? `Export ${rows.length} rows` : "Export CSV"}
          />
        }
      />

      <DocumentsFilterBar filters={filters} counts={counts} documentTypes={documentTypes} processors={processors} />

      <div className={cn("transition-opacity", isFiltering && "opacity-60")}>
        <DocumentsTable
          rows={rows}
          sort={sortByExpiration ? "expires" : "application"}
          emptyMessage={
            <div className="space-y-2">
              <p>No documents match these filters.</p>
              {filtered && (
                <Button variant="outline" size="sm" onClick={() => setSearchParams({}, { preventScrollReset: true })}>
                  Clear filters
                </Button>
              )}
            </div>
          }
        />
      </div>
    </>
  );
}
