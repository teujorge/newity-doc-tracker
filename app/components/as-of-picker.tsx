import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { DEFAULT_AS_OF, formatDisplayDate, parseDate, toIsoDate } from "~/lib/domain";

/**
 * Header control for the "as of" date. Posting to /api/as-of sets a cookie and
 * React Router revalidates every loader, so all pages recompute instantly.
 */
export function AsOfPicker({ asOf }: { asOf: string }) {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  const pending = fetcher.formData?.get("asOf");
  const current = typeof pending === "string" ? pending : asOf;

  const submit = (value: string) => {
    fetcher.submit({ asOf: value }, { method: "post", action: "/api/as-of" });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Change as-of date">
          <CalendarIcon data-icon="inline-start" />
          <span className="hidden text-muted-foreground sm:inline">As of</span>
          {formatDisplayDate(current)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="border-b p-3 text-xs text-muted-foreground">
          Expirations and "stalled" are calculated as of this date.
        </div>
        <Calendar
          mode="single"
          selected={parseDate(current) ?? undefined}
          defaultMonth={parseDate(current) ?? undefined}
          onSelect={(date) => date && submit(toIsoDate(date))}
        />
        <div className="flex gap-2 border-t p-3">
          <Button size="sm" variant="secondary" onClick={() => submit(DEFAULT_AS_OF)}>
            Demo date
          </Button>
          <Button size="sm" variant="ghost" onClick={() => submit(toIsoDate(new Date()))}>
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
