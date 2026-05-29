/**
 * Shared matching core — used by both the offline embedding builder
 * (scripts/build-match-embeddings.mjs) and the live walk-in matcher
 * (app/api/match/route.js).
 *
 * The whole point of sharing this: the 453 precomputed profiles and a live
 * walk-in are turned into vectors the SAME way, so cosine similarity between
 * them is meaningful. If the two sides built their embed text differently, the
 * geometry would be apples-to-oranges and the matches would be noise.
 *
 * Embeddings: OpenAI text-embedding-3-small (no reasoning-LLM call — the match
 * is pure geometry, per the twin-matcher hypothesis).
 */

export const EMBED_MODEL = process.env.POC_OPENAI_EMBED_MODEL || 'text-embedding-3-small';

/**
 * Build the text we embed from an EnrichLayer profile object (the shape is
 * identical whether it came from a saved scrape or a live fetch). Names are
 * deliberately EXCLUDED — we want similarity on professional substance
 * (role, industry, experience, skills), not on whose name sounds alike.
 */
export function embedTextFromProfile(p) {
  if (!p || typeof p !== 'object') return '';
  const experiences = Array.isArray(p.experiences)
    ? p.experiences.slice(0, 4)
        .map((e) => [e.title, e.company].filter(Boolean).join(' at '))
        .filter(Boolean)
    : [];
  const skills = Array.isArray(p.skills) ? p.skills.slice(0, 12) : [];
  const parts = [
    p.headline,
    p.occupation,
    p.industry,
    p.summary,
    experiences.join('; '),
    [p.city, p.country_full_name || p.country].filter(Boolean).join(', '),
    skills.join(', '),
  ].filter(Boolean);
  return parts.join('. ').replace(/\s+/g, ' ').trim().slice(0, 6000);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Embed one string via OpenAI. Light backoff on 429 (rate limit). */
export async function embedOpenAI(text, { apiKey = process.env.OPENAI_API_KEY, attempts = 4 } = {}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  if (!text) throw new Error('embedOpenAI: empty text');
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    });
    const data = await res.json();
    if (res.ok) {
      const values = data?.data?.[0]?.embedding;
      if (!Array.isArray(values)) throw new Error('no embedding values in response');
      return values;
    }
    if (res.status === 429) { lastErr = new Error('429'); await sleep(1500 * 2 ** i); continue; }
    throw new Error(`OpenAI embed ${res.status}: ${JSON.stringify(data?.error || data).slice(0, 200)}`);
  }
  throw new Error(`OpenAI embed failed after ${attempts} attempts: ${lastErr?.message}`);
}

/** Cosine similarity between two equal-length vectors. */
export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

/** Loose equality for company / country strings (case + whitespace + trailing punctuation). */
export function norm(s) {
  return (s || '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}
