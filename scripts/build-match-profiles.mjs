/**
 * Precompute curated LLM-ready profiles for the candidate pool, so the live
 * walk-in matcher (app/api/match) can write match reasons + talking points
 * WITHOUT reading the raw scrape dir (which isn't part of the deployed app).
 *
 *   lib/match_profiles.json  →  { [slug]: curatedProfile }
 *
 * Kept SEPARATE from lib/match_embeddings.json on purpose: the embeddings file is
 * loaded for vector math on every request and we don't want to bloat it with text.
 *
 * Source: the saved scrapes at
 *   scripts/output/linkedin-profiles/<public_identifier>/profile_data.json
 * curated via lib/profile-extract.mjs (drops PII + noise).
 *
 * RUN:  node scripts/build-match-profiles.mjs   (no API key needed; idempotent)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractProfileForLLM } from '../lib/profile-extract.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const POOL_INDEX = path.join(ROOT, 'lib', 'pool_index.json');
const PROFILES_DIR = path.join(ROOT, 'scripts', 'output', 'linkedin-profiles');
const OUT = path.join(ROOT, 'lib', 'match_profiles.json');

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

function main() {
  const pool = JSON.parse(fs.readFileSync(POOL_INDEX, 'utf-8'));
  const entries = Object.values(pool);

  const profiles = {};
  let curated = 0, missing = 0;
  for (const e of entries) {
    const slug = e.slug;
    if (!slug) continue;
    const raw = loadSavedProfile(slug);
    if (!raw) { missing++; continue; }
    profiles[slug] = extractProfileForLLM(raw);
    curated++;
  }

  fs.writeFileSync(OUT, JSON.stringify(profiles));
  const mb = (fs.statSync(OUT).size / 1e6).toFixed(2);
  console.log(`\n✓ Wrote lib/match_profiles.json — ${curated} profiles, ${mb} MB (${missing} had no saved scrape)\n`);
}

main();
