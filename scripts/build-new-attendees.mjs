// Clean the "Net-New Attendees (Not in Tracker)" export into a pending-source
// feed for the booth picker. These people are NOT in the embedded pool, so they
// can't have precomputed twins — they go into lib/new_attendees.json and
// build-twin-matches lists them as `pending` (findable by name, URL pre-filled,
// matched live via /api/match). No scrape, no re-embed, no match reshuffle.
//
// The source "LINKED IN PROFILES" column is messy: real URLs, "not found",
// search-result links, and bare display text ("Barry Frey | LinkedIn"). Only
// rows with a real /in/ profile URL survive; everything else is dropped (a
// pending entry with no URL can't live-fallback — same rule as build-twin-matches).
//
// RUN:  node scripts/build-new-attendees.mjs   (no API key needed)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'ATTENDEES-RSVP-LISTS', 'WOO_New_Attendees_With_LinkedIn.xlsx - New Attendees - Not in Tracker.csv');
const OUT = path.join(ROOT, 'lib', 'new_attendees.json');

function parseCsv(text) {
  const rows = []; let cur = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else { if (c === '"') q = true; else if (c === ',') { cur.push(f); f = ''; }
      else if (c === '\n') { cur.push(f); rows.push(cur); cur = []; f = ''; }
      else if (c === '\r') { } else f += c; }
  }
  if (f.length || cur.length) { cur.push(f); rows.push(cur); }
  return rows;
}

// Mirror build-twin-matches.mjs::toSlug so resolution there computes the same key.
const toSlug = (url) => {
  if (!url || !/linkedin\.com\/in\//i.test(url)) return '';
  const m = url.match(/\/in\/([^/?#]+)/i);
  if (!m) return '';
  return decodeURIComponent(m[1]).replace(/\/+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
};

// Pull a clean canonical profile URL from a messy cell, or '' if none.
function cleanUrl(raw) {
  const s = (raw || '').trim();
  if (!s) return '';
  if (/^(not\s*f?o?und|not\s*available|n\/a)$/i.test(s)) return '';
  if (/\/search\/results/i.test(s)) return '';            // search link, not a profile
  if (!/linkedin\.com\/in\//i.test(s)) return '';         // "Name | LinkedIn" display text
  const m = s.match(/\/in\/([^/?#\s]+)/i);
  if (!m) return '';
  return `https://www.linkedin.com/in/${m[1]}`;           // drop locale path/query suffixes
}

const rows = parseCsv(fs.readFileSync(SRC, 'utf8'));
const data = rows.filter((r) => /^\d+$/.test((r[0] || '').trim()) && (r[1] || '').trim());

const seen = new Set();
const out = [];
let dropped = 0, dupes = 0;
for (const r of data) {
  const name = (r[1] || '').trim();
  const linkedinUrl = cleanUrl(r[6]);
  if (!linkedinUrl) { dropped++; continue; }
  const slug = toSlug(linkedinUrl);
  if (!slug) { dropped++; continue; }
  if (seen.has(slug)) { dupes++; continue; }
  seen.add(slug);
  out.push({ slug, name, email: '', company: (r[3] || '').trim(), role: '', country: (r[4] || '').trim(), linkedinUrl });
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${out.length} attendees with a usable LinkedIn URL to ${path.relative(ROOT, OUT)}`);
console.log(`  dropped (no usable URL): ${dropped}   in-file dupes: ${dupes}`);
console.log('  (already-in-pool people are de-duped downstream in build-twin-matches.)');
