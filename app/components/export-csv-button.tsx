import { DownloadIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { type CsvColumn, downloadCsv } from "~/lib/export-csv";

interface ExportCsvButtonProps<T> {
  filename: string;
  rows: T[];
  columns: CsvColumn<T>[];
  label?: string;
  size?: "default" | "sm" | "xs";
  variant?: "outline" | "ghost" | "secondary";
}

/** Downloads `rows` as a CSV using the given column mapping. Used for tables and chart data. */
export function ExportCsvButton<T>({
  filename,
  rows,
  columns,
  label = "Export CSV",
  size = "sm",
  variant = "outline",
}: ExportCsvButtonProps<T>) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows, columns)}
    >
      <DownloadIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}
