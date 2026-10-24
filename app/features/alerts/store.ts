// A tiny external store over localStorage, read with useSyncExternalStore.
// The bell, the /alerts page and the scheduler all subscribe, so a change anywhere (or in another tab,
// via the `storage` event) shows up everywhere. SSR-safe: the server snapshot is always empty, and
// localStorage is only touched from client snapshots, event handlers and effects.
import { useSyncExternalStore } from "react";
import { computeNextRun, defaultRules, newId } from "./schedule";
import type { AlertNotification, AlertRule } from "./types";
import type { NotificationDraft } from "./messages";

export const RULES_KEY = "doc-tracker:alert-rules";
export const NOTIFICATIONS_KEY = "doc-tracker:notifications";
const MAX_NOTIFICATIONS = 50;

// ---------- emitter ----------

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === RULES_KEY || event.key === NOTIFICATIONS_KEY) emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

// ---------- raw storage (never throws: private mode / blocked storage just means "empty") ----------

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    memoryFallback.delete(key);
  } catch {
    // Storage full or blocked: keep the value in memory so this tab still works.
    memoryFallback.set(key, value);
  }
  emit();
}

// If localStorage is unavailable, keep the latest writes in memory so the current tab still works.
const memoryFallback = new Map<string, string>();

function currentRaw(key: string): string | null {
  return memoryFallback.get(key) ?? readRaw(key);
}

// ---------- parsed snapshots (cached by raw string so references stay stable) ----------

function parseArray<T>(raw: string | null): T[] | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as T[]) : null;
  } catch {
    return null;
  }
}

let rulesCache: { raw: string | null; value: AlertRule[] } | null = null;
let seedRules: AlertRule[] | null = null;

/** Rules as stored, or the (not yet saved) defaults on a first visit. */
export function getRules(): AlertRule[] {
  const raw = currentRaw(RULES_KEY);
  if (rulesCache && rulesCache.raw === raw) return rulesCache.value;
  const parsed = parseArray<AlertRule>(raw);
  const value = parsed ?? (seedRules ??= defaultRules());
  rulesCache = { raw, value };
  return value;
}

let notificationsCache: { raw: string | null; value: AlertNotification[] } | null = null;

export function getNotifications(): AlertNotification[] {
  const raw = currentRaw(NOTIFICATIONS_KEY);
  if (notificationsCache && notificationsCache.raw === raw) return notificationsCache.value;
  const value = parseArray<AlertNotification>(raw) ?? [];
  notificationsCache = { raw, value };
  return value;
}

const EMPTY_RULES: AlertRule[] = [];
const EMPTY_NOTIFICATIONS: AlertNotification[] = [];

// ---------- hooks ----------

export function useAlertRules(): AlertRule[] {
  return useSyncExternalStore(subscribe, getRules, () => EMPTY_RULES);
}

export function useNotifications(): AlertNotification[] {
  return useSyncExternalStore(subscribe, getNotifications, () => EMPTY_NOTIFICATIONS);
}

const noopSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards. Use it to avoid hydration mismatches. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// ---------- rule mutations ----------

/** Persist the default rules on first visit (called from an effect). */
export function ensureRulesSeeded() {
  if (currentRaw(RULES_KEY) === null) writeRaw(RULES_KEY, JSON.stringify(getRules()));
}

export function saveRules(rules: AlertRule[]) {
  writeRaw(RULES_KEY, JSON.stringify(rules));
}

export function addRule(rule: AlertRule) {
  saveRules([...getRules(), rule]);
}

export function deleteRule(id: string) {
  saveRules(getRules().filter((r) => r.id !== id));
}

/**
 * Update a rule. If anything that affects timing changes (or the rule is switched on),
 * the next run is recalculated from now.
 */
export function updateRule(id: string, patch: Partial<Omit<AlertRule, "id">>) {
  const now = new Date();
  saveRules(
    getRules().map((rule) => {
      if (rule.id !== id) return rule;
      const next = { ...rule, ...patch };
      const rescheduled =
        patch.frequency !== undefined ||
        patch.dayOfWeek !== undefined ||
        patch.time !== undefined ||
        (patch.enabled === true && !rule.enabled);
      if (rescheduled) next.nextRunAt = computeNextRun(next, now).toISOString();
      return next;
    }),
  );
}

/**
 * Atomically (within this browser) claim every enabled rule that is due: their `nextRunAt` moves
 * forward *before* any work starts, so a second tick, a StrictMode double effect or another tab
 * reading the same storage won't run them again.
 */
export function claimDueRules(now: Date = new Date()): AlertRule[] {
  const rules = getRules();
  const due = rules.filter((r) => r.enabled && new Date(r.nextRunAt).getTime() <= now.getTime());
  if (due.length === 0) return [];
  const dueIds = new Set(due.map((r) => r.id));
  saveRules(
    rules.map((r) =>
      dueIds.has(r.id)
        ? { ...r, lastRunAt: now.toISOString(), nextRunAt: computeNextRun(r, now).toISOString() }
        : r,
    ),
  );
  return due;
}

export function markRuleRan(id: string, at: Date = new Date()) {
  saveRules(getRules().map((r) => (r.id === id ? { ...r, lastRunAt: at.toISOString() } : r)));
}

// ---------- notification mutations ----------

export function addNotification(draft: NotificationDraft): AlertNotification {
  const notification: AlertNotification = {
    ...draft,
    id: newId("note"),
    createdAt: new Date().toISOString(),
    read: false,
  };
  writeRaw(NOTIFICATIONS_KEY, JSON.stringify([notification, ...getNotifications()].slice(0, MAX_NOTIFICATIONS)));
  return notification;
}

export function markNotificationRead(id: string) {
  writeRaw(
    NOTIFICATIONS_KEY,
    JSON.stringify(getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n))),
  );
}

export function markAllNotificationsRead() {
  writeRaw(NOTIFICATIONS_KEY, JSON.stringify(getNotifications().map((n) => ({ ...n, read: true }))));
}

export function clearNotifications() {
  writeRaw(NOTIFICATIONS_KEY, JSON.stringify([]));
}
