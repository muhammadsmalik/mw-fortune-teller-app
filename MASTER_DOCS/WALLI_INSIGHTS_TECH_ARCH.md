# Agent WALLi Insights — Design & Technical Architecture

_Status: **DRAFT for review** · Companion to `MASTER_DOCS/WALLI_INSIGHTS_PRD.md` · Created: 2026-06-01_
_Branch: `claude/integrate-ai-scoring-module-luquf`_

> The PRD says *what* and *why*. This doc says *how*: components, routes, data shapes,
> the generation pipeline, config, failure modes, and the build/test plan. References to
> requirements (`R#`) and decisions (`D#`) point back to the PRD.

---

## 1. System context (what exists today)

### Flow & state
- Next.js 15 (App Router), React 19, Tailwind. Booth flow is a chain of client pages that
  pass state through **`localStorage`**, not a server session:
  - `app/select-name/page.js` → sets `selectedAttendeeSlug`, `…Name`, `…Company`, `…Role`,
    `…LinkedInUrl`, `…Email`, `…HeadshotUrl`; walk-ins also set `liveMatches`.
  - `app/reveal/page.js` → reads those, renders matches from `lib/twin_matches.json`
    (or `liveMatches`), and on CTA sets `selectedMatches` then `router.push('/concierge')`
    (`app/reveal/page.js:60`).
  - `app/concierge/page.js` → reads `selectedMatches`, captures email, fires
    `/api/submit-lead` + `/api/send-email` (×N), routes to `/confirmation`.
  - `app/confirmation/page.js` → thank-you + clears localStorage.
- Live walk-in matches come from `POST /api/match` (`app/api/match/route.js`).

### The scoring module (the asset to integrate)
- **`scripts/score-mockup.mjs`** — scores ONE media owner across 3 dimensions
  (Discoverability / Ease of Purchase / Measurement) with **isolated, grounded Gemini calls**
  (`@google/generative-ai`, `tools:[{googleSearch:{}}]`), then validates with a 3-layer guard:
  - L1 prevent (prompt rules), L2 verify (`verifyBullets()` against `groundingSupports`),
    L3 reject (`BANNED_PHRASES`, exactly-3-bullets, valid score). Withholds a dimension if
    nothing grounds. Renders an HTML scorecard (currently in the **old Oracle voice** — must be
    rebranded, see `R-COPY`).
  - Output shape per dimension: `{ score:0-100, bullets:[{point, evidence, verified, groundedBy}], lowConfidence }`.
- **`scripts/score-all.mjs`** — batch precompute over `scripts/twins.json` → writes
  `scripts/scores.json` keyed **by name** (OpenAI variant; comment says swap in the grounded
  Gemini approach for the real run). **Note:** `scripts/scores.json` and `scripts/twins.json`
  **do not exist in the repo yet** — the precompute has not been run.
- **`app/api/send-email/route.js`** already has `lookupScore(fullName)`
  (`route.js:76`) reading `scripts/scores.json` by name — partial plumbing, currently dormant.
- **`components/fortune-journey/SelfAssessment.js`** + `lib/self_assessment_questions.json` —
  deterministic subjective questionnaire (dims: Discoverability / **Bookability** / Measurement,
  mapped to products Studio/Market/Measure). v3 only (PRD §8).
- **Branding tokens:** `mw-navy-*`, `mw-blue-electric`, `mw-gold-antique*`, `mw-parchment`
  (booth-flow only). `components/twin-reveal/WalliAvatar.js` renders poses
  `greeting · presenting · thinking · casting · celebrating` from `/public/agent-walli/`.

### Naming/keying inconsistencies to resolve (PRD D5, D6)
- "Ease of Purchase" (scorers) vs "Bookability" (self-assessment) — pick one (**D5**).
- Score keyed by **name** (`lookupScore`) vs the flow's key **slug** — standardise on slug (**D6**).

---

## 2. Target architecture (Phase 1)

### 2.1 New/changed surfaces

| Layer | Item | New/changed | Purpose |
|---|---|---|---|
| Data | `lib/walli_scores.json` | **new** | Precomputed scores keyed by **slug**; imported statically (offline-safe, like `twin_matches.json`). |
| Lib | `lib/insights.js` | **new** | `getInsightForSlug(slug)`, `computeOverall(dims)`, `isInsightAvailable(slug)`, shared shape/constants (dimension keys, labels). Single source of truth for both client and email. |
| Lib | `lib/insights-copy.js` | **new** | Science-voiced strings + a `assertNoMysticalCopy()` lint helper (enforces AC7). |
| UI | `components/twin-reveal/InsightOffer.js` | **new** | The yes/no offer (Radix dialog). Props: `available`, `onAccept`, `onDecline`. |
| UI | `components/twin-reveal/ScoreCard.js` | **new** | Renders overall + 3 dimension rows + summary + trust line. Pure/presentational; reused by screen and (optionally) email preview. |
| Page | `app/insights/page.js` | **new** | The scorecard screen; reads slug from localStorage → `getInsightForSlug` → `ScoreCard` → "Continue to my intros". |
| Page | `app/reveal/page.js` | **changed** | CTA now: persist `selectedMatches` (unchanged) → if `isInsightAvailable` & flag on, open `InsightOffer`; else `router.push('/concierge')` as today. |
| API | `app/api/insights/route.js` | **new (Phase 2)** | `POST` live-generate for walk-ins/misses; `GET ?slug=` optional server lookup. |
| API | `app/api/send-email/route.js` | **changed (Phase 2)** | Add a `scorecard` template (science-voiced); migrate `lookupScore` to slug + `lib/walli_scores.json`. |
| Script | `scripts/build-walli-scores.mjs` | **new** | Grounded batch precompute → `lib/walli_scores.json` (productionised `score-mockup.mjs` logic over the attendee list). |
| Config | `lib/event-config.js` | **changed** | Add `INSIGHTS_ENABLED` (from `NEXT_PUBLIC_INSIGHTS_ENABLED`) + `INSIGHTS_LIVE_GEN` flags. |

### 2.2 Routing & state flow

```
/reveal
  tap CTA ──► localStorage.setItem('selectedMatches', …)   (unchanged)
          ├─ INSIGHTS_ENABLED && isInsightAvailable(slug)?
          │        └─ yes ─► open <InsightOffer/>
          │                    ├─ accept ─► router.push('/insights')
          │                    └─ decline ─► router.push('/concierge')
          └─ no ─► router.push('/concierge')               (today's behaviour)

/insights
  read selectedAttendeeSlug ─► getInsightForSlug(slug)
    ├─ found ─► <ScoreCard/> + "Continue to my intros" ─► /concierge
    └─ missing (shouldn't happen if offer gated on availability):
                 Phase 1 → redirect to /concierge
                 Phase 2 → live-gen via POST /api/insights (loading) → ScoreCard | email-fallback
```

No new persisted state is required for Phase 1 beyond what `/reveal` already writes.
Optional: `insightsViewed` flag in localStorage for analytics (D4) and to avoid re-offering on back-nav.

---

## 3. Data contract

### 3.1 `lib/walli_scores.json` (keyed by slug — D6)

```jsonc
{
  "guillermo-de-lella-1234": {
    "slug": "guillermo-de-lella-1234",
    "overall": 62,                       // mean of SCORED dims only (withheld excluded) — R5
    "dimensions": {
      "discoverability": {
        "score": 70,                     // 0–100, or null = withheld (R8)
        "bullets": [
          { "point": "Your VIOOH stack lists 1,200+ UK screens buyers can filter live.",
            "evidence": "viooh.com/inventory", "verified": true }
        ],
        "lowConfidence": false           // true = fewer than 3 grounded bullets
      },
      "easeOfPurchase": { "score": 55, "bullets": [ /* … */ ], "lowConfidence": false },
      "measurement":    { "score": null, "bullets": [], "lowConfidence": true }  // withheld
    },
    "summary": "Your biggest opportunity is Measurement — buyers can't yet see proof you delivered.",
    "sourceCount": 11,                   // unique grounded domains across dims — trust line (R8)
    "generatedAt": "2026-06-01",
    "model": "gemini-2.5-flash"
  }
}
```

- **Dimension keys are canonical** and shared via `lib/insights.js` (`DIMENSIONS = ['discoverability','easeOfPurchase','measurement']`) so client, builder, and email never drift (mirrors how `lib/match-select.mjs` is shared today).
- `score: null` ⇒ withheld; renderer shows "—" + note. Never emit a fabricated number.

### 3.2 `lib/insights.js` (shared helpers)

```js
export const DIMENSIONS = [
  { key: 'discoverability', label: 'Discoverability' },
  { key: 'easeOfPurchase',  label: 'Ease of Purchase' },
  { key: 'measurement',     label: 'Measurement' },
];

import scores from '@/lib/walli_scores.json';
export function getInsightForSlug(slug)  { return slug ? scores[slug] || null : null; }
export function isInsightAvailable(slug) { return Boolean(getInsightForSlug(slug)); }   // R4 gate
export function computeOverall(dims) {     // R5: mean of scored only
  const vals = DIMENSIONS.map(d => dims?.[d.key]?.score).filter(s => typeof s === 'number');
  return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
}
```

### 3.3 `POST /api/insights` (Phase 2 live-gen) contract

```
Request:  { slug, name, company, role, linkedinUrl }
Response: 200 { insight: <same shape as a walli_scores.json entry> }
          202 { status: 'queued' }            // too slow → will email (R11a/R12)
          422 { error: 'ungrounded' }         // nothing could be grounded → no score
Server timeout budget ≤ 25s (R11a); on exceed, return 202 + enqueue email job.
```

---

## 4. The precompute pipeline (`scripts/build-walli-scores.mjs`)

Productionise `score-mockup.mjs` from "one hard-coded PROFILE" → "loop over the attendee list":

1. **Input:** the RSVP/attendee list with slug + name + company + role + linkedinUrl. Source from
   `lib/twin_index.json` (already slug-keyed) and/or `lib/pool_index.json` (D7 picks the set).
2. **Per attendee:** run the 3 isolated, grounded, sequential Gemini calls (reuse
   `dimensionPrompt`, `scoreWithRetry`, `verifyBullets`, `validateDimension`, `BANNED_PHRASES`
   verbatim from `score-mockup.mjs` — factor them into `scripts/lib/score-core.mjs` so the
   script and a future `/api/insights` share one implementation).
3. **Assemble** the §3.1 entry (compute `overall` via the shared `computeOverall`, dedupe source
   domains for `sourceCount`).
4. **Write** `lib/walli_scores.json` (so it's bundled & offline-safe at the booth, like
   `twin_matches.json`). **Resumable + idempotent** (skip slugs already present unless `--force`),
   `--limit N`, `--rpm`, `--concurrency`, honouring the same rate-limit lessons as
   `generate-match-reasons.mjs` (the grounded endpoint 429s under parallel load → sequential +
   spacing, as `score-mockup.mjs` already does with its 4s gap).
5. **npm script:** add `"build:walli-scores": "node scripts/build-walli-scores.mjs"`.

> Cost note: grounded Gemini, 3 calls/attendee. Size the run to the **booth-reachable** set first
> (RSVP + WOO attendees), not the full 982 pool (D7). Add to the email-cost/quota doc that's
> already a TODO in `AGENT_WALLI_STATUS.md`.

---

## 5. Rendering & branding

- `components/twin-reveal/ScoreCard.js` reuses the booth tokens (`mw-navy-*`, `mw-gold-antique`,
  `mw-blue-electric`) and `WalliAvatar` (pose `thinking` for analysis, `presenting` for the
  result). **No mystical theme.** Port the *structure* of `score-mockup.mjs`'s `dimensionRow`
  (label, score, bar, ≤3 bullets, withheld/low-confidence notes) into a React component, but
  **rewrite the voice** (heading, eyebrow, trust line) per PRD §6.
- `lib/insights-copy.js` exports the strings and `assertNoMysticalCopy(str)` (regex blocklist:
  `/oracle|prophe|fortune|the cards|mystic|crystal ball/i`) used by a unit test (AC7) and,
  defensively, at render of any model-produced summary.

---

## 6. Config / flags (`lib/event-config.js` + `.env`)

| Var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_INSIGHTS_ENABLED` | `false` (Phase 1 ships behind a flag → AC9) | Master on/off for the offer + screen. |
| `NEXT_PUBLIC_INSIGHTS_LIVE_GEN` | `false` | Phase 2: allow live-gen for walk-ins (D3). |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` | — | Grounded scoring (precompute + live-gen). |
| `GEMINI_MODEL_NAME` | `gemini-2.5-flash` | Scoring model. |

`NEXT_PUBLIC_*` are build-time → rebuild/restart to apply (same caveat as the other booth flags
in `AGENT_WALLI_STATUS.md §5`).

---

## 7. Failure modes & handling

| Scenario | Handling | Req |
|---|---|---|
| No precomputed score, live-gen off | **Don't show the offer**; CTA → `/concierge` as today. | R4/AC5 |
| Some dimensions ungrounded | Withhold those (`score:null`, "—" + note); overall = mean of the rest. | R8/AC6 |
| All dimensions ungrounded | Treat as "no score" (R4) — no offer / no screen. | R8 |
| Live-gen slow/fails (Phase 2) | Timeout ≤25s → 202 → email fallback; never spin/dead-end. | R11a/R12 |
| Attendee lands on `/insights` with no slug | `router.replace('/select-name')` (same guard as `/reveal`, `/concierge`). | — |
| Score present but malformed | `getInsightForSlug` returns it; `ScoreCard` defends each field; missing → skip row. | — |
| Back from `/insights` | Return to `/reveal`, selection intact (selection lives in localStorage). | AC8 |
| Flag off | No code path entered; flow byte-identical to today. | AC9 |

---

## 8. Build / rollout plan

1. **Scaffolding (no behaviour change):** add `lib/insights.js`, `lib/insights-copy.js`, the flag
   (default off), and `lib/walli_scores.json` (can start as `{}`). Ship — flow unchanged (AC9).
2. **Precompute:** factor `scripts/lib/score-core.mjs` out of `score-mockup.mjs`; add
   `scripts/build-walli-scores.mjs`; run over the RSVP/WOO set → populate `lib/walli_scores.json`.
   Spot-check for hallucinations (reuse the sub-agent audit approach from `AGENT_WALLI_STATUS.md §2`).
3. **UI:** `ScoreCard.js`, `InsightOffer.js`, `app/insights/page.js`; wire the `/reveal` CTA behind
   the flag. Manual test per AC1–AC9 with `NEXT_PUBLIC_INSIGHTS_ENABLED=true`.
4. **Enable** for internal testing (the 30 May "begin testing today/tomorrow" cadence), then event.
5. **Phase 2:** `/api/insights` live-gen + `scorecard` email template + `lookupScore` slug
   migration. **Phase 3:** self-assessment side-by-side.

### Testing notes (consistent with `AGENT_WALLI_STATUS.md §7`)
- Demo path: `npm run dev` → `/select-name` → **Guillermo De Lella** → `/reveal` → CTA → offer →
  `/insights`. Seed Guillermo's entry in `lib/walli_scores.json` for a fully-populated demo.
- Keep `EMAIL_TEST_MODE=true` while testing the Phase-2 email path so no real inbox is hit.
- Don't run `next build` against a running `next dev` (corrupts `.next`).

---

## 9. Reuse map (don't reinvent)

| Need | Reuse |
|---|---|
| Grounded scoring + 3-layer guard | `scripts/score-mockup.mjs` (→ extract to `scripts/lib/score-core.mjs`). |
| Static, offline data load by slug | Pattern of `lib/twin_matches.json` import in `app/reveal/page.js`. |
| Shared logic across client + script + api | Pattern of `lib/match-select.mjs` (one impl, two callers). |
| Email delivery + test-mode reroute | `app/api/send-email/route.js` `resolveDelivery()` + `lookupScore()`. |
| Step navigation + slug guard | `app/concierge/page.js` / `app/reveal/page.js` `useEffect` guards. |
| Avatar / tokens / dialog | `WalliAvatar.js`, `tailwind.config.js` booth tokens, `@radix-ui/react-dialog`. |

---

## 10. Risks

- **R-LATENCY:** grounded scoring is slow (~tens of seconds). Mitigation: precompute (Phase 1);
  live-gen is opt-in + timeout + email fallback (Phase 2).
- **R-COST/QUOTA:** grounded Gemini per attendee; AI-Studio free tier rate-limits (see the
  match-reasons lesson in `AGENT_WALLI_STATUS.md §2` — sequential + spacing, or Vertex).
- **R-FUNNEL:** the insight could distract from the intro. Mitigation: opt-in, skippable, and
  "Continue to my intros" is the primary CTA on `/insights` (M2 watches this).
- **R-BRAND:** accidental mystical copy leaking from `score-mockup.mjs`. Mitigation:
  `assertNoMysticalCopy` lint + AC7 test.
- **R-DATA-DRIFT:** two dimension names / two score keys. Mitigation: resolve D5/D6 up front;
  centralise in `lib/insights.js`.
```
