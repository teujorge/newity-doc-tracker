import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { cn } from "~/lib/utils";

type Tone = "default" | "danger" | "warning";

const TONE: Record<Tone, string> = {
  default: "",
  danger: "text-status-expired",
  warning: "text-status-outstanding",
};

interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Small line next to the value, e.g. "$1.2M in loans". */
  detail?: ReactNode;
  /** Plain-language explanation of what the number means. */
  helper: ReactNode;
  /** When set, the whole card links to a filtered list. */
  to?: string;
  tone?: Tone;
  children?: ReactNode;
}

/** One headline number on the dashboard. */
export function KpiCard({ label, value, detail, helper, to, tone = "default", children }: KpiCardProps) {
  const card = (
    <Card size="sm" className={cn("h-full", to && "transition-colors group-hover/kpi:bg-muted/50")}>
      <CardHeader>
        <CardDescription className="flex items-center justify-between gap-2 font-medium text-foreground">
          {label}
          {to && (
            <ChevronRightIcon
              className="size-4 text-muted-foreground transition-transform group-hover/kpi:translate-x-0.5"
              aria-hidden
            />
          )}
        </CardDescription>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", TONE[tone])}>{value}</span>
          {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
        </div>
      </CardHeader>
      <CardContent className="mt-auto space-y-2">
        {children}
        <p className="text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );

  if (!to) return card;
  return (
    <Link
      to={to}
      className="group/kpi rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`${label}: view list`}
    >
      {card}
    </Link>
  );
}
