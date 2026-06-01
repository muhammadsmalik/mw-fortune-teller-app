# Business Insight Scoring — Agent WALLi

**Feature:** A grounded AI "business intelligence" report that scores an attendee's media-owner business across five dimensions, ties each dimension to a Moving Walls product, and delivers it by email with a **Book a Demo** call-to-action.
**Status:** Design / spec. Not yet implemented.
**Author:** Salman Malik
**Date:** 2026-06-01
**Related docs:** [`CORE_FLOW_PRD.md`](./CORE_FLOW_PRD.md) · [`../../MW_PRODUCT_LINEUP.md`](../../MW_PRODUCT_LINEUP.md) · [`../status/AGENT_WALLI_STATUS.md`](../status/AGENT_WALLI_STATUS.md)
**Origin:** Revives the AI scoring concept from the May 12 & May 20 alignment meetings (`MEETINGS/revival-mehul-12-may.md`, `MEETINGS/alignment-w-ceo-20-may.md`) that had dropped off the agenda by the May 30 demo.

> **Approach decision (key):** This feature **adapts the existing grounded scoring engine in `scripts/score-mockup.mjs`** — a working, anti-hallucination, Google-Search-grounded Gemini scorer currently unwired ("stakeholder mockup — NOT wired into the app"). We do **not** build a new scorer from scratch. We extend it from 3 → 5 dimensions, rebrand it from the "Oracle's Reading" fortune theme to the Agent WALLi science/data theme, wire it into an async post-submit job, and add a new product-recommendation layer.

---

## 1. Summary

After an attendee requests their networking intros (the existing concierge flow), Agent WALLi runs the **grounded scoring engine** (adapted from `score-mockup.mjs`) to research the attendee's company on the open web and score it across **five dimensions** that shape how advertisers discover and buy their media. Each dimension scores **0–100** with **exactly three evidence-cited bullets**, and maps to a Moving Walls product; the weakest scored dimension becomes a concrete product recommendation. The full scored report — plus a **Book a Demo** link — is delivered by **email**, computed **asynchronously** so the attendee never waits at the booth.

This realises the May 12 plan: *"a basic score at the event booth, while the full report will be sent via email."* The booth screen carries a one-tap **opt-in** (no live scores); the email carries the substance.

## 2. Goals & Non-Goals

### Goals
- **G1 — Grounded, verified, honest scores.** Reuse the engine's three anti-hallucination layers: a no-fluff prompt (the "swap test"), live Google-Search grounding with per-bullet source verification against `groundingSupports`/`groundingChunks`, and a fluff-phrase blocklist with retry-or-withhold. A dimension with no grounded evidence is **withheld**, never guessed.
- **G2 — Product-tied recommendations.** Every dimension maps to a product in the lineup, so a weak score becomes a specific "here's how Moving Walls helps."
- **G3 — Zero booth wait.** The slow multi-call grounded research must never block the on-screen flow. The attendee sees their confirmation instantly.
- **G4 — Reuse, don't reinvent.** Adapt `scripts/score-mockup.mjs` rather than write a new scorer; keep its grounding/verification machinery intact.
- **G5 — Never dead-end.** On total failure, fall back to a generic Book-a-Demo email with no scores rather than erroring.

### Non-Goals
- Not personalising the *intro* emails with scores (those send on the critical path at the concierge step — see §6).
- Not precomputing scores into `scripts/scores.json` (the `score-all.mjs` / `lookupScore` path). Scoring is **live per submission** via the grounded engine. The dead `scores.json` lookup path is out of scope; leave it untouched.
- Not surfacing live score dials on the booth screen (opt-in CTA + emailed report only — see §5).
- **Not pre-warming the research earlier in the journey** (e.g. at name selection). Scoring is triggered only at concierge submit — see §6 "Timing: why not pre-warm."
- ~~Not migrating the scoring engine to the new `@google/genai` SDK.~~ **Updated post-ship:** the engine now runs on `@google/genai` over Vertex AI, sharing one client with the matching path — see §4 SDK note.

## 3. The five dimensions → product map

Three dimensions come from the May 20 meeting and already exist in `score-mockup.mjs` with tuned in-scope/out-of-scope isolation. "Ease of Purchase" is **renamed to "Ease of Booking"** and **re-scoped** (see below). Two new dimensions complete the set.

| Dimension | What it measures | Product home (`MW_PRODUCT_LINEUP.md`) |
|---|---|---|
| **Discoverability** | How easily their media is found via search, AI, and OOH directories | Market, Studio |
| **Ease of Booking** *(re-scoped)* | How easily a buyer transacts **directly**: self-serve booking, packaged deals, marketplace storefront, transparent pricing | Studio (self-serve booking), Market |
| **Measurement** | Whether they **prove what a campaign delivered**: audience/impression data, third-party verification, attribution, post-campaign reporting | Measure |
| **Programmatic Readiness** *(new)* | Readiness for **programmatic activation**: SSP/DSP connectivity, exchange/PMP participation, external ad-platform integration, automated delivery | Activate |
| **Audience Intelligence** *(new)* | Use of **first-party / location / audience data to plan and price** (pre-campaign), audience segmentation, insights products | Science, Influence, Planner |

### Dimension boundary changes (to preserve isolation)
The mockup's whole design rests on each dimension's prompt declaring what's **out of scope** so facts can't bleed across calls. Adding two dimensions forces three boundary edits:
- **Ease of Booking** loses "programmatic connectivity (SSP/DSP), external marketplaces/exchanges" — that moves to **Programmatic Readiness**. It keeps direct + self-serve + packaged + marketplace-storefront booking.
- **Programmatic Readiness (new)** — *in scope:* their SSP and connected DSPs/demand partners, exchange/PMP/programmatic-guaranteed support, external ad-platform integration, automated activation pipelines. *Out of scope:* findability (Discoverability), direct/self-serve booking UX (Ease of Booking), any audience/measurement data (Measurement, Audience Intelligence).
- **Audience Intelligence (new)** — *in scope:* first-party data assets, audience segmentation/profiling, location/movement data, data-driven planning & pricing, insights/intelligence products. *Out of scope:* **post-campaign** proof/attribution (that's Measurement), findability, booking, programmatic plumbing. The Measurement vs Audience Intelligence split is **pre-campaign planning data (AI) vs post-campaign delivery proof (Measurement)** — state this explicitly in both prompts.

The dimension→product mapping lives in a small config module (`lib/business-score-mapping.mjs`) referencing `MW_PRODUCT_LINEUP.md` as source of truth. `MW_PRODUCT_MAPPING_LOCATION.md` is **outdated** and should be retired once this ships.

## 4. Scoring module — adapt `score-mockup.mjs` → `lib/business-scores.mjs`

Move the engine out of the standalone script into a reusable, app-callable module. Keep the machinery; change the inputs, dimension set, branding, and output boundary.

**Keep as-is (the valuable parts):**
- Grounded generation with `tools: [{ googleSearch: {} }]`, `temperature: 0.3`. *(SDK updated post-ship from `@google/generative-ai` to `@google/genai` on Vertex — see SDK note below. The `googleSearch` tool config and grounding-metadata shape are identical across both SDKs, so this kept the grounding pipeline unchanged.)*
- **One isolated grounded call per dimension**, run **sequentially with ~4s spacing** (the grounded endpoint 429s and drops citations under parallel load — do not parallelise).
- **Freeform text output + `extractJson`** — NOT `responseJsonSchema`. This is deliberate: structured-output mode returns empty `groundingChunks`, destroying source verification. Freeform preserves citations. *(This corrects the original spec, which wrongly proposed structured output.)*
- The three anti-hallucination layers: `RULES` prompt + `validateDimension` (score 0–100, exactly 3 `{point, evidence}` bullets, `BANNED_PHRASES` blocklist) + `verifyBullets` (grounding-support overlap → `groundedBy`/`verified`) + `scoreWithRetry` (3 attempts, keep grounded bullets, withhold if none).
- The data-driven `summary` (weakest **scored** dimension).

**Change:**
- **Signature:** export `async function scoreBusiness(profile)` where `profile = { fullName, title, company, region, linkedinUrl, context }`. Replace the hardcoded `PROFILE` const. Returns `{ scores, sources, queries, summary }` — **no email, no console** side effects (the route handles delivery). Caller maps app context → profile (`fullName`←name, `title`←role, `company`, `region`←country if available, `linkedinUrl`, `context`←any known blurb).
- **Dimensions:** extend `DIMENSIONS` and `DIM_KEYS` from 3 → 5 per §3, including the boundary edits. `easeOfPurchase` key may stay as the internal key but its `label` becomes "Ease of Booking" and its scope text is edited; add `programmaticReadiness` and `audienceIntelligence`.
- **Model:** own env `GEMINI_SCORE_MODEL` (default `gemini-2.5-flash`, what the mockup uses and which supports grounding) so it's decoupled from other routes' `GEMINI_MODEL_NAME`.
- **Move HTML out:** the `buildScorecardHtml`/`dimensionRow`/`fullEmailHtml` rendering moves to the email route as the `businessInsight` template (§7), rebranded. The lib module returns data only.

**SDK note (updated post-ship):** the engine was first ported on `@google/generative-ai` (the SDK `score-mockup.mjs` used) with an AI Studio API key. It was then migrated to `@google/genai` so it could run on **Vertex AI** (far higher quota than the AI Studio free tier's 15 rpm). The grounding-metadata extraction (`candidate.groundingMetadata.groundingChunks/groundingSupports/webSearchQueries`) is identical across both SDKs, so the migration touched only the client construction and the one `generateContent` call shape — the freeform-output + verification pipeline is unchanged. Because the matching path (`lib/match-reasons.mjs`) already used `@google/genai`, both grounded paths now share one client extracted to **`lib/genai-client.mjs`** (`genaiClient()`): prefers Vertex when `GCP_PROJECT_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON` are set, falls back to an API key (`GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY`). See §9.

## 5. On-screen behaviour (opt-in CTA)

> **Updated post-ship:** the original design was a passive teaser line that implied the report was *already* being generated for everyone. That auto-fired ~2 min of grounded research for every submitter, including people who didn't want it. **Changed to an explicit opt-in.**

The booth screen shows **no live scores** and adds **no wait**. On the confirmation screen (`app/confirmation/page.js`), below the intro confirmation, render an **opt-in card** in WALLi's data-analyst voice:

> *"Want to see what else I found? I can analyse {Company}'s market presence across five dimensions and email you the full breakdown."* + a **[Yes, email me the market read]** button.

- Tapping the button fires `POST /api/business-insight` (see §6) and swaps the button for *"On its way to your inbox ✓"* (`insightState`: `idle → sending → sent`, with an `error` retry path). It cannot double-fire.
- If `company` is unknown, fall back to generic phrasing (*"…analyse your business…"*). If no `email` is in `localStorage`, the card is hidden (can't deliver).
- The profile (`name`, `company`, `role`, `linkedinUrl`, `email`) is read from `localStorage` (persisted at `/select-name`, email refreshed at concierge submit) — no re-collection.

This is the **only** place the research is triggered; the concierge submit no longer fires it.

## 6. Flow, data, and async architecture

Existing flow: `reveal` → `concierge` (tap **Send me the intros**, lead saved + intro/notification emails fire) → `confirmation`.

This feature adds an **asynchronous insight job**, triggered by the **opt-in tap on `/confirmation`** (§5) *without blocking the UI*:

> **Updated post-ship:** the trigger moved from concierge submit (auto-fire for everyone) to an explicit opt-in tap on `/confirmation`. The concierge submit no longer fires it. The route and async mechanics below are unchanged.

1. In `app/confirmation/page.js`, when the attendee taps the opt-in button, `requestMarketRead()` POSTs to `POST /api/business-insight` with `{ name, company, role, linkedinUrl, email }` (read from `localStorage`). The button reflects `sending`/`sent`/`error`; the page never navigates or waits on the result.
2. `app/api/business-insight/route.js`:
   - Validates input (requires a valid `email`), returns **`202 Accepted` immediately**.
   - Schedules the real work with Next.js **`after()`** (`import { after } from 'next/server'`) so the function stays alive after responding (Vercel Fluid Compute, `export const maxDuration = 300`). **Required** — a bare fire-and-forget dies when the client request closes.
   - Scheduled work: map context → profile, call `scoreBusiness()`. The engine runs 5 sequential grounded calls; **measured ~90–130s per company** (4s inter-dimension spacing + up to 3 retries/dimension), well under the 300s limit. On success → POST `/api/send-email` with template `businessInsight` (pass `scores`, `summary`, `recommendation`, profile fields). On total failure (`scoreBusiness` throws / all dimensions withheld) → send the generic fallback email.
3. The route builds the `recommendation` from the weakest **scored** dimension via `lib/business-score-mapping.mjs` (dimension key → `{ product, why }`).

**Why `after()` and not a plain async call:** the work must outlive the response. `after()` is the Next.js App Router primitive that keeps the function alive after the `202` is sent (the spec originally called for Vercel's `waitUntil`; `after()` is the framework-level equivalent and what shipped). It has **no retry/durability** — if the instance dies mid-research that attendee gets nothing. Acceptable at booth volume; escalate to Vercel Queues / a Trigger.dev task only if guaranteed delivery, retries, or higher concurrency are needed (see §9).

Walk-ins and RSVP attendees both reach this with `company`/`role`/`linkedinUrl` in context, so the flow is identical for both doors.

### Timing: why not pre-warm

A tempting optimisation is to start research earlier (e.g. at `/select-name`) so it's ready sooner. **We deliberately do not.** The trigger stays at concierge submit, for three reasons:

1. **No latency to optimise.** Scoring is async and email-only (§1, §5) — nobody waits on screen, and the email landing sooner is invisible. Pre-warming optimises a wait no human experiences.
2. **Avoids wrong-name waste.** At name selection the choice isn't committed — an attendee can pick wrong and go back. Pre-warming would burn ~5 grounded calls on the wrong company and require invalidation + re-run. At submit, the name is locked, matches picked, email entered: every run is real and correct.
3. **Avoids a persistence problem.** A client `fetch` started on `/select-name` is tied to that page; navigating unmounts the component and the browser may cancel the in-flight request, and `localStorage` only persists data already received, not an in-flight promise. Reliable pre-warming would require **server-side compute cached by attendee slug in a durable store** (KV/Blob/Redis) — contradicting "keep it simple" for no user-visible gain.

**When this would flip:** if a future version shows live scores on the booth screen or folds scores into the intro email, pre-warming becomes worthwhile — then build the server-side compute-and-cache-by-slug version, triggered when intent is high (e.g. entering `/reveal`).

## 7. Email delivery + Book a Demo

Add a `businessInsight` template to `app/api/send-email/route.js` (alongside `twinConfirmation`, `salesRepNotification`, `matchIntro`) and register it in `BOOTH_TEMPLATES`. Adapt the mockup's `buildScorecardHtml` for the body, **rebranded** from "The Oracle's Reading" / "Your Fortune Score" / "AI Fortune Teller" to Agent WALLi's science/data identity (e.g. "Agent WALLi's Market Read", "Market Presence Score", "— Agent WALLi, AI Concierge · Moving Walls"). Render:
- Overall score + the five dimension rows (score bar + 3 evidence bullets each; withheld dimensions show the existing "score withheld" note).
- The `summary` line.
- A new **recommendation block**: the weakest scored dimension, its matched product, and the `why` line from the mapping.
- A prominent **Book a Demo** button → `NEXT_PUBLIC_DEMO_URL` *(placeholder env until the real booking link is supplied — see §9)*.

Reuse the route's `resolveDelivery` test-mode reroute so booth test runs never hit a real inbox.

**Fallback path:** if scoring failed entirely, send a short `businessInsight` variant (passed a `fallback: true` flag, or a separate template) with a warm line and the same Book a Demo button, so the attendee always gets a useful email.

**Sequencing note:** the *intro* confirmation email (`twinConfirmation`) sends synchronously at the concierge step, **before** scoring runs, so it carries (at most) a generic Book-a-Demo link, not the live scores. The personalised scored report is a **separate** email arriving later. Folding scores into the single intro email would put the slow ~5-call research on the critical send path — rejected per G3.

## 8. Phasing (each becomes its own implementation plan)

1. **Scoring core** — port `score-mockup.mjs` → `lib/business-scores.mjs` (`scoreBusiness(profile)`, data-only return); extend to 5 dimensions with re-scoped boundaries; add `lib/business-score-mapping.mjs`. Verifiable via a thin `scripts/test-business-score.mjs` harness that calls `scoreBusiness` for one real attendee and prints scores/sources (mirrors the repo's `node scripts/*.mjs` verification convention — there is no test framework).
2. **Email** — `businessInsight` template (adapted, rebranded scorecard + recommendation + Book a Demo CTA) + fallback variant in the send-email route; register in `BOOTH_TEMPLATES`.
3. **Route + async job** — `POST /api/business-insight` (validate → 202 → `waitUntil` → `scoreBusiness` → send-email; build recommendation from mapping; fallback on failure).
4. **Confirmation opt-in** — render the opt-in CTA on `app/confirmation/page.js`; tapping it fires the insight job non-blocking. *(Originally "concierge wiring + teaser" — the auto-fire was removed from `handleSubmit` and replaced by this opt-in; see §5.)*

## 9. Open items

- **Book a Demo URL** — ✅ **Resolved (2026-06-01):** hard-coded to `https://www.movingwalls.com/contact` in `app/api/send-email/route.js` (`DEMO_URL` const, no longer env-driven). *(Note: the legacy fortune flow's `app/contact-details/page.js` uses `https://www.movingwalls.com/contact-us/` — a different path; reconcile if a single canonical booking URL is wanted.)*
- **Shared GenAI client** — ✅ **Done (post-ship):** after the scorer was migrated to `@google/genai` on Vertex, the duplicated Vertex-or-API-key client block was extracted to `lib/genai-client.mjs` (`genaiClient()`). Both `lib/business-scores.mjs` and `lib/match-reasons.mjs` now import it. (Side effect: the matching path's API-key fallback now also accepts `GOOGLE_GENERATIVE_AI_API_KEY` in addition to `GEMINI_API_KEY` — a benign superset.)
- **Async runtime** — ✅ **Resolved:** ships on Next.js `after()` with `maxDuration = 300`. Measured ~90–130s per company, comfortably under the limit. **Decision (2026-06-01): keep `after()`, do NOT move to Trigger.dev** — it fits the limit, nobody waits, and the booth runs at modest volume. Revisit Trigger.dev only for guaranteed delivery/retries, concurrency limits, or if runtime approaches 5 min. (`after()` is best-effort: a mid-run instance death drops that one report.)
- **Scoring model** — ⚠️ **Locked to `gemini-2.5-flash`.** Head-to-head tested (2026-06-01): 2.5-flash grounds 15/15 bullets on easy *and* thin-data companies; `gemini-3.1-flash-lite` returns empty grounding metadata (0/15 → all withheld) and `gemini-3.5-flash` emits `[n.n.n]` citation markers + phrasing that fails the ≥50% overlap check in `verifyBullets` (all withheld even on the easy case). Do not change `GEMINI_SCORE_MODEL` without re-running a head-to-head through the real scorer (not just a grounding probe).
- **Grounding under load** — the engine is sequential with 4s spacing by design (parallel 429s and drops citations). With 5 dimensions that's longer; acceptable on the async path. Do not "optimise" into parallel calls.
- **Verification without a test framework** — the repo has no jest/vitest. Phase 1 ships a `scripts/test-business-score.mjs` runnable harness; later phases verify by hitting the route and inspecting the email in `EMAIL_TEST_MODE`.

## References

- `scripts/score-mockup.mjs` — the engine being adapted (grounded, verified, 3-dim).
- `scripts/score-all.mjs` — the abandoned precompute path (not used here).
- [Gemini — Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [Grounding metadata empty with structured output (why we keep freeform output)](https://discuss.ai.google.dev/t/grounding-metadata-grounding-chunks-grounding-supports-empty-when-using-structured-output-with-google-search-tool/113240)
