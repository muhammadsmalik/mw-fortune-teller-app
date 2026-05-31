/**
 * Twin Matcher — WOO Forum "twinning" pipeline, the AFFINITY + ALLOCATION step.
 *
 * Tests the core hypothesis: matching needs ZERO reasoning LLM calls. The LLM's
 * understanding is front-loaded into each person's text during enrichment; here
 * we turn each person into ONE embedding vector, and "how good a twin" becomes
 * cosine similarity (geometry, not a reasoning call). A greedy 1:1 allocation
 * then proposes pairs, which the deterministic tracker enforces/records.
 *
 * Embeddings: text-embedding-004 via the @google/generative-ai SDK (embedContent).
 *
 * TWO MODES (the open "what is a twin?" question, made switchable):
 *   --mode similar        affinity = cosine similarity  → pairs the most alike
 *   --mode complementary  affinity = cosine − same-region penalty → favours
 *                         shared interests but DIFFERENT region (Sal's
 *                         "international connection" rule)
 *
 * INPUT:  scripts/twins.json (people). Embeds google_search_data if present,
 *         else linkedin_data. For the POC we run on linkedin_data (no enrichment
 *         needed) — enrichment only sharpens the same vectors.
 * OUTPUT: prints ranked pairings to eyeball + writes scripts/twin_pairs.json
 *         in the tracker's record-batch format.
 *
 * RUN:
 *   node scripts/match-twins.mjs                      # similar (default)
 *   node scripts/match-twins.mjs --mode complementary
 *   then:  node scripts/twin-tracker.mjs record-batch scripts/twin_pairs.json
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const STORE_PATH = path.join(HERE, 'twins.json');
const PAIRS_OUT = path.join(HERE, 'twin_pairs.json');

const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GEMINI_EMBED_MODEL = process.env.POC_EMBED_MODEL || 'text-embedding-004';
const OPENAI_EMBED_MODEL = process.env.POC_OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const SAME_REGION_PENALTY = 0.12; // complementary mode: how hard to push apart same-region pairs

const argv = process.argv.slice(2);
const getArg = (f, d) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : d; };
const mode = getArg('--mode', 'similar').toLowerCase();
const provider = getArg('--provider', 'openai').toLowerCase();
if (!['similar', 'complementary'].includes(mode)) {
  console.error(`✗ --mode must be 'similar' or 'complementary' (got '${mode}')`);
  process.exit(1);
}
if (!['gemini', 'openai'].includes(provider)) {
  console.error(`✗ --provider must be 'gemini' or 'openai' (got '${provider}')`);
  process.exit(1);
}
if (provider === 'gemini' && !GEMINI_KEY) { console.error('\n✗ No Gemini key in .env.\n'); process.exit(1); }
if (provider === 'openai' && !OPENAI_KEY) { console.error('\n✗ No OPENAI_API_KEY in .env.\n'); process.exit(1); }

// ── Cheap region bucket from free text (heuristic; enrichment gives a real field later). ──
const REGION_RULES = [
  ['ANZ', /\b(australia|new zealand|anz)\b/i],
  ['LATAM', /\b(mexico|latam|central america|argentina|brazil|el salvador|guatemala|buenos aires|panama)\b/i],
  ['MENA', /\b(dubai|uae|mena|backlite|middle east)\b/i],
  ['Africa', /\b(africa|cape town|south africa|polygon)\b/i],
  ['Europe', /\b(greek|greece|france|french|uk|united kingdom|london|europe)\b/i],
  ['North America', /\b(usa|u\.s\.|united states|north america|american|canada|canadian)\b/i],
];
function regionOf(person) {
  const enrichedRegion = person.google_search_data?.region;
  if (enrichedRegion) return enrichedRegion;
  const text = person.linkedin_data || '';
  for (const [label, rx] of REGION_RULES) if (rx.test(text)) return label;
  return 'Unknown';
}

// Text we embed: enriched profile if available, else the raw LinkedIn summary.
function embedText(person) {
  const g = person.google_search_data;
  if (g) {
    return [g.company, g.role, g.region, g.companyFocus, (g.specialties || []).join(', '), (g.connectionHooks || []).join('; ')]
      .filter(Boolean)
      .join('. ');
  }
  return person.linkedin_data || person.name;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let totalChars = 0; // tallied for the per-run cost estimate

async function embed(text) {
  totalChars += text.length;
  return provider === 'openai' ? embedOpenAI(text) : embedGemini(text);
}

// Gemini embeddings via @google/generative-ai SDK. Quota is tight → back off on 429.
let _embedModel;
function getEmbedModel() {
  if (!_embedModel) {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    _embedModel = genAI.getGenerativeModel({ model: GEMINI_EMBED_MODEL });
  }
  return _embedModel;
}
async function embedGemini(text, attempts = 6) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await getEmbedModel().embedContent(text);
      const values = result?.embedding?.values;
      if (!Array.isArray(values)) throw new Error('no embedding values: ' + JSON.stringify(result).slice(0, 300));
      return values;
    } catch (e) {
      const msg = String(e?.message || e);
      if (/429|quota|rate limit|resource has been exhausted/i.test(msg)) {
        lastErr = e; await sleep(2000 * 2 ** i); continue;
      }
      throw new Error(`embed: ${msg.slice(0, 300)}`);
    }
  }
  throw new Error(`gemini embed failed after ${attempts} attempts: ${lastErr?.message}`);
}

// OpenAI: /v1/embeddings. Higher rate limits → minimal backoff.
async function embedOpenAI(text, attempts = 4) {
  const url = 'https://api.openai.com/v1/embeddings';
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input: text }),
    });
    const data = await res.json();
    if (res.ok) {
      const values = data?.data?.[0]?.embedding;
      if (!Array.isArray(values)) throw new Error('no embedding values: ' + JSON.stringify(data).slice(0, 300));
      return values;
    }
    if (res.status === 429) { lastErr = new Error('429'); await sleep(1500 * 2 ** i); continue; }
    throw new Error(`embed ${res.status}: ${JSON.stringify(data?.error || data).slice(0, 300)}`);
  }
  throw new Error(`openai embed failed after ${attempts} attempts: ${lastErr?.message}`);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function main() {
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  const people = store.people;
  const enrichedCount = people.filter((p) => p.google_search_data).length;
  const modelLabel = provider === 'openai' ? OPENAI_EMBED_MODEL : GEMINI_EMBED_MODEL;
  console.log(`Provider: ${provider} (${modelLabel})  |  Mode: ${mode}  |  People: ${people.length}  |  Source: ${enrichedCount ? `enriched (${enrichedCount})` : 'linkedin_data (no enrichment yet)'}`);

  // 1. Embed everyone (sequential — cheap, avoids any rate spikes).
  process.stdout.write('▶ Embedding… ');
  const vecs = new Map();
  const regions = new Map();
  for (const p of people) {
    vecs.set(p.id, await embed(embedText(p)));
    regions.set(p.id, regionOf(p));
    process.stdout.write('.');
    await sleep(provider === 'gemini' ? 1500 : 100);
  }
  console.log(' done.');

  // 2. Affinity for every pair.
  const scored = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const A = people[i], B = people[j];
      let score = cosine(vecs.get(A.id), vecs.get(B.id));
      const sameRegion = regions.get(A.id) === regions.get(B.id) && regions.get(A.id) !== 'Unknown';
      if (mode === 'complementary' && sameRegion) score -= SAME_REGION_PENALTY;
      scored.push({ a: A.id, b: B.id, score, sameRegion });
    }
  }
  scored.sort((x, y) => y.score - x.score);

  // 3. Greedy 1:1 allocation (capacity 1 each) — guarantees no duplicates.
  const used = new Set();
  const pairs = [];
  for (const s of scored) {
    if (used.has(s.a) || used.has(s.b)) continue;
    pairs.push(s);
    used.add(s.a);
    used.add(s.b);
  }
  const leftover = people.filter((p) => !used.has(p.id));

  // 4. Show + write.
  const name = (id) => people.find((p) => p.id === id).name;
  console.log(`\n  Proposed pairs (${pairs.length}):`);
  for (const p of pairs) {
    console.log(
      `    ${name(p.a)} [${regions.get(p.a)}]  ↔  ${name(p.b)} [${regions.get(p.b)}]   ` +
      `sim=${p.score.toFixed(3)}${p.sameRegion ? ' (same region)' : ''}`
    );
  }
  if (leftover.length) console.log(`\n  Leftover (→ tracker trio): ${leftover.map((p) => p.name).join(', ')}`);

  const out = {
    pairs: pairs.map((p) => ({
      a: p.a,
      b: p.b,
      reason: `${mode} match, sim=${p.score.toFixed(3)}${p.sameRegion ? ', same region' : ''}`,
    })),
  };
  fs.writeFileSync(PAIRS_OUT, JSON.stringify(out, null, 2));

  // Per-run cost estimate (both providers, so the comparison is explicit).
  const geminiCost = (totalChars * 0.000025) / 1000;        // ~$0.000025 / 1K chars (text-embedding-004)
  const openaiCost = (totalChars / 4) * (0.02 / 1e6);        // ~4 chars/token, $0.02 / 1M tokens (3-small)
  console.log(`\n  Embedded ${totalChars.toLocaleString()} chars · est. cost this run: $${(provider === 'openai' ? openaiCost : geminiCost).toFixed(6)} (${provider})`);
  console.log(`\n✓ Wrote ${path.relative(path.dirname(HERE), PAIRS_OUT)} — feed it to: node scripts/twin-tracker.mjs record-batch ${path.relative(path.dirname(HERE), PAIRS_OUT)}\n`);
}

main().catch((e) => {
  console.error('\n✗ Failed:', e.message, '\n');
  process.exit(1);
});
