/**
 * Batch Scorer — WOO Forum media-owner scorecard, precompute step.
 * ---------------------------------------------------------------
 * Scores EVERY person in scripts/twins.json across the 3 meeting dimensions
 * (Discoverability, Ease of Purchase, Measurement) and writes the result to
 * scripts/scores.json, keyed by name. This is the "precompute the AI score"
 * step: at the event you run this over the RSVP list once, ahead of time, and
 * the app just looks each person up.
 *
 * This is the AI-RESEARCH half of the score only. The self-assessment half is
 * computed live in-app from the questionnaire and shown next to this number.
 *
 * Uses OpenAI (reliable, your key works) — one call per person scoring all 3
 * dimensions from the person's stored linkedin_data. For the real run with rich
 * profiles you'd swap in the grounded Gemini approach from score-mockup.mjs.
 *
 * RUN:  node scripts/score-all.mjs
 * REQUIRES in .env: OPENAI_API_KEY
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const STORE_PATH = path.join(HERE, 'twins.json');
const SCORES_OUT = path.join(HERE, 'scores.json');
const MODEL = process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';

const key = process.env.OPENAI_API_KEY;
if (!key) { console.error('\n✗ No OPENAI_API_KEY in .env.\n'); process.exit(1); }
const openai = new OpenAI({ apiKey: key });

// The 3 meeting dimensions, media-owner specific.
const DIMENSIONS = `
- discoverability: How easily can buyers and AI assistants FIND this media owner and their inventory online (search/AI visibility, website, listed inventory, OOH directories)?
- easeOfPurchase: How easily can a buyer TRANSACT — programmatic connectivity to demand partners (SSP/DSP), external marketplaces, self-serve booking?
- measurement: Does this media owner PROVIDE solid proof a campaign delivered — audience/impression data, third-party verification, attribution, post-campaign reporting?`;

function prompt(person) {
  return `You are auditing an out-of-home (OOH) MEDIA OWNER for Moving Walls. Score them 0-100 on each of these three dimensions, where 90 = best-in-class and 20 = weak:
${DIMENSIONS}

Base it ONLY on the profile below. Be specific, second-person ("you/your"), no marketing fluff. If the profile lacks evidence for a dimension, score conservatively and say what's missing.

PROFILE:
Name: ${person.name}
Details: ${person.linkedin_data || '(no detail provided)'}
${person.google_search_data ? `Enrichment: ${JSON.stringify(person.google_search_data).slice(0, 1500)}` : ''}

Return ONLY raw JSON:
{ "discoverability": {"score":0-100,"bullets":["...","...","..."]},
  "easeOfPurchase": {"score":0-100,"bullets":["...","...","..."]},
  "measurement": {"score":0-100,"bullets":["...","...","..."]} }`;
}

const DIM_KEYS = ['discoverability', 'easeOfPurchase', 'measurement'];

async function scoreOne(person) {
  const res = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt(person) }],
  });
  const parsed = JSON.parse(res.choices[0].message.content);
  for (const k of DIM_KEYS) {
    if (typeof parsed[k]?.score !== 'number') throw new Error(`${person.name}: missing ${k}.score`);
  }
  parsed.overall = Math.round(DIM_KEYS.reduce((s, k) => s + parsed[k].score, 0) / DIM_KEYS.length);
  return parsed;
}

async function main() {
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  const people = store.people || [];
  console.log(`Scoring ${people.length} people (${MODEL})…\n`);

  const scores = {};
  for (const p of people) {
    try {
      const s = await scoreOne(p);
      scores[p.name] = s;
      console.log(`  · ${p.name}: D ${s.discoverability.score} | E ${s.easeOfPurchase.score} | M ${s.measurement.score}  → overall ${s.overall}`);
    } catch (e) {
      console.error(`  ✗ ${p.name}: ${e.message}`);
    }
  }

  fs.writeFileSync(SCORES_OUT, JSON.stringify(scores, null, 2));
  console.log(`\n✓ Wrote ${path.relative(path.dirname(HERE), SCORES_OUT)} (${Object.keys(scores).length} scored).`);
}

main().catch((e) => { console.error('\n✗ Failed:', e.message, '\n'); process.exit(1); });
