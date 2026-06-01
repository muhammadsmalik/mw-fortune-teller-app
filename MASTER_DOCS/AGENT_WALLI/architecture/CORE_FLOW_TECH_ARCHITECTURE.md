# Core Flow — Technical Architecture (Matching → Talking Points → Concierge)

**Companion to:** [`../product/CORE_FLOW_PRD.md`](../product/CORE_FLOW_PRD.md)
**System:** Next.js (App Router) app, "Agent WALLi" booth flow for WOO London.
**Last reconciled with code:** 2026-06-01

---

## 1. System Overview

Two-plane architecture: an **offline build plane** (Node scripts that precompute the match graph, reasons, and talking points) and an **online request plane** (Next.js routes + client pages that serve precomputed data instantly and compute live for walk-ins). Stateless serverless functions; no application database — durable state lives in a **Google Sheet** (leads) and **email** (the actual introductions). Client step-to-step state is **localStorage**.

```
 OFFLINE (build time)                         ONLINE (request time)
 ───────────────────                          ─────────────────────
 CSV / RSVP / scrapes                          Browser (App Router pages)
        │                                        │  select-name → reveal
        ▼                                        │  → concierge → confirmation
 build-pool-index ─► pool_index.json             │
        │                                        ├─► /api/match        (walk-in: live embed + select + Gemini)
 build-match-embeddings ─► match_embeddings.json ├─► /api/submit-lead  (Google Sheets append)
        │                                        └─► /api/send-email   (Resend: 3 templates)
 build-match-profiles ─► match_profiles.json
        │                                        Reads precomputed (RSVP path):
 build-twin-matches ──► twin_matches.json          twin_matches.json, twin_index.json
   (selectMatches + twin-5 cap + merge)
        ▲
 generate-match-reasons (Gemini) ─► twin_match_reasons.json
                                  └► twin_talking_points.json
```

---

## 2. Component Map

### Online — pages (`app/`)
| Route | File | Role |
|---|---|---|
| `/select-name` | `app/select-name/page.js` | Directory search (`twin_index.json`) for RSVP; walk-in LinkedIn URL paste; routes `pending` RSVP into walk-in. |
| `/reveal` | `app/reveal/page.js` | Renders 3 matches. Precomputed (`twin_matches.json`) or live `/api/match`. |
| `/concierge` | `app/concierge/page.js` | Selection + email capture + 3-part submit orchestration. |
| `/confirmation` | `app/confirmation/page.js` | Thank-you, windows, localStorage reset. |

### Online — APIs (`app/api/`)
| Endpoint | File | Role |
|---|---|---|
| `POST /api/match` | `app/api/match/route.js` | Walk-in: EnrichLayer fetch → OpenAI embed → `selectMatches` → Gemini reason+points. |
| `POST /api/submit-lead` | `app/api/submit-lead/route.js` | Append lead row to Google Sheet. |
| `POST /api/send-email` | `app/api/send-email/route.js` | Resend dispatch; 3 templates; test-mode reroute; CC/reply-to routing. |

### Online — shared logic (`lib/*.mjs`)
| Module | Role |
|---|---|
| `match-core.mjs` | Embedding text construction (name-free), `embedOpenAI`, cosine similarity. `EMBED_MODEL = text-embedding-3-small` (1536-dim). |
| `match-select.mjs` | `selectMatches(vec, source, vectors, opts)` — exclusion, composition, twin-5 cap. Shared by live + batch. |
| `match-reasons.mjs` | `generateReasonAndPoints(source, match, opts)` — Gemini (Vertex-preferred) reason + 3 points, in-memory cache, deterministic fallback handled by caller. |
| `profile-extract.mjs` | `extractProfileForLLM()` — PII-stripped curated profile for the LLM. |

### Online — UI components
| Component | Role |
|---|---|
| `components/twin-reveal/MatchCard.js` | The atomic match unit: header (name/role/company/country/confidence/reason pill) + talking-points list (rendered only when non-empty). |
| `components/twin-reveal/WalliAvatar.js` | Agent WALLi persona avatar (posed per step). |

### Offline — build scripts (`scripts/`)
| Script | Output | Role |
|---|---|---|
| `build-pool-index.mjs` | `pool_index.json` | Ingest enriched CSV → pool directory (slug, lists, email, urls). |
| `build-match-embeddings.mjs` | `match_embeddings.json` (~13.8 MB) | OpenAI embeddings for the whole pool; 6-dp rounded. |
| `build-match-profiles.mjs` | `match_profiles.json` | Curated, PII-stripped profiles for LLM input. |
| `generate-match-reasons.mjs` | `twin_match_reasons.json`, `twin_talking_points.json` | Gemini pass: 1 reason + 3 points per edge; rate-limited, resumable, non-destructive merge files. |
| `build-twin-matches.mjs` | `twin_matches.json`, `twin_index.json` | Run `selectMatches` over WOO sources with twin-5 cap; merge in reasons + points; attach pool emails. |

---

## 3. Data Model

### 3.0 Current build snapshot (2026-06-01)

Counts from the live data files; they change on every rebuild (`§9`).

| Artifact | Count | Detail |
|---|---|---|
| `match_embeddings.json` | **982** vectors | 508 WOO-only · 473 CRM-only · 1 both. `text-embedding-3-small`, 1536-dim, ~13.8 MB. |
| `pool_index.json` | **981** people | 880 have an email (match-intro recipients). |
| `twin_matches.json` | **521** sources / **1,458** edges | 484 sources have the full 3 matches · 3 have 2 · **34 `pending` have 0** (no embedding → walk-in). **98%** of edges carry a reason + 3 talking points. Confidence split **High 485 / Medium 973** (≈ 1 guaranteed-present WOO attendee per source). 1,291 match edges have an email. |
| `twin_index.json` | **521** directory entries | 34 `pending`; **only 39 carry an email** (RSVP-only privacy strip). |
| `twin_match_reasons.json` / `twin_talking_points.json` | 1,545 / 1,854 edges | Larger than the 1,458 live edges — non-destructive merge files retain edges later dropped by the twin-5 cap. |
| `…/matching/linkedin-profile-index-map.json` | 453 entries | Older matching-prompt subset; index → profile metadata. |

### 3.1 Precomputed artifacts (`lib/`)

**`match_embeddings.json`** — `{ model, dim:1536, count, builtAt, vectors:[{ index, slug, lists, name, role, company, country, linkedinUrl, headshotUrl, vec:[1536 floats] }] }`. Loaded once at module scope by `/api/match`.

**`pool_index.json`** — `{ [slug]: { slug, lists, name, role, company, country, linkedinUrl, email, headshotUrl } }`. Source of match **emails** and list membership.

**`match_profiles.json`** — `{ [slug]: { headline, occupation, industry, country, bio, experiences[], activities[], articles[] } }`. LLM input (no embeddings, no PII).

**`twin_matches.json`** — the precomputed graph, keyed by source slug:
```jsonc
{
  "<sourceSlug>": {
    "source": { "headshotUrl": "" },
    "matches": [
      {
        "slug","index","name","role","company","country",
        "lists": ["woo"],                 // or ["crm"] / ["woo","crm"]
        "confidence": "High",             // High = guaranteed present WOO attendee
        "matchReason": "≤12 words",
        "linkedinUrl","headshotUrl",
        "email": "may be empty",          // from pool_index
        "talkingPoints": ["…","…","…"],   // [] if not generated
        "_sim": 0.84                       // debug only
      }
      // exactly 3
    ]
  }
}
```

**`twin_match_reasons.json`** — `{ [sourceSlug]: { [matchSlug]: "reason" } }` (merge file).
**`twin_talking_points.json`** — `{ [sourceSlug]: { [matchSlug]: ["p1","p2","p3"] } }` (merge file).
**`twin_index.json`** — name-sorted RSVP directory: `[{ slug, name, role, company, email(RSVP-only), linkedinUrl, pending? }]`.

### 3.2 Runtime state (client)
localStorage keys carry context across steps: `selectedAttendee{Slug,Name,Email,Company,Role,LinkedInUrl}`, `selectedMatches` (JSON), and `conciergeLeadSaved` (idempotency marker = attendee slug). Email-send dedupe within a session uses an ephemeral `useRef` (`sent.current`), reset on refresh.

### 3.3 Durable state (server-side, external)
- **Leads:** Google Sheet `Sheet1!A1:O1`, one row per submit (cols A–O: timestamp, name, email, industry, company, fortuneText, flowSource, linkedinUrl, headline, location, persona, questionIds, questionTexts, tarotCards, sessionId).
- **Introductions:** the emails themselves (Resend). No DB.

---

## 4. Key Flows (sequence)

### 4.1 Walk-in match — `POST /api/match`
```
Client (select-name) ──{ linkedinUrl }──► /api/match
  1. normalize + validate URL                         (400 if invalid)
  2. EnrichLayer fetch profile (ENRICHLAYER_API_KEY)  (502 on failure)
  3. extract identity (name/role/company/country/url/headshot)
  4. OpenAI embed (text-embedding-3-small)            (422 if profile too sparse)
  5. cosine score vs POOL (module-scope singleton)
  6. selectMatches(vec, source, POOL.vectors)         → top 3 (no capacity opts)
  7. Promise.all over 3 matches:
        generateReasonAndPoints(curated, match)  (retries:0, fail-fast)
        on success → m.matchReason, m.talkingPoints
        on failure → keep deterministic reasonFor(), talkingPoints:[]
  8. return { source, matches }                        (500 on unexpected)
```
- **Response:** `{ source:{name,role,company,country,linkedinUrl,headshotUrl}, matches:[…3…] }`.
- **Latency:** dominated by EnrichLayer + embedding + ~1.3s × parallel Gemini calls.

### 4.2 RSVP reveal (no live compute)
`/select-name` resolves the slug → `/reveal` reads `twin_matches.json[slug].matches` directly. `pending` RSVP people (no enriched data) are rerouted into the walk-in path instead of an empty reveal.

### 4.3 Concierge submit (3-part, `app/concierge/page.js`)
```
On submit (email validated, ≤3 chosen matches):
  Part 1 — Lead (idempotent):
     if !localStorage[conciergeLeadSaved===slug]:
        POST /api/submit-lead { fullName,email,companyName,industry,
                                flowSource:'twin-reveal',linkedinProfileUrl,
                                persona:'media_owner', sessionId:slug }
        on ok → set marker
  Part 2 — Two emails in parallel:
     POST /api/send-email twinConfirmation  → emailTo:attendee, testRerouteTo:email
     POST /api/send-email salesRepNotification → emailTo:DRI, testRerouteTo:email
  Part 3 — Match invitations:
     for each chosen match with m.email (deduped via sent.current.matches):
        POST /api/send-email matchIntro
           emailTo:m.email, replyTo:attendeeEmail, testRerouteTo:email
           { matchName, attendeeName/Role/Company, matchReason, talkingPoints }
  → navigate /confirmation
```

### 4.4 Email dispatch (`/api/send-email`)
```
POST { template, emailTo, subject, testRerouteTo?, replyTo?, ...templateFields }
  resolveDelivery(emailTo, subject, testRerouteTo):
     if EMAIL_TEST_MODE → to = testRerouteTo || EMAIL_TEST_RECIPIENTS
                          subject = "[TEST→<realRecipient>] " + subject
     else               → to = [emailTo]
  resolveReplyTo(template, body.replyTo):
     if matchIntro && !TEST && CONCIERGE_CC_EMAILS → reply-to = MW team   ← team brokers confirmations
     else → body.replyTo (attendee)
  resend.emails.send({ from:"Agent WALLi <FROM_EMAIL>", to, subject,
                       html: BOOTH_TEMPLATES[template](body),
                       cc: (!TEST && CONCIERGE_CC_EMAILS) || undefined,
                       replyTo })
```
Templates: `twinConfirmation` (attendee recap), `salesRepNotification` (team handoff, flags missing-email matches), `matchIntro` (invitation with prominent confirm CTA + windows + talking points).

---

## 5. Algorithms

### 5.1 Embedding text (`match-core.mjs`)
Name-free composition: headline + occupation + industry + summary + top-4 experiences + location + top-12 skills; thin-profile fallback to recent posts + CSV role/company; truncated to 6000 chars. Model `text-embedding-3-small`, 1536-dim, cosine similarity.

### 5.2 Selection (`match-select.mjs::selectMatches`)
1. **Self-exclusion** by slug (picker) or LinkedIn URL (walk-in).
2. **Diversity:** require different company AND country (company compared via normalized + brand-root equality stripping suffixes/country tokens). Relax to different-company-only if <3 remain.
3. **Composition:** guarantee 1 present WOO attendee (High), fill 2 by similarity (Medium).
4. **Twin-5 cap:** optional `hasCapacity` predicate caps any candidate at 5 appearances across the graph; soft — never truncate below 3.
5. Returns `[{ c, sim, confidence }]`, default limit 3.

### 5.3 Reason + points (`match-reasons.mjs::generateReasonAndPoints`)
- **Model:** Gemini `gemini-3.1-flash-lite` (override `GEMINI_MATCH_MODEL`), `thinkingBudget:0` for speed (~1.3s), temp 0.7.
- **Auth preference:** Vertex AI (`GCP_PROJECT_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON`) for quota; falls back to `GEMINI_API_KEY`.
- **Output schema:** `{ reason: ≤12 words, talkingPoints: [str,str,str] }`.
- **Cache:** in-memory per `(sourceSlug, matchSlug)`.
- **Resilience:** retries only on 429/RESOURCE_EXHAUSTED; live path uses `retries:0` (fail-fast → deterministic `reasonFor()` + empty points); batch path uses budgeted retries + exponential backoff.

---

## 6. External Dependencies

| Service | Used for | Auth (env) | Where |
|---|---|---|---|
| **OpenAI** | Profile embeddings | `OPENAI_API_KEY` (`POC_OPENAI_EMBED_MODEL` optional) | live `/api/match`, build-embeddings |
| **EnrichLayer** | Live LinkedIn profile fetch | `ENRICHLAYER_API_KEY` | live `/api/match` |
| **Google Gemini** | Match reasons + talking points | Vertex (`GCP_PROJECT_ID`,`GOOGLE_SERVICE_ACCOUNT_JSON`) or `GEMINI_API_KEY` | `match-reasons.mjs`, generate-match-reasons |
| **Google Sheets** | Lead logging | `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEET_ID` | `/api/submit-lead` |
| **Resend** | Transactional email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `/api/send-email` |

---

## 7. Configuration / Environment Matrix

| Variable | Plane | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | server | — | Embeddings (live + build). |
| `POC_OPENAI_EMBED_MODEL` | server | `text-embedding-3-small` | Embedding model override. |
| `ENRICHLAYER_API_KEY` | server | — | Walk-in profile fetch. |
| `GEMINI_API_KEY` | server | — | Gemini fallback auth (free tier ~15 rpm). |
| `GCP_PROJECT_ID` / `GOOGLE_SERVICE_ACCOUNT_JSON` | server | — | Vertex AI (preferred, higher quota). |
| `GEMINI_MATCH_MODEL` | server | `gemini-3.1-flash-lite` | Reason/points model. |
| `GOOGLE_SHEETS_CLIENT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY` / `GOOGLE_SHEET_ID` | server | — | Lead sheet. |
| `RESEND_API_KEY` | server | — | Live email. |
| `RESEND_FROM_EMAIL` | server | `onboarding@resend.dev` | From address (wrapped "Agent WALLi <…>"). |
| `EMAIL_TEST_MODE` | server | — | **Must be `false` in prod.** Reroutes whole submit; restart to apply. |
| `EMAIL_TEST_RECIPIENTS` | server | — | Fallback reroute targets when `testRerouteTo` absent. |
| `CONCIERGE_CC_EMAILS` | server | — | Staff CC (live only); also the match-reply broker inbox. |
| `NEXT_PUBLIC_CONCIERGE_DRI_EMAIL` | build | `atlas1000x@gmail.com` (fallback chain) | DRI notification recipient. **Set before event.** |
| `NEXT_PUBLIC_SALES_REP_EMAIL` | build | — | DRI fallback. |
| `NEXT_PUBLIC_ENABLED_PERSONAS` | build | `media_owner` | Persona picker (skipped for WOO). |
| `NEXT_PUBLIC_LIVE_FLOW` | build | `twin-reveal` | `fortune` restores old path. |

> `NEXT_PUBLIC_*` and `EMAIL_TEST_MODE` require a rebuild/restart to change.

---

## 8. Reliability & Failure Modes

| Failure | Behavior | Where |
|---|---|---|
| Gemini down / 429 (live) | Fail-fast → deterministic reason, no talking points; reveal still works. | `/api/match`, `match-reasons.mjs` |
| EnrichLayer fails | 502 with friendly error; attendee can retry. | `/api/match` |
| Profile too sparse | 422; cannot embed. | `/api/match` |
| Match has no email | Skipped for `matchIntro`; flagged "needs manual intro" in DRI email. | concierge + send-email |
| Page refresh mid-submit | Lead won't double-write (localStorage guard); emails may re-send (idempotent enough — same content). | concierge |
| Test mode left on | All emails reroute to tester, subjects prefixed, CC suppressed. | send-email |

**No-dead-end invariant:** every entry path resolves to 3 matches (RSVP precomputed, walk-in live, pending→walk-in), and every match shows at least a reason.

---

## 9. Build & Regeneration Runbook

To refresh the RSVP graph on a final pool:
```
node scripts/build-pool-index.mjs          # CSV → pool_index.json
node scripts/build-match-embeddings.mjs     # → match_embeddings.json (OpenAI; throttled)
node scripts/build-match-profiles.mjs       # → match_profiles.json (no API)
node scripts/generate-match-reasons.mjs \   # → twin_match_reasons.json + twin_talking_points.json
     [--limit N] [--force] [--concurrency 3] [--rpm 14]   # Gemini; resumable, rate-limited
node scripts/build-twin-matches.mjs         # → twin_matches.json + twin_index.json (merge + twin-5 cap)
```
Merge files are **non-destructive**: re-running `generate-match-reasons` only fills gaps; the build merges without wiping existing/handwritten points.

---

## 10. Known Constraints / Future Work

- **Embeddings file is ~13.8 MB** loaded at module scope — fine for a fixed pool; would need externalizing for a much larger pool.
- **No per-pair scheduling** — intentional; coordination is by reply/in-person.
- **Leads in a Sheet, not a DB** — adequate for one event; not a CRM.
- **Region soft-penalty deferred** — current rule is hard same-country exclusion (per 2026-05-29 decision); region-weighting pending confirmation.
- **Live talking points depend on Gemini quota** — Vertex preferred to avoid free-tier throttling at the booth.
