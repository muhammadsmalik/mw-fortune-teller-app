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
- **Back navigation:** `/reveal` → `/select-name` and `/concierge` → `/reveal` (explicit step routes, lucide `ArrowLeft`; entry + confirmation screens omit it by design).
- **`/twin-matches`** — static design showcase (Craig #247, full grounded talking points). Not in the flow; kept as a reference mock.

### Theme / visual (Agent WALLi look — NEW)
- Booth flow restyled toward the brand sheet: **deep-navy backgrounds** (`#0A0F1C → #1B2740 → #111827`) + an electric-blue glow, **antique-gold** accents (`#D4AF37`, replacing the bright yellow `#FEDA24`).
- **Scope:** antique gold is **booth-flow only** — the legacy fortune flow keeps the bright `mw-gold` and was left untouched (new `mw-gold-antique*` / `mw-navy*` / `mw-blue-electric` / `mw-parchment` tokens in `tailwind.config.js`).
- **`components/twin-reveal/WalliAvatar.js`** gives WALLi a face at each step (greeting / presenting / thinking / casting / celebrating). Real art now lives in `public/agent-walli/<pose>.png` (Gemini-generated, downscaled to 512px); a gold-ring "W" glow placeholder still renders for any missing pose.
- **Plan + image-gen prompts + remaining steps** (avatar art, mobile pass, footer-wave recolor, favicon): **`MASTER_DOCS/AGENT_WALLI_THEME_REVAMP.md`**.

### Email + lead capture (wired & configured)
- `POST /api/send-email` has **three** booth templates (dispatched via a `BOOTH_TEMPLATES` map): **`twinConfirmation`** (to the attendee, their matches + talking points), **`salesRepNotification`** (to the **marketing DRI**, lists requested matches w/ LinkedIn links, flags missing-email cases + which matches were auto-emailed), and **`matchIntro`** (to each selected match — see below).
- **Match-intro emails (NEW):** on submit, each **selected** match that has an `email` gets a `matchIntro` — the attendee + role/company, the **shared list of booth networking windows** (`lib/meeting-slots.js`), and the grounded talking points; **reply-to is the attendee** so the match can respond directly. Matches without an email are skipped and flagged in the DRI notification for a manual intro. `email` is an optional field per match in `twin_matches.json` — real values pending the CRM list (currently **test data only**, see §4).
- **Meeting slots (NEW, simplified):** there is **no per-match slot**. A single static list of exhibition-area networking windows lives in **`lib/meeting-slots.js`** and renders the same for everyone in both the `matchIntro` email and the `/confirmation` screen. Nothing is persisted per pairing — the attendee + match coordinate via reply-to or by dropping by the booth. The listed times are **preliminary** (from the WOO programme); confirm finals with Deewakshi and edit the one list.
- **Idempotent submit (NEW):** the sheet write is guarded by a localStorage marker (keyed by attendee slug, single-sourced in `lib/concierge-storage.js`) so a retry/refresh can't double-write; each email is guarded so a retry re-sends only the one(s) that failed. Failures now surface (HTTP errors throw) instead of silently routing to `/confirmation`.
- **Email test mode (NEW):** `EMAIL_TEST_MODE=true` + `EMAIL_TEST_RECIPIENTS` reroute **every** outbound email to a fixed test list (subject prefixed `[TEST→<real recipient>]`) via a single server-side `resolveDelivery()` chokepoint — booth tests never hit a real inbox. Server-only var → keep `false` for the live event; restart to apply.
- `POST /api/submit-lead` appends the request to Google Sheets (reuses existing pipe, `flowSource:'twin-reveal'`).
- **Config status:** `RESEND_API_KEY` ✅, `RESEND_FROM_EMAIL` ✅, Google Sheets creds ✅. So the flow sends **real** emails + writes a **real** sheet row today.
- **Missing-email fallback:** if no email on file, the form prompts for it; the DRI notification flags "entered at booth."

### Matching data
- **453 profiles matched** (3 each) in `MASTER_DOCS/MATCHES/matches.md` — the "matched universe" (who's-attending + RSVP that were scraped/indexed).
- **`lib/twin_matches.json`** — generated payload the app reads, keyed by attendee slug. Currently **21 of 39** RSVP attendees have matches (the other 18 were never scraped — see §4).
- Built by **`scripts/build-twin-matches.mjs`** (joins `matches.md` + index-map + rsvp; merges talking points + headshots).

### Live walk-in matching (NEW — done & tested)
- **Walk-ups not in the precomputed set now match live.** `/select-name` has a "Not on the list? Match with your LinkedIn" path → `POST /api/match`.
- **`POST /api/match`** (`app/api/match/route.js`): LinkedIn URL → **EnrichLayer** live profile fetch (same service that scraped the 453) → OpenAI embedding → cosine vs the precomputed pool → top-3, returned in the exact `twin_matches` shape so `/reveal` renders them unchanged.
- **Exclusion rule:** a valid match must differ in **both company and country** (the 2026-05-29 meeting rule) — favours cross-market intros. Graceful relaxation if the strict rule leaves <3.
- **`lib/match_embeddings.json`** — precomputed pool (452 vectors, `text-embedding-3-small`, 1536-dim), built by **`scripts/build-match-embeddings.mjs`** (`npm run build:match-embeddings`) from the saved scrapes. The walk-in is embedded the **same way** (shared `lib/match-core.mjs`) so the geometry is comparable.
- **No reasoning-LLM cost:** match = one embed call + an in-memory cosine sweep. Match reason is deterministic (shared professional theme + the match's country). Talking points are `[]` for live matches.
- **Tested live end-to-end:** Juan Alvarez (LatinAd, Argentina) → 3 cross-country LatAm OOH leaders, HTTP 200 in ~2.0s, exclusion held.
- **Requires network + `OPENAI_API_KEY` + `ENRICHLAYER_API_KEY` at event time** (all set). Walk-in headshots come from the local `/match-photos` cache (offline-safe); initials fallback for expired/missing.

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
| Matching logic: exclude same **country** AND company | ✅ **live walk-in matcher applies it** (`/api/match`). ⚠️ the **batch** precompute (`matches.md`) still only excludes same-company — folds into the paused CRM re-run. _Open Q for Salman: rule is same-**country**; if "international connection" meant cross-**region**, it's a 1-line soft-penalty change (see route TODO)._ |
| Mobile optimization | ⬜ not done (layout stacks but not tuned) |
| Missing-email fallback + notify DRI | ✅ done |
| Email-cost estimate doc (≈400 footfall, ~1,200 emails) | ⬜ not started |
| Credential-sharing guide | ⬜ not started |
| AI-Studio API-key setup guide (for Sukriti) | ⬜ not started |

### Product gaps (beyond the meeting)
- ~~**On-the-fly / live matching** for walk-ups not in the precomputed set.~~ ✅ **DONE** — wired via `POST /api/match` + `lib/match_embeddings.json` (see §2 "Live walk-in matching").
- **Talking points for the other 20 mapped attendees** (currently only Guillermo). Costly LLM run — batch with the CRM re-run.
- ~~**Meeting-slot assignment** from networking breaks (system assigns, manual fallback).~~ ✅ **DONE (simplified)** — replaced per-match assignment with a single shared window list (`lib/meeting-slots.js`) shown in the email + confirmation. Only the **actual times** remain to confirm (preliminary in the programme).
- **DRI email** in production (`NEXT_PUBLIC_CONCIERGE_DRI_EMAIL` is unset → falls back to hardcoded gmail).
- **Scorecard end-screen** (deferred).
- ~~**Direct "X wants to meet you" emails to matches**~~ ✅ **DONE** — `matchIntro` emails each selected match that has an `email` (meeting slot + talking points, reply-to the attendee). Still gated on **real match emails** (test data only so far — see §4). Meeting slots now ship as a shared list (`lib/meeting-slots.js`); only the final times need confirming.

---

## 4. Are we blocked?

**Not hard-blocked.** Core dev work continues; only two things are genuinely gated on other people.

### ⛔ Blocked on the team
| Blocked item | Waiting on |
|---|---|
| **Final re-match** (apply same-country rule + fold in new people) + talking-points re-run | **CRM media-owner list** — Deewakshi / Sukriti |
| **Final meeting-slot times** | **Networking schedule / local times** — Deewakshi. Slots ship as a shared list (`lib/meeting-slots.js`); only the times are preliminary. |
| **Match-intro emails to real recipients** | the matches' **email addresses** (from the CRM list) — code is done; `twin_matches.json` has test emails only |
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
| `EMAIL_TEST_MODE` | ⚠️ currently `true` | reroutes **all** emails to `EMAIL_TEST_RECIPIENTS`. **Set `false` before the event** (server-only var → restart to apply). |
| `EMAIL_TEST_RECIPIENTS` | set (test inboxes) | comma-separated reroute targets, used only when test mode is on. |
| Resend plan | ⚠️ free = 100 emails/day | event burst will exceed it — now **up to ~5 emails/submit** (attendee + DRI + up to 3 match intros) → upgrade (Pro $20 covers it). See email-cost doc TODO. |

---

## 6. How to regenerate (after CRM list / new data)

```bash
node scripts/download-profile-pics.mjs      # pull any new headshots (idempotent)
node scripts/build-twin-matches.mjs         # rebuild lib/twin_matches.json (precomputed flow)
npm run build:match-embeddings              # rebuild lib/match_embeddings.json (live walk-in pool)
```
Talking points: add a `sourceSlug` block to `lib/twin_talking_points.json`, then re-run the generator.

> ⚠️ **Match `email` is not yet produced by `build-twin-matches.mjs`** — it currently lives as an inline field in `twin_matches.json` (test data for Guillermo) and would be **overwritten on a rebuild**. When real match emails arrive, either teach the generator to merge them (like talking points) or re-apply them after regen. (Meeting slots are no longer per-match — they live in `lib/meeting-slots.js`, so a rebuild can't touch them.)

---

## 7. Testing notes
- `npm run dev` → `/select-name` → **Guillermo De Lella** → `/reveal` is the fully-populated demo (headshots + talking points for all 3 matches).
- ⚠️ Completing `/concierge` sends **real** emails and writes a **real** Sheet row **unless `EMAIL_TEST_MODE=true`** — use test mode (or your own address) while testing.
- **Safe testing:** set `EMAIL_TEST_MODE=true` + `EMAIL_TEST_RECIPIENTS` and restart `next dev` → every email reroutes to your inboxes (subject `[TEST→<real recipient>]`), so the real flow won't email real people. The Sheet write still happens. To exercise `matchIntro`, the selected matches need an `email` in `twin_matches.json` (seeded as test data for Guillermo).
- Do **not** run `next build` against a running `next dev` — it corrupts `.next` (delete `.next` and restart dev if you hit `Cannot find module` / favicon 500s).
