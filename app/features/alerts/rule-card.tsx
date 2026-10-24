import { Loader2Icon, PlayIcon, Trash2Icon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { DAYS_OF_WEEK, DEFAULT_WINDOW_DAYS, FREQUENCY_LABELS, KIND_INFO, describeSchedule, formatRunTime } from "./schedule";
import { deleteRule, updateRule } from "./store";
import { KIND_ICONS } from "./icons";
import type { AlertFrequency, AlertRule } from "./types";

interface RuleCardProps {
  rule: AlertRule;
  now: Date;
  running: boolean;
  onRunNow: (rule: AlertRule) => void;
}

export function RuleCard({ rule, now, running, onRunNow }: RuleCardProps) {
  const id = useId();
  const Icon = KIND_ICONS[rule.kind];
  const due = rule.enabled && new Date(rule.nextRunAt).getTime() <= now.getTime();

  return (
    <Card className={rule.enabled ? undefined : "opacity-75"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {rule.name}
        </CardTitle>
        <CardDescription>{KIND_INFO[rule.kind].description}</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${id}-enabled`} className="text-xs text-muted-foreground">
              {rule.enabled ? "On" : "Off"}
            </Label>
            <Switch
              id={`${id}-enabled`}
              checked={rule.enabled}
              onCheckedChange={(enabled) => updateRule(rule.id, { enabled })}
              aria-label={`Turn ${rule.name} ${rule.enabled ? "off" : "on"}`}
            />
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-frequency`}>How often</Label>
          <Select
            value={rule.frequency}
            onValueChange={(frequency) => updateRule(rule.id, { frequency: frequency as AlertFrequency })}
          >
            <SelectTrigger id={`${id}-frequency`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FREQUENCY_LABELS) as AlertFrequency[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rule.frequency === "weekly" && (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-day`}>Day</Label>
            <Select
              value={String(rule.dayOfWeek)}
              onValueChange={(day) => updateRule(rule.id, { dayOfWeek: Number(day) })}
            >
              <SelectTrigger id={`${id}-day`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day, i) => (
                  <SelectItem key={day} value={String(i)}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {rule.frequency !== "every-minute" && (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-time`}>Time</Label>
            <Input
              id={`${id}-time`}
              type="time"
              value={rule.time}
              onChange={(e) => e.target.value && updateRule(rule.id, { time: e.target.value })}
            />
          </div>
        )}

        {rule.kind === "expiring-documents" && (
          <WindowDaysField id={`${id}-window`} rule={rule} />
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Schedule:</span> {describeSchedule(rule)}
          </p>
          <p>
            <span className="font-medium text-foreground">Next check:</span>{" "}
            {!rule.enabled ? (
              <Badge variant="outline">Paused</Badge>
            ) : due ? (
              "Any moment now"
            ) : (
              formatRunTime(rule.nextRunAt, now)
            )}
          </p>
          <p>
            <span className="font-medium text-foreground">Last ran:</span>{" "}
            {rule.lastRunAt ? formatRunTime(rule.lastRunAt, now) : "Not yet"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onRunNow(rule)} disabled={running}>
            {running ? <Loader2Icon className="animate-spin" /> : <PlayIcon />} Run now
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${rule.name}`}
            onClick={() => {
              if (window.confirm(`Delete the "${rule.name}" alert? Past results stay in the history.`)) deleteRule(rule.id);
            }}
          >
            <Trash2Icon />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

/** Number input that lets people type freely and saves a sensible value (1–365). */
function WindowDaysField({ id, rule }: { id: string; rule: AlertRule }) {
  const saved = rule.windowDays ?? DEFAULT_WINDOW_DAYS;
  const [draft, setDraft] = useState(String(saved));
  useEffect(() => setDraft(String(saved)), [saved]);

  const commit = (value: string) => {
    const n = Number.parseInt(value, 10);
    const next = Number.isFinite(n) ? Math.min(365, Math.max(1, n)) : saved;
    setDraft(String(next));
    if (next !== saved) updateRule(rule.id, { windowDays: next });
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Look ahead (days)</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={365}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit(e.currentTarget.value)}
      />
    </div>
  );
}
