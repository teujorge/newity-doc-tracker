// Applications list: answers "which applications are stalled waiting on documents?"
import { InfoIcon } from "lucide-react";
import { Link, useNavigation } from "react-router";
import { type HealthCounts, ApplicationFilters } from "~/components/applications/application-filters";
import { ApplicationsTable, applicationCsvColumns } from "~/components/applications/applications-table";
import {
  AT_RISK_LEGEND,
  HEALTH_FILTERS,
  STALLED_LEGEND,
  compareByAttention,
  isApplicationHealth,
} from "~/components/applications/health";
import type { RouteHandle } from "~/components/app-header";
import { ExportCsvButton } from "~/components/export-csv-button";
import { PageHeader } from "~/components/page-header";
import { formatDisplayDate } from "~/lib/domain";
import { pluralize } from "~/lib/format";
import { loadPipeline } from "~/lib/pipeline.server";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/applications";

export const handle: RouteHandle = { breadcrumb: "Applications" };

export const meta: Route.MetaFunction = () => [{ title: "Applications · Doc Tracker" }];

export async function loader({ request }: Route.LoaderArgs) {
  const { asOf, applications } = await loadPipeline(request);
  const params = new URL(request.url).searchParams;

  const processors = [...new Set(applications.map((a) => a.processor))].sort();
  const q = params.get("q")?.trim() ?? "";
  const processorParam = params.get("processor") ?? "";
  const processor = processors.includes(processorParam) ? processorParam : "";
  const healthParam = params.get("health");
  const health = isApplicationHealth(healthParam) ? healthParam : null;

  // Search + processor narrow the list; the status chips then show counts within that.
  const needle = q.toLowerCase();
  const matching = applications.filter(
    (a) =>
      (!processor || a.processor === processor) &&
      (!needle ||
        a.businessName.toLowerCase().includes(needle) ||
        a.borrowerName.toLowerCase().includes(needle) ||
        a.applicationId.toLowerCase().includes(needle)),
  );

  const counts = { all: matching.length } as HealthCounts;
  for (const h of HEALTH_FILTERS) counts[h] = matching.filter((a) => a.health === h).length;

  const rows = (health ? matching.filter((a) => a.health === health) : matching).sort(compareByAttention);

  return { asOf, filters: { q, processor, health }, processors, counts, rows, total: applications.length };
}

export default function ApplicationsPage({ loaderData }: Route.ComponentProps) {
  const { asOf, filters, processors, counts, rows, total } = loaderData;
  const navigation = useNavigation();
  const refreshing = navigation.state === "loading" && navigation.location.pathname === "/applications";

  return (
    <>
      <PageHeader
        title="Applications"
        description={`${pluralize(total, "application")} · ${counts.stalled} stalled · as of ${formatDisplayDate(asOf)}`}
        actions={
          <ExportCsvButton
            filename={`applications${filters.health ? `-${filters.health}` : ""}-${asOf}`}
            rows={rows}
            columns={applicationCsvColumns}
          />
        }
      />

      <ApplicationFilters filters={filters} processors={processors} counts={counts} />

      <p className="-mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-medium text-foreground">{STALLED_LEGEND}</strong> {AT_RISK_LEGEND} Outstanding =
          Pending or Expired. Stalled applications are listed first.
        </span>
      </p>

      <div className={cn("transition-opacity", refreshing && "opacity-60")}>
        <ApplicationsTable
          rows={rows}
          emptyMessage={
            <span>
              No applications match these filters.{" "}
              <Link to="/applications" className="underline">
                Show all applications
              </Link>
            </span>
          }
        />
      </div>
    </>
  );
}
