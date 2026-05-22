// POC: LLM-driven insights for the WOO satellite event Fortune Teller revival.
//
// What this proves:
//   1. We can enrich an RSVP row (name + role + company) into a usable dossier
//      using Gemini with Google Search grounding, with cited sources.
//   2. We can auto-suggest Q1 (Discoverability) and Q3 (Measurement) scores
//      from public signals — leaving the internal-ops questions for self-report.
//   3. We can generate a non-obvious "why you two" twinning rationale grounded
//      in both attendees' public footprints.
//
// Run:   node scripts/poc-llm-insights.mjs
// Needs: GEMINI_API_KEY in .env (already present in this repo).

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set in .env');
  process.exit(1);
}

const MODEL = process.env.POC_MODEL || 'gemini-2.5-flash';
// Twin reasoning gets a stronger model — only 1 call per pair, quality matters.
const TWIN_MODEL = process.env.POC_TWIN_MODEL || 'gemini-2.5-pro';
// Gemini 1.5 uses `googleSearchRetrieval`, 2.0+ uses `googleSearch`.
const GROUNDING_TOOL = MODEL.startsWith('gemini-1.5')
  ? { googleSearchRetrieval: {} }
  : { googleSearch: {} };
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const CACHE_PATH = 'scripts/output/poc-output.json';
const USE_CACHE = !process.argv.includes('--fresh');

// Sample WOO-flavoured media owners. Names are placeholders; companies are real
// so search grounding has public signals to work with.
const SAMPLE_ATTENDEES = [
  { name: 'Alex Chen',      designation: 'Head of Digital',  organisation: 'Ocean Outdoor',        country: 'UK' },
  { name: 'Marie Dubois',   designation: 'VP Programmatic',  organisation: 'JCDecaux',             country: 'France' },
  { name: 'Tom Whitfield',  designation: 'CCO',              organisation: 'Global',               country: 'UK' },
  { name: 'Sven Larsson',   designation: 'Director of Sales',organisation: 'Clear Channel Europe', country: 'Sweden' },
  { name: 'Priya Iyer',     designation: 'Founder',          organisation: 'Alight Media',         country: 'UK' },
];

const insightsPrompt = (a) => `
You are an OOH/DOOH industry analyst preparing a 1-page profile for a Moving Walls satellite networking event at the WOO Forum (London, June 2026).

Attendee:
- Name: ${a.name}
- Role: ${a.designation}
- Company: ${a.organisation}
- Country: ${a.country}

Use Google Search to find what is publicly known about this company's OOH inventory, trading capabilities, audience data, and any recent moves (last 18 months).

Produce a JSON object with EXACTLY this shape (no extra fields, no markdown fences):
{
  "dossier": "3-sentence factual summary of their OOH footprint, formats, geographies, and recent moves",
  "discoverability_score": 1-5,
  "discoverability_reasoning": "one sentence citing what you found publicly",
  "measurement_score": 1-5,
  "measurement_reasoning": "one sentence citing what you found publicly",
  "talking_points": ["3 short bullets a Moving Walls rep could lead the conversation with"]
}

Scoring anchors (be conservative — if signal is thin, score lower and say so):
- Discoverability: 1 = no public inventory listing; 3 = website site finder or PDF rate card; 5 = listed on multiple programmatic marketplaces with live availability.
- Measurement: 1 = POP photos only; 3 = audience estimate from own methodology; 5 = third-party verified impressions + attribution offering.

Output ONLY the JSON object.
`;

// Twin rationale prompt: forces CONTRAST, not shared themes. Few-shot examples
// show the difference between fluff ("you both do OOH") and a real reason to talk.
const twinPrompt = (a, b, profileA, profileB) => `
You are facilitating a 1:1 introduction at the Moving Walls satellite event at WOO Forum.

Your job: write ONE line (max 35 words) that gives these two a real reason to walk over and start talking. The line must be grounded in the CONTRAST between their public profiles — not a shared theme.

BAD examples (what NOT to write):
  - "Both leaders in data-driven OOH could discuss leveraging insights to maximise campaign effectiveness." ← generic, could apply to anyone
  - "You both work in DOOH and care about programmatic." ← states the obvious
  - "Could share best practices on attention measurement." ← no specific hook

GOOD examples (what TO write):
  - "Ocean has 10 years of neuroscience research in attention; Alight just hit 500 digital billboards and is buying its measurement stack now — Priya should pressure-test what Ocean wishes it had built earlier."
  - "JCDecaux runs VIOOH across 35 markets; Global is UK-dominant and still building out programmatic — a 20-minute conversation on which DSP integrations actually moved revenue would save Tom 6 months."
  - "Clear Channel's European exit just freed Sven from corporate constraints; Priya is scaling a UK challenger — there's a hire-or-be-hired conversation here, or at minimum a candid debrief on what the old model couldn't ship."

Now do the same for:

Person A: ${a.name} — ${a.designation} at ${a.organisation}
A's dossier: ${profileA.dossier}
A's discoverability: ${profileA.discoverability_score}/5 — ${profileA.discoverability_reasoning}
A's measurement: ${profileA.measurement_score}/5 — ${profileA.measurement_reasoning}

Person B: ${b.name} — ${b.designation} at ${b.organisation}
B's dossier: ${profileB.dossier}
B's discoverability: ${profileB.discoverability_score}/5 — ${profileB.discoverability_reasoning}
B's measurement: ${profileB.measurement_score}/5 — ${profileB.measurement_reasoning}

Find the specific asymmetry (incumbent ↔ challenger, programmatic-native ↔ relationship-led, mature measurement ↔ scaling without it, recent transition ↔ stable, geography gap, role mismatch). Name it. Then name what one of them gets out of the conversation.

Output only the single line. No preamble, no quotes.
`;

function extractCitations(response) {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  return chunks.map(c => c.web?.uri).filter(Boolean);
}

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

async function enrichAttendee(attendee) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    tools: [GROUNDING_TOOL],
  });
  const result = await model.generateContent(insightsPrompt(attendee));
  const text = result.response.text();
  const citations = extractCitations(result.response);

  try {
    const insight = JSON.parse(stripFences(text));
    return { attendee, insight, citations };
  } catch (e) {
    return { attendee, error: `JSON parse failed: ${e.message}`, raw: text, citations };
  }
}

async function twinRationale(a, b, profileA, profileB) {
  const model = genAI.getGenerativeModel({ model: TWIN_MODEL });
  const result = await model.generateContent(twinPrompt(a, b, profileA, profileB));
  return result.response.text().trim().replace(/^["']|["']$/g, '');
}

function loadCachedResults() {
  if (!USE_CACHE || !existsSync(CACHE_PATH)) return null;
  try {
    const cached = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    const ok = cached.attendees?.every(r => r.insight && !r.error);
    return ok ? cached.attendees : null;
  } catch { return null; }
}

function printRecord(record) {
  const { attendee, insight, citations = [], error, raw } = record;
  console.log('\n' + '═'.repeat(72));
  console.log(`${attendee.name} — ${attendee.designation}, ${attendee.organisation}`);
  console.log('═'.repeat(72));
  if (error) {
    console.log(`  ⚠  ${error}`);
    if (raw) console.log(`  raw: ${raw.slice(0, 200)}…`);
    return;
  }
  console.log(`\nDossier:\n  ${insight.dossier}`);
  console.log(`\nDiscoverability: ${insight.discoverability_score}/5`);
  console.log(`  → ${insight.discoverability_reasoning}`);
  console.log(`Measurement:     ${insight.measurement_score}/5`);
  console.log(`  → ${insight.measurement_reasoning}`);
  console.log(`\nTalking points:`);
  for (const t of insight.talking_points ?? []) console.log(`  • ${t}`);
  if (citations.length) {
    console.log(`\nSources (${citations.length}):`);
    for (const c of citations.slice(0, 5)) console.log(`  - ${c}`);
  }
}

// Three contrast pairings to stress-test the twin prompt across different asymmetries.
const TWIN_PAIRS = [
  ['Ocean Outdoor', 'Alight Media'],      // incumbent ↔ challenger, same market
  ['JCDecaux', 'Global'],                 // global programmatic ↔ UK-dominant
  ['Clear Channel Europe', 'Alight Media'], // recent divestment ↔ scaling
];

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║  LLM Insight POC — ${SAMPLE_ATTENDEES.length} attendees                              ║`);
  console.log(`║  Dossier model:   ${MODEL.padEnd(51)}║`);
  console.log(`║  Twin model:      ${TWIN_MODEL.padEnd(51)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝`);

  let results = loadCachedResults();
  if (results) {
    console.log(`  Loaded ${results.length} cached dossiers from ${CACHE_PATH}`);
    console.log(`  (pass --fresh to re-enrich)\n`);
  } else {
    results = [];
    for (const a of SAMPLE_ATTENDEES) {
      process.stdout.write(`  Enriching ${a.organisation.padEnd(24)} `);
      const t0 = Date.now();
      try {
        const r = await enrichAttendee(a);
        results.push(r);
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        process.stdout.write(r.error ? `failed (${dt}s)\n` : `ok  (${dt}s)\n`);
      } catch (e) {
        console.log(`failed: ${e.message}`);
        results.push({ attendee: a, error: e.message });
      }
    }
    for (const r of results) printRecord(r);
  }

  const twins = [];
  for (const [orgA, orgB] of TWIN_PAIRS) {
    const a = results.find(r => r.attendee.organisation === orgA);
    const b = results.find(r => r.attendee.organisation === orgB);
    if (!a?.insight || !b?.insight) continue;

    console.log('\n' + '═'.repeat(72));
    console.log(`  TWIN: ${a.attendee.name} (${orgA})  ↔  ${b.attendee.name} (${orgB})`);
    console.log('═'.repeat(72));
    const t0 = Date.now();
    try {
      const line = await twinRationale(a.attendee, b.attendee, a.insight, b.insight);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  (${TWIN_MODEL}, ${dt}s)\n`);
      console.log(`  ${line}`);
      twins.push({ pair: [a.attendee.name, b.attendee.name], orgs: [orgA, orgB], rationale: line });
    } catch (e) {
      console.log(`  Twin generation failed: ${e.message}`);
    }
  }

  mkdirSync('scripts/output', { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: MODEL,
    twinModel: TWIN_MODEL,
    grounding: 'googleSearch',
    attendees: results,
    twins,
  }, null, 2));

  console.log(`\n\n  Full output → ${CACHE_PATH}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
