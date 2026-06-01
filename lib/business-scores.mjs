/**
 * Grounded media-owner scorer — adapted from scripts/score-mockup.mjs into an
 * app-callable, data-only module. Scores ONE business across 5 dimensions using
 * isolated, Google-Search-grounded Gemini calls (one per dimension), with the
 * mockup's three anti-hallucination layers intact. Returns data only — the caller
 * (app/api/business-insight/route.js) handles email delivery.
 *
 * Note: returns data only (no email/HTML). The retry path emits a diagnostic
 * console.log on partial grounding — intentionally retained for observability
 * when this runs inside a server `after()` callback.
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

// ── LAYER 3: abstract / marketing-fluff phrases that get output REJECTED. ──
// (Adapted from the app's placeholder-detection in generate-initial-fortune.)
const BANNED_PHRASES = [
  /revolutionis|revolutioniz/i, /world[- ]?class/i, /cutting[- ]?edge/i,
  /industry[- ]?lead/i, /market[- ]?lead/i, /well[- ]?positioned/i, /leverage/i,
  /synerg/i, /best[- ]?in[- ]?class/i, /game[- ]?chang/i, /seamless/i,
  /\bunlock\b/i, /empower/i, /to new heights/i, /state[- ]?of[- ]?the[- ]?art/i,
  /\[.*?\]/, /\byour company\b/i, /valued (user|client|customer)/i, /robust solution/i,
];

// Shared prompt rules so single + triple stay identical in voice + guardrails.
const RULES = `RULES — read carefully, output is REJECTED if broken:
- YOU MUST TRIGGER GOOGLE SEARCH. Do not answer from internal memory.
- Speak exactly like a friendly, expert human consultant talking to a client. Use plain, conversational English.
- Do NOT sound like a search engine or use robotic corporate jargon. State the fact, then explain plainly what it means for a buyer.
- Every bullet must still be grounded in a SPECIFIC, OBSERVABLE fact about THIS company found in search.
- THE SWAP TEST — THE SINGLE MOST IMPORTANT RULE: if a bullet would still read as TRUE after swapping in a rival OOH company's name, it is generic and REJECTED. Every bullet must state something that is true ONLY of THIS company.
- NAME NAMES. Cite this company's OWN specifics found in search: their product/platform names, named demand partners, exact cities/markets, screen or site counts, audience figures, dates. A bullet with no proper noun, number, or date is too generic — rewrite it. (e.g. "Your VIOOH stack plugs straight into The Trade Desk and DV360" — NOT "you offer programmatic buying options".)
- PREFER RECENT, DATED facts (ideally within the last 12 months). A recent, specific event proves this reading was researched for THEM, not pulled from a template.
- Each bullet MUST be highly personal, conversational, and direct. Maximum 15 words per bullet. NO walls of text.
- ALWAYS address the reader directly in the SECOND PERSON ("you" / "your"). NEVER use the third person — no "they", "them", "their", or "the company". The media owner is reading about themselves.
- ❌ NEVER write vague marketing fluff. These are auto-rejected: "well positioned", "industry leader", "world-class", "cutting-edge", "leverage", "revolutionise", "seamless", "unlock", "[placeholder]".
- SUCCESS CRITERIA: judge against the concrete in-scope metrics defined above, but explain it conversationally.
- "evidence" = the exact source the bullet is based on (e.g. "jcdecaux.com/programmatic"). If you cannot verify something, state plainly what you could NOT find — never invent.`;

function extractJson(text) {
  // Strip ```json fences and grab the first {...} block.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model output:\n' + text);
  return JSON.parse(raw.slice(start, end + 1));
}

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

// SDK call → { text, sources, queries }. Captures grounding for Layer 2.
async function ask(prompt) {
  const result = await model().generateContent(prompt);
  const resp = result.response;
  const cand = resp?.candidates?.[0];
  const parts = cand?.content?.parts || [];
  const text = parts.map((p) => p.text).filter(Boolean).join('');
  if (!text) throw new Error('Empty response: ' + JSON.stringify(resp).slice(0, 400));
  const gm = cand?.groundingMetadata || {};
  // groundingChunks = the real pages Google returned. web.title is the real domain;
  // web.uri is an opaque Google redirect. groundingSupports maps response spans → chunks.
  // Keep groundingChunks index-aligned (DON'T drop nulls) so groundingSupports'
  // chunk indices still resolve. `sources` is the filtered list for display/counting.
  const chunks = (gm.groundingChunks || []).map((c) => (c.web ? { domain: c.web.title, uri: c.web.uri } : null));
  const sources = chunks.filter(Boolean);
  const supports = (gm.groundingSupports || []).map((s) => ({ text: s.segment?.text || '', chunks: s.groundingChunkIndices || [] }));
  const queries = gm.webSearchQueries || [];
  return { text, sources, chunks, supports, queries };
}

// ── LAYER 3: validate one dimension object { score, bullets:[{point,evidence}x3] }. ──
function validateDimension(label, dim) {
  if (typeof dim?.score !== 'number' || dim.score < 0 || dim.score > 100)
    throw new Error(`${label}: score missing or out of 0–100 range`);
  if (!Array.isArray(dim.bullets) || dim.bullets.length !== 3)
    throw new Error(`${label}: expected exactly 3 bullets, got ${dim.bullets?.length ?? 0}`);
  dim.bullets.forEach((b, i) => {
    if (!b?.point?.trim()) throw new Error(`${label} bullet ${i + 1}: empty point`);
    if (!b?.evidence?.trim()) throw new Error(`${label} bullet ${i + 1}: missing evidence`);
    const hit = BANNED_PHRASES.find((rx) => rx.test(b.point));
    if (hit) throw new Error(`${label} bullet ${i + 1} too abstract (matched ${hit}): "${b.point}"`);
  });
}

// ── LAYER 2 (real verification): mark each bullet against groundingSupports — the
// API's OWN map of which response span is backed by which source chunk — instead of
// string-matching the model's freeform "evidence". A bullet is verified iff a grounded
// segment overlapping it cites ≥1 real source; those source domains become groundedBy. ──
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sigWords = (s) => norm(s).split(' ').filter((w) => w.length > 3);

function verifyBullets(bullets, supports, chunks) {
  const grounded = (supports || []).filter((s) => (s.chunks || []).length);
  for (const b of bullets) {
    const words = sigWords(b.point);
    const domains = new Set();
    if (words.length) {
      for (const s of grounded) {
        const segWords = new Set(sigWords(s.text));
        const overlap = words.filter((w) => segWords.has(w)).length / words.length;
        if (overlap >= 0.5) for (const i of s.chunks) { const d = chunks[i]?.domain; if (d) domains.add(d); }
      }
    }
    b.groundedBy = [...domains];
    b.verified = b.groundedBy.length > 0;
  }
}

// Run a grounded call with retries, ENFORCING grounding: keep only bullets a retrieved
// source actually backs (verifyBullets), require 3 → pass. Can't get 3 after retries →
// return the grounded ones we DID find, flagged lowConfidence. Never fake an ungrounded
// bullet. Only the genuinely-empty case (0 grounded) throws → caller withholds the score.
async function scoreWithRetry(prompt, validate, attempts = 3) {
  let lastErr, best = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const { text, sources, chunks, supports, queries } = await ask(prompt);
      if (!queries.length) throw new Error('model did not search');
      const parsed = extractJson(text);
      validate(parsed);                                  // score + 3 bullets + no fluff
      verifyBullets(parsed.bullets, supports, chunks);   // sets verified + groundedBy
      const grounded = parsed.bullets.filter((b) => b.verified);
      if (!best || grounded.length > best.grounded.length)
        best = { parsed, sources, chunks, supports, queries, grounded };
      if (grounded.length >= 3) {
        parsed.bullets = grounded.slice(0, 3);
        return { parsed, sources, chunks, supports, queries, lowConfidence: false };
      }
      throw new Error(`only ${grounded.length}/3 bullets grounded in retrieved sources`);
    } catch (e) {
      lastErr = e;
      if (i < attempts) console.log(`    ↻ retry ${i}: ${e.message}`);
    }
  }
  // Exhausted — don't fake. Return only the grounded bullets we found, flagged low-confidence.
  if (best && best.grounded.length) {
    best.parsed.bullets = best.grounded;
    return { ...best, lowConfidence: true };
  }
  throw new Error(`no grounded bullets after ${attempts} attempts: ${lastErr.message}`);
}

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
 * @returns {Promise<{scores:object, sources:Array, queries:string[], summary:string, weakestKey:string}>}
 * @throws if EVERY dimension is withheld (nothing grounded) — caller sends the fallback email.
 */
export async function scoreBusiness(profile) {
  const settled = [];
  for (let idx = 0; idx < DIM_KEYS.length; idx++) {
    const key = DIM_KEYS[idx];
    try {
      const r = await scoreWithRetry(dimensionPrompt(key, profile), (p) => validateDimension(DIMENSIONS[key].label, p));
      settled.push([key, r]);
    } catch {
      settled.push([key, { parsed: { score: null, bullets: [], _ungrounded: true }, sources: [], queries: [], lowConfidence: true }]);
    }
    // 4s spacing BETWEEN dimensions only — the grounded endpoint 429s and drops
    // citations under load. No need to wait after the final dimension.
    if (idx < DIM_KEYS.length - 1) await new Promise((res) => setTimeout(res, 4000));
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
