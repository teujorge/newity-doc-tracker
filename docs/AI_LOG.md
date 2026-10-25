# AI Usage Log

How I used AI (Claude Code, Claude Opus, in the Claude desktop app) across the whole project, summarised from the exported conversations. The full history is in [`ai-conversation/`](ai-conversation/): `conversation.md` to read, `conversation.json` for the structured version.

**How I worked:** I set the direction and made the calls. AI did the analysis, drafting and grunt work, and I reviewed what came back before it landed. The work ran in two sessions:

| Session | Job |
|---|---|
| Build | Plan the app with me, scaffold it, run parallel sub-agents per feature, integrate, deploy, apply my QA fixes, write the docs |
| Demo script | Started from the build session to write `docs/DEMO.md` from the brief, README and code, with real numbers checked in the app |

---

## 1. Understanding the problem

- I pasted the brief and asked to plan together. Before proposing anything, AI **profiled the sample CSV with a throwaway script**.
- **Findings that shaped the design:**
  - 620 rows means one row per application × document: 60 applications and 12 document types.
  - The data ends in Feb 2026, but "today" is Oct 2026, so against the real date nearly everything looks expired. ⇒ an **"as of" date** that defaults to the data snapshot.
  - The expiration rules hold in the data (bank statements +90 days, tax returns +3 years, insurance +1 year). ⇒ **expiration dates fill in automatically**.
  - Some rows contradict themselves: Received but past expiry, or Expired with a future date. ⇒ an **effective status** that flags them instead of silently overwriting.
  - There's no "last updated" column. ⇒ "stalled" has to be estimated, which became a stated limitation.
- **Reframe I accepted:** the main pain, "which applications are stalled", is about applications, not documents. So the main view is one row per application, not the 620-row grid.

## 2. Scoping and planning

- **Framework check:** I asked for Remix. AI checked the current docs and found that Remix 3 is no longer React, so shadcn wouldn't work. We switched to **React Router framework mode**, Remix's React successor, before writing any code.
- **Hosting:** AI flagged that a CSV database won't persist on Vercel. My call: local-first, and temporary data online is fine for one person testing.
- **Scope:** AI drafted a tiered scope. I adjusted it: CSV export for tables and charts, a front-end "cron" for alerts (a toast instead of email), and the as-of date.
- **Cut on purpose:** sign-in, real email, file uploads, history, importing applications, concurrent editing.

## 3. Building

- **Foundation (lead agent):** the CSV read/write store, the pure business rules, the app shell (sidebar, header, breadcrumbs) and shared UI (data table, badges, CSV export).
- **Four parallel sub-agents**, each with a written brief and strict file ownership so they couldn't collide:
  1. Dashboard and Weekly Summary
  2. Applications, detail and editing
  3. Documents and unit tests
  4. Alerts
- Each one reported back what it built, how it verified it, and which shared-file changes it recommended. The lead agent reviewed and applied those centrally, then integrated, type-checked and checked every page in the browser.
- **Shipping:** AI created the GitHub repo and deployed to Vercel. Vercel's React Router preset only supports v7, so it deploys without it.

## 4. Testing

- **Unit tests (Vitest)** on the business rules, seeded from the data quirks found in step 1: expiry math, auto-expiry, status conflicts, the 14- and 30-day boundaries, and a CSV round-trip that reproduces the original file.
- **Browser checks by the build session:** every page, a live status edit confirmed against the CSV on disk, the alert toast and bell, and a fresh load with no console errors.
- **My QA pass:** I QA'd the live app (using AI sub-agents), picked what to fix and what to leave out of scope, and sent the two fixes back to the build session.

## 5. Documentation and demo

- AI drafted the README, this log and the demo script from the decisions in the conversation. I edited each one.
- **Demo script:** I wrote the brief for it and had AI build it in its own session. The build session then sent that session the real numbers and gotchas. I reviewed the draft and asked for these changes:
  - fewer numbers
  - a one-line intro about me
  - an explicit story: things fall through the cracks → the dashboard shows the cracks → fix one in a click → see it in the weekly summary
  - one action per step
  - limits framed as decisions, not "didn't get to it"
- **README:** I asked for a cleanup against the "runs in under 5 minutes" requirement. AI tested a fresh clone: about 20s to install, tests passed, every page loaded. It also caught a wrong Node version in the README (it said 20+, but 22.22+ is needed).

## 6. Where I pushed back or AI got it wrong

- **Wrong framework:** "Remix" meant something different now. It was caught by checking the docs, not by assuming.
- **Tests caught a design gap:** marking a Pending bank statement "Expired" invented dates and created a fake conflict. Fixed in the shared rule, with a regression test.
- **A rule in the wrong place:** a sub-agent put a re-dating rule inside its page. It was moved into the shared business rules so every edit behaves the same. A failing test then showed the rule was too broad, so it was narrowed.
- **Two bugs the build agents missed, found in QA:**
  - Alerts counted expired documents two ways (6 vs 41). They now use the same definition as the dashboard, and the wording matches everywhere.
  - The edit dialog accepted a future "date received", which could hide a stall. It's now rejected in the dialog and on the server.
- **Scope control:** QA also raised mobile layout, filters in the URL, email and more test coverage. I kept all of them out of scope on purpose.
- **Smaller fixes:** a dev-server crash from a charting library (fixed by pre-bundling it), and a layout overflow at laptop width.
- **Blocked actions:** a couple of tool installs were refused by the agent's permission guard. AI reported them instead of working around them.

## 7. What I'd do differently

- Start with a small real database instead of a CSV. It's about the same effort, and it unlocks history, safe editing and trends.
- QA earlier, not only at the end. My QA pass found the two real bugs.
