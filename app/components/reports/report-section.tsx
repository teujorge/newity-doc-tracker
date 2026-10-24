import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

/** One titled block of a printable report. */
export function ReportSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("print:shadow-none print:ring-foreground/20", className)}>
      <CardHeader>
        <CardTitle className="font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction className="print:hidden">{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ReportStat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

export function ReportEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{children}</p>;
}
