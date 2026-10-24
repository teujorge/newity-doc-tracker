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

_Review notes / corrections:_ (filled in during integration — see section 6)

## 4. Testing

- Unit tests (Vitest) for the business rules, seeded from the real data quirks AI found in step 1: auto-expiry, status conflicts, expiring-soon boundaries (0/30/31 days), stalled threshold (13 vs 14 days), expiration math, CSV round-trip (parse → serialize equals the original file).
- Browser verification of every page in the built-in browser pane.
- QA plan for the demo: see README.

## 5. Documentation

- README, this log and the demo outline drafted by AI from the actual decisions made in this conversation, then edited by me.

## 6. Where I pushed back / caught issues

- _(updated during integration)_
