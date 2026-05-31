/**
 * The costly grounded pass: generate a one-line match reason + 3 talking points
 * for every (attendee → match) pair, via Gemini (lib/match-reasons.mjs).
 *
 * Writes two merge-files that build-twin-matches.mjs folds in non-destructively
 * (same pattern as the handwritten talking points), so re-running the build never
 * wipes this pass, and re-running THIS pass skips pairs already generated:
 *   lib/twin_match_reasons.json   -> { sourceSlug: { matchSlug: reason } }
 *   lib/twin_talking_points.json  -> { sourceSlug: { matchSlug: [points] } }
 *
 * Curated profiles come from lib/match_profiles.json (build it first via
 * scripts/build-match-profiles.mjs). Pairs whose source or match has no curated
 * profile are skipped — the build leaves them on the deterministic reasonFor().
 *
 * RUN:  node scripts/generate-match-reasons.mjs [--limit N] [--force] [--concurrency N]
 *       (needs GEMINI_API_KEY)
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateReasonAndPoints } from '../lib/match-reasons.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJSON = (p, fallback) => {
  try { return JSON.parse(read(p)); } catch { return fallback; }
};

// --- args ---
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const LIMIT = Number(opt('--limit', 0)) || 0; // 0 = all
const FORCE = flag('--force');
const CONCURRENCY = Number(opt('--concurrency', 3)) || 3;
// Gemini free tier = 15 requests/min/model. Pace request STARTS to stay under it
// (1 every ~4.1s ≈ 14.6/min). Override with --rpm once billing raises the limit.
const RPM = Number(opt('--rpm', 14)) || 14;
const MIN_INTERVAL_MS = Math.ceil(60000 / RPM);
const RETRIES = Number(opt('--retries', 6)) || 6;

// --- inputs ---
// Source of pairs is the freshly-built match graph (keyed by canonical slug, the
// same slug match_profiles.json uses), so no index-map / normalization needed.
const twinMatches = readJSON('lib/twin_matches.json', null);
if (!twinMatches) {
  console.error('\n✗ lib/twin_matches.json missing — run: node scripts/build-twin-matches.mjs\n');
  process.exit(1);
}
const directory = readJSON('lib/twin_index.json', []);
const nameBySlug = Object.fromEntries(directory.map((d) => [d.slug, d.name]));

const matchProfiles = readJSON('lib/match_profiles.json', null);
if (!matchProfiles) {
  console.error('\n✗ lib/match_profiles.json missing — run: node scripts/build-match-profiles.mjs\n');
  process.exit(1);
}

const reasons = readJSON('lib/twin_match_reasons.json', {});
const points = readJSON('lib/twin_talking_points.json', {});

// --- assemble the work list ---
const tasks = [];
for (const [sourceSlug, entry] of Object.entries(twinMatches)) {
  const sourceCurated = matchProfiles[sourceSlug];
  if (!sourceCurated) continue; // no curated source → deterministic fallback
  for (const m of entry.matches || []) {
    const matchSlug = m.slug;
    const matchCurated = matchProfiles[matchSlug];
    if (!matchCurated) continue;
    const haveReason = !!reasons[sourceSlug]?.[matchSlug];
    const havePoints = Array.isArray(points[sourceSlug]?.[matchSlug]);
    if (!FORCE && haveReason && havePoints) continue; // already done
    tasks.push({
      sourceSlug, matchSlug,
      source: { name: nameBySlug[sourceSlug] || sourceSlug, slug: sourceSlug, ...sourceCurated },
      match: { name: m.name, slug: matchSlug, ...matchCurated },
    });
  }
}

const work = LIMIT ? tasks.slice(0, LIMIT) : tasks;
const etaMin = Math.ceil((work.length / RPM));
console.log(`Pairs to generate: ${work.length}${LIMIT ? ` (limited from ${tasks.length})` : ''}  ·  concurrency ${CONCURRENCY} · ${RPM} rpm · ~${etaMin} min`);

// --- run with a small concurrency pool + a request-rate gate -------------
let done = 0, ok = 0, failed = 0;
const set = (obj, a, b, v) => { (obj[a] ||= {})[b] = v; };
const persist = () => {
  fs.writeFileSync(path.join(root, 'lib/twin_match_reasons.json'), JSON.stringify(reasons, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'lib/twin_talking_points.json'), JSON.stringify(points, null, 2) + '\n');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Global gate: hand out request slots no faster than MIN_INTERVAL_MS apart, so
// the combined rate across all workers stays under the per-minute quota.
let nextSlot = 0;
async function gate() {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_INTERVAL_MS;
  if (slot > now) await sleep(slot - now);
}

async function worker() {
  while (true) {
    const t = work[done++];
    if (!t) return;
    await gate();
    const out = await generateReasonAndPoints(t.source, t.match, { retries: RETRIES });
    if (out) {
      // Non-destructive: never clobber a handwritten/prior reason or talking points.
      if (FORCE || !reasons[t.sourceSlug]?.[t.matchSlug]) set(reasons, t.sourceSlug, t.matchSlug, out.reason);
      if (FORCE || !Array.isArray(points[t.sourceSlug]?.[t.matchSlug])) set(points, t.sourceSlug, t.matchSlug, out.talkingPoints);
      ok++;
    } else {
      failed++;
    }
    const n = ok + failed;
    if (n % 25 === 0) { persist(); console.log(`  …${n}/${work.length} (ok ${ok}, failed ${failed})`); }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, work.length) }, worker));
persist();
// Fail loud: a non-trivial failure count means rate-limit/error, not "done".
const verdict = failed > work.length * 0.02 ? '⚠️  HIGH FAILURE RATE — likely rate-limited; re-run to fill gaps' : '✓';
console.log(`\n${verdict} Generated ${ok} pairs (${failed} failed). Wrote lib/twin_match_reasons.json + lib/twin_talking_points.json`);
console.log(`  Next: node scripts/build-twin-matches.mjs  (folds these into lib/twin_matches.json)\n`);
