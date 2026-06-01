# Core Flow PRD — Agent WALLi (Matching → Talking Points → Concierge)

**Product:** Agent WALLi, the AI Concierge for Moving Walls at WOO London Forum (June 2026)
**Scope of this doc:** The core attendee flow only — **Matching**, **Talking Points**, and **Concierge**. Upstream fortune-teller / archetype journeys are out of scope here.
**Status:** Implemented, in pre-event hardening. See [`../status/AGENT_WALLI_STATUS.md`](../status/AGENT_WALLI_STATUS.md) for live operational status.
**Last reconciled with code:** 2026-06-01

---

## 1. Summary

Agent WALLi turns a one-line action — "find out who I should meet" — into three concrete, warm, data-grounded networking introductions for a media-owner executive attending WOO London. For each introduction it explains **why** the two should meet (a match reason), gives them **three specific things to talk about** (talking points), and then **does the legwork**: it emails the attendee their matches, emails each matched person an invitation, notifies the Moving Walls team, and logs the lead.

The product exists because high-value B2B networking at a 2-day forum is bottlenecked by discovery ("who here is worth my time?") and activation ("how do I break the ice?"). WALLi removes both.

---

## 2. Goals & Non-Goals

### Goals
- **G1 — Relevant matches.** Give each attendee 3 high-quality introductions grounded in real professional substance, not name/title coincidence.
- **G2 — Frictionless icebreaking.** Each match ships with 3 concrete, business-relevant talking points so neither party starts cold.
- **G3 — Closed-loop concierge.** WALLi delivers the intros end-to-end (attendee email, match invitations, team handoff) without staff manually composing anything at the booth.
- **G4 — Two entry doors.** Works both for **pre-registered (RSVP)** attendees (instant, precomputed) and **walk-ins** (paste a LinkedIn URL, matched live).
- **G5 — Booth-grade reliability.** Never dead-ends. A degraded LLM still produces a usable match; a missing email still produces a manual-intro handoff.

### Non-Goals
- Not a scheduling system. There is **no per-pair calendar booking** — a shared list of 5 networking windows is offered and the parties confirm by reply or in person.
- Not a CRM. Leads are appended to a Google Sheet; downstream nurture is out of scope.
- Not a chat assistant. "Agent WALLi" is a guided flow with a persona, not a free-text conversational agent.
- Not a persona picker (for this event). WOO London is media-owners only; persona selection is auto-skipped.

---

## 3. Users & Personas

| Persona | Description | What they get |
|---|---|---|
| **Pre-registered attendee (RSVP)** | On the "Meet-Your-Twin" RSVP list; profile already enriched & matched offline. | Instant reveal of 3 matches with reasons + talking points; email pre-filled if they shared it. |
| **Walk-in attendee** | Stops at the booth, pastes their LinkedIn URL. | Live match (≈ a few seconds) producing the same 3-match experience. |
| **Matched person ("twin")** | Someone in the pool selected as a match; may or may not be physically present. | An invitation email from the attendee with reason + talking points + networking windows. |
| **Moving Walls team (DRI + staff)** | Booth/marketing staff who broker the intro. | A notification email per submit (who to introduce, LinkedIn links, missing-email flags) and CC on live sends; they catch match replies and coordinate. |

The current event persona is fixed to `media_owner` (`lib/event-config.js`).

---

## 4. The Core Flow (User Journey)

```
   ┌─────────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────┐
   │ select-name │ →  │  reveal  │ →  │  concierge │ →  │ confirmation │
   │ (or walk-in │    │ 3 matches│    │ pick + email│   │ thank you +  │
   │  URL paste) │    │ + points │    │  capture    │   │ windows      │
   └─────────────┘    └──────────┘    └────────────┘    └──────────────┘
```

1. **Find me / Walk in** (`/select-name`)
   - RSVP attendee searches their name in a directory and selects themselves.
   - Walk-in (or an RSVP person flagged `pending` with no data on file) pastes a LinkedIn URL instead.

2. **Reveal** (`/reveal`)
   - Shows **exactly 3 matches**. Each card: name, role, company, country, a confidence pill (**High** = guaranteed present WOO attendee, **Medium** = other), a one-line **match reason**, and (when available) **3 talking points**.
   - RSVP path reads precomputed matches; walk-in path calls `/api/match` live.

3. **Concierge** (`/concierge`)
   - Attendee confirms which matches they want (up to 3), confirms their name (read-only), and provides an email if not already on file.
   - On submit, WALLi: (a) logs the lead, (b) emails the attendee a recap, (c) emails the MW team a notification, (d) emails each match (that has an email) an invitation.

4. **Confirmation** (`/confirmation`)
   - Thank-you, the 5 networking windows repeated, and a "start over" reset.

---

## 5. Feature Requirements

### 5.1 Matching

**What it does:** Selects 3 introductions for an attendee from a pool of ~980 media-industry profiles (roughly half present WOO attendees, half CRM contacts), scored on professional substance.

**Requirements**
- **M1.** Match on professional substance, **not names**. Embedding text deliberately excludes names; it uses headline, role, industry, bio, recent experiences, location, skills, and (for thin profiles) recent posts.
- **M2.** Return **exactly 3** matches. (Edge case: a registered attendee with no embedding on file has no precomputed matches and is routed to the live walk-in path — see M7.)
- **M3.** Diversity rule: a match must differ from the attendee in **both company and country**. If that leaves fewer than 3 candidates, relax to **different-company-only**. (Same-country exclusion per the 2026-05-29 product decision.)
- **M4.** **Guarantee ≥1 physically-present WOO attendee** as the first match, surfaced as **High** confidence. Fill the remaining 2 by similarity.
- **M5. Exposure cap ("twin-5"):** in the precomputed graph, no person appears as a match more than **5 times** across the whole event, so nobody gets over-introduced. (Soft: never truncate below 3 to honor the cap.)
- **M6. Two paths, one selector:**
  - *RSVP/picker:* matches precomputed offline and read instantly at reveal.
  - *Walk-in:* live profile fetch + live embedding + same selection rules, in ≈ a few seconds.
- **M7.** Never dead-end: an RSVP person with no enriched data is routed into the walk-in path instead of an empty reveal.

**Match reason (the "why")**
- **M8.** Every match shows a **≤12-word reason**. Preferred source is an LLM-generated, profile-grounded reason; if the LLM is unavailable, a **deterministic theme + market** fallback is always shown (e.g. "Shared leadership focus · Argentina"). The reason is never blank.

### 5.2 Talking Points

**What it does:** Gives each match 3 concrete, business-relevant conversation openers grounded in both people's real LinkedIn activity.

**Requirements**
- **T1.** **Exactly 3** talking points per match when present; each is 1–3 sentences, written as an actionable opener ("You both…", "Ask them about…").
- **T2.** **Grounded, not hallucinated** — each point must trace to real signal (recent posts, articles, roles, experiences) from both profiles.
- **T3. Precomputed for RSVP** attendees (batch-generated, stored, merged into the match graph); **generated live for walk-ins** (in parallel for the 3 matches).
- **T4. Graceful absence.** If generation fails, the match still shows (with its reason); the talking-points section is simply **hidden** rather than showing an error or placeholder.
- **T5.** Reason and talking points are **distinct but paired** — the reason is the header hook; the points are the body. They are produced together from the same profile data.

### 5.3 Concierge

**What it does:** Captures intent + contact, then fans out emails and logs the lead — the closed loop.

**Requirements**
- **C1. Selection.** Attendee picks up to 3 matches to act on (defaults to all of their matches if none explicitly chosen).
- **C2. Contact capture.** Name is pre-filled and read-only. Email is **pre-filled only for RSVP attendees who shared it** (privacy rule); walk-ins type it. Email must contain `@`.
- **C3. Lead logging.** One row appended to the Google Sheet per attendee, **idempotent** (guarded so a refresh/retry won't double-write).
- **C4. Attendee recap email** — confirms their selected matches with talking points.
- **C5. Match invitation email** — sent to each selected match **that has an email**; includes the match reason, talking points, the 5 networking windows, and a **prominent "interested? reply to confirm" CTA**. Matches **without an email are skipped but flagged** to the team for manual intro.
- **C6. Team notification email** — to the DRI, listing attendee details, each match with LinkedIn links, and which matches need a manual intro.
- **C7. Team-brokered replies.** On live sends, the match invitation's **reply-to is the Moving Walls team** (CC'd staff), so the team catches confirmations and coordinates — rather than the reply going straight to the attendee. Falls back to the attendee address if no team inbox is configured.
- **C8. Networking windows.** A single shared list of 5 windows (`lib/meeting-slots.js`) is shown in the match email and on the confirmation screen. No per-pair slot assignment.
- **C9. Test mode.** A server-only `EMAIL_TEST_MODE` reroutes an entire submit's emails to the tester's own inbox, prefixes the subject with the intended recipient, and suppresses staff CC — so the full flow can be rehearsed safely.

---

## 6. Key Product Decisions & Rationale

| Decision | Rationale |
|---|---|
| Match on substance, exclude names from embeddings | Avoids matching "John at X" to "John at Y"; surfaces real complementarity. |
| Always 3 matches, ≥1 guaranteed present | Choice without overwhelm; at least one intro can happen in the room today. |
| Twin-5 exposure cap | Prevents a few "popular" profiles from being introduced to everyone. |
| Precompute RSVP, live walk-in | Instant experience for the known crowd; inclusive door for everyone else. |
| Reason always present, points optional | The "why" must never be blank; the richer "how" degrades gracefully. |
| Shared windows, not per-pair scheduling | Booth reality — coordination happens by reply or in person; one list to maintain. |
| Team-brokered match replies | MW stays in the loop and owns the introduction quality. |
| RSVP-only email pre-fill | Privacy: never expose an email the person didn't explicitly share. |
| Whole-submit test reroute | One tester can rehearse and inspect every email a submit produces. |

---

## 7. Success Metrics

- **Match acceptance:** % of attendees who proceed to concierge and submit (intent to meet).
- **Intro fan-out:** avg. matches emailed per submit; % of matches with a deliverable email.
- **Reply/confirm rate:** % of match invitations that get a reply (team-tracked).
- **Coverage:** % of RSVP attendees with full precomputed reasons + talking points (currently high; see status doc).
- **Reliability:** zero dead-end reveals; zero double-logged leads; zero emails sent to the wrong recipient in production.

---

## 8. Constraints & Assumptions

- **Data freshness:** RSVP matches are only as fresh as the last offline build. Walk-ins are live.
- **Email quotas:** ~5 emails per submit; the email provider plan must absorb event-day burst.
- **LLM quota:** live talking-point generation depends on Gemini quota; fast-fails to deterministic reason under pressure.
- **One event, one persona:** current config is WOO London / media owners. Both are env-overridable for reuse.

---

## 9. Pre-Event Readiness Checklist (product-facing)

- [ ] `EMAIL_TEST_MODE=false` (else all emails reroute to testers).
- [ ] DRI notification recipient set to the correct inbox.
- [ ] Email provider on a plan that covers event-day volume.
- [ ] Match graph rebuilt on the final attendee pool with reasons + talking points.
- [ ] Networking windows in `lib/meeting-slots.js` match the final agenda.

See [`../architecture/CORE_FLOW_TECH_ARCHITECTURE.md`](../architecture/CORE_FLOW_TECH_ARCHITECTURE.md) for the implementation and the full env matrix.
