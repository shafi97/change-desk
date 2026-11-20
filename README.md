# Change Desk

Triage for website change requests. Paste a client's messy message and Change Desk suggests a type and priority (with reasons), sets a due time in business hours, and keeps the queue sorted by what will breach its SLA first.

**Live demo:** https://change-desk-shafi.netlify.app (use "Load sample requests" on an empty queue)

Personal project, built with Claude Code from a written spec ([SPEC.md](SPEC.md)) and reviewed by hand. It comes from my own work running a web support queue.

## The problem
Requests arrive as "site is down!!", "can you change the phone number", "emails to our domain bounce". Someone has to decide what each one is, how urgent it is and when it is due, and an outage can sit behind a typo fix. Promises like "within 8 business hours" also get counted in calendar hours across weekends.

## What it does
- **Reads the message:** rules classify it as outage, domain or email, bug, content edit, SEO, new feature or other.
- **Explains itself:** every suggestion lists the reasons, for example "Looks like a content edit, which starts at P3" and "Urgent wording in the message, so priority goes up to P2". You can override type and priority.
- **Business-hours SLA:** P1 2h, P2 4h, P3 8h, P4 24h, counted Monday to Friday 9 to 17 in the viewer's local time. A request received Friday at 16:00 with a 2-hour SLA is due Monday at 10:00.
- **Queue by risk:** on track, at risk (75% used) or breached (100%), sorted by due time, with counts for the manager.
- **Duplicate warning:** a similar open request from the same client is flagged, but saving is still allowed.
- **Everything else:** React Router pages, validated form, localStorage persistence, dark mode, keyboard and phone friendly.

## How it is built
- Pure logic in `src/lib`: `triage.ts` (classification, priority, duplicates), `sla.ts` (business-hours math, shared with my agent-workflow project), `requests.ts` (due dates, SLA state, queue order, reducer). The UI only calls these.
- **36 tests** (Vitest and React Testing Library) cover the main acceptance criteria in the spec. Time is injected, and the tests build dates in local time so they pass in any time zone (checked in UTC, Toronto and India).

```bash
npm install
npm run dev
npm test
npm run build
```

## Limits
- Classification is keyword rules, not machine learning, so unusual wording can be misjudged; that is why the suggestion is editable and always explained.
- "Waiting on client" does not pause the clock yet.
- No login, email intake, holidays or time zone selector. Data stays in the browser.
