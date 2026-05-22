// POC: scoring + archetype + LLM narrative layer for the WOO booth.
//
// What this proves:
//   1. The deterministic 0–100 math works and discriminates between attendees.
//   2. Archetype is assigned from the *shape* of the 5 sub-scores, not the total
//      — so a 60 with a flat profile reads very differently from a 60 with one
//      hard weakness.
//   3. The weakest sub-score maps cleanly to one MW product recommendation.
//   4. The LLM narrative layer (booth fortune + email intro) can be grounded in
//      the dossier so it doesn't read like generic horoscope text.
//
// Inputs: scripts/output/poc-output.json (from poc-llm-insights.mjs)
// Run:   node scripts/poc-scoring.mjs
//
// For Q1 and Q3 we use the LLM-suggested scores from the dossier (Discoverability
// and Measurement are web-observable). For Q2, Q4, Q5 we use hardcoded mocks —
// in production these come from the attendee tapping the tablet at the booth.

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Free-tier is 5 RPM on gemini-2.5-flash. Throttle to be safe.
const CALL_INTERVAL_MS = 13_000;
let lastCallAt = 0;
async function throttle() {
  const wait = CALL_INTERVAL_MS - (Date.now() - lastCallAt);
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

// Retry on 429/503 with the API's suggested delay (or exponential backoff).
async function withRetry(fn, label, maxAttempts = 4) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await throttle();
      return await fn();
    } catch (e) {
      const msg = e.message || '';
      const is429 = msg.includes('429');
      const is503 = msg.includes('503');
      if (!is429 && !is503) throw e;
      const hint = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
      const delay = hint ? Math.ceil(parseFloat(hint[1]) * 1000) + 500 : 1000 * 2 ** i;
      console.log(`    ${label}: ${is429 ? '429' : '503'}, retry ${i}/${maxAttempts} in ${(delay/1000).toFixed(1)}s`);
      await sleep(delay);
    }
  }
  throw new Error(`${label}: exhausted ${maxAttempts} retries`);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const NARRATIVE_MODEL = process.env.POC_NARRATIVE_MODEL || 'gemini-3-flash-preview';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Dimension order matches the plan's question order.
const DIMENSIONS = [
  { key: 'discoverability', label: 'Discoverability', product: 'Studio'    },
  { key: 'bookability',     label: 'Bookability',     product: 'Market'    },
  { key: 'measurement',     label: 'Measurement',     product: 'Measure'   },
  { key: 'yield',           label: 'Yield / Fill',    product: 'Influence' },
  { key: 'speed',           label: 'Speed',           product: 'Activate'  },
];

// Mock self-reports for Q2, Q4, Q5. These would be booth taps in production.
// Chosen to give each attendee a distinctive *shape* so the archetype logic gets
// exercised.
const MOCK_SELF_REPORTS = {
  'Ocean Outdoor':        { bookability: 4, yield: 4, speed: 3 }, // strong everywhere
  'JCDecaux':             { bookability: 5, yield: 5, speed: 4 }, // top-tier, programmatic-mature
  'Global':               { bookability: 3, yield: 3, speed: 3 }, // solid but flat
  'Clear Channel Europe': { bookability: 4, yield: 4, speed: 3 }, // mid-transition
  'Alight Media':         { bookability: 3, yield: 2, speed: 4 }, // fast, but yield lagging
};

// Archetypes are assigned by shape. Each rule checks the score vector and picks
// the first match — order matters, most-specific first.
const ARCHETYPES = [
  {
    name: 'The Open Vault',
    tagline: 'Anyone can buy you, instantly.',
    match: s => s.discoverability >= 4 && s.bookability >= 4 && s.speed >= 4,
  },
  {
    name: 'The Hidden Gem',
    tagline: 'Premium inventory that buyers struggle to find.',
    match: s => s.discoverability <= 2 && (s.measurement >= 3 || s.yield >= 3),
  },
  {
    name: 'The Measured Operator',
    tagline: 'You prove it. Few of your peers can.',
    match: s => s.measurement >= 4 && s.yield >= 4,
  },
  {
    name: 'The Relationship King',
    tagline: 'Your buyers love you. Your funnel can\'t scale.',
    match: s => s.speed >= 4 && s.discoverability <= 2,
  },
  {
    name: 'The Local Champion',
    tagline: 'Strong at home. Invisible abroad.',
    match: s => s.discoverability >= 3 && s.discoverability <= 4 && s.bookability <= 3,
  },
  {
    name: 'The Sleeping Giant',
    tagline: 'Big footprint, no sharp edges.',
    match: s => Object.values(s).every(v => v >= 2 && v <= 3),
  },
  // Fallback
  {
    name: 'The Climber',
    tagline: 'Mid-mature, still figuring out which edge to sharpen.',
    match: () => true,
  },
];

function computeScore(s, reasoning = {}) {
  // reasoning: { discoverability, measurement } — from grounded dossier.
  // Q2/Q4/Q5 are self-report; their justification is the attendee's own answer.
  const subscores = DIMENSIONS.map(d => ({
    ...d,
    value: s[d.key],
    source: ['discoverability', 'measurement'].includes(d.key) ? 'grounded' : 'self-report',
    rationale: reasoning[d.key] || `Self-reported by attendee at booth (${s[d.key]}/5).`,
  }));
  const total = subscores.reduce((a, b) => a + b.value, 0) * 4;
  const weakest = [...subscores].sort((a, b) => a.value - b.value)[0];
  const archetype = ARCHETYPES.find(a => a.match(s));
  return { total, subscores, weakest, archetype };
}

const fortunePrompt = (a, dossier, score, archetype, weakest) => `
You are writing the booth-reveal "fortune" for a Moving Walls satellite event at WOO Forum. Tarot-flavoured but operationally grounded — no zodiac, no "the stars say." The respondent will see this on a tablet right after answering 5 questions.

Attendee: ${a.name}, ${a.designation} at ${a.organisation}
Their score: ${score}/100
Their archetype: ${archetype.name} — ${archetype.tagline}
Their weakest dimension: ${weakest.label} (${weakest.value}/5)
Public dossier (use for grounding, do not contradict): ${dossier}

Write ONE short paragraph (40-60 words). Structure:
1. Name the archetype and what it reveals about them — drawing from the dossier where possible.
2. Name the weakness, gently — frame it as the next chapter, not a failing.
3. End with a one-sentence hook that earns the conversation. No CTA, no product name.

Tone: confident, specific, slightly mystical but never silly. Avoid: "embrace your journey", "unlock potential", any horoscope cliché.

Output the paragraph only.
`;

// Per-dimension justification for the email report. For grounded scores (Q1/Q3),
// rewrite the dossier evidence in the report's voice. For self-report scores
// (Q2/Q4/Q5), cross-reference the dossier — use the company's footprint, format
// mix, and recent moves to add operational context to the attendee's own answer.
const scoreRationalePrompt = (a, dossier, subscores) => {
  const lines = subscores.map(s =>
    `- ${s.label} (${s.value}/5, ${s.source}): ${s.rationale}`
  ).join('\n');
  return `
You are writing the "score breakdown" section of a personalised post-event report from Moving Walls. The recipient saw their five sub-scores and wants to know WHY they got each one.

Attendee: ${a.name}, ${a.designation} at ${a.organisation}
Public dossier: ${dossier}

Scores and source data:
${lines}

For each of the five dimensions, write ONE sentence (25–40 words) that justifies the score. Rules:

- For "grounded" dimensions: rewrite the source evidence in the report's voice. Cite the public signal directly (named SSP, named partner, named platform). Do not contradict the dossier.
- For "self-report" dimensions: open by acknowledging the attendee's own answer, then add ONE operational interpretation drawn from the dossier — what their footprint scale, format mix, geography, or recent moves implies about that score. End with what closing that gap would look like (no product pitch — just operational state).

Output STRICT JSON, no markdown fences, no commentary:
{
  "discoverability": "...",
  "bookability": "...",
  "measurement": "...",
  "yield": "...",
  "speed": "..."
}
`;
};

const emailIntroPrompt = (a, dossier, score, archetype, weakest, product) => `
You are writing the opening paragraph of a personalised post-event report from Moving Walls.

Attendee: ${a.name}, ${a.designation} at ${a.organisation}
Their score: ${score}/100
Their archetype: ${archetype.name}
Their weakest dimension: ${weakest.label} (${weakest.value}/5)
Recommended MW product (do not pitch — just acknowledge the gap exists): ${product}
Public dossier: ${dossier}

Write the opening paragraph of their report — 70-100 words, professional, factual, grounded in the dossier. Structure:
1. Acknowledge a specific thing from their public footprint (one detail from the dossier).
2. State their score and what the archetype means in plain English.
3. Name the weakness as a concrete operational gap, not abstract advice.

Avoid: marketing copy, exclamation marks, "we're excited to share."

Output the paragraph only.
`;

async function generate(model, prompt, label) {
  return withRetry(async () => {
    const m = genAI.getGenerativeModel({ model });
    const r = await m.generateContent(prompt);
    return r.response.text().trim();
  }, label);
}

const SCORING_CACHE = 'scripts/output/poc-scoring.json';
function loadNarrativeCache() {
  if (!existsSync(SCORING_CACHE)) return new Map();
  try {
    const prev = JSON.parse(readFileSync(SCORING_CACHE, 'utf8'));
    return new Map((prev.results || []).map(r => [
      r.attendee.organisation,
      { fortune: r.fortune, emailIntro: r.emailIntro, scoreRationale: r.scoreRationale },
    ]));
  } catch { return new Map(); }
}

function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function bar(value, max = 5) {
  return '█'.repeat(value) + '░'.repeat(max - value);
}

async function main() {
  const cached = JSON.parse(readFileSync('scripts/output/poc-output.json', 'utf8'));
  console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║  Scoring + Narrative POC — ${cached.attendees.length} attendees                          ║`);
  console.log(`║  Narrative model: ${NARRATIVE_MODEL.padEnd(51)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝`);

  const results = [];
  const narrativeCache = loadNarrativeCache();
  if (narrativeCache.size) console.log(`  Loaded ${narrativeCache.size} cached narratives (pass --fresh to regenerate)\n`);
  if (process.argv.includes('--fresh')) narrativeCache.clear();

  for (const { attendee: a, insight } of cached.attendees) {
    if (!insight) continue;
    const mock = MOCK_SELF_REPORTS[a.organisation];
    if (!mock) continue;

    const scoreVector = {
      discoverability: insight.discoverability_score,
      bookability:     mock.bookability,
      measurement:     insight.measurement_score,
      yield:           mock.yield,
      speed:           mock.speed,
    };
    const reasoning = {
      discoverability: insight.discoverability_reasoning,
      measurement:     insight.measurement_reasoning,
    };
    const { total, subscores, weakest, archetype } = computeScore(scoreVector, reasoning);

    console.log('\n' + '═'.repeat(72));
    console.log(`  ${a.name} — ${a.designation}, ${a.organisation}`);
    console.log('═'.repeat(72));
    console.log(`\n  SCORE: ${total}/100        ARCHETYPE: ${archetype.name}`);
    console.log(`                            "${archetype.tagline}"\n`);
    for (const s of subscores) {
      const marker = s.key === weakest.key ? ' ← weakest' : '';
      const tag = s.source === 'grounded' ? '🌐' : '✋';
      console.log(`  ${tag} ${s.label.padEnd(18)} ${bar(s.value)} ${s.value}/5   → ${s.product}${marker}`);
      console.log(`     ${s.rationale.slice(0, 110)}${s.rationale.length > 110 ? '…' : ''}`);
    }
    console.log(`\n  Recommended product: ${weakest.product} (closes the ${weakest.label} gap)`);
    console.log(`  🌐 = grounded from public sources   ✋ = self-reported at booth\n`);

    const cachedNarrative = narrativeCache.get(a.organisation) || {};
    let fortune = cachedNarrative.fortune || null;
    let emailIntro = cachedNarrative.emailIntro || null;
    let scoreRationale = cachedNarrative.scoreRationale || null;

    if (fortune) {
      console.log('  Booth fortune:    cached');
    } else {
      process.stdout.write('  Generating booth fortune...    ');
      try {
        fortune = await generate(NARRATIVE_MODEL, fortunePrompt(a, insight.dossier, total, archetype, weakest), 'fortune');
        console.log('ok');
      } catch (e) { console.log(`failed: ${e.message.slice(0, 80)}`); }
    }

    if (emailIntro) {
      console.log('  Email intro:      cached');
    } else {
      process.stdout.write('  Generating email intro...       ');
      try {
        emailIntro = await generate(NARRATIVE_MODEL, emailIntroPrompt(a, insight.dossier, total, archetype, weakest, weakest.product), 'email');
        console.log('ok');
      } catch (e) { console.log(`failed: ${e.message.slice(0, 80)}`); }
    }

    if (scoreRationale) {
      console.log('  Score rationale:  cached');
    } else {
      process.stdout.write('  Generating score rationale...   ');
      try {
        const raw = await generate(NARRATIVE_MODEL, scoreRationalePrompt(a, insight.dossier, subscores), 'rationale');
        scoreRationale = JSON.parse(stripJsonFences(raw));
        console.log('ok');
      } catch (e) { console.log(`failed: ${e.message.slice(0, 80)}`); }
    }

    if (fortune) {
      console.log(`\n  ─── BOOTH REVEAL ─────────────────────────────────────────────────`);
      console.log(`\n  ${fortune}\n`);
    }
    if (emailIntro) {
      console.log(`  ─── EMAIL REPORT INTRO ───────────────────────────────────────────`);
      console.log(`\n  ${emailIntro}\n`);
    }
    if (scoreRationale) {
      console.log(`  ─── SCORE RATIONALE (per dimension) ──────────────────────────────`);
      for (const d of DIMENSIONS) {
        const line = scoreRationale[d.key];
        if (!line) continue;
        const sub = subscores.find(s => s.key === d.key);
        const tag = sub.source === 'grounded' ? '🌐' : '✋';
        console.log(`\n  ${tag} ${d.label} (${sub.value}/5)`);
        console.log(`     ${line}`);
      }
      console.log();
    }

    results.push({
      attendee: a, score: total, archetype, subscores, weakest,
      recommendedProduct: weakest.product, fortune, emailIntro, scoreRationale,
    });

    // Checkpoint after every attendee so a mid-run kill / quota wall doesn't lose work.
    writeFileSync(SCORING_CACHE, JSON.stringify({
      generatedAt: new Date().toISOString(),
      narrativeModel: NARRATIVE_MODEL,
      results,
    }, null, 2));
  }

  writeFileSync(SCORING_CACHE, JSON.stringify({
    generatedAt: new Date().toISOString(),
    narrativeModel: NARRATIVE_MODEL,
    results,
  }, null, 2));

  console.log(`\n  Full output → scripts/output/poc-scoring.json\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
