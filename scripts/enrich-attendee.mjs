/**
 * Attendee Enrichment — WOO Forum "Twinning" pipeline, LAYER 1 (input upgrade)
 * ---------------------------------------------------------------------------
 * Proves we can reliably enrich an attendee BEYOND their LinkedIn summary using
 * live Google Search. This is the first stage of the offline twinning pipeline:
 *
 *   [RSVP list] -> ENRICH (this file) -> score pairs -> allocate twins -> store
 *
 * It reuses the proven grounded-call pattern from scripts/score-mockup.mjs:
 * the @google/generative-ai SDK (Developer API, AIza key) + the googleSearch tool.
 *
 * Output is shaped for MATCHING — only the facts that decide whether two media
 * owners are a good "twin": company + inventory, region/markets, focus areas,
 * recent activity (conversation hooks), and explicit connectionHooks. Every run
 * captures the real grounding sources + search queries so we can verify the
 * model actually searched (anti-hallucination), not answered from memory.
 *
 * For the POC we run against the stale lib/archetypes_data.json (18 entries,
 * one of which — Emeline — is an empty "phantom", the perfect thin-data test).
 *
 * RUN (one attendee, prints to console — cheap sanity check):
 *   node scripts/enrich-attendee.mjs                 # first attendee
 *   node scripts/enrich-attendee.mjs --i 3           # by index
 *   node scripts/enrich-attendee.mjs --name "Ben Poole"
 *
 * RUN (all 18, sequential w/ spacing, writes a cache for the next stage):
 *   node scripts/enrich-attendee.mjs --all
 *   -> writes scripts/enriched_attendees.json
 *
 * REQUIRES in .env:  GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY)
 * OPTIONAL in .env:  POC_MODEL (default gemini-2.5-flash)
 */

import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─────────────────────────────────────────────────────────────────────────────
// Gemini setup — @google/generative-ai SDK (Developer API, AIza key)
// ─────────────────────────────────────────────────────────────────────────────
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.POC_MODEL || process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

const ARCHETYPES_PATH = path.join(process.cwd(), 'lib', 'archetypes_data.json');
const CACHE_PATH = path.join(process.cwd(), 'scripts', 'enriched_attendees.json');

const SPACING_MS = 4000; // grounded endpoint 429s under parallel load → sequential + spacing

if (!API_KEY) {
  console.error('\n✗ No Gemini key. Set GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) in .env and re-run.\n');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  tools: [{ googleSearch: {} }],
  generationConfig: { temperature: 0.3 },
});

// ── Anti-fluff blocklist: matching keys on specifics, so vague hooks are useless. ──
const BANNED_PHRASES = [
  /world[- ]?class/i, /cutting[- ]?edge/i, /industry[- ]?lead/i, /market[- ]?lead/i,
  /well[- ]?positioned/i, /\bleverage\b/i, /synerg/i, /best[- ]?in[- ]?class/i,
  /game[- ]?chang/i, /seamless/i, /\bunlock\b/i, /empower/i, /thought leader/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Grounded Gemini call → { text, sources, queries }. (Reused from score-mockup.)
// ─────────────────────────────────────────────────────────────────────────────
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model output:\n' + text);
  return JSON.parse(raw.slice(start, end + 1));
}

async function ask(prompt) {
  const result = await model.generateContent(prompt);
  const resp = result.response;
  const cand = resp?.candidates?.[0];
  const parts = cand?.content?.parts || [];
  const text = parts.map((p) => p.text).filter(Boolean).join('');
  if (!text) throw new Error('Empty response: ' + JSON.stringify(resp).slice(0, 400));
  const gm = cand?.groundingMetadata || {};
  const sources = (gm.groundingChunks || [])
    .map((c) => (c.web ? { domain: c.web.title, uri: c.web.uri } : null))
    .filter(Boolean);
  const queries = gm.webSearchQueries || [];
  return { text, sources, queries };
}

// ─────────────────────────────────────────────────────────────────────────────
// The enrichment prompt — research the person for MATCHING, grounded in search.
// ─────────────────────────────────────────────────────────────────────────────
function enrichmentPrompt(person) {
  return `You are a researcher building a networking profile for an out-of-home (OOH) advertising conference. You use live Google Search to find current, specific facts about ONE attendee and their company, so we can later match them with the most relevant person to meet at the event.

ATTENDEE TO RESEARCH:
- Name: ${person.name}
- What we already know: ${person.summary || 'No prior information — find everything from search.'}

RULES — output is REJECTED if broken:
- YOU MUST TRIGGER GOOGLE SEARCH. Do not answer from internal memory.
- Find facts that are SPECIFIC and OBSERVABLE: real company/product names, named markets/cities, screen or inventory counts, dates, named partners. Name names.
- PREFER RECENT, DATED facts (ideally within the last 12 months).
- Never invent. If you cannot verify a field, return an empty string/array for it and add a short note in "notFound" — do NOT guess.
- NO marketing fluff. These get rejected: "world-class", "industry leader", "cutting-edge", "leverage", "well positioned", "thought leader", "seamless".
- Keep every string tight and factual. connectionHooks are the threads another attendee could bond over — make them concrete (a shared market, a specific technology, a complementary role), never generic.

Return ONLY raw JSON in this exact shape:
{
  "fullName": "string",
  "company": "string — current employer",
  "role": "string — current title/seniority",
  "region": "string — primary geography / markets they operate in (e.g. 'ANZ', 'LATAM', 'MENA', 'US Midwest')",
  "companyFocus": "string — what the company does + inventory type (billboards / transit / DOOH / programmatic / adtech / measurement, etc.)",
  "specialties": ["3-6 concrete focus areas or expertise threads"],
  "recentActivity": ["0-3 specific, dated, grounded items — recent moves, launches, talks, articles; empty array if none found"],
  "connectionHooks": ["3-5 concrete reasons another OOH attendee would want to meet this person"],
  "confidence": "high | medium | low — how much you could actually verify in search",
  "notFound": "string — what you could NOT verify (empty string if everything was found)"
}`;
}

function validateEnrichment(e) {
  for (const f of ['fullName', 'company', 'role', 'region', 'companyFocus']) {
    if (typeof e?.[f] !== 'string') throw new Error(`field '${f}' missing or not a string`);
  }
  if (!Array.isArray(e.specialties)) throw new Error('specialties must be an array');
  if (!Array.isArray(e.connectionHooks) || e.connectionHooks.length === 0)
    throw new Error('connectionHooks must be a non-empty array');
  if (!['high', 'medium', 'low'].includes(e.confidence))
    throw new Error(`confidence must be high|medium|low, got '${e.confidence}'`);
  // Soft check: warn (don't reject) on fluff so we can SEE quality without losing the run.
  const fluff = [...(e.connectionHooks || []), ...(e.specialties || [])].filter((s) =>
    BANNED_PHRASES.some((rx) => rx.test(String(s)))
  );
  if (fluff.length) e._fluffWarnings = fluff;
}

// Grounded enrichment with retry: L2 grounding gate + structural validation.
async function enrichOne(person, attempts = 2) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const { text, sources, queries } = await ask(enrichmentPrompt(person));
      if (!queries.length) throw new Error('no Google Search grounding — model did not actually search');
      const enriched = extractJson(text);
      validateEnrichment(enriched);
      enriched._sources = [...new Set(sources.map((s) => s.domain).filter(Boolean))];
      enriched._queries = queries;
      return enriched;
    } catch (e) {
      lastErr = e;
      if (i < attempts) console.log(`    ↻ retry ${i}: ${e.message}`);
    }
  }
  throw new Error(`failed after ${attempts} attempts: ${lastErr.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Console pretty-printer so we can eyeball reliability without opening files.
// ─────────────────────────────────────────────────────────────────────────────
function printEnriched(e) {
  console.log(`\n  ${e.fullName}  —  ${e.role} @ ${e.company}`);
  console.log(`  Region:    ${e.region}`);
  console.log(`  Focus:     ${e.companyFocus}`);
  console.log(`  Specialties: ${(e.specialties || []).join('; ')}`);
  if ((e.recentActivity || []).length) console.log(`  Recent:    ${e.recentActivity.join(' | ')}`);
  console.log(`  Hooks:`);
  (e.connectionHooks || []).forEach((h) => console.log(`     • ${h}`));
  console.log(`  Confidence: ${e.confidence}${e.notFound ? `   (not found: ${e.notFound})` : ''}`);
  console.log(`  Grounded by ${(e._sources || []).length} sources, ${(e._queries || []).length} searches: ${(e._queries || []).join(', ')}`);
  if (e._fluffWarnings) console.log(`  ⚠ fluffy hooks to tighten: ${e._fluffWarnings.join(' | ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const attendees = JSON.parse(await fs.readFile(ARCHETYPES_PATH, 'utf-8'));
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  console.log(`Model: ${MODEL_NAME}  |  Source: lib/archetypes_data.json (${attendees.length} attendees)`);

  if (args.includes('--all')) {
    console.log(`\n▶ Enriching all ${attendees.length} attendees (sequential, ${SPACING_MS}ms spacing)…\n`);
    const out = [];
    for (const [idx, person] of attendees.entries()) {
      process.stdout.write(`  [${idx + 1}/${attendees.length}] ${person.name}… `);
      try {
        const e = await enrichOne(person);
        console.log(`✓ ${e.confidence} (${(e._sources || []).length} sources)`);
        out.push(e);
      } catch (err) {
        console.log(`✗ ${err.message}`);
        out.push({ fullName: person.name, _error: err.message });
      }
      if (idx < attendees.length - 1) await new Promise((r) => setTimeout(r, SPACING_MS));
    }
    await fs.writeFile(CACHE_PATH, JSON.stringify(out, null, 2));
    const ok = out.filter((e) => !e._error).length;
    console.log(`\n✓ Enriched ${ok}/${attendees.length}. Wrote ${path.relative(process.cwd(), CACHE_PATH)}`);
    return;
  }

  // Single-attendee mode (default): pick by --name, --i, or first.
  let person;
  const name = getArg('--name');
  const iArg = getArg('--i');
  if (name) person = attendees.find((a) => a.name.toLowerCase() === name.toLowerCase());
  else if (iArg !== undefined) person = attendees[Number(iArg)];
  else person = attendees[0];

  if (!person) {
    console.error(`\n✗ Attendee not found. Use --i 0..${attendees.length - 1} or --name "Full Name".\n`);
    process.exit(1);
  }

  console.log(`\n▶ Enriching: ${person.name}`);
  const enriched = await enrichOne(person);
  printEnriched(enriched);
  console.log('\nDone. If this looks reliable, run with --all to enrich + cache the full list.\n');
}

main().catch((e) => {
  console.error('\n✗ Failed:', e.message, '\n');
  process.exit(1);
});
