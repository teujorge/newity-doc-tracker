// Runs one alert rule in the browser: fetch fresh numbers, record a notification, toast it.
// Client-only (called from effects and click handlers).
import { toast } from "sonner";
import { buildNotification } from "./messages";
import { DEFAULT_WINDOW_DAYS } from "./schedule";
import { addNotification, claimDueRules, markNotificationRead } from "./store";
import type { AlertNotification, AlertRule, AlertsData } from "./types";

type Navigate = (href: string) => void;

export async function fetchAlertsData(windowDays: number = DEFAULT_WINDOW_DAYS): Promise<AlertsData> {
  // Same-origin, so the as-of cookie goes along and the numbers match what the user sees.
  const res = await fetch(`/api/alerts?windowDays=${encodeURIComponent(windowDays)}`, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`/api/alerts responded ${res.status}`);
  return (await res.json()) as AlertsData;
}

export async function runRule(rule: AlertRule, navigate: Navigate): Promise<AlertNotification | null> {
  let data: AlertsData;
  try {
    data = await fetchAlertsData(rule.windowDays ?? DEFAULT_WINDOW_DAYS);
  } catch (error) {
    console.error(`Alert "${rule.name}" failed`, error);
    toast.error(`Couldn't check "${rule.name}"`, {
      description: "We'll try again at the next scheduled time.",
    });
    return null;
  }

  const notification = addNotification(buildNotification(rule, data));
  const view = () => {
    markNotificationRead(notification.id);
    navigate(notification.href);
  };

  if (notification.quiet) {
    // Subtle confirmation that the check ran; nothing to act on.
    toast(notification.title, { description: notification.body, duration: 4000 });
  } else {
    const show = rule.kind === "weekly-summary" ? toast.info : toast.warning;
    show(notification.title, {
      description: notification.body,
      duration: 10_000,
      action: { label: "View", onClick: view },
    });
    showDesktopNotification(notification, view);
  }
  return notification;
}

// ---------- scheduler tick ----------

let ticking = false;

/**
 * Run every enabled rule whose time has come. Rules are "claimed" (their next run moved forward)
 * inside a cross-tab Web Lock where supported, so two open tabs don't both fire the same alert.
 */
export async function runDueRules(navigate: Navigate) {
  if (ticking) return;
  ticking = true;
  try {
    let due: AlertRule[] = [];
    if (typeof navigator !== "undefined" && navigator.locks) {
      await navigator.locks.request("doc-tracker:alerts-scheduler", { ifAvailable: true }, async (lock) => {
        if (lock) due = claimDueRules();
      });
    } else {
      due = claimDueRules();
    }
    for (const rule of due) await runRule(rule, navigate);
  } finally {
    ticking = false;
  }
}

// ---------- desktop notifications (optional, only if the user allowed them) ----------

export type DesktopPermission = NotificationPermission | "unsupported";

export function getDesktopPermission(): DesktopPermission {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

export async function requestDesktopPermission(): Promise<DesktopPermission> {
  if (getDesktopPermission() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return getDesktopPermission();
  }
}

function showDesktopNotification(notification: AlertNotification, onClick: () => void) {
  if (getDesktopPermission() !== "granted") return;
  try {
    const desktop = new Notification(notification.title, { body: notification.body, tag: notification.ruleId });
    desktop.onclick = () => {
      window.focus();
      onClick();
      desktop.close();
    };
  } catch {
    // Some browsers (e.g. Android Chrome) only allow notifications from a service worker. Toast is enough.
  }
}
