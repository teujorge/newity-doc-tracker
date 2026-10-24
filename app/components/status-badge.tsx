import { cn } from "~/lib/utils";
import type { ApplicationHealth, DocumentStatus } from "~/lib/domain";

// Colors come from the --status-* tokens in app.css so badges and charts match.
const DOT: Record<DocumentStatus, string> = {
  Approved: "bg-status-complete",
  "Not Required": "bg-status-muted",
  Received: "bg-status-in-progress",
  "Under Review": "bg-status-in-progress",
  Pending: "bg-status-outstanding",
  Expired: "bg-status-expired",
};

const PILL = "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return (
    <span className={cn(PILL, "bg-background", className)}>
      <span className={cn("size-2 rounded-full", DOT[status])} aria-hidden />
      {status}
    </span>
  );
}

const HEALTH: Record<ApplicationHealth, { label: string; className: string }> = {
  stalled: { label: "Stalled", className: "border-status-expired/30 bg-status-expired/10 text-status-expired" },
  "at-risk": { label: "At risk", className: "border-status-outstanding/40 bg-status-outstanding/10 text-foreground" },
  "on-track": { label: "On track", className: "border-status-in-progress/30 bg-status-in-progress/10 text-status-in-progress" },
  complete: { label: "Complete", className: "border-status-complete/30 bg-status-complete/10 text-status-complete" },
};

export function HealthBadge({ health, className }: { health: ApplicationHealth; className?: string }) {
  const { label, className: tone } = HEALTH[health];
  return <span className={cn(PILL, tone, className)}>{label}</span>;
}

export const HEALTH_LABEL: Record<ApplicationHealth, string> = {
  stalled: "Stalled",
  "at-risk": "At risk",
  "on-track": "On track",
  complete: "Complete",
};
