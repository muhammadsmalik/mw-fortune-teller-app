/**
 * Build the two payloads that drive the booth flow, computing the match graph
 * FROM the embeddings (not the stale MASTER_DOCS/AGENT_WALLI/matching/MATCHES/matches.md), so the
 * precomputed picker path uses the exact same rules as the live walk-in matcher:
 *
 *   lib/twin_index.json    -> lightweight attendee directory for /select-name
 *                             (slug,name,role,company,email,linkedinUrl), name-sorted.
 *   lib/twin_matches.json  -> per-source match payload for /reveal + /concierge,
 *                             keyed by canonical slug: { source:{headshotUrl}, matches }.
 *
 * SOURCES (who picks their name at the booth) = the WOO attendees in the pool,
 * plus the confirmed RSVPs (most map onto a WOO embedding by url/name; the
 * handful with no LinkedIn data on file are listed as "matches pending" and fall
 * to the live walk-in path). CRM contacts are TARGETS only — they don't pick a
 * name, so they get no row here (a CRM person who shows up uses /api/match live).
 *
 * MATCHING is delegated to lib/match-select.mjs (shared with /api/match):
 *   exclude self + same company/country, then 1 WOO guaranteed + best 2 from
 *   WOO ∪ CRM by cosine similarity.
 *
 * TWIN-5 CAP (CEO ask): applied IN this generation step, not post-patched. A
 * capacity map starts every target at CAP and is decremented as matches are
 * assigned; selectMatches skips exhausted targets and falls to the next best, so
 * no one is shown as a match more than CAP times — and everyone still keeps 3.
 *
 * Grounded reasons + talking points (Gemini) are merged in from
 * lib/twin_match_reasons.json + lib/twin_talking_points.json when present, so a
 * rebuild never wipes the costly LLM pass. They are EMPTY on a first run; the
 * Gemini batch (scripts/generate-match-reasons.mjs) fills them, then you re-run
 * this script to fold them in.
 *
 * RUN:  node scripts/build-twin-matches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectMatches } from '../lib/match-select.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));
const readJSONOpt = (p) => { try { return readJSON(p); } catch { return {}; } };

const CAP = 5; // max times any one person may appear as someone else's match

const embeddings = readJSON('lib/match_embeddings.json');
const poolIndex = readJSON('lib/pool_index.json');           // emails live here
const rsvp = readJSON('lib/rsvp_attendees.json');
const talkingPointsBySource = readJSONOpt('lib/twin_talking_points.json'); // srcSlug->matchSlug->[points]
const reasonsBySource = readJSONOpt('lib/twin_match_reasons.json');        // srcSlug->matchSlug->reason
const matchProfiles = readJSONOpt('lib/match_profiles.json');              // slug->curated; absent = scrape failed

const vectors = embeddings.vectors;

// --- normalize helpers ---------------------------------------------------
const nameKey = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');

// Mirror scripts/build-pool-index.mjs::toSlug so RSVP urls resolve to pool slugs.
const toSlug = (url) => {
  if (!url || !url.includes('linkedin.com')) return '';
  const m = url.match(/\/in\/([^/?#]+)/i);
  if (!m) return '';
  return decodeURIComponent(m[1]).replace(/\/+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
};

// --- lookups -------------------------------------------------------------
const emailBySlug = {};
for (const [slug, p] of Object.entries(poolIndex)) if (p.email) emailBySlug[slug] = p.email;

const vectorBySlug = new Map(vectors.map((v) => [v.slug, v]));
const vectorByName = new Map();
for (const v of vectors) { const k = nameKey(v.name); if (k && !vectorByName.has(k)) vectorByName.set(k, v); }

// Email is the strongest RSVP→vector key when url+name both miss — e.g. an RSVP
// "Thimio Sotos" vs the scraped "Efthimios Thimio Sotos" (same person, different
// name form). Without this they'd resolve to a `pending` stub AND lose their email.
const vectorByEmail = new Map();
for (const [slug, p] of Object.entries(poolIndex)) {
  const e = (p.email || '').trim().toLowerCase();
  const v = vectorBySlug.get(slug);
  if (e && v && !vectorByEmail.has(e)) vectorByEmail.set(e, v);
}

// Resolve an RSVP person to their pool vector (so we can attach their email and
// know they're a real booth source). Returns the vector or null.
const vectorForRsvp = (r) =>
  vectorBySlug.get(toSlug(r.linkedinUrl)) ||
  vectorByName.get(nameKey(r.name)) ||
  vectorByEmail.get((r.email || '').trim().toLowerCase()) ||
  null;

// RSVP email keyed by the resolved pool slug; also collect RSVPs with no vector.
const rsvpEmailBySlug = {};
const rsvpOnly = []; // RSVPs we can't precompute (no LinkedIn data on file)
for (const r of rsvp) {
  const v = vectorForRsvp(r);
  if (v) { if (r.email) rsvpEmailBySlug[v.slug] = r.email; }
  else rsvpOnly.push(r);
}

// --- match graph (cap-aware, deterministic source order) -----------------
const isWoo = (v) => Array.isArray(v.lists) && v.lists.includes('woo');
const sources = vectors.filter(isWoo).sort((a, b) => a.index - b.index); // stable greedy order

const capacity = new Map(vectors.map((v) => [v.slug, CAP]));
const hasCapacity = (slug) => (capacity.get(slug) ?? CAP) > 0;

const matchObj = (srcSlug, { c, sim, confidence }) => ({
  slug: c.slug,
  index: c.index,
  name: c.name,
  role: c.role,
  company: c.company,
  country: c.country,
  lists: c.lists || [],
  confidence,
  matchReason: (reasonsBySource[srcSlug]?.[c.slug] || '').trim(),
  linkedinUrl: c.linkedinUrl,
  headshotUrl: c.headshotUrl || '',
  email: emailBySlug[c.slug] || '',
  talkingPoints: Array.isArray(talkingPointsBySource[srcSlug]?.[c.slug]) ? talkingPointsBySource[srcSlug][c.slug] : [],
  _sim: Math.round(sim * 1000) / 1000, // inspection aid; UI ignores it
});

const out = {};
const directory = [];
let shortCount = 0; // sources that couldn't get a full 3

let brokenSources = 0;
for (const v of sources) {
  const dirEntry = {
    slug: v.slug,
    name: v.name,
    role: v.role,
    company: v.company,
    // Picker pre-fill is RSVP-only by rule (Mehul, 2026-05-30 privacy decision):
    // only attendees who explicitly shared their email via the Meet-Your-Twin RSVP
    // list get it pre-populated at the concierge form. Do NOT fall back to the
    // enriched WOO/CRM pool email (`emailBySlug`) for non-RSVP sources — that stays
    // confined to the match-intro recipient field (see matchObj above).
    email: rsvpEmailBySlug[v.slug] || '',
    linkedinUrl: v.linkedinUrl,
  };

  // A source whose own profile failed to curate (errored/empty scrape) only yields
  // degenerate, reasonless matches. Flag it `pending` so the picker routes it to the
  // live walk-in (its LinkedIn URL is prefilled there) instead of a bad reveal.
  if (!matchProfiles[v.slug]) {
    brokenSources++;
    out[v.slug] = { source: { headshotUrl: v.headshotUrl || '' }, matches: [] };
    directory.push({ ...dirEntry, pending: true });
    continue;
  }

  const chosen = selectMatches(v.vec, v, vectors, { hasCapacity });
  for (const { c } of chosen) capacity.set(c.slug, (capacity.get(c.slug) ?? CAP) - 1);
  if (chosen.length < 3) shortCount++;

  out[v.slug] = { source: { headshotUrl: v.headshotUrl || '' }, matches: chosen.map((x) => matchObj(v.slug, x)) };
  directory.push(dirEntry);
}

// RSVP-only people with no embedding: still selectable, but flagged `pending` so
// the picker routes them into the live walk-in flow (paste LinkedIn → match)
// instead of a dead-end reveal — we have no precomputed matches for them.
for (const r of rsvpOnly) {
  const slug = r.slug;
  if (out[slug]) continue;
  // A pending entry with no LinkedIn URL can neither precompute NOR live-fallback
  // (the walk-in path has nothing to fetch) — picking it dead-ends. Drop it from
  // the picker entirely; if a URL is added later it reappears automatically.
  if (!(r.linkedinUrl || '').trim()) continue;
  out[slug] = { source: { headshotUrl: '' }, matches: [] };
  directory.push({ slug, name: r.name, role: r.role || '', company: r.company || '', email: r.email || '', linkedinUrl: r.linkedinUrl || '', pending: true });
}

directory.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(path.join(root, 'lib/twin_matches.json'), JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'lib/twin_index.json'), JSON.stringify(directory, null, 2) + '\n');

// --- report --------------------------------------------------------------
const entries = Object.values(out);
const withMatches = entries.filter((e) => e.matches.length).length;

// in-degree (how many times each target was chosen) for the cap audit
const inDegree = new Map();
let edges = 0, wooEdges = 0, crmEdges = 0;
for (const e of entries) for (const m of e.matches) {
  inDegree.set(m.slug, (inDegree.get(m.slug) || 0) + 1);
  edges++;
  if (m.lists.includes('woo')) wooEdges++;
  if (m.lists.includes('crm')) crmEdges++;
}
const degrees = [...inDegree.values()];
const maxDeg = Math.max(0, ...degrees);
const overCap = degrees.filter((d) => d > CAP).length;
const atCap = degrees.filter((d) => d === CAP).length;
const targetsUsed = inDegree.size;
const orphanTargets = vectors.length - targetsUsed; // pool members never shown as a match
const reasonsApplied = entries.reduce((n, e) => n + e.matches.filter((m) => m.matchReason).length, 0);
const pointsApplied = entries.reduce((n, e) => n + e.matches.filter((m) => m.talkingPoints.length).length, 0);

console.log('Wrote lib/twin_matches.json + lib/twin_index.json');
console.log(`  sources (rows):     ${entries.length}  (WOO ${sources.length} + RSVP-only ${rsvpOnly.length})`);
console.log(`  with matches:       ${withMatches}`);
console.log(`  matches pending:    ${entries.length - withMatches}  (RSVP-only ${rsvpOnly.length} + broken-scrape ${brokenSources})`);
console.log(`  sources short of 3: ${shortCount}`);
console.log(`  total edges:        ${edges}  (woo ${wooEdges} / crm ${crmEdges})`);
console.log(`  distinct targets:   ${targetsUsed} / ${vectors.length}  (orphans never shown: ${orphanTargets})`);
console.log(`  cap audit (CAP=${CAP}): max in-degree ${maxDeg}, at cap ${atCap}, OVER cap ${overCap}`);
console.log(`  gemini reasons merged:  ${reasonsApplied}`);
console.log(`  talking points merged:  ${pointsApplied}`);
