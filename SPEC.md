# Change Desk: Specification

Written before the code. Built with Claude Code from this spec, then reviewed and tested by hand.

## Problem
Website change requests arrive as messy messages: "site is down!!", "can you change the phone number", "emails to our domain bounce". A person has to read each one, decide what kind of request it is, how urgent it is and when it is due, and not lose track of the clock. Mistakes are easy: an outage waits behind a typo fix, or a promise "within 8 business hours" gets counted in calendar hours over a weekend.

Change Desk reads the message, suggests a type and priority with reasons, sets a due time in business hours, and keeps the queue sorted by what will breach first.

## Users and stories
1. As a support specialist, I paste a client's message and see a suggested type, priority and due time, with the reasons.
2. As a support specialist, I can override the suggestion before saving.
3. As a support specialist, I see a queue sorted by due time, with on-track, at-risk and breached states.
4. As a support specialist, I am warned if the new request looks like a duplicate of an open one from the same client.
5. As a support specialist, I move requests through new, in progress, waiting on client and done.
6. As a manager, I see counts of open, at-risk and breached requests.

## Rules
- Types: outage, dns_email, bug, content, seo, feature, other.
- Base priority: outage P1, dns_email P2, bug P2, content P3, other P3, seo P4, feature P4.
- Bumps (one level up each, never above P1): urgent wording (asap, urgent, immediately, right now, emergency, today), lost-business wording (lost sales, customers cannot, cannot order), premium client.
- SLA in business hours (Mon to Fri, 9 to 17): P1 2h, P2 4h, P3 8h, P4 24h.
- States: on track, at risk (75% of the SLA used), breached (100% used). Done requests show met or missed.
- "Waiting on client" pauses nothing in this version; it is shown in the queue but the clock keeps running. (Documented limit.)

## Acceptance criteria
- AC1: Classification picks the right type for clear examples of each type, and `other` when nothing matches.
- AC2: Priority follows the base table, and each bump applies once; P1 never goes higher.
- AC3: Every suggestion includes human-readable reasons.
- AC4: Due time is received time plus the SLA in business hours, skipping nights and weekends.
- AC5: SLA state is on track under 75%, at risk from 75%, breached at 100%, and for done requests met or missed.
- AC6: The queue sorts open requests by due time, earliest first; done requests go below.
- AC7: A message with a title and client is required; empty or too-short messages show an error and are not saved.
- AC8: A request from the same client with very similar words to an open one triggers a duplicate warning that names the original; saving is still allowed.
- AC9: Requests survive a reload; "Load sample requests" fills the queue for a demo.
- AC10: Works on a phone and with a keyboard only.

## Out of scope
Login, email intake, time zones, pausing the clock while waiting on the client.
