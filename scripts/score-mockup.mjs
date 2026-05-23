/**
 * Media-Owner Scorecard Mockup — WOO Forum (London)
 * ---------------------------------------------------
 * Standalone one-off. Scores ONE media owner across 3 dimensions
 * (Discoverability, Ease of Purchase, Measurement) using 3 ISOLATED, PARALLEL
 * Google-Search-grounded Gemini calls — one per dimension. Each call sees ONLY
 * its own dimension (no shared/poisoned context), then renders an on-brand
 * "Oracle's Reading" HTML scorecard and (if Resend is configured) emails it.
 *
 * Each dimension returns EXACTLY 3 short, specific, second-person bullets
 * (skimmable at a conference) — not a paragraph.
 *
 * THREE ANTI-HALLUCINATION LAYERS:
 *   L1 prevent  — prompt forces concrete, evidence-cited bullets, strict per-
 *                 dimension scope, and rejects vague marketing language.
 *   L2 verify   — require live Google Search grounding; capture source URLs;
 *                 each bullet self-cites its evidence.
 *   L3 reject   — regex blocklist kills vague/abstract phrasing; enforce exactly
 *                 3 bullets, valid score, non-empty evidence; retry on failure.
 *
 * This is a stakeholder mockup — NOT wired into the app.
 *
 * RUN:  node scripts/score-mockup.mjs
 *       (scores all 3 dimensions in 3 isolated parallel calls)
 *
 * REQUIRES in .env:  GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY)
 * OPTIONAL in .env:  RESEND_API_KEY, RESEND_FROM_EMAIL, SCORE_MOCKUP_TO, GEMINI_MODEL_NAME
 */

import 'dotenv/config';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE MEDIA OWNER  →  replace these fields with one real RSVP attendee.
//    The more context you give, the better the grounded research.
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE = {
  // ── STAND-IN for pipeline test — replace with a real RSVP attendee. ──
  fullName: 'Sean Reilly',
  title: 'Chief Executive Officer',
  company: 'Lamar Advertising Company',
  region: 'USA',
  linkedinUrl: 'https://www.linkedin.com/company/lamar-advertising-company/',
  // Free-text: anything you already know (inventory type, scale, markets, tech stack).
  context: 'One of the largest out-of-home advertising companies in the US; extensive billboard, logo-sign, transit and airport inventory across the US and Canada; large and fast-growing digital billboard (DOOH) network.',
};

// Where to email the mockup (optional). Falls back to your inbox.
const SEND_TO = process.env.SCORE_MOCKUP_TO || 'aarizsajan2@gmail.com';

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE 3 SCORING DIMENSIONS (per the meeting — media-owner specific)
//    Each has a tight IN-SCOPE / OUT-OF-SCOPE so isolated calls stay in lane
//    and the same fact (e.g. VIOOH) can't bleed into the wrong dimension.
// ─────────────────────────────────────────────────────────────────────────────
const DIMENSIONS = {
  discoverability: {
    label: 'Discoverability',
    // Meeting: "how easily their media can be found via search or AI".
    question: 'How easily can buyers — and AI assistants — FIND this media owner and their inventory online?',
    inScope:
      'Search-engine and AI visibility; quality and clarity of their website; whether their screens / locations / inventory are publicly listed, described and indexed; presence in OOH directories and listings.',
    outOfScope:
      'Do NOT mention how to BOOK or BUY the inventory, programmatic / SSP / DSP connectivity, marketplaces, pricing, or audience measurement. Those are scored by other dimensions — ignore them entirely here.',
    high: 'Easy to find on Google / AI; inventory and locations clearly listed and indexed.',
    low: 'Effectively invisible online; no findable inventory or location data.',
  },
  easeOfPurchase: {
    label: 'Ease of Purchase',
    // Meeting: "connectivity to demand partners and external marketplaces".
    question: 'How easily can a buyer actually TRANSACT — through connectivity to demand partners and external marketplaces?',
    inScope:
      'Programmatic connectivity (their SSP, and the DSPs / demand partners they connect to); inclusion in external marketplaces and exchanges; self-serve or automated booking.',
    outOfScope:
      'Do NOT mention whether they can be FOUND online (Discoverability) or any audience / impression / measurement data (Measurement). Ignore those entirely here.',
    high: 'Tradable programmatically via major SSP/DSPs and external marketplaces; self-serve booking.',
    low: 'Manual only (email / phone); no programmatic or marketplace access.',
  },
  measurement: {
    label: 'Measurement',
    // Meeting: "provision of data points".
    question: 'Does this media owner PROVIDE solid data points to prove what a campaign delivered?',
    inScope:
      'Audience / impression data and methodology; third-party verification or auditing; attribution and post-campaign reporting; the data points they hand a buyer.',
    outOfScope:
      'Do NOT mention whether they can be FOUND (Discoverability) or how to BOOK / BUY (Ease of Purchase). Ignore those entirely here.',
    high: 'Provides robust, third-party-verified audience data and clear reporting.',
    low: 'No data; gut-feel reach claims only.',
  },
};

const DIM_KEYS = ['discoverability', 'easeOfPurchase', 'measurement'];

// ── LAYER 3: abstract / marketing-fluff phrases that get output REJECTED. ──
// (Adapted from the app's placeholder-detection in generate-initial-fortune.)
const BANNED_PHRASES = [
  /revolutionis|revolutioniz/i, /world[- ]?class/i, /cutting[- ]?edge/i,
  /industry[- ]?lead/i, /market[- ]?lead/i, /well[- ]?positioned/i, /leverage/i,
  /synerg/i, /best[- ]?in[- ]?class/i, /game[- ]?chang/i, /seamless/i,
  /\bunlock\b/i, /empower/i, /to new heights/i, /state[- ]?of[- ]?the[- ]?art/i,
  /\[.*?\]/, /\byour company\b/i, /valued (user|client|customer)/i, /robust solution/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Gemini setup — @google/generative-ai SDK (Developer API, AIza key)
// ─────────────────────────────────────────────────────────────────────────────
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

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

const profileBlock = `
- Name: ${PROFILE.fullName}
- Title: ${PROFILE.title}
- Company: ${PROFILE.company}
- Region: ${PROFILE.region}
- LinkedIn: ${PROFILE.linkedinUrl}
- Known context: ${PROFILE.context}`.trim();

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

// SDK call → { text, sources, queries }. Captures grounding for Layer 2.
async function ask(prompt) {
  const result = await model.generateContent(prompt);
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

// Build the isolated, single-dimension prompt. It never names the other dimensions.
function dimensionPrompt(key) {
  const d = DIMENSIONS[key];
  return `You are auditing an out-of-home (OOH) MEDIA OWNER for Moving Walls using live Google Search.

Research this person and their company:
${profileBlock}

You are scoring ONE dimension only: ${d.label}.
WHAT IT MEASURES: ${d.question}
IN SCOPE: ${d.inScope}
OUT OF SCOPE: ${d.outOfScope}
SCORE 0–100, where high (≈90) = ${d.high} and low (≈20) = ${d.low}. Give EXACTLY 3 bullets.

${RULES}

Return ONLY raw JSON:
{ "score": 0-100, "bullets": [ {"point":"...","evidence":"..."}, {"point":"...","evidence":"..."}, {"point":"...","evidence":"..."} ] }`;
}

// ── Score all 3 dimensions in ISOLATED, SEQUENTIAL calls. ──
// Each call is still fully isolated (sees only its own dimension) — isolation comes from
// separate calls, NOT from running them simultaneously. Sequential + spacing is required:
// the grounded endpoint 429s under parallel load and drops grounding-chunk citations.
async function scoreDimensions() {
  const settled = [];
  for (const key of DIM_KEYS) {
    try {
      const r = await scoreWithRetry(dimensionPrompt(key), (p) => validateDimension(DIMENSIONS[key].label, p));
      const flag = r.lowConfidence ? ` ⚠ LOW CONFIDENCE (${r.parsed.bullets.length} grounded)` : '';
      console.log(`  · ${DIMENSIONS[key].label}: ${r.parsed.score} (${r.sources.length} sources)${flag}`);
      settled.push([key, r]);
    } catch (e) {
      // Nothing grounded after retries — withhold rather than ship a guess.
      console.log(`  · ${DIMENSIONS[key].label}: WITHHELD — ${e.message}`);
      settled.push([key, { parsed: { score: null, bullets: [], _ungrounded: true }, sources: [], queries: [], lowConfidence: true }]);
    }
    await new Promise((res) => setTimeout(res, 4000));
  }

  const out = {};
  let sources = [];
  let queries = [];
  for (const [key, r] of settled) {
    out[key] = r.parsed;
    out[key].lowConfidence = r.lowConfidence;
    out[key]._groundingSources = r.sources.map((s) => s.domain);
    sources = sources.concat(r.sources);
    queries = queries.concat(r.queries);
  }
  // Data-driven summary: weakest dimension among the ones we could actually verify (ignore withheld).
  const scored = DIM_KEYS.filter((k) => typeof out[k].score === 'number');
  if (scored.length) {
    const lowest = [...scored].sort((a, b) => out[a].score - out[b].score)[0];
    out.summary = `Your lowest-scoring area is ${DIMENSIONS[lowest].label} (${out[lowest].score}/100) — the fastest place to win back buyers.`;
  }
  return { scores: out, sources, queries };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML scorecard — dark mystical "Oracle's Reading" (matches the app's fortune email)
// ─────────────────────────────────────────────────────────────────────────────
const NAVY = '#151E43';
const LIGHT = '#5BADDE';
const GOLD = '#FEDA24';

function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// One dimension: score bar + 3 skimmable bullets. Table layout (not flex) for email safety.
function dimensionRow(label, score, bullets, lowConfidence) {
  const withheld = typeof score !== 'number';
  const pct = clampScore(score);
  const scoreCell = withheld
    ? `&mdash;<span style="font-size:11px;color:#8aa0c8;"> /100</span>`
    : `${pct}<span style="font-size:11px;color:#8aa0c8;">/100</span>`;
  const n = (bullets || []).length;
  const note = withheld
    ? `<li style="margin:7px 0;color:${GOLD};font-size:13px;line-height:1.45;">Could not verify any claim against live sources — score withheld.</li>`
    : (lowConfidence
        ? `<li style="margin:7px 0;color:${GOLD};font-size:12px;font-style:italic;line-height:1.45;">Low confidence — only ${n} grounded ${n === 1 ? 'claim' : 'claims'} found.</li>`
        : '');
  const items = (bullets || [])
    .map(
      (b) =>
        `<li style="margin:7px 0;color:#dce6f7;font-size:13px;line-height:1.45;">${escapeHtml(b.point)}</li>`
    )
    .join('') + note;
  return `
    <div style="margin:22px 0;">
      <table width="100%" style="border-collapse:collapse;"><tr>
        <td style="text-align:left;font-weight:700;color:${GOLD};font-size:15px;letter-spacing:.3px;">${escapeHtml(label)}</td>
        <td style="text-align:right;font-weight:700;color:#ffffff;font-size:18px;">${scoreCell}</td>
      </tr></table>
      <div style="background:rgba(255,255,255,0.09);border-radius:20px;height:9px;margin:8px 0;overflow:hidden;">
        <div style="width:${withheld ? 0 : pct}%;height:9px;background:${LIGHT};border-radius:20px;"></div>
      </div>
      <ul style="margin:6px 0 0;padding-left:18px;">${items}</ul>
    </div>`;
}

function buildScorecardHtml(scores, modeLabel, sourceCount) {
  const scoredKeys = DIM_KEYS.filter((k) => typeof scores[k]?.score === 'number');
  const overall = scoredKeys.length
    ? Math.round(scoredKeys.reduce((s, k) => s + clampScore(scores[k].score), 0) / scoredKeys.length)
    : 0;
  const rows = DIM_KEYS.map((k) => dimensionRow(DIMENSIONS[k].label, scores[k]?.score, scores[k]?.bullets, scores[k]?.lowConfidence)).join('');
  const firstName = (PROFILE.fullName || '').split(' ')[0] || 'there';
  const trust = sourceCount ? `Backed by ${sourceCount} live web sources` : 'Backed by live web search';

  return `
  <div style="max-width:600px;margin:auto;text-align:left;background:${NAVY};border:1px solid #2a3566;border-radius:14px;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif;color:#eaf0fa;">
    <div style="padding:30px 28px 22px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:12px;letter-spacing:3px;color:${LIGHT};text-transform:uppercase;white-space:nowrap;">&#10024; The Oracle&#39;s Reading &#10024;</div>
      <div style="font-size:24px;font-weight:800;margin-top:10px;color:#ffffff !important;">${escapeHtml(PROFILE.fullName)}</div>
      <div style="font-size:13px;color:#9fb2d8;margin-top:3px;">${escapeHtml(PROFILE.title)} &middot; ${escapeHtml(PROFILE.company)} &middot; ${escapeHtml(PROFILE.region)}</div>
    </div>
    <div style="padding:24px 28px 28px;">
      <p style="color:#c2cfe6;font-size:14px;line-height:1.65;margin:0 0 20px;">Hello ${escapeHtml(firstName)}, &#10024; the cards have been consulted. Here is your fortune as a media owner &mdash; read across the three realms that decide whether your inventory is <em>found</em>, <em>bought</em>, and <em>believed</em>.</p>
      <div style="text-align:center;margin:6px 0 20px;padding:18px;background:rgba(254,218,36,0.06);border:1px solid rgba(254,218,36,0.28);border-radius:12px;">
        <div style="font-size:12px;letter-spacing:2px;color:${GOLD};text-transform:uppercase;">Your Fortune Score</div>
        <div style="font-size:50px;font-weight:800;color:#ffffff;line-height:1.05;">${overall}<span style="font-size:18px;color:#7e93bd;">/100</span></div>
      </div>
      ${rows}
      ${scores.summary ? `<p style="margin-top:22px;padding:14px 16px;background:rgba(91,173,222,0.08);border-left:3px solid ${LIGHT};color:#dce6f7;font-size:13px;border-radius:6px;font-style:italic;">&#128302; ${escapeHtml(scores.summary)}</p>` : ''}
      <p style="margin-top:24px;color:#c2cfe6;font-size:13px;line-height:1.6;">Best regards,<br/><span style="color:${GOLD};font-style:italic;">Your AI Fortune Teller at Moving Walls &#128640;</span></p>
      <p style="margin-top:16px;font-size:10px;color:#5e6e92;text-align:center;letter-spacing:.5px;">${escapeHtml(trust)} &middot; ${escapeHtml(modeLabel)} &middot; ${new Date().toISOString().slice(0, 10)}</p>
    </div>
  </div>`;
}

function fullEmailHtml(inner) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background-color:#0c0e16;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0c0e16;padding:24px;">
    <tr><td align="center">
      ${inner}
    </td></tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output: email the scorecard (if Resend configured)
// ─────────────────────────────────────────────────────────────────────────────
async function emit(result) {
  const { scores, sources } = result;
  const modeLabel = '3 isolated parallel calls';
  const uniqueSources = [...new Map(sources.map((s) => [s.uri, s])).values()];

  const html = fullEmailHtml(buildScorecardHtml(scores, modeLabel, uniqueSources.length));

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const { error } = await resend.emails.send({
      from: `Moving Walls Scorecard <${from}>`,
      to: [SEND_TO],
      subject: `Media Owner Scorecard — ${PROFILE.fullName}`,
      html,
    });
    if (error) console.error('  ✗ email failed:', error.message);
    else console.log(`  ✓ emailed scorecard → ${SEND_TO}`);
  } else {
    console.log('  · RESEND_API_KEY not set → no email sent. Set RESEND_API_KEY in .env to deliver the scorecard.');
  }
}

// Print scores + bullets to the console so you can sanity-check without opening anything.
function printScores(scores) {
  for (const k of DIM_KEYS) {
    const sc = scores[k]?.score;
    const tag = scores[k]?.lowConfidence ? (typeof sc === 'number' ? ' (low confidence)' : ' (withheld)') : '';
    console.log(`  · ${DIMENSIONS[k].label}: ${sc ?? '—'}${tag}`);
    (scores[k]?.bullets || []).forEach((b) => {
      const src = b.groundedBy?.length ? b.groundedBy.join(', ') : (b.evidence || 'no source');
      console.log(`      ${b.verified ? '✓' : '⚠'} ${b.point}  [${src}]`);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  if (PROFILE.fullName.startsWith('REPLACE')) {
    console.warn('\n⚠  PROFILE is still placeholder text. Edit the PROFILE block at the top with a real RSVP attendee for meaningful scores.\n');
  }
  console.log(`Model: ${MODEL_NAME}  |  Target: ${PROFILE.fullName} (${PROFILE.company})\n`);
  console.log('▶ Scoring 3 dimensions in isolated, parallel calls…');

  const result = await scoreDimensions();
  printScores(result.scores);
  await emit(result);
  console.log('\nDone. Check the email and send to Sal.\n');
}

main().catch((e) => {
  console.error('\n✗ Failed:', e.message, '\n');
  process.exit(1);
});
