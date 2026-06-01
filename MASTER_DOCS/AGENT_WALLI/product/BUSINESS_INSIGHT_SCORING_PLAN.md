# Business Insight Scoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the existing grounded scoring engine (`scripts/score-mockup.mjs`) into a live, async, email-delivered "what Agent WALLi found about your business" feature: 5 dimensions scored 0–100 with cited bullets, each mapped to a Moving Walls product, plus a Book a Demo CTA.

**Architecture:** Port the engine to a data-only lib module (`lib/business-scores.mjs`), add a dimension→product mapping, render the report as a new `businessInsight` email template, and trigger it from a `POST /api/business-insight` route that returns `202` immediately and finishes the ~5-call grounded research after the response via Next.js `after()`. The concierge submit fires this non-blocking; the confirmation screen shows a teaser line.

**Tech Stack:** Next.js 15.3.8 App Router (Node runtime, `after()`), `@google/generative-ai` SDK with Google Search grounding (`gemini-2.5-flash`), Resend email.

**Spec:** [`BUSINESS_INSIGHT_SCORING.md`](./BUSINESS_INSIGHT_SCORING.md). Read it before starting — especially §3 (dimension boundaries) and §4 (what to keep vs change in the engine).

**No test framework:** this repo has no jest/vitest. Verification is via runnable `node scripts/*.mjs` harnesses and hitting routes with `EMAIL_TEST_MODE=true`. Each task's verification step reflects that.

---

## File structure

- **Create** `lib/business-scores.mjs` — the ported engine. Exports `scoreBusiness(profile)`. Data only (no email, no console, no `main`).
- **Create** `lib/business-score-mapping.mjs` — `DIMENSION_PRODUCT` map (dimension key → `{ product, why }`).
- **Create** `scripts/test-business-score.mjs` — runnable harness that scores one profile and prints results (Phase 1 verification).
- **Modify** `app/api/send-email/route.js` — add `businessInsightHtml` template + register in `BOOTH_TEMPLATES`.
- **Create** `app/api/business-insight/route.js` — validate → `202` → `after()` → `scoreBusiness` → send email; fallback on failure.
- **Modify** `app/concierge/page.js` — fire the insight job non-blocking in `handleSubmit`.
- **Modify** `app/confirmation/page.js` — add the teaser line.

---

## Task 1: Port the scoring engine to `lib/business-scores.mjs` (5 dimensions, data-only)

**Files:**
- Create: `lib/business-scores.mjs`
- Reference (copy verbatim from): `scripts/score-mockup.mjs`

- [ ] **Step 1: Create `lib/business-scores.mjs` with the static setup, RULES, and 5-dimension definitions**

```js
/**
 * Grounded media-owner scorer — adapted from scripts/score-mockup.mjs into an
 * app-callable, data-only module. Scores ONE business across 5 dimensions using
 * isolated, Google-Search-grounded Gemini calls (one per dimension), with the
 * mockup's three anti-hallucination layers intact. Returns data only — the caller
 * (app/api/business-insight/route.js) handles email delivery.
 *
 * See MASTER_DOCS/AGENT_WALLI/product/BUSINESS_INSIGHT_SCORING.md §3–§4.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_SCORE_MODEL || 'gemini-2.5-flash';

const DIMENSIONS = {
  discoverability: {
    label: 'Discoverability',
    question: 'How easily can buyers — and AI assistants — FIND this media owner and their inventory online?',
    inScope:
      'Search-engine and AI visibility; quality and clarity of their website; whether their screens / locations / inventory are publicly listed, described and indexed; presence in OOH directories and listings.',
    outOfScope:
      'Do NOT mention how to BOOK or BUY the inventory, programmatic / SSP / DSP connectivity, marketplaces, pricing, or audience measurement. Those are scored by other dimensions — ignore them entirely here.',
    high: 'Easy to find on Google / AI; inventory and locations clearly listed and indexed.',
    low: 'Effectively invisible online; no findable inventory or location data.',
  },
  easeOfPurchase: {
    label: 'Ease of Booking',
    question: 'How easily can a buyer transact DIRECTLY — self-serve booking, packaged deals, a marketplace storefront, transparent pricing?',
    inScope:
      'Direct and self-serve booking (their own portal or a marketplace storefront); packaged deals / rate cards; transparent, accessible pricing; how simply a buyer goes from interest to a confirmed booking without manual back-and-forth.',
    outOfScope:
      'Do NOT mention programmatic connectivity, SSP/DSP, exchanges, PMP, or external ad-platform integration (scored by Programmatic Readiness). Do NOT mention findability (Discoverability) or any audience/measurement data. Ignore those entirely here.',
    high: 'Self-serve booking and/or marketplace storefront with packaged deals and transparent pricing.',
    low: 'Manual only (email/phone); no self-serve booking, no published pricing.',
  },
  measurement: {
    label: 'Measurement',
    question: 'Does this media owner PROVE what a campaign DELIVERED after it ran?',
    inScope:
      'Post-campaign proof: audience / impression data and methodology; third-party verification or auditing; attribution and post-campaign reporting; the data points they hand a buyer to prove delivery.',
    outOfScope:
      'This is POST-campaign delivery proof. Do NOT mention first-party / audience data used to PLAN or target a campaign (that is Audience Intelligence). Do NOT mention findability, booking, or programmatic plumbing. Ignore those entirely here.',
    high: 'Provides robust, third-party-verified audience data and clear post-campaign reporting.',
    low: 'No data; gut-feel reach claims only.',
  },
  programmaticReadiness: {
    label: 'Programmatic Readiness',
    question: 'How ready is this media owner for PROGRAMMATIC activation?',
    inScope:
      'Their SSP and the DSPs / demand partners they connect to; exchange / PMP / programmatic-guaranteed support; integration with external ad platforms; automated programmatic activation pipelines.',
    outOfScope:
      'Do NOT mention findability (Discoverability), direct/self-serve booking UX (Ease of Booking), or any audience/measurement data (Measurement, Audience Intelligence). Ignore those entirely here.',
    high: 'Tradable programmatically via major SSP/DSPs, exchanges and PMPs; integrated with external ad platforms.',
    low: 'No programmatic connectivity; not present in any exchange or DSP.',
  },
  audienceIntelligence: {
    label: 'Audience Intelligence',
    question: 'How well does this media owner use first-party / location / audience DATA to PLAN and price campaigns (pre-campaign)?',
    inScope:
      'First-party data assets; audience segmentation and profiling; location / movement data; data-driven planning and pricing; insights or intelligence products offered to buyers for planning.',
    outOfScope:
      'This is PRE-campaign planning data. Do NOT mention post-campaign proof / attribution / reporting (that is Measurement). Do NOT mention findability, booking, or programmatic plumbing. Ignore those entirely here.',
    high: 'Rich first-party / location data driving audience planning and pricing; insights products for buyers.',
    low: 'No audience data; inventory sold on location/price alone with no data story.',
  },
};

const DIM_KEYS = ['discoverability', 'easeOfPurchase', 'measurement', 'programmaticReadiness', 'audienceIntelligence'];
```

- [ ] **Step 2: Append the verbatim machinery copied from `score-mockup.mjs`**

Copy these blocks **exactly** from `scripts/score-mockup.mjs` (line ranges given) into `lib/business-scores.mjs`, in this order. They are unchanged:

- `BANNED_PHRASES` — lines **97–103**
- `RULES` — lines **132–144**
- `extractJson` — lines **146–154**
- `validateDimension` — lines **177–188**
- `norm` and `sigWords` — lines **194–195**
- `verifyBullets` — lines **197–212**
- `scoreWithRetry` — lines **218–246**

Then add the Gemini client setup (replaces mockup lines 116–121, with the key check guarding the call instead of `process.exit`):

```js
let _model;
function model() {
  if (_model) return _model;
  if (!API_KEY) throw new Error('Set GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) for business scoring.');
  const genAI = new GoogleGenerativeAI(API_KEY);
  _model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.3 },
  });
  return _model;
}
```

Note: the verbatim `ask(prompt)` (mockup lines 157–174) references a module-level `model`. Change its first line from `const result = await model.generateContent(prompt);` to `const result = await model().generateContent(prompt);` so it uses the lazy getter. Copy the rest of `ask` verbatim.

- [ ] **Step 3: Add the profile-driven prompt builder and the `scoreBusiness` export**

These replace the mockup's `profileBlock` const (123–129), `dimensionPrompt` (249–266), and `scoreDimensions` (272–305). Everything email/console/`PROFILE`/`SEND_TO`/`main` from the mockup is **omitted**.

```js
function profileBlock(p) {
  return [
    `- Name: ${p.fullName || 'Unknown'}`,
    p.title ? `- Title: ${p.title}` : '',
    `- Company: ${p.company || 'Unknown'}`,
    p.region ? `- Region: ${p.region}` : '',
    p.linkedinUrl ? `- LinkedIn: ${p.linkedinUrl}` : '',
    p.context ? `- Known context: ${p.context}` : '',
  ].filter(Boolean).join('\n');
}

function dimensionPrompt(key, profile) {
  const d = DIMENSIONS[key];
  return `You are auditing an out-of-home (OOH) MEDIA OWNER for Moving Walls using live Google Search.

Research this person and their company:
${profileBlock(profile)}

You are scoring ONE dimension only: ${d.label}.
WHAT IT MEASURES: ${d.question}
IN SCOPE: ${d.inScope}
OUT OF SCOPE: ${d.outOfScope}
SCORE 0–100, where high (≈90) = ${d.high} and low (≈20) = ${d.low}. Give EXACTLY 3 bullets.

${RULES}

Return ONLY raw JSON:
{ "score": 0-100, "bullets": [ {"point":"...","evidence":"..."}, {"point":"...","evidence":"..."}, {"point":"...","evidence":"..."} ] }`;
}

/**
 * Score one business across all 5 dimensions in isolated, SEQUENTIAL grounded
 * calls (4s spacing — the grounded endpoint 429s and drops citations under
 * parallel load; do NOT parallelise). Returns data only.
 *
 * @param {{fullName?:string,title?:string,company?:string,region?:string,linkedinUrl?:string,context?:string}} profile
 * @returns {Promise<{scores:object, sources:Array, queries:string[], summary:string|null}>}
 *   `scores` is keyed by dimension; each is { score:number|null, bullets:[{point,evidence,verified,groundedBy}], lowConfidence, _groundingSources }.
 * @throws if EVERY dimension is withheld (nothing grounded) — caller sends the fallback email.
 */
export async function scoreBusiness(profile) {
  const settled = [];
  for (const key of DIM_KEYS) {
    try {
      const r = await scoreWithRetry(dimensionPrompt(key, profile), (p) => validateDimension(DIMENSIONS[key].label, p));
      settled.push([key, r]);
    } catch {
      settled.push([key, { parsed: { score: null, bullets: [], _ungrounded: true }, sources: [], queries: [], lowConfidence: true }]);
    }
    await new Promise((res) => setTimeout(res, 4000));
  }

  const out = {};
  let sources = [];
  let queries = [];
  for (const [key, r] of settled) {
    out[key] = r.parsed;
    out[key].label = DIMENSIONS[key].label;
    out[key].lowConfidence = r.lowConfidence;
    out[key]._groundingSources = r.sources.map((s) => s.domain);
    sources = sources.concat(r.sources);
    queries = queries.concat(r.queries);
  }

  const scored = DIM_KEYS.filter((k) => typeof out[k].score === 'number');
  if (!scored.length) throw new Error('All dimensions withheld — no grounded evidence found.');

  const lowest = [...scored].sort((a, b) => out[a].score - out[b].score)[0];
  const summary = `Your lowest-scoring area is ${DIMENSIONS[lowest].label} (${out[lowest].score}/100) — the fastest place to win back buyers.`;

  return { scores: out, sources, queries, summary, weakestKey: lowest };
}

export { DIM_KEYS, DIMENSIONS };
```

- [ ] **Step 4: Verify the module loads and exports cleanly**

Run: `node -e "import('./lib/business-scores.mjs').then(m => console.log('exports:', Object.keys(m), '| dims:', m.DIM_KEYS.length))"`
Expected: `exports: [ 'scoreBusiness', 'DIM_KEYS', 'DIMENSIONS' ] | dims: 5` (order may vary). No import/syntax errors.

- [ ] **Step 5: Commit**

```bash
git add lib/business-scores.mjs
git commit -m "feat(score): port grounded scorer to lib/business-scores.mjs, extend to 5 dimensions"
```

---

## Task 2: Dimension → product mapping (`lib/business-score-mapping.mjs`)

**Files:**
- Create: `lib/business-score-mapping.mjs`

- [ ] **Step 1: Create the mapping module**

```js
/**
 * Maps each scoring dimension to the Moving Walls product that addresses a gap
 * there. Source of truth: MASTER_DOCS/MW_PRODUCT_LINEUP.md. The route builds the
 * email's recommendation from the WEAKEST scored dimension.
 */
export const DIMENSION_PRODUCT = {
  discoverability: {
    product: 'MW Market',
    why: 'List your inventory in a self-serve marketplace so brands — and AI assistants — can find and buy it as easily as social media.',
  },
  easeOfPurchase: {
    product: 'MW Studio',
    why: 'Stand up self-serve booking, content and player management so buyers can transact directly without manual back-and-forth.',
  },
  measurement: {
    product: 'MW Measure',
    why: 'Give advertisers proof of performance — audience, attribution and post-campaign reporting — as a value-added service.',
  },
  programmaticReadiness: {
    product: 'MW Activate',
    why: 'Plug your inventory into global programmatic demand through SSP/DSP and marketplace connectivity.',
  },
  audienceIntelligence: {
    product: 'MW Science',
    why: 'Turn first-party and location data into audience planning and insights that shape smarter campaigns.',
  },
};

/** Build the recommendation object from a weakest-dimension key. Returns null if unknown. */
export function recommendationFor(weakestKey, label) {
  const m = DIMENSION_PRODUCT[weakestKey];
  if (!m) return null;
  return { dimensionKey: weakestKey, dimensionLabel: label || weakestKey, product: m.product, why: m.why };
}
```

- [ ] **Step 2: Verify it loads and covers all 5 keys**

Run:
```bash
node -e "Promise.all([import('./lib/business-scores.mjs'),import('./lib/business-score-mapping.mjs')]).then(([s,m])=>{const miss=s.DIM_KEYS.filter(k=>!m.DIMENSION_PRODUCT[k]);console.log(miss.length?('MISSING: '+miss):'all 5 dimensions mapped')})"
```
Expected: `all 5 dimensions mapped`

- [ ] **Step 3: Commit**

```bash
git add lib/business-score-mapping.mjs
git commit -m "feat(score): add dimension->product mapping"
```

---

## Task 3: Runnable scoring harness (`scripts/test-business-score.mjs`)

**Files:**
- Create: `scripts/test-business-score.mjs`

This is the Phase-1 verification artifact (mirrors `node scripts/*.mjs` convention). It calls the real grounded engine for one business and prints scores + sources, so the engine can be validated before any wiring.

- [ ] **Step 1: Create the harness**

```js
/**
 * Manual check for lib/business-scores.mjs — scores ONE business with the live
 * grounded engine and prints results. NOT wired into the app.
 * RUN:  node scripts/test-business-score.mjs
 * REQUIRES in .env: GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY)
 */
import 'dotenv/config';
import { scoreBusiness, DIM_KEYS } from '../lib/business-scores.mjs';

const PROFILE = {
  fullName: 'Sean Reilly',
  title: 'Chief Executive Officer',
  company: 'Lamar Advertising Company',
  region: 'USA',
  linkedinUrl: 'https://www.linkedin.com/company/lamar-advertising-company/',
  context: 'One of the largest OOH advertising companies in the US; billboard, transit and airport inventory; large digital (DOOH) network.',
};

const { scores, sources, summary } = await scoreBusiness(PROFILE);
for (const k of DIM_KEYS) {
  const d = scores[k];
  console.log(`\n${d.label}: ${d.score ?? '— (withheld)'}${d.lowConfidence && d.score != null ? ' (low confidence)' : ''}`);
  (d.bullets || []).forEach((b) => console.log(`  ${b.verified ? '✓' : '⚠'} ${b.point}  [${(b.groundedBy || []).join(', ') || b.evidence || 'no source'}]`));
}
console.log(`\nSUMMARY: ${summary}`);
console.log(`Total sources: ${sources.length}`);
```

- [ ] **Step 2: Add an npm script**

In `package.json` `scripts`, add (matching the existing `generate:match-reasons` style):
```json
"test:business-score": "node scripts/test-business-score.mjs"
```

- [ ] **Step 3: Run it and confirm grounded output**

Run: `npm run test:business-score`
Expected: 5 dimension blocks print with numeric scores (0–100) and mostly `✓` cited bullets with source domains, plus a `SUMMARY` line naming the weakest dimension and `Total sources` > 0. (Withheld dimensions show `—`; that's acceptable as long as not all five are withheld.)

- [ ] **Step 4: Commit**

```bash
git add scripts/test-business-score.mjs package.json
git commit -m "test(score): add runnable business-score harness"
```

---

## Task 4: `businessInsight` email template + fallback

**Files:**
- Modify: `app/api/send-email/route.js` (add template fn before the `BOOTH_TEMPLATES` map at line ~259; register in the map)

- [ ] **Step 1: Add the rebranded scorecard template function**

Insert this function in `app/api/send-email/route.js` just above `const BOOTH_TEMPLATES = {` (line ~259). It adapts the mockup's `buildScorecardHtml`/`dimensionRow`/`fullEmailHtml` (lines 314–399) but **rebranded** from the fortune theme to Agent WALLi, and adds the recommendation + Book a Demo CTA. Dimension order is fixed.

```js
// ----- Business Insight scorecard (Agent WALLi market read) -----
const BI_NAVY = '#151E43';
const BI_LIGHT = '#5BADDE';
const BI_GOLD = '#FEDA24';
const BI_DIM_ORDER = ['discoverability', 'easeOfPurchase', 'measurement', 'programmaticReadiness', 'audienceIntelligence'];
const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL || 'https://www.movingwalls.com/contact';

function biEscape(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function biClamp(n) { return Math.max(0, Math.min(100, Number(n) || 0)); }

function biDimensionRow(dim) {
  const withheld = typeof dim?.score !== 'number';
  const pct = biClamp(dim?.score);
  const scoreCell = withheld
    ? `&mdash;<span style="font-size:11px;color:#8aa0c8;"> /100</span>`
    : `${pct}<span style="font-size:11px;color:#8aa0c8;">/100</span>`;
  const note = withheld
    ? `<li style="margin:7px 0;color:${BI_GOLD};font-size:13px;line-height:1.45;">Couldn't verify this against live sources — score withheld.</li>`
    : '';
  const items = (dim?.bullets || [])
    .map((b) => `<li style="margin:7px 0;color:#dce6f7;font-size:13px;line-height:1.45;">${biEscape(b.point)}</li>`)
    .join('') + note;
  return `
    <div style="margin:22px 0;">
      <table width="100%" style="border-collapse:collapse;"><tr>
        <td style="text-align:left;font-weight:700;color:${BI_GOLD};font-size:15px;letter-spacing:.3px;">${biEscape(dim?.label || '')}</td>
        <td style="text-align:right;font-weight:700;color:#ffffff;font-size:18px;">${scoreCell}</td>
      </tr></table>
      <div style="background:rgba(255,255,255,0.09);border-radius:20px;height:9px;margin:8px 0;overflow:hidden;">
        <div style="width:${withheld ? 0 : pct}%;height:9px;background:${BI_LIGHT};border-radius:20px;"></div>
      </div>
      <ul style="margin:6px 0 0;padding-left:18px;">${items}</ul>
    </div>`;
}

function businessInsightHtml({ fullName, title, company, region, scores, summary, recommendation, sourceCount, fallback }) {
  const firstName = (fullName || '').split(' ')[0] || 'there';
  const demoBtn = `
    <div style="text-align:center;margin:26px 0 6px;">
      <a href="${DEMO_URL}" style="display:inline-block;background:${BI_GOLD};color:${BI_NAVY};font-weight:800;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:10px;">Book a Demo</a>
    </div>`;

  if (fallback || !scores) {
    return biShell(`
      <div style="padding:30px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:12px;letter-spacing:3px;color:${BI_LIGHT};text-transform:uppercase;">Agent WALLi · Market Read</div>
      </div>
      <div style="padding:24px 28px 28px;">
        <p style="color:#c2cfe6;font-size:14px;line-height:1.65;margin:0 0 18px;">Hello ${biEscape(firstName)}, I started pulling a market read on ${biEscape(company || 'your business')} but couldn't gather enough verified detail to score it fairly this time. The Moving Walls team can walk you through it directly.</p>
        ${demoBtn}
        <p style="margin-top:20px;color:#c2cfe6;font-size:13px;">— Agent WALLi, AI Concierge · Moving Walls</p>
      </div>`);
  }

  const scoredKeys = BI_DIM_ORDER.filter((k) => typeof scores[k]?.score === 'number');
  const overall = scoredKeys.length
    ? Math.round(scoredKeys.reduce((s, k) => s + biClamp(scores[k].score), 0) / scoredKeys.length)
    : 0;
  const rows = BI_DIM_ORDER.map((k) => biDimensionRow(scores[k])).join('');
  const trust = sourceCount ? `Backed by ${sourceCount} live web sources` : 'Backed by live web search';
  const rec = recommendation ? `
    <div style="margin-top:22px;padding:16px 18px;background:rgba(91,173,222,0.10);border:1px solid rgba(91,173,222,0.4);border-radius:10px;">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${BI_LIGHT};">Where Moving Walls can help most</p>
      <p style="margin:0;font-size:15px;color:#eaf0fa;"><strong style="color:#fff;">${biEscape(recommendation.product)}</strong> — ${biEscape(recommendation.why)}</p>
    </div>` : '';

  return biShell(`
    <div style="padding:30px 28px 22px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:12px;letter-spacing:3px;color:${BI_LIGHT};text-transform:uppercase;">Agent WALLi · Market Read</div>
      <div style="font-size:24px;font-weight:800;margin-top:10px;color:#ffffff;">${biEscape(company || fullName || '')}</div>
      ${title || region ? `<div style="font-size:13px;color:#9fb2d8;margin-top:3px;">${[biEscape(title), biEscape(region)].filter(Boolean).join(' · ')}</div>` : ''}
    </div>
    <div style="padding:24px 28px 28px;">
      <p style="color:#c2cfe6;font-size:14px;line-height:1.65;margin:0 0 20px;">Hello ${biEscape(firstName)}, here's my data-driven read on ${biEscape(company || 'your business')} across the five dimensions that decide whether your inventory is <em>found</em>, <em>bought</em>, and <em>believed</em>.</p>
      <div style="text-align:center;margin:6px 0 20px;padding:18px;background:rgba(254,218,36,0.06);border:1px solid rgba(254,218,36,0.28);border-radius:12px;">
        <div style="font-size:12px;letter-spacing:2px;color:${BI_GOLD};text-transform:uppercase;">Market Presence Score</div>
        <div style="font-size:50px;font-weight:800;color:#ffffff;line-height:1.05;">${overall}<span style="font-size:18px;color:#7e93bd;">/100</span></div>
      </div>
      ${rows}
      ${summary ? `<p style="margin-top:22px;padding:14px 16px;background:rgba(91,173,222,0.08);border-left:3px solid ${BI_LIGHT};color:#dce6f7;font-size:13px;border-radius:6px;font-style:italic;">${biEscape(summary)}</p>` : ''}
      ${rec}
      ${demoBtn}
      <p style="margin-top:18px;color:#c2cfe6;font-size:13px;">— Agent WALLi, AI Concierge · Moving Walls</p>
      <p style="margin-top:12px;font-size:10px;color:#5e6e92;text-align:center;letter-spacing:.5px;">${biEscape(trust)}</p>
    </div>`);
}

function biShell(inner) {
  return `<!DOCTYPE html><html><head><meta name="color-scheme" content="light dark"></head>
  <body style="margin:0;padding:0;background-color:#0c0e16;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0c0e16;padding:24px;"><tr><td align="center">
      <div style="max-width:600px;margin:auto;text-align:left;background:${BI_NAVY};border:1px solid #2a3566;border-radius:14px;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif;color:#eaf0fa;">
        ${inner}
      </div>
    </td></tr></table>
  </body></html>`;
}
```

- [ ] **Step 2: Register the template in `BOOTH_TEMPLATES`**

Modify the `BOOTH_TEMPLATES` object (line ~259) to add the new key:
```js
const BOOTH_TEMPLATES = {
  twinConfirmation: twinConfirmationHtml,
  salesRepNotification: salesRepNotificationHtml,
  matchIntro: matchIntroHtml,
  businessInsight: businessInsightHtml,
};
```

- [ ] **Step 3: Verify the template renders (no network needed)**

Run:
```bash
node --input-type=module -e "
import fs from 'node:fs';
const src = fs.readFileSync('app/api/send-email/route.js','utf8');
console.log('registered:', /businessInsight:\s*businessInsightHtml/.test(src));
console.log('has fn:', /function businessInsightHtml/.test(src));
"
```
Expected: `registered: true` and `has fn: true`. (Full visual check happens in Task 5 via `EMAIL_TEST_MODE`.)

- [ ] **Step 4: Commit**

```bash
git add app/api/send-email/route.js
git commit -m "feat(email): add rebranded businessInsight scorecard template + Book a Demo CTA"
```

---

## Task 5: `POST /api/business-insight` route (202 + `after()` + send)

**Files:**
- Create: `app/api/business-insight/route.js`

- [ ] **Step 1: Create the route**

```js
import { NextResponse, after } from 'next/server';
import { scoreBusiness } from '@/lib/business-scores.mjs';
import { recommendationFor } from '@/lib/business-score-mapping.mjs';

export const runtime = 'nodejs';
export const maxDuration = 300; // grounded 5-call sequence runs after the response

// Absolute base URL for the internal send-email call (server-to-server).
function baseUrl(request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

async function sendInsightEmail(origin, payload) {
  const res = await fetch(`${origin}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[business-insight] send-email failed', res.status, detail);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { name, company, role, linkedinUrl, email } = body || {};
  if (!email || !email.includes('@')) {
    return NextResponse.json({ message: 'Missing valid email' }, { status: 400 });
  }

  const origin = baseUrl(request);
  const profile = { fullName: name, title: role, company, linkedinUrl };

  // Do the slow grounded research AFTER responding, so the booth flow never waits.
  after(async () => {
    try {
      const { scores, sources, summary, weakestKey } = await scoreBusiness(profile);
      const recommendation = recommendationFor(weakestKey, scores[weakestKey]?.label);
      await sendInsightEmail(origin, {
        template: 'businessInsight',
        emailTo: email,
        testRerouteTo: email,
        subject: `Your market read — ${company || 'Moving Walls'}`,
        fullName: name,
        title: role,
        company,
        scores,
        summary,
        recommendation,
        sourceCount: sources.length,
      });
    } catch (err) {
      console.error('[business-insight] scoring failed, sending fallback:', err.message);
      await sendInsightEmail(origin, {
        template: 'businessInsight',
        emailTo: email,
        testRerouteTo: email,
        subject: `A market read from Agent WALLi`,
        fullName: name,
        company,
        fallback: true,
      });
    }
  });

  return NextResponse.json({ message: 'accepted' }, { status: 202 });
}
```

- [ ] **Step 2: Verify the route returns 202 immediately and triggers an email in test mode**

Set in `.env`: `EMAIL_TEST_MODE=true` (and `EMAIL_TEST_RECIPIENTS=you@example.com` as backstop). Start dev server: `npm run dev`. Then:
```bash
curl -i -X POST http://localhost:3000/api/business-insight \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sean Reilly","company":"Lamar Advertising Company","role":"CEO","linkedinUrl":"https://www.linkedin.com/company/lamar-advertising-company/","email":"you@example.com"}'
```
Expected: `HTTP/1.1 202` returned within ~1s. Then within ~30–60s the dev-server console logs the grounded calls and `[send-email] TEST MODE — rerouting…`, and a `businessInsight` email arrives at `you@example.com` with the rebranded scorecard, recommendation block, and Book a Demo button. A bad payload (`-d '{}'`) returns `400`.

- [ ] **Step 3: Commit**

```bash
git add app/api/business-insight/route.js
git commit -m "feat(api): add business-insight route (202 + after() grounded scoring + email)"
```

---

## Task 6: Fire the insight job from concierge + add the confirmation teaser

**Files:**
- Modify: `app/concierge/page.js` (in `handleSubmit`, after `await Promise.all(emailTasks);` at line ~191, before `router.push('/confirmation')` at line ~196)
- Modify: `app/confirmation/page.js` (the intro copy block, lines ~32–36)

- [ ] **Step 1: Fire the insight job non-blocking in `app/concierge/page.js`**

Immediately after `await Promise.all(emailTasks);` (line ~191) and before persisting the email / navigating, add a fire-and-forget call. It must NOT be awaited and must never throw into the flow:

```js
      // Kick off the async "business insight" research email — fire-and-forget.
      // The route returns 202 instantly and finishes the grounded research via
      // after(); we never block the booth flow on it.
      fetch('/api/business-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ctx.name,
          company: ctx.company,
          role: ctx.role,
          linkedinUrl: ctx.linkedinUrl,
          email,
        }),
      }).catch((err) => console.error('[concierge] insight kickoff failed', err));
```

- [ ] **Step 2: Add the teaser line in `app/confirmation/page.js`**

The page reads attendee data from `localStorage` for `handleReset` but doesn't currently read the company for display. Add a company read and the teaser. Replace the intro paragraph (lines ~32–36):

```jsx
          <p className="text-base text-mw-white/80 leading-relaxed">
            Your intro request is on its way to your inbox.
            <br />
            Drop by the Moving Walls booth and Agent WALLi&apos;s team will make the intro in person.
          </p>
          <p className="mt-4 text-sm text-mw-light-blue leading-relaxed">
            {company
              ? `I've also analysed ${company}'s market presence — your full breakdown is on its way to your inbox.`
              : `I've also analysed your business — your full breakdown is on its way to your inbox.`}
          </p>
```

And add this near the top of the component body (after `const router = useRouter();`, line ~11):
```jsx
  const company =
    typeof window !== 'undefined' ? window.localStorage.getItem('selectedAttendeeCompany') || '' : '';
```

- [ ] **Step 3: Verify the full booth flow end-to-end (test mode)**

With `EMAIL_TEST_MODE=true` and `npm run dev` running, walk the flow in the browser: select a name → reveal → pick matches → concierge → enter your own email → tap **Send me the intros**. Expected:
- The confirmation screen appears immediately (no added wait) and shows the teaser line with the company name.
- The dev console shows the `/api/business-insight` request return `202`, then the grounded scoring logs, then the `businessInsight` email reroutes to your inbox a little later.

- [ ] **Step 4: Commit**

```bash
git add app/concierge/page.js app/confirmation/page.js
git commit -m "feat(booth): fire async business-insight on submit + confirmation teaser"
```

---

## Self-review notes (already reconciled)

- **Spec coverage:** §3 dimensions+boundaries → Task 1; §3 product map → Task 2; §4 engine port → Task 1; §7 email+demo → Task 4; §6 async route → Task 5; §5 teaser + §6 concierge wiring → Task 6. Verification-without-tests (§9) → Task 3 harness + test-mode route/flow checks.
- **Type consistency:** `scoreBusiness` returns `{ scores, sources, queries, summary, weakestKey }` (Task 1) — consumed by the route (Task 5) and `recommendationFor(weakestKey, label)` (Task 2). Each `scores[key]` carries `label`, `score`, `bullets`, `lowConfidence` — consumed by `businessInsightHtml` (Task 4). Internal key `easeOfPurchase` is retained everywhere (label "Ease of Booking" is display-only).
- **Open items carried from spec §9:** real `NEXT_PUBLIC_DEMO_URL` (placeholder default used); confirm `after()`/`maxDuration` covers the full grounded sequence on the deploy target (Task 5 validates locally); do not parallelise the per-dimension calls.
```
