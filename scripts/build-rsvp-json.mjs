#!/usr/bin/env node
// Reads the Meet-Your-Twin RSVP CSV (LinkedIn URLs inline) and writes
// lib/rsvp_attendees.json for the WOO booth flow, deriving a stable slug per
// attendee from their LinkedIn URL (falls back to a name slug when blank).
//
// (The old Sheet1 export had no LinkedIn column, so this script used to
// email-join URLs off the master tracker; the updated export carries them
// inline, so that join is gone.)
//
// Re-run when the RSVP CSV changes:
//   node scripts/build-rsvp-json.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const RSVP_CSV = path.join(ROOT, 'ATTENDEES-RSVP-LISTS', 'Meet Your Twin RSVP List - RSVP - Updated.csv');
const OUT = path.join(ROOT, 'lib', 'rsvp_attendees.json');

// Minimal CSV parser that handles quoted fields and commas inside quotes.
function parseCsv(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function rowsToObjects(rows) {
  const [header, ...data] = rows;
  return data
    .filter((r) => r.some((v) => (v || '').trim().length > 0))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractLinkedInSlug(url) {
  if (!url) return null;
  const m = String(url).match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

// "De Lella, Guillermo" -> "Guillermo De Lella"
function normalizeName(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  if (s.includes(',')) {
    const [last, first] = s.split(',').map((x) => x.trim());
    if (first && last) return `${first} ${last}`;
  }
  return s;
}

const rsvpRows = rowsToObjects(parseCsv(fs.readFileSync(RSVP_CSV, 'utf-8')))
  // Drop rows that carry only a stray index column (e.g. the trailing blank row),
  // so the picker never shows a nameless "(no name)" entry.
  .filter((row) => (row['Full Name'] || '').trim());

const out = rsvpRows.map((row) => {
  const name = normalizeName(row['Full Name']);
  const email = (row['Email'] || '').toLowerCase().trim();
  const nameKey = slugify(name);
  // LinkedIn URL is now inline in the RSVP export (blank for a handful of rows).
  const linkedinUrl = (row['LinkedIn'] || '').trim();
  const slug = extractLinkedInSlug(linkedinUrl) || nameKey;
  return {
    slug,
    name,
    email,
    company: row['Company Name'] || '',
    role: row['Designation'] || '',
    country: row['Country'] || '',
    companyType: row['Company Type'] || '',
    linkedinUrl,
  };
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

const withLi = out.filter((a) => a.linkedinUrl).length;
console.log(`Wrote ${out.length} attendees to ${path.relative(ROOT, OUT)}`);
console.log(`  ${withLi} have an inline LinkedIn URL`);
console.log(`  ${out.length - withLi} missing — slug fell back to name slug`);
