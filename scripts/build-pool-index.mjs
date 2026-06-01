/**
 * Build the unified candidate-pool index from the canonical source lists, tagging
 * each person with which list(s) they belong to. This drives the expanded matcher:
 * a valid match set is 1 WOO attendee + 2 from (WOO ∪ CRM).
 *
 *   lib/pool_index.json  →  { [slug]: { slug, lists, name, role, company, country, linkedinUrl, email } }
 *     lists: ['woo'] | ['crm'] | ['woo','crm']
 *
 * Sources (in ATTENDEES-RSVP-LISTS/):
 *   WOO_London_Attendee_Tracker_Final_Enriched.csv  → list 'woo' (the WOO London attendees)
 *   CRM-List.csv                                     → list 'crm'
 * (The "Meet Your Twin RSVP" list is the source/picker directory, not a match
 *  target, so it is NOT a pool list — handled in build-twin-matches.mjs.)
 *
 * `slug` is the scrape-dir name (matches scripts/output/linkedin-profiles/<slug>),
 * so the embedding builder can load each person's saved profile.
 *
 * RUN:  node scripts/build-pool-index.mjs   (no API key needed)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { photoFile, photoPublicPath } from './lib/match-photos.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LISTS = path.join(ROOT, 'ATTENDEES-RSVP-LISTS');
const OLD_INDEX = path.join(ROOT, 'MASTER_DOCS', 'AGENT_WALLI', 'matching', 'linkedin-profile-index-map.json');
const OUT = path.join(ROOT, 'lib', 'pool_index.json');

// Minimal CSV parser (handles quoted fields + embedded commas/newlines).
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readCSVObjects(file) {
  const rows = parseCSV(fs.readFileSync(file, 'utf8'));
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
}

// Mirror scripts/scrape-attendee-linkedin-profiles.js so slugs match the on-disk dirs.
function toSlug(url) {
  if (!url || !url.includes('linkedin.com')) return '';
  const m = url.match(/\/in\/([^/?#]+)/i);
  if (!m) return '';
  const raw = decodeURIComponent(m[1]).replace(/\/+$/, '');
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Local headshots are stored as public/match-photos/<KEY>.jpg, where KEY is the
// index-map's object key — that's what download-profile-pics.mjs writes. Use the
// SAME key here, NOT the 1-based `e.index` field: `e.index === key + 1` for every
// entry, so referencing `e.index` pointed each person at the NEXT person's photo.
// Map slug → local photo path so already-photographed people keep their booth
// headshots in the expanded pool. (New people get '' → UI shows initials.)
const legacyHeadshot = {};
try {
  const old = JSON.parse(fs.readFileSync(OLD_INDEX, 'utf8'));
  for (const [idx, e] of Object.entries(old)) {
    const key = toSlug(e.linkedin_url) || (e.public_identifier || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (key && fs.existsSync(photoFile(ROOT, idx))) legacyHeadshot[key] = photoPublicPath(idx);
  }
} catch { /* optional */ }

const pool = {};
const add = (slug, list, fields) => {
  if (!slug) return;
  if (!pool[slug]) pool[slug] = { slug, lists: [], name: '', role: '', company: '', country: '', linkedinUrl: '', email: '', headshotUrl: legacyHeadshot[slug] || '' };
  const p = pool[slug];
  if (!p.lists.includes(list)) p.lists.push(list);
  // First non-empty value wins per field (keeps the richer source's data).
  for (const [k, v] of Object.entries(fields)) if (v && !p[k]) p[k] = v;
};

// 1) WOO London attendees (final enriched). No Title column → role filled from the
//    scraped profile at embed time.
for (const r of readCSVObjects(path.join(LISTS, 'WOO_London_Attendee_Tracker_Final_Enriched.csv'))) {
  const url = r['LinkedIn Profile URL'];
  add(toSlug(url), 'woo', {
    name: r['Full Name'], company: r['Company'], country: r['Country'], email: r['Email'], linkedinUrl: url,
  });
}

// 2) CRM list. Region stands in for country (cross-market signal); Title → role.
for (const r of readCSVObjects(path.join(LISTS, 'CRM-List.csv'))) {
  const url = r['LinkedIn'];
  const name = [r['First Name'], r['Last Name']].filter(Boolean).join(' ');
  add(toSlug(url), 'crm', {
    name, role: r['Title'], company: r['Company'], country: r['Region'], email: r['Email'], linkedinUrl: url,
  });
}

fs.writeFileSync(OUT, JSON.stringify(pool, null, 2) + '\n');

// --- report ---
const all = Object.values(pool);
const scraped = new Set(fs.existsSync(path.join(ROOT, 'scripts/output/linkedin-profiles'))
  ? fs.readdirSync(path.join(ROOT, 'scripts/output/linkedin-profiles')) : []);
const count = (pred) => all.filter(pred).length;
console.log(`\n✓ Wrote lib/pool_index.json — ${all.length} unique people`);
console.log(`  woo only:  ${count((p) => p.lists.length === 1 && p.lists[0] === 'woo')}`);
console.log(`  crm only:  ${count((p) => p.lists.length === 1 && p.lists[0] === 'crm')}`);
console.log(`  both:      ${count((p) => p.lists.length === 2)}`);
console.log(`  have a scrape on disk: ${count((p) => scraped.has(p.slug))}/${all.length}\n`);
