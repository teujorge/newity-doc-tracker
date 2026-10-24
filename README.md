# Doc Tracker — SBA Document Checklist

A browser tool that replaces the loan operations team's shared spreadsheet for tracking SBA loan documents. It answers the team's biggest question — **"which applications are stalled waiting on documents?"** — and makes updating a document's status quicker than editing the spreadsheet.

Built as a 3–4 hour MVP for the NEWITY Product Engineer take-home.

## Quick start (under 5 minutes)

Requirements: **Node.js 20+** (tested on Node 24) and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

- The sample CSV in `docs/` is the seed. On first run it's copied to `data/documents.csv`, and that copy is the working "database". Edits are written straight back to it.
- **Reset demo data** (bottom of the sidebar) restores the original sample.
- **Download all data** exports the current CSV in the original spreadsheet format.

Other scripts:

```bash
npm test           # unit tests for the business rules (Vitest)
npm run typecheck  # route type generation + TypeScript
npm run build && npm start   # production build on http://localhost:3000
```

## What's in it

| Page | For | What it does |
|---|---|---|
| **Dashboard** | Team lead / leadership | Pipeline health: KPIs (active, stalled, expiring, expired, completion), charts for processor workload, bottleneck document types and application health, plus "needs attention" and "upcoming expirations" lists. Each chart's data can be exported to CSV. |
| **Applications** | Processors | One row per application with progress, outstanding count, days since last activity and a health badge (Stalled / At risk / On track / Complete). Search, filter by status and processor, export to CSV. |
| **Application detail** | Processors | The checklist for one application. Change a status inline, or edit received date, expiration date and notes. Expiration dates fill in automatically for time-sensitive documents. |
| **Documents** | Processors | All documents across applications (the spreadsheet view), filterable by type, status, processor and expiration, with export to CSV. |
| **Weekly Summary** | Team lead → leadership | Replaces the manual Monday email: a print-friendly summary with **Copy as email** and **Print / Save as PDF**. |
| **Alerts** | Everyone | Scheduled in-app alerts for expiring documents, stalled applications and the weekly summary. Each runs every minute (for the demo), daily, or weekly. Shown as toasts and in a bell inbox in the header. |

**"As of" date (header).** Every expiration and "stalled" calculation is relative to this date. The sample data stops in Feb 2026, so it defaults to **Feb 13, 2026**. Click **Today** to use the real date.

### Business rules

- **Status groups:** Outstanding = Pending or Expired · In progress = Received or Under Review · Done = Approved or Not Required.
- **Expiration windows** (confirmed against the sample data): bank statements 90 days, personal and business tax returns 3 years (1,095 days), insurance 1 year.
- **Effective status:** a document whose expiration date has passed counts as **Expired**, even if the sheet says Received or Approved. Rows marked Expired that still have a future expiration date get a "please confirm" flag.
- **Stalled:** the application has outstanding documents and nothing has been received in 14+ days.
- **Expiring soon:** expires within 30 days.

## Tech and architecture

- **React Router v8, framework mode** (Remix's successor for React apps). Routes use `loader` for reads and `action` for writes. Resource routes under `/api/*` serve the CSV export, as-of date, reset and alert data.
- **shadcn/ui + Tailwind v4**, TanStack Table, Recharts (via shadcn charts), PapaParse, date-fns, Vitest.

```
app/
  lib/domain.ts              pure business rules (statuses, expiry, stalled, rollups) — unit tested
  lib/csv-store.server.ts    the CSV "database": readDocuments / updateDocument / resetDocuments
  lib/pipeline.server.ts     loader helper: read → derive for as-of date → summarize
  lib/as-of.server.ts        as-of date cookie
  routes.ts                  route config (app shell layout + pages + /api resource routes)
  routes/_layout.tsx         sidebar + header shell shared by every page
  components/                shared UI (data table, page header, badges, CSV export)
  features/alerts/           front-end alert scheduler, store, bell
docs/                        brief, sample CSV (seed), AI usage log
```

## Scope decisions

**Built (in priority order):** stalled-application visibility, document status editing (without it the tool can't replace the spreadsheet), expiration tracking with automatic dates, the leadership dashboard and weekly summary, CSV exports, demo-grade alerts.

**Cut on purpose:**
- **Auth and roles.** Three internal users, running locally.
- **Real email.** Alerts appear in the app instead. Email needs a backend scheduler and an email provider (V2).
- **Audit history / "last updated".** The CSV has no history column, so "stalled" is estimated from received dates.
- **Adding or importing applications, file uploads, exporting charts as images.**
- **Simultaneous edits.** Writes are queued within one server process, and the last write wins.

## Known limitations

- **The CSV is the database.** That's fine for one person testing locally. It isn't safe for several people editing on several servers. On serverless hosts (e.g. Vercel) the working copy lives in `/tmp` and resets.
- **Alerts only run while the app is open in a browser tab.** Rules and notifications are stored per browser (localStorage).
- **"Stalled" is estimated** from the most recent received date, not true activity.
- **No week-over-week trends**, because there's no history.

## QA plan

1. **Unit tests** (`npm test`) cover the rules most likely to be wrong: expiry math, auto-expiry, status conflicts, the 30-day and 14-day boundaries, application rollups, and a CSV round-trip that must reproduce the original file byte for byte.
2. **Manual script:**
   - Change the as-of date and check the KPIs.
   - Filter Applications to Stalled and spot-check one against the raw CSV.
   - Mark a bank statement Received and confirm its expiration is +90 days.
   - Export CSVs and open them in Excel.
   - Print the weekly summary.
   - Switch an alert to every minute and wait for the toast.
3. **Before real use:**
   - Check the KPIs against the team lead's last Monday email.
   - Sit with one processor for a day of real updates.
   - Load-test with 75+ applications.

## What's next (V2)

1. **A real database plus an activity log.** Fixes simultaneous edits, gives "stalled" a true last-activity date, and enables week-over-week trends.
2. **Server-side scheduled jobs plus email**, using the same rule logic as the in-app alerts. Expiry alerts and the Monday summary arrive even when nobody has the app open.
3. **Borrower follow-up tracking**: "requested on / reminder sent" per document, because chasing borrowers is where documents stall.
4. Sign-in with roles (processor vs. lead), and adding or importing new applications.
