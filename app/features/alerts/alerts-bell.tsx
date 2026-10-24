// Header bell: unread count + a popover inbox of recent alert results.
import { BellIcon, CheckCheckIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { NotificationList } from "./notification-list";
import { clearNotifications, markAllNotificationsRead, useIsClient, useNotifications } from "./store";

const SHOWN_IN_POPOVER = 10;

export function AlertsBell() {
  const isClient = useIsClient();
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  // Only count after mount, so the server HTML (no localStorage) and first client render match.
  const unread = isClient ? notifications.filter((n) => !n.read).length : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Alerts (${unread} unread)` : "Alerts"}
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div>
            <p className="font-medium">Alerts</p>
            <p className="text-xs text-muted-foreground">
              {unread ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="xs" onClick={markAllNotificationsRead} disabled={unread === 0}>
              <CheckCheckIcon /> Mark all read
            </Button>
            <Button variant="ghost" size="xs" onClick={clearNotifications} disabled={notifications.length === 0}>
              <Trash2Icon /> Clear
            </Button>
          </div>
        </div>
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          <NotificationList
            compact
            notifications={notifications.slice(0, SHOWN_IN_POPOVER)}
            onSelect={() => setOpen(false)}
          />
        </div>
        <div className="border-t p-1.5">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/alerts" onClick={() => setOpen(false)}>
              Manage alerts &amp; see full history
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
