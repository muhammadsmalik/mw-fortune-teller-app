# Agent WALLi — Booth Flow Status

_Last updated: 2026-05-31 · Branch: `integration/woo-e2e`_

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
- **`/select-name`** — searchable attendee picker over the precomputed directory (`lib/twin_index.json`), stores selection in localStorage. **Walk-ins** (anyone not in the directory) get their **own focused screen** — paste LinkedIn → live match — reached via "Not on the list?", with a collapsible **"How do I find my LinkedIn URL?"** guide (iOS/Android, handles the menu variants) and a **back-to-search** return. The screen is one-task-per-state: search → walk-in → confirm.
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

### Candidate pool — 3 canonical lists (NEW — 2026-05-31)
The matching pool is now built from the canonical source lists in `ATTENDEES-RSVP-LISTS/`:
- **WOO London attendees** (= the final-enriched tracker) — `WOO_London_Attendee_Tracker_Final_Enriched.csv` → list tag `woo`.
- **CRM list** — `CRM-List.csv` → list tag `crm`.
- **Meet Your Twin RSVP** — `Meet Your Twin RSVP List - Sheet1.csv`. This is the **source/picker** directory (who shows up at the booth), **not** a match target.
- **`lib/pool_index.json`** (built by `node scripts/build-pool-index.mjs`) unifies WOO+CRM keyed by slug, each tagged `lists: ['woo'|'crm']`. Totals: **982 people — 508 WOO, 473 CRM, 1 both**. Legacy booth headshots are preserved by joining the old index-map.
- **CRM scrape (done):** 497 new LinkedIn profiles scraped via EnrichLayer (978 profiles on disk; 27 failed/deleted → fall back to thin embed text).

### Composition rule (NEW — 2026-05-31)
- A match set is **1 WOO attendee guaranteed + the best 2 from WOO ∪ CRM** by similarity (CRM only surfaces when it ranks; "the rest can be WOO or CRM", per Salman). Company/country exclusion still applies. The WOO twin is shown first (High) since they're physically at the event.

### Live walk-in matching (done & tested)
- **`POST /api/match`** (`app/api/match/route.js`): LinkedIn URL → **EnrichLayer** live profile fetch → OpenAI embedding → cosine vs the pool → exclusion → **composition rule** → top-3, returned in the exact `twin_matches` shape so `/reveal` renders them unchanged.
- **`lib/match_embeddings.json` — now 982 vectors** (was 452), `text-embedding-3-small`, 1536-dim, **each carrying its `lists` tag**. Built by `scripts/build-match-embeddings.mjs` (`npm run build:match-embeddings`) from `lib/pool_index.json` + the saved scrapes. The walk-in is embedded the **same way** (shared `lib/match-core.mjs`).
- **Shared selection:** exclusion + composition live in `lib/match-select.mjs`, used by **both** `/api/match` and the precompute builder.
- **Exclusion rule:** a valid match must differ in **both company and country** (2026-05-29 meeting rule) — company compared by **brand root** so cross-subsidiary colleagues (JCDecaux AU/UK) are excluded. Graceful relaxation if the strict rule leaves <3.
- Embed text = curated professional substance (headline/occupation/industry/bio/experience-titles/location); **not** the raw JSON, **not** posts/descriptions (those feed talking points instead).

### Match reason + talking points — Gemini (NEW — 2026-05-31)
- Replaces the old deterministic reason + empty talking points. **Gemini 3.1 Flash-Lite** (`@google/genai`, structured JSON-schema output, thinking off → steady ~1.3s/call) generates a **one-line reason + 3 grounded talking points** per pair. `lib/match-reasons.mjs`.
- Inputs are **curated** (`lib/profile-extract.mjs`): bio + top 3 experiences (with descriptions) + top ~6 recent posts/activities + article titles. **PII (emails/phones) + noise stripped.** (Richer than the embedding text — posts are the gold for talking points.)
- **Live:** `/api/match` generates the 3 matches **in parallel** (~3s, block-until-ready); deterministic `reasonFor()` + `[]` fallback on any failure or missing curated profile.
- **Batch:** `scripts/generate-match-reasons.mjs` (`npm run generate:match-reasons`) — reads the new `lib/twin_matches.json` graph (not `matches.md`); writes two **non-destructive** merge-files, `lib/twin_match_reasons.json` + `lib/twin_talking_points.json`, folded into `twin_matches.json` by `build-twin-matches.mjs` (preserves the handwritten Guillermo set). Resumable + only fills missing pairs: `--limit N`, `--force`, `--concurrency N`, `--rpm N`, `--retries N`.
- **Provider — Vertex AI (2026-05-31):** `match-reasons.mjs` prefers **Vertex** when `GCP_PROJECT_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` are set (`GOOGLE_CLOUD_LOCATION=global`), falling back to `GEMINI_API_KEY`. Reason: the AI-Studio **free tier is 15 rpm** — a concurrency-5 batch blew past it and silently dropped ~1,400 pairs. Vertex has no such cap; the full ~1,460-pair run completes in ~10 min with **0 failures**.
- **Rate-limit hardening:** `generateReasonAndPoints(…, { retries })` now does 429-aware backoff that honours the server's "retry in Ns" hint (live path keeps `retries:0` = fast deterministic fallback, never blocks the reveal); the batch adds a request-rate gate (`--rpm`) and **fails loud** (warns on high failure rate instead of reporting success).
- **Env:** `GEMINI_MATCH_MODEL=gemini-3.1-flash-lite` (defaults if unset; **only** model used for matching). `@google/genai` added; deprecated `@google/generative-ai` left in place for the fortune/archetype endpoints. Plan: `MASTER_DOCS/GEMINI_MATCH_REASONS_PLAN.md`.

### ✅ Precompute / picker path REGENERATED (task 11 — done 2026-05-31)
- The **picker path** (`/select-name` → `/reveal` ← `lib/twin_matches.json`) now uses the **same logic as the live walk-in path** — the old 452-pool `matches.md` is no longer read.
- **Shared selector `lib/match-select.mjs`** — exclusion + composition extracted into one function used by **both** `/api/match` (live) and `build-twin-matches.mjs` (precompute), so the two paths can't diverge. Live passes no cap; the batch passes a `hasCapacity` predicate.
- **`build-twin-matches.mjs` rewritten** to compute the graph from `lib/match_embeddings.json` (not `matches.md`): sources = 509 WOO + 14 RSVP-only (pending); matches via the shared selector + the twin-5 cap; reasons/points merged from the Gemini files.
- **Final graph:** 523 source rows · **488 with matches, 35 pending** · 1,464 edges · **1,442 (98.5%) carry a Gemini reason + 3 talking points**.
- **Twin-5 cap — DONE (baked into generation):** no person appears as a match more than 5×; capacity-constrained greedy, soft cap so everyone still keeps 3. Verified: max in-degree 5, 0 over-cap, 0 sources short of 3.
- **Match emails populated** (`emailBySlug` from `pool_index`, 881/982) → the precomputed `matchIntro` path is unblocked (no longer test-data-only).
- **Pending → walk-in:** the 35 pending people (14 RSVP-only with no LinkedIn on file + 21 with a broken/errored scrape) are flagged `pending: true` in `twin_index.json`; the picker routes them into the **live walk-in flow** (LinkedIn prefilled for the 21 that have a URL) instead of a dead-end "matches pending" reveal.

### Matching refinements (2026-05-31)
- **Thin-profile embedding fix** (`lib/match-core.mjs`): ~37 profiles came back `thin_profile:true` from EnrichLayer (no headline/occupation/experience — confirmed NOT a cache issue; fresh fetches still thin). They were embedding on bare location → collapsing into a ~1.0 noise cluster. Now thin profiles embed on their **recent post titles + CSV role/company** (`isThinProfile()` + fallback). Re-embedded → max edge similarity dropped 1.000 → 0.843; ~24 real attendees recovered into sensible matches.
- **Company-root exclusion** (`match-select.mjs`): the exclusion now compares a normalized **brand root** (strips country/legal/industry tokens, splits on any punctuation), so cross-subsidiary "colleague" intros (JCDecaux AU → JCDecaux UK, APG\|SGA, Weischer) are blocked. Same-brand matches: ~24 → **0**.
- **Quality audit (4 sub-agents):** hallucination **~0** (40 pairs hand-checked, every specific claim traced to the curated facts); cross-market rules hold 100%; thin-profile fallback produces grounded matches. Findings that drove the fixes above: colleague matches, the broken-scrape cluster, and the RSVP coverage gap.

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
| Mobile optimization | ✅ done (flow tuned for phones; shipped within the theme revamp, no standalone commit) |
| Missing-email fallback + notify DRI | ✅ done |
| Email-cost estimate doc (≈400 footfall, ~1,200 emails) | ⬜ not started |
| Credential-sharing guide | ⬜ not started |
| AI-Studio API-key setup guide (for Sukriti) | ⬜ not started |

### Product gaps (beyond the meeting)
- ~~**On-the-fly / live matching** for walk-ups not in the precomputed set.~~ ✅ **DONE** — wired via `POST /api/match` + `lib/match_embeddings.json` (see §2 "Live walk-in matching").
- ~~**Talking points for the other mapped attendees** (currently only Guillermo).~~ ✅ **DONE** — the full Gemini batch ran over Vertex (0 failures); **1,442 / 1,464 edges (98.5%) carry a reason + 3 grounded points** in `lib/twin_matches.json`. The ~22 without are matches to thin-no-scrape targets (deterministic fallback; UI hides the empty line).
- ~~**Meeting-slot assignment** from networking breaks (system assigns, manual fallback).~~ ✅ **DONE (simplified)** — replaced per-match assignment with a single shared window list (`lib/meeting-slots.js`) shown in the email + confirmation. Only the **actual times** remain to confirm (preliminary in the programme).
- ~~**Twin-match exposure cap (CEO ask, 2026-05-30):** cap one person to ≤5 appearances.~~ ✅ **DONE (2026-05-31)** — baked into `build-twin-matches.mjs` generation (capacity-constrained greedy, soft cap so everyone keeps 3). Verified on the regenerated graph: **max in-degree 5, 0 over-cap, 0 sources short of 3**.
  - **Inverse problem still open (raise with CEO):** **446 of 982** pool members are never shown to anyone — a cap fixes over-exposure but not under-exposure. Mostly CRM contacts who aren't booth attendees, so it's not a booth blocker; only matters if the goal is "everyone in the DB gets ≥1 intro" (would need a min-coverage guarantee alongside the cap).
  - **Confidence label note:** "High" = the guaranteed WOO pick (physically present), **not** the highest cosine — so ~41% of the time a "Medium" has higher similarity. Intentional, but don't read High/Medium as a quality ranking. Open: relabel or document at the booth.
- **DRI email** in production (`NEXT_PUBLIC_CONCIERGE_DRI_EMAIL` is unset → falls back to hardcoded gmail).
- **Scorecard end-screen** (deferred).
- ~~**Direct "X wants to meet you" emails to matches**~~ ✅ **DONE** — `matchIntro` emails each selected match that has an `email` (meeting slot + talking points, reply-to the attendee). Still gated on **real match emails** (test data only so far — see §4). Meeting slots now ship as a shared list (`lib/meeting-slots.js`); only the final times need confirming.

---

## 4. Are we blocked?

**Not hard-blocked.** Core dev work continues; only two things are genuinely gated on other people.

### ⛔ Blocked on the team
| Blocked item | Waiting on |
|---|---|
| ~~**CRM list**~~ ✅ **ARRIVED 2026-05-31** (`ATTENDEES-RSVP-LISTS/CRM-List.csv`, 473 people). Scraped + embedded; live walk-in matcher now uses the WOO ∪ CRM pool with the composition rule. **Precompute re-run** (picker path) + **twin-5 cap** still pending (task 11). | — (decision, not blocked) |
| **Final meeting-slot times** | **Networking schedule / local times** — Deewakshi. Slots ship as a shared list (`lib/meeting-slots.js`); only the times are preliminary. |
| **Match-intro emails to real recipients** | the matches' **email addresses** (from the CRM list) — code is done; `twin_matches.json` has test emails only |
| Matches for the **18 unmapped RSVP people** | their LinkedIn data (or live matching) — folds into the re-run |
| DRI notification going to the right inbox | the **DRI email address** (minor; placeholder works meanwhile) |

> **Why 18 RSVP people have no matches:** the booth's selectable list (`rsvp_attendees.json`, 39) and the scraped/matched universe (453) come from different inputs and only partly overlap. 21 of the 39 are in the 453; 18 were never scraped, so there's nothing to precompute for them. This is an input-coverage gap, not a matching failure — all 453 indexed profiles do have matches.

### ✅ NOT blocked — can build now
- Talking points for the current mapped set (cost = LLM tokens; or wait to batch with CRM)
- Concierge polish, DRI placeholder, copy
- The three docs (email cost, credential guide, API-key guide)
- Writing the same-country exclusion code (hold the actual re-run for the CRM batch so it's paid once)

### The strategic note (from the group thread)
The CRM list has now arrived (2026-05-31). The **live walk-in** pipeline has been re-run on the expanded WOO ∪ CRM pool (scrape → embed → composition rule → Gemini reasons/points). The one remaining cost is the **precompute re-run** for the picker path (rebuild the match graph + the ~1,500-call Gemini batch) — gated on a go/cost decision, not on the team. Doing it once now (with the twin-5 cap) avoids a second paid re-run.

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
node scripts/build-pool-index.mjs                       # unify WOO + CRM → lib/pool_index.json (+ list tags, emails, headshots)
node scripts/scrape-attendee-linkedin-profiles.js --all # scrape any new LinkedIn profiles (idempotent, skips existing)
node scripts/download-profile-pics.mjs                  # pull any new headshots (idempotent)
npm run build:match-embeddings                          # rebuild lib/match_embeddings.json (982 vectors, list-tagged, thin→posts)
node scripts/build-match-profiles.mjs                   # rebuild lib/match_profiles.json (curated profiles for Gemini)
node scripts/build-twin-matches.mjs                     # PASS 1: build the match graph (selector + composition + twin-5 cap)
npm run generate:match-reasons -- --rpm 150 --concurrency 8   # Gemini over Vertex; reads twin_matches.json; resumable; fills only missing pairs
node scripts/build-twin-matches.mjs                     # PASS 2: fold reasons + points back into lib/twin_matches.json
```
**Order matters now:** `generate:match-reasons` reads the graph in `lib/twin_matches.json`, so `build-twin-matches.mjs` must run **before** it (PASS 1), then **again after** (PASS 2) to merge the reasons/points. The generator is non-destructive (`--force` to overwrite) and skips pairs already done, so PASS 2 + a re-run only touches new pairs. Reasons/points live in `lib/twin_match_reasons.json` + `lib/twin_talking_points.json` (handwritten Guillermo set preserved).

> **Match `email` is now produced** by `build-twin-matches.mjs` from `lib/pool_index.json` (`emailBySlug`, 881/982), so a rebuild no longer wipes it. (Meeting slots live in `lib/meeting-slots.js` — not per-match — so a rebuild can't touch them either.)

---

## 7. Testing notes
- `npm run dev` → `/select-name` → **Guillermo De Lella** → `/reveal` is the fully-populated demo (headshots + talking points for all 3 matches).
- ⚠️ Completing `/concierge` sends **real** emails and writes a **real** Sheet row **unless `EMAIL_TEST_MODE=true`** — use test mode (or your own address) while testing.
- **Safe testing:** set `EMAIL_TEST_MODE=true` + `EMAIL_TEST_RECIPIENTS` and restart `next dev` → every email reroutes to your inboxes (subject `[TEST→<real recipient>]`), so the real flow won't email real people. The Sheet write still happens. To exercise `matchIntro`, the selected matches need an `email` in `twin_matches.json` (seeded as test data for Guillermo).
- Do **not** run `next build` against a running `next dev` — it corrupts `.next` (delete `.next` and restart dev if you hit `Cannot find module` / favicon 500s).
