import { formatDistance } from "date-fns";
import { CircleCheckIcon, FileClockIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { formatDisplayDate } from "~/lib/domain";
import { KIND_ICONS } from "./icons";
import { markNotificationRead } from "./store";
import type { AlertNotification } from "./types";

/** Re-render every `ms` so relative times ("2 minutes ago", "Next check") stay fresh. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

function relativeTime(date: Date, now: Date): string {
  if (now.getTime() - date.getTime() < 60_000) return "just now";
  return formatDistance(date, now, { addSuffix: true });
}

interface NotificationListProps {
  notifications: AlertNotification[];
  /** Compact = header popover (clamped text). */
  compact?: boolean;
  /** Called after an item is clicked (e.g. to close the popover). */
  onSelect?: () => void;
  emptyMessage?: string;
}

export function NotificationList({ notifications, compact, onSelect, emptyMessage }: NotificationListProps) {
  const now = useNow();

  if (notifications.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "No alerts yet. When an alert runs, its results show up here."}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {notifications.map((n) => {
        const Icon = n.quiet ? CircleCheckIcon : n.kind ? KIND_ICONS[n.kind] : FileClockIcon;
        const created = new Date(n.createdAt);
        return (
          <li key={n.id}>
            <Link
              to={n.href}
              onClick={() => {
                markNotificationRead(n.id);
                onSelect?.();
              }}
              className={cn(
                "flex gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                !n.read && "bg-primary/5",
              )}
            >
              <Icon
                aria-hidden
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  n.quiet ? "text-emerald-600 dark:text-emerald-400" : n.kind === "weekly-summary" ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400",
                )}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start gap-2">
                  <p className={cn("flex-1 text-sm leading-snug", n.read ? "font-normal" : "font-semibold")}>{n.title}</p>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </div>
                <p className={cn("text-xs text-muted-foreground", compact && "line-clamp-3")}>{n.body}</p>
                <p className="text-[11px] text-muted-foreground/80">
                  <time dateTime={n.createdAt} title={created.toLocaleString()}>
                    {relativeTime(created, now)}
                  </time>
                  {n.asOf && <> · data as of {formatDisplayDate(n.asOf)}</>}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
