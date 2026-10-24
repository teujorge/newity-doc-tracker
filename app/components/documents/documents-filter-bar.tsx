import { FilterXIcon, SearchIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { DOCUMENT_STATUSES } from "~/lib/domain";
import { cn } from "~/lib/utils";
import { type DocumentFilters, type ExpirationFilter, type QuickFilterCounts, hasActiveFilters } from "./filters";

type ParamChanges = Partial<Record<"q" | "type" | "status" | "processor" | "expiration", string | null>>;

/** Radix Select can't use "" as an item value, so "all" stands for "no filter". */
const ALL = "all";

interface DocumentsFilterBarProps {
  filters: DocumentFilters;
  counts: QuickFilterCounts;
  documentTypes: string[];
  processors: string[];
}

export function DocumentsFilterBar({ filters, counts, documentTypes, processors }: DocumentsFilterBarProps) {
  const [, setSearchParams] = useSearchParams();

  function update(changes: ParamChanges, { replace = false } = {}) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace, preventScrollReset: true },
    );
  }

  const toggleExpiration = (value: ExpirationFilter) =>
    update({ expiration: filters.expiration === value ? null : value });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Quick filters:</span>
        <QuickFilterChip
          active={filters.expiration === "expiring"}
          count={counts.expiring}
          dotClassName="bg-status-outstanding"
          onClick={() => toggleExpiration("expiring")}
        >
          Expiring soon
        </QuickFilterChip>
        <QuickFilterChip
          active={filters.expiration === "expired"}
          count={counts.expired}
          dotClassName="bg-status-expired"
          onClick={() => toggleExpiration("expired")}
        >
          Expired
        </QuickFilterChip>
        <QuickFilterChip
          active={filters.status === "Pending"}
          count={counts.pending}
          dotClassName="bg-status-outstanding"
          onClick={() => update({ status: filters.status === "Pending" ? null : "Pending" })}
        >
          Pending
        </QuickFilterChip>
        <QuickFilterChip
          active={filters.expiration === "conflicts"}
          count={counts.conflicts}
          dotClassName="bg-status-expired"
          onClick={() => toggleExpiration("conflicts")}
        >
          Status conflicts
        </QuickFilterChip>
        <QuickFilterChip
          active={filters.expiration === "time-sensitive"}
          count={counts.timeSensitive}
          dotClassName="bg-status-in-progress"
          onClick={() => toggleExpiration("time-sensitive")}
        >
          Has an expiration date
        </QuickFilterChip>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox value={filters.q} onSearch={(q) => update({ q: q || null }, { replace: true })} />

        <FilterSelect
          label="Document type"
          allLabel="All document types"
          value={filters.type}
          options={documentTypes}
          onChange={(type) => update({ type })}
          className="sm:w-60"
        />
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={filters.status}
          options={[...DOCUMENT_STATUSES]}
          onChange={(status) => update({ status })}
          className="sm:w-40"
        />
        <FilterSelect
          label="Processor"
          allLabel="All processors"
          value={filters.processor}
          options={processors}
          onChange={(processor) => update({ processor })}
          className="sm:w-44"
        />

        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => update({ q: null, type: null, status: null, processor: null, expiration: null })}
          >
            <FilterXIcon data-icon="inline-start" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

function QuickFilterChip({
  active,
  count,
  dotClassName,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  dotClassName: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted",
      )}
    >
      <span className={cn("size-2 rounded-full", dotClassName)} aria-hidden />
      {children}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs font-medium tabular-nums",
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
      {active && <XIcon className="size-3.5" aria-label="Remove filter" />}
    </button>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  className?: string;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger aria-label={label} className={cn("w-full", value && "border-primary", className)}>
        <SelectValue placeholder={allLabel}>{value ?? allLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Search box that updates the URL 300ms after the user stops typing (replacing history, not pushing). */
function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(value);
  const lastSent = useRef(value);

  // Follow URL changes we didn't cause (Clear filters, back button) without clobbering typing.
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    const q = text.trim();
    if (q === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = q;
      onSearch(q);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSearch is recreated every render
  }, [text]);

  return (
    <InputGroup className="sm:w-80">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label="Search documents"
        placeholder="Search business, borrower, app ID, notes…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setText("")}>
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
