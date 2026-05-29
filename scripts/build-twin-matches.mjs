/**
 * Build the two payloads that drive the booth flow, from one pass over the data:
 *   lib/twin_index.json    -> lightweight attendee directory for the /select-name
 *                             picker (slug,name,role,company,email,linkedinUrl),
 *                             pre-sorted by name. Keeps the heavy match graph out
 *                             of the picker's client bundle.
 *   lib/twin_matches.json  -> per-attendee match payload for /reveal + /concierge,
 *                             keyed by canonical slug: { source: { headshotUrl }, matches }.
 *
 * Both are derived from the same loop so the picker can never list someone the
 * reveal can't resolve.
 *
 * Built from the UNION of two inputs (decision: cover every WOO attendee, not
 * just confirmed RSVPs):
 *   MASTER_DOCS/linkedin-profile-index-map.json  -> the 453 WOO attendee tracker
 *       (idx -> { full_name, title, company, country, public_identifier, linkedin_url }).
 *       Every one of these has a precomputed matches row.
 *   lib/rsvp_attendees.json                       -> the 39 confirmed RSVPs
 *       (slug, name, email, company, role, country, linkedinUrl). Source of the
 *       only emails we have; ~18 of these are NOT in the tracker.
 *
 *   MASTER_DOCS/MATCHES/matches.md  -> minified JSON: { "<idx>": [[matchIdx, conf, reason], x3] }
 *
 * Join rules:
 *   - Tracker people are keyed by public_identifier; their matches come from
 *     matches.md[index]. If a confirmed RSVP matches (by slug/url/name), its
 *     curated fields + email win for display.
 *   - RSVP-only people (not in the tracker) are added with an empty matches list
 *     — they show a "matches pending" reveal until scraped/matched, but are still
 *     selectable at the booth.
 *
 * Talking points come from lib/twin_talking_points.json (sourceSlug -> matchSlug
 * -> [points]); merged here so re-running never wipes the costly grounded pass.
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

// Title-case a slug as a last-resort display name ("john-smith" -> "John Smith").
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

// RSVP lookups so a tracker person can claim their curated fields + email.
const rsvpByKey = new Map(); // slug / url-slug / name-key -> rsvp record
for (const r of rsvp) {
  for (const key of [norm(r.slug), slugFromUrl(r.linkedinUrl), nameKey(r.name)]) {
    if (key && !rsvpByKey.has(key)) rsvpByKey.set(key, r);
  }
}
const findRsvp = (p) => {
  for (const key of [norm(p.public_identifier), slugFromUrl(p.linkedin_url), nameKey(p.full_name)]) {
    if (key && rsvpByKey.has(key)) return rsvpByKey.get(key);
  }
  return null;
};

// One builder for an attendee's directory fields, so the picker entry and the
// reveal headshot are shaped from a single place. RSVP fields win over tracker
// fields for display; `p`/`idx` are absent for RSVP-only people.
const buildPerson = (slug, r, p = {}, idx = null) => ({
  slug,
  name: (r && r.name) || p.full_name || nameFromSlug(p.public_identifier),
  role: (r && r.role) || p.title || p.occupation || '',
  company: (r && r.company) || p.company || '',
  email: (r && r.email) || '',
  linkedinUrl: (r && r.linkedinUrl) || p.linkedin_url || '',
  headshotUrl: idx == null ? '' : localPic(idx),
});

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
    talkingPoints: [], // overridden below from twin_talking_points.json when present
  };
};

const applyPoints = (slug, matches) => {
  const overrides = talkingPointsBySource[slug] || {};
  let applied = 0;
  for (const m of matches) {
    if (Array.isArray(overrides[m.slug])) {
      m.talkingPoints = overrides[m.slug];
      applied += 1;
    }
  }
  return applied;
};

// Record one attendee into both payloads. Returns true if matches were attached.
const out = {};
const directory = [];
const addPerson = (person, matches) => {
  out[person.slug] = { source: { headshotUrl: person.headshotUrl }, matches };
  const { headshotUrl, ...dirItem } = person; // picker never needs the headshot
  directory.push(dirItem);
};

// --- build ---------------------------------------------------------------
const claimedRsvp = new Set();
const withPoints = [];

// 1) Every WOO attendee from the tracker (all have a matches row).
for (const [idx, p] of Object.entries(indexMap)) {
  const slug = norm(p.public_identifier) || slugFromUrl(p.linkedin_url) || String(idx);
  if (out[slug]) continue; // pids are unique, but be defensive
  const r = findRsvp(p);
  if (r) claimedRsvp.add(r.slug);

  const triples = matchesByIndex[idx];
  const matches = Array.isArray(triples) ? triples.map((t) => resolveMatch(...t)) : [];
  if (applyPoints(slug, matches) > 0) withPoints.push(`${p.full_name} (${slug})`);
  addPerson(buildPerson(slug, r, p, idx), matches);
}

// 2) Confirmed RSVPs not in the tracker — selectable, but matches pending.
for (const r of rsvp) {
  const slug = norm(r.slug);
  if (claimedRsvp.has(r.slug) || out[slug]) continue;
  addPerson(buildPerson(slug, r), []);
}

directory.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(path.join(root, 'lib/twin_matches.json'), JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'lib/twin_index.json'), JSON.stringify(directory, null, 2) + '\n');

// --- report --------------------------------------------------------------
const entries = Object.values(out);
const withMatches = entries.filter((e) => e.matches.length).length;
console.log(`Wrote lib/twin_matches.json + lib/twin_index.json`);
console.log(`  attendees:        ${entries.length} (tracker ${Object.keys(indexMap).length} + RSVP-only ${entries.length - Object.keys(indexMap).length})`);
console.log(`  with matches:     ${withMatches}`);
console.log(`  matches pending:  ${entries.length - withMatches}`);
console.log(`  talking points populated: ${withPoints.length}`);
withPoints.forEach((w) => console.log(`    - ${w}`));
