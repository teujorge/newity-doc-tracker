// Demo-grade stand-in for a server cron job: while the app is open, check the alert rules
// (stored in localStorage) every few seconds and run any that are due. Renders nothing.
// V2: move this to a scheduled server job that sends email.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { runDueRules } from "./run-rule";
import { ensureRulesSeeded } from "./store";

const CHECK_EVERY_MS = 15_000;

export function AlertsScheduler() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    ensureRulesSeeded();
    const tick = () => void runDueRules((href) => navigateRef.current(href));

    tick();
    const interval = window.setInterval(tick, CHECK_EVERY_MS);
    // Catch up right away when the user comes back to a background tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
