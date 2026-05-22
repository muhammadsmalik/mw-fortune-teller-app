// POC variant: LLM-ONLY scoring.
//
// What this proves (or disproves):
//   1. Can a single grounded call score all 5 dimensions from public signals
//      alone — no booth quiz?
//   2. Can the model honestly report low confidence on dimensions where public
//      signal is thin (Yield, Speed) — so the booth UI can selectively fall
//      back to self-report for just those dims?
//   3. Does this hold up vs the hybrid (LLM-suggested Q1/Q3 + self-report
//      Q2/Q4/Q5) approach in poc-scoring.mjs?
//
// Run:   node scripts/poc-llm-only-scoring.mjs
// Needs: GEMINI_API_KEY in .env.

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const MODEL = process.env.POC_MODEL || 'gemini-3-flash-preview';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SAMPLE_ATTENDEES = [
  { name: 'Alex Chen',      designation: 'Head of Digital',  organisation: 'Ocean Outdoor',        country: 'UK' },
  { name: 'Marie Dubois',   designation: 'VP Programmatic',  organisation: 'JCDecaux',             country: 'France' },
  { name: 'Tom Whitfield',  designation: 'CCO',              organisation: 'Global',               country: 'UK' },
  { name: 'Sven Larsson',   designation: 'Director of Sales',organisation: 'Clear Channel Europe', country: 'Sweden' },
  { name: 'Priya Iyer',     designation: 'Founder',          organisation: 'Alight Media',         country: 'UK' },
];

const DIMENSIONS = [
  { key: 'discoverability', label: 'Discoverability', product: 'Studio'    },
  { key: 'bookability',     label: 'Bookability',     product: 'Market'    },
  { key: 'measurement',     label: 'Measurement',     product: 'Measure'   },
  { key: 'yield',           label: 'Yield / Fill',    product: 'Influence' },
  { key: 'speed',           label: 'Speed',           product: 'Activate'  },
];

const ARCHETYPES = [
  { name: 'The Open Vault',         tagline: "Anyone can buy you, instantly.",                       match: s => s.discoverability >= 4 && s.bookability >= 4 && s.speed >= 4 },
  { name: 'The Hidden Gem',         tagline: "Premium inventory that buyers struggle to find.",      match: s => s.discoverability <= 2 && (s.measurement >= 3 || s.yield >= 3) },
  { name: 'The Measured Operator',  tagline: "You prove it. Few of your peers can.",                 match: s => s.measurement >= 4 && s.yield >= 4 },
  { name: 'The Relationship King',  tagline: "Your buyers love you. Your funnel can't scale.",       match: s => s.speed >= 4 && s.discoverability <= 2 },
  { name: 'The Local Champion',     tagline: "Strong at home. Invisible abroad.",                    match: s => s.discoverability >= 3 && s.discoverability <= 4 && s.bookability <= 3 },
  { name: 'The Sleeping Giant',     tagline: "Big footprint, no sharp edges.",                       match: s => Object.values(s).every(v => v >= 2 && v <= 3) },
  { name: 'The Climber',            tagline: "Mid-mature, still figuring out which edge to sharpen.",match: () => true },
];

const SCORING_PROMPT = (a) => `
You are an OOH/DOOH industry analyst scoring a media owner for the Moving Walls satellite event at WOO Forum (London, June 2026).

Attendee:
- Name: ${a.name}
- Role: ${a.designation}
- Company: ${a.organisation}
- Country: ${a.country}

Use Google Search to find what is publicly known about this company. Then score them 1–5 on each of the 5 operational dimensions below. For each dimension you MUST also state your confidence based on how rich or thin the public evidence is.

Confidence rules (HONESTY IS THE POINT):
- "high"   = multiple specific public signals directly support the score (named SSPs, named measurement partners, named pricing models, dated press, financial filings)
- "medium" = some public signal, but partial or indirect (recent leadership moves, vague capability statements, generic case studies)
- "low"    = thin or absent public signal — you're extrapolating from adjacent facts. Score conservatively and flag low.

Dimensions and scoring anchors:

1. Discoverability — How does a new buyer find their inventory?
   1 = no public inventory listing | 3 = website site finder/PDF rate card | 5 = listed on multiple programmatic marketplaces with live availability

2. Bookability — From buyer interest to confirmed booking, how long?
   1 = 2+ weeks (RFP→IO) | 3 = a few days, templated quotes | 5 = minutes (PG/PMP, self-serve)

3. Measurement — What proof do they give buyers post-campaign?
   1 = POP photos + play logs only | 3 = audience estimate from own methodology | 5 = third-party verified impressions + attribution

4. Yield / Fill — How is their inventory priced?
   1 = fixed rate card, manual discounts | 3 = tiered by daypart/season, reviewed quarterly | 5 = fully dynamic yield, automated pricing tied to demand

5. Speed of Execution — From confirmed booking to creative live on screen?
   1 = 5+ days, manual upload | 3 = ~1 day, CMS-driven but human-gated | 5 = under 1 hour, API-driven, no human in loop

Output STRICT JSON, no markdown fences, no preamble:
{
  "dossier": "3-sentence factual summary",
  "scores": {
    "discoverability": { "value": 1-5, "confidence": "high|medium|low", "reasoning": "one sentence citing the specific public signal that drove the score" },
    "bookability":     { "value": 1-5, "confidence": "high|medium|low", "reasoning": "..." },
    "measurement":     { "value": 1-5, "confidence": "high|medium|low", "reasoning": "..." },
    "yield":           { "value": 1-5, "confidence": "high|medium|low", "reasoning": "..." },
    "speed":           { "value": 1-5, "confidence": "high|medium|low", "reasoning": "..." }
  }
}

Critical: do not bluff. If you cannot find direct evidence for a dimension (especially Yield and Speed — these are typically internal), score conservatively and mark confidence "low".
`;

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function extractCitations(response) {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return chunks.map(c => c.web?.uri).filter(Boolean);
}

async function scoreAttendee(attendee) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    tools: [{ googleSearch: {} }],
  });
  const result = await model.generateContent(SCORING_PROMPT(attendee));
  const text = result.response.text();
  const citations = extractCitations(result.response);

  try {
    const parsed = JSON.parse(stripFences(text));
    return { attendee, ...parsed, citations };
  } catch (e) {
    return { attendee, error: `JSON parse failed: ${e.message}`, raw: text, citations };
  }
}

function bar(value, max = 5) {
  return '█'.repeat(value) + '░'.repeat(max - value);
}

function confTag(conf) {
  return { high: '🟢', medium: '🟡', low: '🔴' }[conf] || '⚪';
}

function printRecord(r) {
  const { attendee: a, scores, dossier, citations = [], error } = r;
  console.log('\n' + '═'.repeat(72));
  console.log(`  ${a.name} — ${a.designation}, ${a.organisation}`);
  console.log('═'.repeat(72));
  if (error) { console.log(`  ⚠  ${error}`); return; }

  const vec = Object.fromEntries(DIMENSIONS.map(d => [d.key, scores[d.key].value]));
  const total = Object.values(vec).reduce((a, b) => a + b, 0) * 4;
  const archetype = ARCHETYPES.find(a => a.match(vec));
  const lowConfDims = DIMENSIONS.filter(d => scores[d.key].confidence === 'low');

  console.log(`\n  SCORE: ${total}/100        ARCHETYPE: ${archetype.name}`);
  console.log(`                            "${archetype.tagline}"\n`);
  console.log(`  Dossier: ${dossier}\n`);

  for (const d of DIMENSIONS) {
    const s = scores[d.key];
    console.log(`  ${confTag(s.confidence)} ${d.label.padEnd(18)} ${bar(s.value)} ${s.value}/5   conf: ${s.confidence}`);
    console.log(`     ${s.reasoning}`);
  }

  console.log(`\n  Sources: ${citations.length} grounded references`);
  if (lowConfDims.length) {
    console.log(`  ⚠  Low-confidence dimensions: ${lowConfDims.map(d => d.label).join(', ')}`);
    console.log(`     → Booth UI should invite attendee to confirm/adjust these specifically.`);
  } else {
    console.log(`  ✓  All dimensions scored with medium or high confidence.`);
  }
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║  LLM-ONLY Scoring POC — ${SAMPLE_ATTENDEES.length} attendees                             ║`);
  console.log(`║  Model: ${MODEL.padEnd(61)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝`);
  console.log(`\n  Each attendee gets ONE grounded call that scores all 5 dimensions`);
  console.log(`  + per-dim confidence. Low-confidence dims flag for booth fallback.\n`);

  const results = [];
  for (const a of SAMPLE_ATTENDEES) {
    process.stdout.write(`  Scoring ${a.organisation.padEnd(24)} `);
    const t0 = Date.now();
    try {
      const r = await scoreAttendee(a);
      results.push(r);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(r.error ? `failed (${dt}s)\n` : `ok  (${dt}s)\n`);
    } catch (e) {
      console.log(`failed: ${e.message.slice(0, 100)}`);
      results.push({ attendee: a, error: e.message });
    }
    mkdirSync('scripts/output', { recursive: true });
    writeFileSync('scripts/output/poc-llm-only-scoring.json', JSON.stringify({
      generatedAt: new Date().toISOString(),
      model: MODEL,
      results,
    }, null, 2));
  }

  for (const r of results) printRecord(r);

  console.log(`\n  Full output → scripts/output/poc-llm-only-scoring.json\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
