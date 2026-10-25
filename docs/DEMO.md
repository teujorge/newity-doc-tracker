# Demo script: Doc Tracker (~6.5 min)

Cue sheet for the recorded demo, not a word-for-word script. **Audience: the ops team and business users.** Read numbers off the screen; only call one out when it makes a point.

**The thread:** things fall through the cracks → the dashboard shows the cracks → open one stalled application and fix it in one click → watch it ripple into the weekly summary. Documents and Alerts are short supporting beats.

## Pre-flight (before recording)

- [ ] Run locally (`npm run dev` → http://localhost:5173). Edits on Vercel are temporary.
- [ ] Sidebar → **Reset demo data**.
- [ ] Header **As of** → **Demo date**.
- [ ] Alerts → History → **Clear**, so the bell starts at zero.
- [ ] Desktop-width browser, notifications off, start on the **Dashboard**.

| Step | Time |
|---|---|
| Intro | 0:40 |
| 1. Dashboard: the cracks | 0:50 |
| 2. Fix one stalled application | 1:00 |
| 3. Expiration dates fill themselves in | 0:30 |
| 4. Weekly Summary: the ripple | 0:40 |
| 5. Documents | 0:30 |
| 6. Alerts | 0:30 |
| Closing | 1:45 |
| **Total** | **~6:25** |

---

## Intro (0:40)

**SHOW:** the Dashboard, no clicks.

**SAY (cues):**
- Me: name + role, one line.
- The app: Doc Tracker replaces the shared spreadsheet loan ops uses for SBA document checklists.
- Tech + assumptions, one or two lines: React Router (Remix's React successor) deployed on Vercel. The CSV file *is* the database, no sign-in, alerts run in the browser. The sample data stops in February 2026, so the app runs "as of" that date.
- The problem in their words: applications stall waiting on documents and **fall through the cracks**. And if it's harder than the spreadsheet, nobody will use it.

## 1. Dashboard: the cracks (0:50)

**DO:** point at the **Stalled applications** KPI and the **Needs attention** list.

**SAY (cues):**
- This is where the cracks show: **19 applications are stalled** right now.
- Stalled = missing documents and nothing received in two weeks.
- The list puts whoever has waited longest first, so you know who to call.
- Charts below: workload per processor, which documents hold things up. Every table and chart exports to CSV.

**LAND:** open the app and you know who to follow up with first.

## 2. Fix one stalled application (1:00)

**DO:** click the **Stalled** KPI → search "Metro" → open **Metro Dental Group** → on **Lease Agreement**, change **Pending → Received**.

**SAY (cues):**
- One row per application, because the question is about applications, not documents.
- The header says why it's stalled, in plain words.
- Updating a document is one click: no form, no save button.
- Watch it flip from **Stalled** to **On track**, and the sidebar count drop by one.

**LAND:** fixing it is faster than editing the spreadsheet.

## 3. Expiration dates fill themselves in (0:30)

**DO:** **Bank Statements** → **Edit** → change **Date received** → the expiration date updates on its own → **Esc**.

**SAY (cues):**
- You told us bank statements expire after 90 days and tax returns after 3 years. I checked those rules against your data.
- The app does the date math, so nobody has to.

**LAND:** less rework from documents that quietly expired.

## 4. Weekly Summary: the ripple (0:40)

**DO:** sidebar → **Weekly Summary** → **Copy as email**.

**SAY (cues):**
- The Monday email the team lead compiles by hand, built automatically.
- It already reflects the fix: one fewer stalled, Metro Dental is off the list.
- Copy it into an email, or print it to PDF.

**LAND:** the manual Monday report is gone, and it's never out of date.

## 5. Documents (0:30)

**DO:** sidebar → **Documents** → **Expired** quick filter.

**SAY (cues):**
- The spreadsheet view, for when you need every row.
- If a document's date has passed, it counts as expired even if someone forgot to update the status. That's how **41 expired documents** show up, not just the ones marked Expired.
- Rows that contradict themselves are flagged as conflicts, not silently changed.

**LAND:** expiration tracking you can trust.

## 6. Alerts (0:30)

**DO:** sidebar → **Alerts** → **Documents expiring soon** → **Run now** → open the bell.

**SAY (cues):**
- You asked for alerts before documents expire. Version 1 shows them in the app: a pop-up plus this inbox.
- The rules are already set up: daily, or a day of the week. Email can reuse the same rules later.

**LAND:** the reminders work today, and the path to email is clear.

---

## Closing (1:45)

### Why these features
Ordered by the team's pain:
1. Stalled visibility, the biggest pain.
2. One-click editing, or it can't replace the spreadsheet.
3. Expiration tracking, where the rework comes from.
4. The leadership summary.

Email alerts had the highest cost for the least V1 value, so in-app alerts stand in for them.

### Decisions I made to fit the time box
- **I chose a CSV file over a database** because the team already lives in a spreadsheet and it needs zero setup. The cost: it isn't safe for simultaneous edits, and it doesn't keep history.
- **I chose not to build email** because it needs a server scheduler and an email provider. In-app alerts prove the rules first, but they only run while the app is open.
- **I chose not to build sign-in** because it's three internal users. It's needed before real use.
- **I chose to estimate "stalled"** from received dates, because the data has no "last updated" column.
- **I chose desktop only, and no imports or file uploads**, to keep the core flow solid.

### Testing
- What I did: automated tests (Vitest) only for the core business rules, expiration math and the stalled and expiring cut-offs. Everything else I sanity-checked by hand, comparing the CSV against what the UI shows.
- Before shipping, simple but robust: component tests with Storybook for every screen state (empty, stalled, expired), one Playwright end-to-end test for the edit flow, and the KPIs reconciled against the team lead's last Monday email. Then sit with one processor for a day of real updates.

### What's next
1. A real database with an activity log. This unlocks safe editing, a true "last activity", trends and an audit trail.
2. Server-side email for alerts and the Monday summary, so reminders arrive with the app closed.
3. Sit with the three users, then iterate: design pass, sign-in with roles, error handling. Real usage decides the rest.

### Self-assessment
- **Good:** the main question, who is stalled, is answered in one click. The business rules were checked against the real data and are tested. Updates are faster than the spreadsheet.
- **Rough:** the file-based storage isn't multi-user safe, alerts stop when the app is closed, "stalled" is an estimate, the design is stock components.
- **What I'd change:** a small real database from day one. Same effort as the CSV, and it unlocks history.

AI was part of every step, from profiling the data to tests and docs. The log is in `docs/AI_LOG.md`.

**LAND:** a V1 the team could use this week, with a clear path to production.

