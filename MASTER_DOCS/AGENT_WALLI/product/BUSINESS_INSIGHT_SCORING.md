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

This realises the May 12 plan: *"a basic score at the event booth, while the full report will be sent via email."* The booth screen shows only a teaser; the email carries the substance.

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
- Not surfacing live score dials on the booth screen (teaser only — see §5).
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

## 5. On-screen behaviour (teaser only)

The booth screen shows **no live scores** and adds **no wait**. On the existing confirmation screen (`app/confirmation/page.js`), which already says *"Your intro request is on its way to your inbox,"* add one teaser line in WALLi's data-analyst voice:

> *"I've also analysed {Company}'s market presence — your full breakdown is on its way to your inbox."*

If `company` is unknown, fall back to a generic phrasing (*"…analysed your business…"*). This is pure copy — no new screen, no fetch, no state.

## 6. Flow, data, and async architecture

Existing flow: `reveal` → `concierge` (tap **Send me the intros**, lead saved + intro/notification emails fire) → `confirmation`.

This feature adds an **asynchronous insight job**, kicked off at the concierge submit step *without blocking it*:

1. In `app/concierge/page.js handleSubmit`, after the existing intro emails resolve, **fire (do not await)** a POST to `POST /api/business-insight` with `{ name, company, role, linkedinUrl, email, slug }`, then navigate to `/confirmation` exactly as today.
2. `app/api/business-insight/route.js`:
   - Validates input, returns **`202 Accepted` immediately**.
   - Schedules the real work with **`waitUntil(...)`** so the function stays alive after responding (Vercel Fluid Compute). **Required** — a bare fire-and-forget dies when the client request closes on navigation.
   - Scheduled work: map context → profile, call `scoreBusiness()`. The engine takes ~5 sequential grounded calls (~20–40s with spacing/retries) — fine, nobody waits. On success → POST `/api/send-email` with template `businessInsight` (pass `scores`, `summary`, `recommendation`, profile fields). On total failure (`scoreBusiness` throws / all dimensions withheld) → send the generic fallback email.
3. The route builds the `recommendation` from the weakest **scored** dimension via `lib/business-score-mapping.mjs` (dimension key → `{ product, why }`).

**Why `waitUntil` and not a plain async call:** the client navigates away immediately, cancelling its request; without `waitUntil` the platform may terminate the function mid-research. Alternatives if it proves insufficient (the ~5-call sequence is long): Vercel Queues or a Trigger.dev task — escalate only if needed.

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
4. **Concierge wiring + teaser** — fire the insight job non-blocking from `handleSubmit`; add the teaser line to `app/confirmation/page.js`.

## 9. Open items

- **Book a Demo URL** — ✅ **Resolved:** use a single `NEXT_PUBLIC_DEMO_URL` env as a placeholder for now; real booking link dropped in later.
- **Shared GenAI client** — ✅ **Done (post-ship):** after the scorer was migrated to `@google/genai` on Vertex, the duplicated Vertex-or-API-key client block was extracted to `lib/genai-client.mjs` (`genaiClient()`). Both `lib/business-scores.mjs` and `lib/match-reasons.mjs` now import it. (Side effect: the matching path's API-key fallback now also accepts `GOOGLE_GENERATIVE_AI_API_KEY` in addition to `GEMINI_API_KEY` — a benign superset.)
- **`waitUntil` runtime** — confirm the deployment target keeps functions alive for the full ~5-call grounded sequence (~20–40s); otherwise escalate to a queue / Trigger.dev task.
- **Grounding under load** — the engine is sequential with 4s spacing by design (parallel 429s and drops citations). With 5 dimensions that's longer; acceptable on the async path. Do not "optimise" into parallel calls.
- **Verification without a test framework** — the repo has no jest/vitest. Phase 1 ships a `scripts/test-business-score.mjs` runnable harness; later phases verify by hitting the route and inspecting the email in `EMAIL_TEST_MODE`.

## References

- `scripts/score-mockup.mjs` — the engine being adapted (grounded, verified, 3-dim).
- `scripts/score-all.mjs` — the abandoned precompute path (not used here).
- [Gemini — Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search)
- [Grounding metadata empty with structured output (why we keep freeform output)](https://discuss.ai.google.dev/t/grounding-metadata-grounding-chunks-grounding-supports-empty-when-using-structured-output-with-google-search-tool/113240)
