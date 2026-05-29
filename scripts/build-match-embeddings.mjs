/**
 * Precompute the candidate-pool embeddings the live walk-in matcher scores against.
 *
 * For each of the 453 indexed WOO profiles we embed the SAME text a live walk-in
 * produces (see lib/match-core.mjs), join in the display fields the reveal needs
 * (name/role/company/country/headshot/linkedin), and write one flat file:
 *
 *   lib/match_embeddings.json  →  { model, dim, count, builtAt, vectors: [...] }
 *
 * The API route (app/api/match) loads this once and does cosine in-process — so
 * matching a walk-in is one embed call + a vector sweep, no per-request scrape of
 * the 453 and no reasoning LLM.
 *
 * Source of embed text: the saved scrape at
 *   scripts/output/linkedin-profiles/<public_identifier>/profile_data.json
 * (richest signal). Falls back to the thin index-map fields if a scrape is missing.
 *
 * RUN:  node scripts/build-match-embeddings.mjs
 *       (needs OPENAI_API_KEY; idempotent — safe to re-run after new scrapes)
 */

import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { embedTextFromProfile, embedOpenAI, cosine, EMBED_MODEL } from '../lib/match-core.mjs';
import { photoFile, photoPublicPath } from './lib/match-photos.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INDEX_MAP = path.join(ROOT, 'MASTER_DOCS', 'linkedin-profile-index-map.json');
const PROFILES_DIR = path.join(ROOT, 'scripts', 'output', 'linkedin-profiles');
const OUT = path.join(ROOT, 'lib', 'match_embeddings.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Round to 6 dp — keeps the file ~half size with no meaningful cosine drift.
const round6 = (v) => Math.round(v * 1e6) / 1e6;

function loadSavedProfile(publicIdentifier) {
  if (!publicIdentifier) return null;
  const p = path.join(PROFILES_DIR, publicIdentifier, 'profile_data.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

// Fallback embed text from the thin index-map entry when no scrape is on disk.
function thinText(e) {
  return [e.headline, e.occupation, e.title, e.company, e.country]
    .filter(Boolean).join('. ').trim();
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('\n✗ OPENAI_API_KEY is not set in .env\n');
    process.exit(1);
  }
  const indexMapRaw = JSON.parse(fs.readFileSync(INDEX_MAP, 'utf-8'));
  const entries = Array.isArray(indexMapRaw) ? indexMapRaw : Object.values(indexMapRaw);
  console.log(`Embedding ${entries.length} candidate profiles via ${EMBED_MODEL}…`);

  const vectors = [];
  let scraped = 0, thin = 0, skipped = 0;

  for (const e of entries) {
    const profile = loadSavedProfile(e.public_identifier);
    const text = profile ? embedTextFromProfile(profile) : thinText(e);
    if (!text) { skipped++; continue; }
    profile ? scraped++ : thin++;

    let vec;
    try {
      vec = await embedOpenAI(text);
    } catch (err) {
      console.error(`\n  ! embed failed for #${e.index} ${e.full_name}: ${err.message}`);
      skipped++;
      continue;
    }

    const hasPhoto = fs.existsSync(photoFile(ROOT, e.index));
    vectors.push({
      index: e.index,
      slug: e.public_identifier,
      name: e.full_name,
      role: e.title || e.occupation || '',
      company: e.company || '',
      country: e.country || '',
      linkedinUrl: e.linkedin_url || '',
      headshotUrl: hasPhoto ? photoPublicPath(e.index) : '',
      vec: vec.map(round6),
    });

    if (vectors.length % 25 === 0) process.stdout.write(`  …${vectors.length}\n`);
    await sleep(60); // gentle pacing; OpenAI limits are generous but no need to spike
  }

  const out = {
    model: EMBED_MODEL,
    dim: vectors[0]?.vec.length || 0,
    count: vectors.length,
    builtAt: new Date().toISOString(),
    vectors,
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  const mb = (fs.statSync(OUT).size / 1e6).toFixed(1);

  // Self-check: a profile should be its own nearest neighbour (sanity on the geometry).
  if (vectors.length > 1) {
    const a = vectors[0];
    let best = null;
    for (const b of vectors) {
      if (b.slug === a.slug) continue;
      const s = cosine(a.vec, b.vec);
      if (!best || s > best.s) best = { name: b.name, s };
    }
    console.log(`\n  sanity: "${a.name}" closest match → "${best.name}" (sim=${best.s.toFixed(3)})`);
  }

  console.log(`\n✓ Wrote lib/match_embeddings.json — ${out.count} vectors, dim ${out.dim}, ${mb} MB`);
  console.log(`  (${scraped} from scrapes, ${thin} from thin index-map, ${skipped} skipped)\n`);
}

main().catch((e) => {
  console.error('\n✗ Failed:', e.message, '\n');
  process.exit(1);
});
