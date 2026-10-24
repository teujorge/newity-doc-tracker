import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface ChartCardProps {
  title: string;
  description: ReactNode;
  /** Usually an <ExportCsvButton size="xs" /> for the chart's data. */
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Card shell shared by every dashboard chart. */
export function ChartCard({ title, description, action, children, footer }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
      {footer && <CardContent className="text-xs text-muted-foreground">{footer}</CardContent>}
    </Card>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {children}
    </div>
  );
}
