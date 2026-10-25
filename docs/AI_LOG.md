# AI Usage Log

How AI (Claude Code, running Claude Opus as an agent in the Claude desktop app) was used across the whole lifecycle — not just for code. The full conversation transcript is exported alongside this file; this is the annotated summary.

> Pattern used throughout: **I set direction and make the calls; AI does the analysis, drafting and grunt work; I review the output before it lands.** Where AI output was wrong or risky, it's noted below.

---

## 1. Understanding the problem

| What I asked | What AI did | What I took from it |
|---|---|---|
| Paste the brief + "let's discuss and collaborate on a plan" | Read the brief, then **profiled the sample CSV with a throwaway Node script** before proposing anything | Planning was based on the real data, not assumptions |

**Data findings that changed the design** (all from the AI's profiling pass):
- 620 rows = one row per *application × document*; 60 applications, 3 processors, 12 doc types, 6 statuses; 8–12 docs per application.
- Clean: no quoting, no duplicates, application fields consistent.
- **The data ends Feb 2026 but "today" is Oct 2026** → against the real date every bank statement is expired and every application looks stalled. ⇒ Added an **"as-of date"** control (defaults to the data snapshot, Feb 13 2026).
- **Expiration rules confirmed empirically**: bank statements = received + 90 days, tax returns = + 1,095 days, insurance = + 365 days ⇒ the app **auto-calculates expiration dates** when a doc is marked received.
- **Status/date conflicts**: 4 bank statements past expiration still marked Received/Approved; 8 rows marked Expired with future dates; 27 Expired with no date ⇒ an **"effective status"** that flags rather than silently overwrites.
- **No "last updated" column** ⇒ "stalled" has to be a proxy (outstanding docs + nothing received in 14 days). Called out as a known limitation.

**Reframe AI proposed and I accepted:** the main pain is *"which applications are stalled"* — an application-level question — so the primary view is one row per application with drill-down, not the 620-row document grid.

## 2. Scoping & planning

- AI researched the current state of **Remix** (web search + docs): Remix 3 is now a non-React framework, so shadcn wouldn't work; the React-based Remix lineage is **React Router v7/v8 framework mode**. Decision: React Router framework mode (Remix loaders/actions model + shadcn).
- AI flagged that **Vercel's filesystem is read-only/ephemeral**, so a CSV-as-database won't persist there. My call: local-first; ephemeral on deploy is fine for a demo.
- AI drafted a tiered scope (P0/P1/cut) and time budget; I adjusted: CSV export for tables *and* charts, front-end localStorage "cron" for alerts (toast instead of email) accepted as demo-grade.
- **Cut deliberately:** auth/roles, real email, file uploads, audit history, creating/importing applications, chart image export, concurrent-edit handling.

## 3. Building

- **Scaffolding:** `create-react-router` (v8.5.0, with the official React Router agent skill so all agents follow framework best practices), `shadcn init` + ~25 components.
- **Foundation written by the lead agent** (reviewed by me): CSV store with read/write functions (`app/lib/csv-store.server.ts`), pure domain rules (`app/lib/domain.ts`), as-of cookie, app shell (sidebar + header + breadcrumb), shared DRY components (DataTable, PageHeader, status badges, CSV export button).
- **Parallel sub-agents** — the lead agent wrote a detailed brief per feature with strict file ownership so they couldn't collide:
  1. Dashboard + Weekly Summary (leadership report)
  2. Applications list + detail with status editing (the write path)
  3. Documents table + unit tests
  4. Alerts scheduler (localStorage rules, toast + bell inbox)
- Integration, type-checking and browser verification done by the lead agent afterwards.

Each sub-agent returned a written report: what it built, how it verified it (curl, typecheck, browser), deviations, and shared-file changes it *recommended but was not allowed to make*. Those recommendations were reviewed and applied centrally — see section 6.

## 4. Testing

- Unit tests (Vitest) for the business rules, seeded from the real data quirks AI found in step 1: auto-expiry, status conflicts, expiring-soon boundaries (0/30/31 days), stalled threshold (13 vs 14 days), expiration math, CSV round-trip (parse → serialize equals the original file).
- Browser verification of every page in the built-in browser pane.
- QA plan for the demo: see README.

## 5. Documentation

- README, this log and the demo outline drafted by AI from the actual decisions made in this conversation, then edited by me.

## 6. Where I pushed back / caught issues

- **Remix ≠ Remix anymore.** My initial ask was "use create-remix". AI checked the live docs and flagged that today's Remix 3 isn't React (shadcn wouldn't work) — switched to React Router framework mode before writing any code.
- **Tests caught a design gap.** The tests sub-agent found that marking a Pending bank statement "Expired" invented a received date and a future expiry, so the doc immediately showed as a status conflict. Fixed in `applyDocumentUpdate` + regression test.
- **Business rule moved to the right layer.** The Applications agent put an "expired doc re-received → date it today" rule inside its route action. Moved into the shared domain function so every write path behaves the same.
- **A failing test exposed an over-broad rule.** After moving it, an existing test failed: moving an auto-expired doc from Received → *Under Review* was re-dating it. That's a review, not a new copy — narrowed the rule (only "Received", or moving off a stored "Expired") and added tests for each case.
- **Clearing an expiration date was ignored** (reported by the Applications agent) → explicit clear now recalculates for time-sensitive docs.
- **Dev-server flake.** Recharts being discovered at runtime caused a one-off duplicate-React crash; pre-bundled heavy deps in `vite.config.ts`.
- **Layout overflow** at ~1024px reported by an agent → `min-w-0` on the app shell.
- **My own QA pass found two things the agents missed** (fixed after):
  - `/api/alerts` counted "expired" by date only (6) while every other screen used effective status (41), so the alert disagreed with the dashboard. Alerts now reuse the same `selectExpired` selector, and the copy says "past their expiration date or marked Expired" everywhere.
  - The edit dialog accepted a *future* "date received". Now rejected on both client (picker capped at the as-of date, inline error, Save disabled) and server (shared `validateReceivedDate` rule).
- **Verified in a real browser, not just by agents' word:** every page, a live status edit (confirmed the CSV row changed on disk), the alert "Run now" toast + bell badge, and a fresh-load console check with zero errors.
