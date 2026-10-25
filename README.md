# Doc Tracker: SBA Document Checklist

A browser tool that replaces the loan operations team's shared spreadsheet for tracking SBA loan documents. It answers the team's biggest question, **"which applications are stalled waiting on documents?"**, and makes updating a document quicker than editing the spreadsheet.

Built as a 3–4 hour MVP for the NEWITY Product Engineer take-home.

**Live app:** https://newity-doc-tracker.vercel.app (edits there are temporary, see [Deployment](#deployment)).

**Demo video:** [docs/NEWITY Demo.mp4](docs/NEWITY%20Demo.mp4)

## Run it locally (under 5 minutes)

**You need:** Node.js **22.22 or newer** (`node -v` to check; tested on Node 24) and npm. No database, environment variables or accounts are needed.

```bash
git clone https://github.com/teujorge/newity-doc-tracker.git
cd newity-doc-tracker
npm install
npm run dev
```

Open **http://localhost:5173**, or the URL printed in the terminal if that port is taken.

- **Data:** the sample CSV in `docs/` is the seed. On first run it's copied to `data/documents.csv`, which is the working "database"; edits are written straight back to it.
- **Start over:** **Reset demo data** at the bottom of the sidebar restores the original sample.
- **"As of" date:** the sample data stops in Feb 2026, so the app runs as of **Feb 13, 2026** by default. Switch it in the header; **Today** makes almost everything look expired.

Other scripts:

```bash
npm test                    # unit tests for the business rules (Vitest)
npm run typecheck           # route types + TypeScript
npm run build && npm start  # production build on http://localhost:3000
```

## What's in it

| Page | For | What it does |
|---|---|---|
| **Dashboard** | Team lead, leadership | KPIs, a "needs attention" list of stalled applications, and charts for processor workload, bottleneck documents, application health and upcoming expirations. |
| **Applications** | Processors | One row per application with progress and a health badge (Stalled, At risk, On track, Complete). Search and filter by status or processor. |
| **Application detail** | Processors | One application's checklist. Change a status in one click, or edit dates and notes. Expiration dates fill in automatically. |
| **Documents** | Processors | Every document (the spreadsheet view), with quick filters for expiring, expired and status conflicts. |
| **Weekly Summary** | Team lead → leadership | The Monday email, built automatically: **Copy as email** or **Print / Save as PDF**. |
| **Alerts** | Everyone | Scheduled in-app alerts (daily, weekly, or every minute for demos) for expiring documents, stalled applications and the weekly summary, shown as pop-ups and in the header bell. |

Every table and chart exports to CSV, and **Download all data** in the sidebar exports the full sheet in its original format.

### Business rules

- **Expiration windows** (checked against the sample data): bank statements 90 days, tax returns 3 years, insurance 1 year.
- **Expired:** a document past its expiration date counts as Expired even if the sheet says Received or Approved. Rows marked Expired with a future date are flagged as conflicts, not silently changed.
- **Stalled:** outstanding documents (Pending or Expired) and nothing received in 14+ days.
- **Expiring soon:** expires within 30 days.

## Tech and architecture

- **React Router v8, framework mode**, Remix's successor for React apps. Pages read with `loader` and write with `action`; `/api/*` resource routes handle CSV export, the as-of date, reset and alert data.
- **shadcn/ui + Tailwind v4**, TanStack Table, Recharts, PapaParse, date-fns, Vitest.

```
app/
  lib/domain.ts            business rules (statuses, expiry, stalled, rollups), unit tested
  lib/csv-store.server.ts  the CSV "database": read, update, reset
  routes.ts                route config: app shell + pages + /api routes
  routes/_layout.tsx       sidebar + header shared by every page
  components/              shared UI (data table, page header, badges, CSV export)
  features/alerts/         in-browser alert scheduler, store and bell
docs/                      brief, sample CSV (seed), demo video + script, AI usage log + full history
```

## Deployment

Vercel, connected to this repo: every push to `main` deploys. It needs no configuration. The `@vercel/react-router` preset isn't used because it only supports React Router v7.

The deployed data is temporary. The working CSV lives in the server's `/tmp` and resets whenever Vercel starts a fresh instance, which is fine for one person trying the demo.

## Scope decisions

Built in priority order: stalled visibility, one-click status editing (without it the tool can't replace the spreadsheet), expiration tracking, the leadership summary, then demo-grade alerts.

Chosen not to build, to fit the time box:
- **A database.** The CSV file is the database: zero setup and the team's existing format. The cost: no history, and simultaneous edits aren't safe (last write wins).
- **Email.** It needs a server scheduler and an email provider. In-app alerts use the same rules, but they only run while the app is open in a browser, and they're stored per browser.
- **Sign-in and roles.** Three internal users.
- **True activity tracking.** The sheet has no "last updated" column, so "stalled" is estimated from received dates, and there are no week-over-week trends.
- **Mobile layout, importing applications, file uploads.**

## Testing

- **Unit tests** (`npm test`) on the rules most likely to be wrong: expiry math, auto-expiry, status conflicts, the 14- and 30-day cut-offs, rollups, and a CSV round-trip that reproduces the original file byte for byte.
- **Manual QA** of every page in the browser, including a live edit checked against the CSV on disk.
- **Before real use:** compare the KPIs with the team lead's last Monday email, and sit with one processor for a day of real updates.

## What's next

1. **A real database with an activity log:** safe simultaneous edits, a true "last activity", trends and an audit trail.
2. **Server-side email** for expiry alerts and the Monday summary, reusing the alert rules.
3. **Iterate with the three users:** borrower follow-up tracking ("requested on / reminder sent"), sign-in with roles, a design pass.

## Submission files (`docs/`)

| File | What it is |
|---|---|
| [NEWITY Demo.mp4](docs/NEWITY%20Demo.mp4) | The 5–10 minute recorded walkthrough for stakeholders. |
| [DEMO.md](docs/DEMO.md) | The cue sheet used while recording the demo. |
| [AI_LOG.md](docs/AI_LOG.md) | How AI was used across the project, by phase: understanding, scoping, building, testing, documentation. |
| [ai-conversation/](docs/ai-conversation/) | The full AI conversation history behind that log: `conversation.md` to read, `conversation.json` for the structured version. |
| `NEWITY_Assessment_A_Document_Checklist.docx` | The original brief. |
| `NEWITY_Sample_Data_A_Document_Checklist.csv` | The sample data, which is also the app's seed data. |
