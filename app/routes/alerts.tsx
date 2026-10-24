import { CheckCheckIcon, InfoIcon, Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import type { RouteHandle } from "~/components/app-header";
import { PageHeader } from "~/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { AddAlertDialog } from "~/features/alerts/add-alert-dialog";
import { DesktopNotificationsButton } from "~/features/alerts/desktop-notifications-button";
import { NotificationList, useNow } from "~/features/alerts/notification-list";
import { RuleCard } from "~/features/alerts/rule-card";
import { runRule } from "~/features/alerts/run-rule";
import {
  clearNotifications,
  markAllNotificationsRead,
  markRuleRan,
  useAlertRules,
  useIsClient,
  useNotifications,
} from "~/features/alerts/store";
import type { AlertRule } from "~/features/alerts/types";
import { useAsOf } from "~/hooks/use-as-of";
import { formatDisplayDate } from "~/lib/domain";
import type { Route } from "./+types/alerts";

export const handle: RouteHandle = { breadcrumb: "Alerts" };

export const meta: Route.MetaFunction = () => [
  { title: "Alerts · Doc Tracker" },
  { name: "description", content: "Reminders for expiring documents, stalled applications and the weekly pipeline summary." },
];

export default function AlertsPage() {
  const isClient = useIsClient();
  const rules = useAlertRules();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const asOf = useAsOf();
  const now = useNow(5_000);
  const [running, setRunning] = useState<Set<string>>(() => new Set());

  const onRunNow = useCallback(
    async (rule: AlertRule) => {
      setRunning((s) => new Set(s).add(rule.id));
      try {
        // "Run now" doesn't move the regular schedule; it just records when it last ran.
        if (await runRule(rule, (href) => navigate(href))) markRuleRan(rule.id);
      } finally {
        setRunning((s) => {
          const next = new Set(s);
          next.delete(rule.id);
          return next;
        });
      }
    },
    [navigate],
  );

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Get a heads-up about expiring documents, stalled applications and the weekly pipeline summary."
        actions={
          <>
            <DesktopNotificationsButton />
            <AddAlertDialog />
          </>
        }
      />

      <Alert>
        <InfoIcon />
        <AlertTitle>How alerts work right now</AlertTitle>
        <AlertDescription>
          <p>
            Alerts show up here in the app while it's open: as a pop-up in the bottom-right corner and in the bell at
            the top of the page. Email delivery is planned for a later version.
          </p>
          <p>
            Alerts use the "as of" date chosen at the top of the page (currently {formatDisplayDate(asOf)}). Tip: set an
            alert to "Every minute (demo)" to see it in action.
          </p>
        </AlertDescription>
      </Alert>

      <section aria-labelledby="alert-rules-heading" className="space-y-3">
        <h2 id="alert-rules-heading" className="text-lg font-semibold">
          Your alerts
        </h2>
        {!isClient ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No alerts set up. Use "Add alert" to create one.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} now={now} running={running.has(rule.id)} onRunNow={onRunNow} />
            ))}
          </div>
        )}
      </section>

      <Card className="gap-0 pb-0">
        <CardHeader className="border-b pb-4">
          <CardTitle>History</CardTitle>
          <CardDescription>
            {isClient
              ? `The last ${notifications.length} alert results${unread ? `, ${unread} unread` : ""}. Click one to open the related page.`
              : "Recent alert results."}
          </CardDescription>
          <CardAction className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} disabled={!isClient || unread === 0}>
              <CheckCheckIcon /> Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              disabled={!isClient || notifications.length === 0}
            >
              <Trash2Icon /> Clear
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {isClient ? (
            <NotificationList notifications={notifications} />
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
