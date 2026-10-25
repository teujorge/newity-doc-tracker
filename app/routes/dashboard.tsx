import { FileTextIcon } from "lucide-react";
import { Link } from "react-router";
import type { RouteHandle } from "~/components/app-header";
import { NeedsAttentionCard, UpcomingExpirationsCard } from "~/components/dashboard/attention-lists";
import { BottleneckChart, ExpirationsChart, HealthChart, WorkloadChart } from "~/components/dashboard/dashboard-charts";
import { KpiCard } from "~/components/dashboard/kpi-card";
import { PageHeader } from "~/components/page-header";
import {
  bucketExpirationsByWeek,
  countByHealth,
  selectStalledApplications,
  selectUpcomingExpirations,
} from "~/lib/reports";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { EXPIRING_SOON_DAYS, STALLED_AFTER_DAYS, formatDisplayDate } from "~/lib/domain";
import { formatCompactCurrency } from "~/lib/format";
import { loadPipeline } from "~/lib/pipeline.server";
import type { Route } from "./+types/dashboard";

export const handle: RouteHandle = { breadcrumb: "Dashboard" };

export const meta: Route.MetaFunction = () => [
  { title: "Dashboard · Doc Tracker" },
  { name: "description", content: "Pipeline health, stalled applications and upcoming document expirations." },
];

const ATTENTION_LIMIT = 8;
const EXPIRATIONS_LIMIT = 8;

export async function loader({ request }: Route.LoaderArgs) {
  const { asOf, documents, applications, summary } = await loadPipeline(request);
  const upcoming = selectUpcomingExpirations(documents);
  return {
    asOf,
    summary,
    needsAttention: selectStalledApplications(applications, ATTENTION_LIMIT),
    upcomingExpirations: upcoming.slice(0, EXPIRATIONS_LIMIT),
    upcomingExpirationsTotal: upcoming.length,
    expirationsByWeek: bucketExpirationsByWeek(documents, asOf),
    health: countByHealth(applications),
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { asOf, summary: s, needsAttention, upcomingExpirations, upcomingExpirationsTotal, expirationsByWeek, health } =
    loaderData;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Where every SBA application stands as of ${formatDisplayDate(asOf)}.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/reports/weekly">
              <FileTextIcon data-icon="inline-start" />
              Weekly summary
            </Link>
          </Button>
        }
      />

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Active applications"
          value={s.activeApplications}
          detail={`of ${s.totalApplications}`}
          helper="Applications still collecting or reviewing documents."
          to="/applications"
        />
        <KpiCard
          label="Stalled applications"
          value={s.stalledApplications}
          detail={`${formatCompactCurrency(s.stalledLoanVolume)} in loans`}
          helper={`Missing documents and nothing new received in ${STALLED_AFTER_DAYS}+ days. Follow up first.`}
          to="/applications?health=stalled"
          tone={s.stalledApplications > 0 ? "danger" : "default"}
        />
        <KpiCard
          label={`Expiring within ${EXPIRING_SOON_DAYS} days`}
          value={s.expiringSoonDocuments}
          detail="documents"
          helper="Will expire soon. Ask the borrower for an updated copy now."
          to="/documents?expiration=expiring"
          tone={s.expiringSoonDocuments > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Expired documents"
          value={s.expiredDocuments}
          detail="documents"
          helper="Past their expiration date or marked Expired. These count as missing until replaced."
          to="/documents?expiration=expired"
          tone={s.expiredDocuments > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Document completion"
          value={`${s.completionPct}%`}
          helper={`${s.documentsByGroup.complete} of ${s.totalDocuments} documents are approved or not required.`}
        >
          <Progress value={s.completionPct} aria-label="Overall document completion" />
        </KpiCard>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <NeedsAttentionCard rows={needsAttention} total={s.stalledApplications} />
        <UpcomingExpirationsCard rows={upcomingExpirations} total={upcomingExpirationsTotal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkloadChart data={s.byProcessor} />
        <BottleneckChart data={s.byDocumentType} />
        <HealthChart data={health} />
        <ExpirationsChart data={expirationsByWeek} />
      </div>
    </>
  );
}
