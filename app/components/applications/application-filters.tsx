// Filter bar for /applications. All filter state lives in the URL (?q, ?processor, ?health),
// so views are shareable/bookmarkable and the loader does the filtering.
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { HEALTH_LABEL } from "~/components/status-badge";
import type { ApplicationHealth } from "~/lib/domain";
import { cn } from "~/lib/utils";
import { HEALTH_FILTERS } from "./health";

export interface ApplicationFilterValues {
  q: string;
  processor: string;
  health: ApplicationHealth | null;
}

export type HealthCounts = Record<ApplicationHealth | "all", number>;

const ALL_PROCESSORS = "__all__";
const SEARCH_DEBOUNCE_MS = 300;

/** `?q=…&processor=…&health=…`, dropping empty values. */
export function buildSearch({ q, processor, health }: ApplicationFilterValues): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (processor) params.set("processor", processor);
  if (health) params.set("health", health);
  const search = params.toString();
  return search ? `?${search}` : "";
}

interface ApplicationFiltersProps {
  filters: ApplicationFilterValues;
  processors: string[];
  counts: HealthCounts;
}

export function ApplicationFilters({ filters, processors, counts }: ApplicationFiltersProps) {
  const navigate = useNavigate();
  const go = (next: Partial<ApplicationFilterValues>, replace = false) =>
    navigate({ search: buildSearch({ ...filters, ...next }) }, { replace, preventScrollReset: true });

  const hasFilters = Boolean(filters.q || filters.processor || filters.health);
  const chips: { value: ApplicationHealth | null; label: string; count: number }[] = [
    { value: null, label: "All", count: counts.all },
    ...HEALTH_FILTERS.map((h) => ({ value: h, label: HEALTH_LABEL[h], count: counts[h] })),
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Quick filters are plain links: they work before hydration and can be opened in a new tab. */}
      <nav aria-label="Filter by status" className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg bg-muted p-[3px]">
        {chips.map((chip) => {
          const active = filters.health === chip.value;
          return (
            <Link
              key={chip.label}
              to={{ search: buildSearch({ ...filters, health: chip.value }) }}
              preventScrollReset
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-foreground/60 transition-colors hover:text-foreground",
                active && "bg-background text-foreground shadow-sm",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  chip.value === "stalled" && chip.count > 0
                    ? "bg-status-expired/15 text-status-expired"
                    : "bg-foreground/5 text-muted-foreground",
                )}
              >
                {chip.count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={filters.q} onSearch={(q) => go({ q }, true)} />
        <Select
          value={filters.processor || ALL_PROCESSORS}
          onValueChange={(value) => go({ processor: value === ALL_PROCESSORS ? "" : value })}
        >
          <SelectTrigger className="w-44" aria-label="Processor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROCESSORS}>All processors</SelectItem>
            {processors.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/applications" preventScrollReset>
              <XIcon data-icon="inline-start" />
              Clear
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Debounced search box. Replaces the history entry so typing doesn't fill the back button. */
function SearchInput({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow the URL when it changes from elsewhere (Clear button, back/forward), but never
  // overwrite what the user is in the middle of typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(value);
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        aria-label="Search applications"
        placeholder="Search business, borrower or ID…"
        className="w-64 pl-8"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onSearch(next.trim()), SEARCH_DEBOUNCE_MS);
        }}
      />
    </div>
  );
}
