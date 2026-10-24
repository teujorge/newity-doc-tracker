// The four dashboard charts. Colors always come from the semantic --status-* tokens
// so "orange = outstanding", "red = expired/stalled" etc. match the badges everywhere else.
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ExportCsvButton } from "~/components/export-csv-button";
import { HEALTH_LABEL } from "~/components/status-badge";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import type { ExpirationWeekBucket, HealthCount } from "~/lib/reports";
import type { PipelineSummary } from "~/lib/domain";
import { pluralize } from "~/lib/format";
import { ChartCard, ChartEmpty } from "./chart-card";

const CHART_CLASS = "aspect-auto h-64 w-full";

// ---------- 1. Workload by processor ----------

const workloadConfig = {
  outstandingDocs: { label: "Outstanding", color: "var(--status-outstanding)" },
  inProgressDocs: { label: "In progress", color: "var(--status-in-progress)" },
  completeDocs: { label: "Complete", color: "var(--status-complete)" },
} satisfies ChartConfig;

export function WorkloadChart({ data }: { data: PipelineSummary["byProcessor"] }) {
  return (
    <ChartCard
      title="Workload by processor"
      description="Documents on each processor's applications. Outstanding = not received yet, or expired."
      action={
        <ExportCsvButton
          size="xs"
          filename="workload-by-processor"
          rows={data}
          columns={[
            { header: "Processor", value: (r) => r.processor },
            { header: "Applications", value: (r) => r.applications },
            { header: "Stalled applications", value: (r) => r.stalled },
            { header: "Outstanding documents", value: (r) => r.outstandingDocs },
            { header: "In-progress documents", value: (r) => r.inProgressDocs },
            { header: "Complete documents", value: (r) => r.completeDocs },
          ]}
        />
      }
    >
      {data.length === 0 ? (
        <ChartEmpty>No applications yet.</ChartEmpty>
      ) : (
        <ChartContainer config={workloadConfig} className={CHART_CLASS}>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="processor" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="outstandingDocs" stackId="docs" fill="var(--color-outstandingDocs)" />
            <Bar dataKey="inProgressDocs" stackId="docs" fill="var(--color-inProgressDocs)" />
            <Bar dataKey="completeDocs" stackId="docs" fill="var(--color-completeDocs)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

// ---------- 2. Bottleneck document types ----------

const bottleneckConfig = {
  pending: { label: "Not received yet", color: "var(--status-outstanding)" },
  expired: { label: "Expired", color: "var(--status-expired)" },
} satisfies ChartConfig;

export function BottleneckChart({ data }: { data: PipelineSummary["byDocumentType"] }) {
  const rows = data
    .filter((t) => t.outstanding > 0)
    .slice(0, 6)
    .map((t) => ({ documentType: t.documentType, pending: t.outstanding - t.expired, expired: t.expired, total: t.outstanding }));

  return (
    <ChartCard
      title="Bottleneck document types"
      description="Which documents we're most often still waiting on, across all applications."
      action={
        <ExportCsvButton
          size="xs"
          filename="bottleneck-document-types"
          rows={data}
          columns={[
            { header: "Document type", value: (r) => r.documentType },
            { header: "Outstanding", value: (r) => r.outstanding },
            { header: "Of which expired", value: (r) => r.expired },
            { header: "In progress", value: (r) => r.inProgress },
            { header: "Complete", value: (r) => r.complete },
          ]}
        />
      }
    >
      {rows.length === 0 ? (
        <ChartEmpty>Nothing outstanding — every document is in.</ChartEmpty>
      ) : (
        <ChartContainer config={bottleneckConfig} className={CHART_CLASS}>
          <BarChart data={rows} layout="vertical" margin={{ right: 28 }} accessibilityLayer>
            <CartesianGrid horizontal={false} />
            <YAxis
              type="category"
              dataKey="documentType"
              tickLine={false}
              axisLine={false}
              width={180}
              interval={0}
            />
            <XAxis type="number" hide allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="pending" stackId="out" fill="var(--color-pending)" />
            <Bar dataKey="expired" stackId="out" fill="var(--color-expired)" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="total" position="right" className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

// ---------- 3. Application health ----------

const healthConfig = {
  count: { label: "Applications" },
  stalled: { label: HEALTH_LABEL.stalled, color: "var(--status-expired)" },
  "at-risk": { label: HEALTH_LABEL["at-risk"], color: "var(--status-outstanding)" },
  "on-track": { label: HEALTH_LABEL["on-track"], color: "var(--status-in-progress)" },
  complete: { label: HEALTH_LABEL.complete, color: "var(--status-complete)" },
} satisfies ChartConfig;

export function HealthChart({ data }: { data: HealthCount[] }) {
  const rows = data.map((d) => ({ ...d, label: HEALTH_LABEL[d.health], fill: `var(--color-${d.health})` }));
  return (
    <ChartCard
      title="Application health"
      description="Stalled = missing documents and no activity in 14+ days. At risk = a document is expired or expiring soon."
      action={
        <ExportCsvButton
          size="xs"
          filename="application-health"
          rows={rows}
          columns={[
            { header: "Health", value: (r) => r.label },
            { header: "Applications", value: (r) => r.count },
          ]}
        />
      }
    >
      <ChartContainer config={healthConfig} className={CHART_CLASS}>
        <BarChart data={rows} margin={{ top: 20 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="health" />} />
          <Bar dataKey="count" radius={4}>
            <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={12} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

// ---------- 4. Expirations over the next 90 days ----------

const expirationsConfig = {
  count: { label: "Documents expiring", color: "var(--status-outstanding)" },
} satisfies ChartConfig;

export function ExpirationsChart({ data }: { data: ExpirationWeekBucket[] }) {
  const total = data.reduce((n, b) => n + b.count, 0);
  return (
    <ChartCard
      title="Expirations coming up"
      description={`Documents that will expire in the next 13 weeks (${pluralize(total, "document")}), by week. Plan re-requests early.`}
      action={
        <ExportCsvButton
          size="xs"
          filename="expirations-by-week"
          rows={data}
          columns={[
            { header: "Week starting", value: (r) => r.weekStart },
            { header: "Documents expiring", value: (r) => r.count },
          ]}
        />
      }
    >
      {total === 0 ? (
        <ChartEmpty>No documents expire in the next 13 weeks.</ChartEmpty>
      ) : (
        <ChartContainer config={expirationsConfig} className={CHART_CLASS}>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => `Week of ${label}`} />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
