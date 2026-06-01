# Gemini Match Reason + Talking Points — Implementation Plan

_Last updated: 2026-05-30 · Branch: `integration/woo-e2e`_

Generate, per matched pair, a **one-line reason** they should meet + **3 concrete
talking points**, using **Gemini 3.1 Flash-Lite** with structured (JSON-schema)
output. Replaces the deterministic `reasonFor()` reason and fills the currently-empty
`talkingPoints` for everyone (today only Guillermo has them).

---

## Decisions (locked)

- **Model:** `gemini-3.1-flash-lite` via the new **`@google/genai`** SDK, JSON-schema structured output.
- **Profile payload:** curated-rich — bio + top 3 experiences + top ~6 activity titles + article titles + headline/occupation/industry/country. Strips PII (`personal_emails`, `personal_numbers`) and noise (`people_also_viewed`, `recommendations`, `similarly_named_profiles`, `follower_count`, `inferred_salary`, logos/URLs). `skills` is 0% populated → skipped.
- **Scope:** both batch (453 precomputed) **and** live walk-ins.
- **Live UX:** block until ready — generate before navigating to `/reveal`.
- **No live re-fetch for matches.** Matches are always pool members, so their profile is already stored. Live EnrichLayer fetch stays only for the source walk-in (existing logic).
- **Fallback:** on Gemini error/timeout → deterministic `reasonFor()` + `talkingPoints: []`. Never block the reveal.

## Data reality

- Raw EnrichLayer profiles for the **453-person pool** are stored at `scripts/output/linkedin-profiles/<slug>/profile_data.json` (~21KB each, full).
- `lib/match_embeddings.json` kept only vector + metadata (name/role/company/country/linkedinUrl/headshotUrl/slug) — **not** profile text.
- Field coverage across 453: headline/occupation ~100%; summary 55% (median 562 chars); experiences-with-description 63% (median 6 roles); **activities (posts/reshares) 84%, median 19 ← richest signal**; articles 14%; skills 0%.
- Matches always come from this pool ⇒ both sides of every pair have rich data available.

## Output contract (no UI changes)

Fills the two fields `components/twin-reveal/MatchCard.js` already renders:
- `matchReason: string` — one line, rendered as a pill.
- `talkingPoints: string[]` — exactly 3, rendered as bullets (shown only when length > 0).

## Files

**New** (all built)
1. `lib/profile-extract.mjs` — `extractProfileForLLM(rawProfile)` → `{ headline, occupation, industry, country, bio, experiences:[{title,company,years,description}]×≤3, activities:[title]×≤6, articles:[title] }`. Omits PII + noise by construction. (Name dropped — passed separately by callers.)
2. `lib/match-reasons.mjs` — `generateReasonAndPoints(source, match)` (each = curated profile + `{name, slug}`): build prompt → Gemini call → parse structured JSON → `{ reason, talkingPoints }`. try/catch → `null` so callers fall back. In-memory cache by `(sourceSlug, matchSlug)`.
3. `scripts/build-match-profiles.mjs` → `lib/match_profiles.json` — `{ [slug]: curatedProfile }` for the pool (434 of 452 have a saved scrape), so `/api/match` has match profiles at runtime without reading `scripts/output/`. No API key needed.
4. `scripts/generate-match-reasons.mjs` — the costly Gemini pass. Writes two **merge-files** the build folds in non-destructively (mirrors the existing handwritten-talking-points pattern): `lib/twin_match_reasons.json` (`{sourceSlug:{matchSlug:reason}}`) + `lib/twin_talking_points.json` (`{sourceSlug:{matchSlug:[points]}}`). Resumable (skips done pairs), `--limit N`, `--force`, `--concurrency N` (default 5). ~1,239 eligible pairs.

**Modified**
5. `scripts/build-twin-matches.mjs` — merges `lib/twin_match_reasons.json` (new `applyReasons`) alongside the existing talking-points merge; reports `gemini reasons applied`.
6. `app/api/match/route.js` — cached `getProfiles()` loader; after scoring, generate reason+points for the top 3 **in parallel** (`Promise.all`), overriding `matchReason`/`talkingPoints`; fall back to `reasonFor()` + `[]` on `null` or missing curated profile.
7. `.env.example` — added `GEMINI_MATCH_MODEL=gemini-3.1-flash-lite`.
8. `package.json` — added `@google/genai` (^2.7.0) + `build:match-profiles` / `generate:match-reasons` scripts. Deprecated `@google/generative-ai` left in place for the fortune/archetype endpoints (no migration).

## Gemini call (verified syntax)

```js
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: process.env.GEMINI_MATCH_MODEL ?? "gemini-3.1-flash-lite",
  contents: buildPrompt(sourceCurated, matchCurated),
  config: {
    responseMimeType: "application/json",      // required with responseJsonSchema
    responseJsonSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "<= ~12 words, warm, specific, why they should meet" },
        talkingPoints: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
      },
      required: ["reason", "talkingPoints"],
      propertyOrdering: ["reason", "talkingPoints"],
    },
    thinkingConfig: { thinkingBudget: 0 },  // thinking OFF — see latency note below
    temperature: 0.7,
  },
});
const { reason, talkingPoints } = JSON.parse(response.text);
```

System instruction: "Both attend WOO London; they're from different markets/companies.
Write one warm, specific reason to meet and exactly 3 concrete talking points, grounded
ONLY in the facts given. No fabrication; prefer their recent activity/posts."

**Latency finding (measured):** thinking enabled (`thinkingLevel: low` or default) averages
~4s with 9–12s tail spikes; `thinkingBudget: 0` gives a steady ~1.3s/call with no real
quality loss here. Live path runs the 3 matches in parallel → ~3s total.

## How to run (batch)

```
node scripts/build-match-profiles.mjs        # → lib/match_profiles.json (no API key)
node scripts/generate-match-reasons.mjs      # the ~1,239-pair Gemini pass (needs GEMINI_API_KEY)
node scripts/build-twin-matches.mjs          # folds reasons + points into lib/twin_matches.json
```
`generate-match-reasons.mjs` is resumable and non-destructive (`--limit N` to sample,
`--force` to regenerate). Live walk-ins generate on the fly in `/api/match`.

## Build / rollout sequence (DONE)

1. `lib/profile-extract.mjs` + verify on real stored profiles (no PII leak, activities present).
2. Build `lib/match_profiles.json`; spot-check size + coverage.
3. `lib/match-reasons.mjs`; dry-run 3–5 known pairs (incl. Guillermo) — compare vs handwritten.
4. Wire batch (`build-twin-matches.mjs`), run all 453 with cache; sample-review.
5. Wire live (`/api/match`); end-to-end walk-in test + simulate fallback (bad key → deterministic reason still shows).

## Cost / latency

Batch: ~453 pairs, one-time + cached. Live: 3 calls per walk-in, blocking ~1–2s on the
"finding matches" screen. Flash-Lite is the cheap/fast tier → per-walk-in cost negligible.

## Sources

- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- https://ai.google.dev/gemini-api/docs/structured-output
- https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html
