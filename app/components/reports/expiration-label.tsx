import { formatDisplayDate } from "~/lib/domain";
import { cn } from "~/lib/utils";
import { type ExpirationRow, describeExpiration } from "~/lib/reports";

export function ExpirationLabel({ row, className }: { row: ExpirationRow; className?: string }) {
  const urgent = row.expired || (row.daysUntilExpiration ?? Infinity) <= 7;
  return (
    <span className={cn("flex flex-col items-end text-right", className)}>
      <span
        className={cn(
          "text-xs font-medium whitespace-nowrap",
          row.expired ? "text-status-expired" : urgent ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {describeExpiration(row)}
      </span>
      <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDisplayDate(row.expirationDate)}</span>
    </span>
  );
}
