# Agent WALLi — Booth Flow Status

_Last updated: 2026-05-29 · Branch: `integration/woo-e2e`_

"Agent WALLi, the AI concierge wizard" — a self-serve booth experience for **WOO London**.
An attendee picks their name, sees the 3 people WALLi thinks they should meet (with talking
points), selects 1–3, and requests a concierge intro. WALLi emails them their matches and
briefs the marketing DRI to make the intro at the booth.

---

## 1. The flow (live)

```
/select-name  →  /reveal  →  /concierge  →  /confirmation
   pick name      see 3 matches,    enter email,        thank-you
                  select 1–3        send intro request   + reset
```

- Media-owner-only event: persona picker is skipped (`lib/event-config.js`, `ENABLED_PERSONAS=['media_owner']`).
- Live flow toggle: `NEXT_PUBLIC_LIVE_FLOW=twin-reveal` (default). `=fortune` restores the old fortune-teller path.

---

## 2. What's DONE

### Booth flow & UI
- **`/select-name`** — searchable attendee picker (from `lib/rsvp_attendees.json`, 39 people), stores selection in localStorage.
- **`/reveal`** — two-column "twin-matches" design (source profile panel + 3 match cards), data-driven from `lib/twin_matches.json`. Cards show headshot, name, confidence pill, role/company, country, match reason, LinkedIn link, and **inline talking points**. Attendee selects **1–3** via ✓ checkboxes → "Ask WALLi for an intro (N)".
- **`/concierge`** — shows the chosen matches, captures email (pre-filled if on file), sends the request. Routes to `/confirmation`.
- **`/confirmation`** — thank-you + "start over" (clears localStorage).
- **Shared components:** `components/twin-reveal/MatchCard.js`, `components/twin-reveal/Avatar.js` (headshot + initials fallback).
- **`/twin-matches`** — static design showcase (Craig #247, full grounded talking points). Not in the flow; kept as a reference mock.

### Email + lead capture (wired & configured)
- `POST /api/send-email` has two booth templates: **`twinConfirmation`** (to the attendee, their matches + talking points) and **`salesRepNotification`** (to the **marketing DRI**, lists requested matches w/ LinkedIn links, flags missing-email cases).
- `POST /api/submit-lead` appends the request to Google Sheets (reuses existing pipe, `flowSource:'twin-reveal'`).
- **Config status:** `RESEND_API_KEY` ✅, `RESEND_FROM_EMAIL` ✅, Google Sheets creds ✅. So the flow sends **real** emails + writes a **real** sheet row today.
- **Missing-email fallback:** if no email on file, the form prompts for it; the DRI notification flags "entered at booth." Matched people are **not** auto-emailed (DRI makes intros manually).

### Matching data
- **453 profiles matched** (3 each) in `MASTER_DOCS/MATCHES/matches.md` — the "matched universe" (who's-attending + RSVP that were scraped/indexed).
- **`lib/twin_matches.json`** — generated payload the app reads, keyed by attendee slug. Currently **21 of 39** RSVP attendees have matches (the other 18 were never scraped — see §4).
- Built by **`scripts/build-twin-matches.mjs`** (joins `matches.md` + index-map + rsvp; merges talking points + headshots).

### Talking points
- **`lib/twin_talking_points.json`** — grounded talking-points overrides, keyed `sourceSlug → matchSlug → [points]`, merged by the generator so re-runs never wipe them.
- **Populated so far: Guillermo De Lella (3/3 matches).** Everyone else is stubbed `[]` (cards show without the talking-points section).

### Profile pictures
- **246 headshots** downloaded locally to `public/match-photos/<index>.jpg` via `scripts/download-profile-pics.mjs` (idempotent). Wired into `twin_matches.json` (source + matches); initials fallback for the ~36 with expired URLs / the unscraped.
- Served from `/public` → works offline at the booth (no CDN dependency at event time).

### Tooling
- `scripts/build-linkedin-matching-prompt.js` (+ `npm run build:linkedin-matching-prompt`) — builds the matching prompt; `MASTER_DOCS/linkedin-profile-index-map.json` maps indexes → real profile metadata.
- `scripts/lib/match-photos.mjs` — shared photo-path contract for the two scripts.

### Scorecard (exists, not wired)
- `scripts/score-mockup.mjs` (single media owner, 3 grounded Gemini dims: Discoverability / Ease of Purchase / Measurement), `scripts/score-all.mjs` (batch), `components/fortune-journey/SelfAssessment.js`, `lib/self_assessment_questions.json`.
- **Deferred by decision** until the core flow is solid; intended as an optional end-of-flow screen later.

---

## 3. What's REMAINING

### From the 2026-05-29 meeting (Salman's action items)
| Item | Status |
|---|---|
| Matching logic: exclude same **country** AND company | ⛔ only same-**company** excluded today; same-country rule not applied → needs a re-run |
| Mobile optimization | ⬜ not done (layout stacks but not tuned) |
| Missing-email fallback + notify DRI | ✅ done |
| Email-cost estimate doc (≈400 footfall, ~1,200 emails) | ⬜ not started |
| Credential-sharing guide | ⬜ not started |
| AI-Studio API-key setup guide (for Sukriti) | ⬜ not started |

### Product gaps (beyond the meeting)
- **On-the-fly / live matching** for walk-ups not in the precomputed set. Building block exists: `scripts/match-twins.mjs` (embedding-based, no reasoning-LLM cost) — not wired to the app.
- **Talking points for the other 20 mapped attendees** (currently only Guillermo). Costly LLM run — batch with the CRM re-run.
- **Meeting-slot assignment** from networking breaks (system assigns, manual fallback).
- **DRI email** in production (`NEXT_PUBLIC_CONCIERGE_DRI_EMAIL` is unset → falls back to hardcoded gmail).
- **Scorecard end-screen** (deferred).
- **Direct "X wants to meet you" emails to matches** — not built (DRI handles intros manually; would need match emails, which we don't have — see §4).

---

## 4. Are we blocked?

**Not hard-blocked.** Core dev work continues; only two things are genuinely gated on other people.

### ⛔ Blocked on the team
| Blocked item | Waiting on |
|---|---|
| **Final re-match** (apply same-country rule + fold in new people) + talking-points re-run | **CRM media-owner list** — Deewakshi / Sukriti |
| **Meeting-slot assignment** | **Networking schedule / local times** — Deewakshi |
| Matches for the **18 unmapped RSVP people** | their LinkedIn data (or live matching) — folds into the re-run |
| DRI notification going to the right inbox | the **DRI email address** (minor; placeholder works meanwhile) |

> **Why 18 RSVP people have no matches:** the booth's selectable list (`rsvp_attendees.json`, 39) and the scraped/matched universe (453) come from different inputs and only partly overlap. 21 of the 39 are in the 453; 18 were never scraped, so there's nothing to precompute for them. This is an input-coverage gap, not a matching failure — all 453 indexed profiles do have matches.

### ✅ NOT blocked — can build now
- Mobile optimization pass
- Talking points for the current mapped set (cost = LLM tokens; or wait to batch with CRM)
- Concierge polish, DRI placeholder, copy
- The three docs (email cost, credential guide, API-key guide)
- Writing the same-country exclusion code (hold the actual re-run for the CRM batch so it's paid once)

### The strategic note (from the group thread)
Adding the CRM list means re-running the **entire** match + talking-points automation (time + LLM-token cost). So matching is **deliberately paused** to avoid a double-cost re-run, while everything else (UI, fallback, mobile, docs, photos) moves in parallel.

---

## 5. Production config checklist

| Var | Status | Note |
|---|---|---|
| `RESEND_API_KEY` | ✅ set | real sends |
| `RESEND_FROM_EMAIL` | ✅ set | |
| Google Sheets creds | ✅ set | real lead writes |
| `NEXT_PUBLIC_CONCIERGE_DRI_EMAIL` | ⬜ unset | falls back to `NEXT_PUBLIC_SALES_REP_EMAIL` → hardcoded gmail. **Set before event.** `NEXT_PUBLIC_*` is build-time → rebuild/restart to apply. |
| `NEXT_PUBLIC_LIVE_FLOW` | default `twin-reveal` | |
| Resend plan | ⚠️ free = 100 emails/day | event burst will exceed it → upgrade (Pro $20 covers it). See email-cost doc TODO. |

---

## 6. How to regenerate (after CRM list / new data)

```bash
node scripts/download-profile-pics.mjs      # pull any new headshots (idempotent)
node scripts/build-twin-matches.mjs         # rebuild lib/twin_matches.json
```
Talking points: add a `sourceSlug` block to `lib/twin_talking_points.json`, then re-run the generator.

---

## 7. Testing notes
- `npm run dev` → `/select-name` → **Guillermo De Lella** → `/reveal` is the fully-populated demo (headshots + talking points for all 3 matches).
- ⚠️ Completing `/concierge` sends **real** emails and writes a **real** Sheet row — use your own address while testing.
- Do **not** run `next build` against a running `next dev` — it corrupts `.next` (delete `.next` and restart dev if you hit `Cannot find module` / favicon 500s).
