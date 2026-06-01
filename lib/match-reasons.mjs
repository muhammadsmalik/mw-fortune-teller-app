/**
 * Generate a one-line match reason + 3 talking points for a (source → match)
 * pair, using Gemini 3.1 Flash-Lite with structured (JSON-schema) output.
 *
 * Used by both the offline builder (scripts/build-twin-matches.mjs) and the live
 * walk-in matcher (app/api/match/route.js). On any failure it returns null so the
 * caller can fall back to the deterministic reasonFor() — generation must never
 * block the reveal.
 *
 * Each person arg is a curated profile from extractProfileForLLM(), with `name`
 * and `slug` merged in by the caller (the curated profile itself is name-free).
 */

import { genaiClient } from './genai-client.mjs';

const MODEL = process.env.GEMINI_MATCH_MODEL || 'gemini-3.1-flash-lite';

// In-memory cache keyed by (sourceSlug, matchSlug). Persists for the life of the
// process — dedupes within a batch run and across warm serverless invocations.
const _cache = new Map();

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reason: {
      type: 'string',
      description: 'One line, max 12 words, no trailing period — why they should meet.',
    },
    talkingPoints: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['reason', 'talkingPoints'],
  propertyOrdering: ['reason', 'talkingPoints'],
};

const SYSTEM_INSTRUCTION = [
  'You write warm, specific networking prompts for attendees of WOO London, an',
  'out-of-home (OOH/DOOH) advertising forum. The two people are from different',
  'companies and usually different markets/countries — that cross-market angle is',
  'the point of the introduction.',
  '',
  'Rules:',
  '- "reason": ONE short line, MAXIMUM 12 words, no trailing period. Specific, not generic.',
  '- "talkingPoints": exactly 3. Each is a concrete conversation opener grounded ONLY in',
  '  the facts provided (roles, experience, posts, articles). Prefer their recent',
  '  posts/activity. Address the attendee directly ("You both…", "Ask them about…").',
  '- Never invent facts not present in the input. If the data is thin, stay honest and',
  '  high-level rather than fabricating specifics.',
].join('\n');

/** Render one curated profile (+ name) into a compact facts block. */
function personBlock(label, p) {
  const lines = [`${label}: ${p.name || 'Unknown'}`];
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  if (p.occupation) lines.push(`Role: ${p.occupation}`);
  if (p.industry) lines.push(`Industry: ${p.industry}`);
  if (p.country) lines.push(`Country: ${p.country}`);
  if (p.bio) lines.push(`Bio: ${p.bio}`);
  if (p.experiences?.length) {
    lines.push('Experience:');
    for (const e of p.experiences) {
      const head = [e.title, e.company].filter(Boolean).join(' at ');
      lines.push(`- ${head}${e.years ? ` (${e.years})` : ''}${e.description ? `: ${e.description}` : ''}`);
    }
  }
  if (p.activities?.length) {
    lines.push('Recent posts/activity:');
    for (const a of p.activities) lines.push(`- ${a}`);
  }
  if (p.articles?.length) {
    lines.push('Articles written:');
    for (const a of p.articles) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}

function buildPrompt(source, match) {
  return [
    personBlock('PERSON A (the attendee)', source),
    '',
    personBlock('PERSON B (their match)', match),
    '',
    'Write the match reason and 3 talking points PERSON A can use when meeting PERSON B.',
  ].join('\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** True for a rate-limit / quota error (429 / RESOURCE_EXHAUSTED). */
function isRateLimited(e) {
  const status = e?.status ?? e?.code;
  return status === 429 || status === 'RESOURCE_EXHAUSTED' || /quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(e?.message || '');
}
/** Honour the server's "Please retry in 56.0s" hint when present (ms), else 0. */
function serverRetryMs(e) {
  const m = /retry in ([\d.]+)s/i.exec(e?.message || '');
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : 0;
}

/**
 * @param {object} source - curated profile + { name, slug } for the attendee
 * @param {object} match  - curated profile + { name, slug } for their match
 * @param {object} [opts]
 * @param {number} [opts.retries] retry budget for rate-limit (429) errors only.
 *   Default 0 — the LIVE reveal must fail fast to a deterministic reason, never
 *   block. The offline batch passes a budget so a transient 429 isn't lost.
 * @returns {Promise<{reason: string, talkingPoints: string[]}|null>} null on any failure
 */
export async function generateReasonAndPoints(source, match, { retries = 0 } = {}) {
  const key = source?.slug && match?.slug ? `${source.slug}::${match.slug}` : null;
  if (key && _cache.has(key)) return _cache.get(key);

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await genaiClient().models.generateContent({
        model: MODEL,
        contents: buildPrompt(source, match),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: RESPONSE_SCHEMA,
          // Thinking off: cuts per-call latency from ~4s (with 9–12s tail spikes) to a
          // steady ~1.3s. For a grounded one-liner + 3 points it costs no real quality,
          // and it keeps the block-until-ready reveal snappy.
          thinkingConfig: { thinkingBudget: 0 },
          temperature: 0.7,
        },
      });
      const parsed = JSON.parse(res.text);
      const reason = (parsed?.reason || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
      const talkingPoints = (Array.isArray(parsed?.talkingPoints) ? parsed.talkingPoints : [])
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 3);

      // Only accept a complete result; a partial one falls back to deterministic.
      if (!reason || talkingPoints.length !== 3) return null;

      const out = { reason, talkingPoints };
      if (key) _cache.set(key, out);
      return out;
    } catch (e) {
      if (attempt < retries && isRateLimited(e)) {
        // Prefer the server's hint; otherwise exponential backoff, capped at 60s.
        await sleep((serverRetryMs(e) || Math.min(60000, 2000 * 2 ** attempt)) + 250);
        continue;
      }
      return null;
    }
  }
}
