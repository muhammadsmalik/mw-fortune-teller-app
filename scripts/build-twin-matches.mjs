/**
 * Build lib/twin_matches.json — the match payload the booth flow reads.
 *
 * Joins three sources, keyed by the attendee SLUG that /select-name stores
 * (selectedAttendeeSlug) and /reveal + /concierge look up:
 *
 *   MASTER_DOCS/MATCHES/matches.md          -> minified JSON: { "<idx>": [[matchIdx, conf, reason], x3] }
 *   MASTER_DOCS/linkedin-profile-index-map.json -> idx -> { full_name, title, company, country, public_identifier, linkedin_url }
 *   lib/rsvp_attendees.json                 -> the 39 selectable attendees (slug, name, ...)
 *
 * Output shape (consumed by app/reveal/page.js + app/concierge/page.js + send-email):
 *   { "<attendeeSlug>": { matches: [ { slug, name, role, company, country, confidence,
 *                                       matchReason, linkedinUrl, talkingPoints: [] } x3 ] } }
 *
 * Talking points are intentionally left EMPTY here — they come from the (costly)
 * grounded automation and are deferred until the CRM list is finalized so we only
 * run that pass once. The screens render names/roles/companies fine without them;
 * the expand-for-talking-points UI simply stays collapsed until populated.
 *
 * RUN:  node scripts/build-twin-matches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { photoFile, photoPublicPath } from './lib/match-photos.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const matchesByIndex = JSON.parse(read('MASTER_DOCS/MATCHES/matches.md').trim());
const indexMap = JSON.parse(read('MASTER_DOCS/linkedin-profile-index-map.json'));
const rsvp = JSON.parse(read('lib/rsvp_attendees.json'));

// Grounded talking points, keyed by sourceSlug -> matchSlug -> [points].
// Optional: merged in below so re-running this generator never wipes them.
let talkingPointsBySource = {};
try {
  talkingPointsBySource = JSON.parse(read('lib/twin_talking_points.json'));
} catch {
  // optional file — fine if absent
}

// --- normalize helpers ---------------------------------------------------
const norm = (s) =>
  decodeURIComponent(String(s || ''))
    .toLowerCase()
    .replace(/\/+$/, '')
    .trim();

// pull the "/in/<slug>" piece out of a linkedin url
const slugFromUrl = (url) => {
  const m = String(url || '').match(/\/in\/([^/?#]+)/i);
  return m ? norm(m[1]) : '';
};

// Order-independent name key: "Boaca Dio" and "Dio Boaca" -> "boaca dio".
const nameKey = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');

// Build slug -> index and name -> index lookups from the index map.
const slugToIndex = new Map();
const nameToIndex = new Map();
for (const [idx, p] of Object.entries(indexMap)) {
  for (const key of [norm(p.public_identifier), slugFromUrl(p.linkedin_url)]) {
    if (key && !slugToIndex.has(key)) slugToIndex.set(key, idx);
  }
  const nk = nameKey(p.full_name);
  if (nk && !nameToIndex.has(nk)) nameToIndex.set(nk, idx);
}

const findIndex = (attendee) => {
  // 1. real LinkedIn identifier (slug or url) — most reliable
  for (const key of [norm(attendee.slug), slugFromUrl(attendee.linkedinUrl)]) {
    if (key && slugToIndex.has(key)) return slugToIndex.get(key);
  }
  // 2. fall back to name (RSVP slugs are name-derived, often "Last First")
  const nk = nameKey(attendee.name);
  if (nk && nameToIndex.has(nk)) return nameToIndex.get(nk);
  return null;
};

// Title-case a slug as a last-resort display name (e.g. "john-smith" -> "John Smith").
const nameFromSlug = (slug) =>
  decodeURIComponent(String(slug || ''))
    .replace(/-+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\d+/g, '')
    .trim();

const CONF = { H: 'High', M: 'Medium', L: 'Low' };

// Local profile pic (downloaded by scripts/download-profile-pics.mjs), keyed by
// index. Returns the public path if present, else '' (UI falls back to initials).
const localPic = (idx) => (fs.existsSync(photoFile(root, idx)) ? photoPublicPath(idx) : '');

const resolveMatch = (matchIdx, conf, reason) => {
  const p = indexMap[matchIdx] || {};
  const slug = norm(p.public_identifier) || slugFromUrl(p.linkedin_url) || String(matchIdx);
  const linkedinUrl =
    p.linkedin_url ||
    (p.public_identifier ? `https://www.linkedin.com/in/${decodeURIComponent(p.public_identifier)}` : '');
  return {
    slug,
    index: Number(matchIdx),
    name: p.full_name || nameFromSlug(p.public_identifier) || `Profile #${matchIdx}`,
    role: p.title || p.occupation || '',
    company: p.company || '',
    country: p.country || '',
    confidence: CONF[conf] || conf || '',
    matchReason: reason || '',
    linkedinUrl,
    headshotUrl: localPic(matchIdx),
    talkingPoints: [], // deferred — populated by the grounded automation post-CRM
  };
};

// --- build ---------------------------------------------------------------
const out = {};
const unmapped = [];
const withPoints = [];

for (const attendee of rsvp) {
  const idx = findIndex(attendee);
  if (idx == null) {
    unmapped.push(`${attendee.name} (${attendee.slug})`);
    continue;
  }
  const triples = matchesByIndex[idx];
  if (!Array.isArray(triples) || triples.length === 0) {
    unmapped.push(`${attendee.name} (idx ${idx}, no matches row)`);
    continue;
  }
  const overrides = talkingPointsBySource[attendee.slug] || {};
  let pointsApplied = 0;
  const matches = triples.map(([mi, conf, reason]) => {
    const m = resolveMatch(mi, conf, reason);
    if (Array.isArray(overrides[m.slug])) {
      m.talkingPoints = overrides[m.slug];
      pointsApplied += 1;
    }
    return m;
  });
  if (pointsApplied > 0) withPoints.push(`${attendee.name} (${pointsApplied}/3 matches)`);
  out[attendee.slug] = { source: { headshotUrl: localPic(idx) }, matches };
}

fs.writeFileSync(path.join(root, 'lib/twin_matches.json'), JSON.stringify(out, null, 2) + '\n');

// --- report --------------------------------------------------------------
console.log(`Wrote lib/twin_matches.json`);
console.log(`  mapped:   ${Object.keys(out).length}/${rsvp.length} RSVP attendees`);
console.log(`  talking points populated: ${withPoints.length}`);
withPoints.forEach((w) => console.log(`    - ${w}`));
console.log(`  unmapped: ${unmapped.length}`);
unmapped.forEach((u) => console.log(`    - ${u}`));
