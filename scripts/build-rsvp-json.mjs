#!/usr/bin/env node
// Joins the RSVP CSV (38 attendees) with the Master tracker CSV to pull
// LinkedIn URLs (matched on email), derives a stable slug per attendee,
// and writes lib/rsvp_attendees.json for the new WOO booth flow.
//
// Re-run when either CSV changes:
//   node scripts/build-rsvp-json.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const RSVP_CSV = path.join(ROOT, 'ATTENDEES-RSVP-LISTS', 'Meet Your Twin RSVP List - Sheet1.csv');
const MASTER_CSV = path.join(ROOT, 'ATTENDEES-RSVP-LISTS', 'WOO_London_Attendee_Tracker_Final_MASTER SHEET.xlsx - WOO 2026 Attendee Tracker.csv');
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

const rsvpRows = rowsToObjects(parseCsv(fs.readFileSync(RSVP_CSV, 'utf-8')));
const masterRows = rowsToObjects(parseCsv(fs.readFileSync(MASTER_CSV, 'utf-8')));

// Build email + name lookups from the master sheet. Prefer the confirmed
// "LinkedIn Profile URL" column; fall back to "URL 1" if absent.
const masterByEmail = new Map();
const masterByName = new Map();
for (const row of masterRows) {
  const url = row['LinkedIn Profile URL'] || row['LinkedIn Profile URL 1'] || '';
  if (!url) continue;
  const email = (row['Email'] || '').toLowerCase().trim();
  if (email && !masterByEmail.has(email)) masterByEmail.set(email, url);
  const nameKey = slugify(normalizeName(row['Full Name']));
  if (nameKey && !masterByName.has(nameKey)) masterByName.set(nameKey, url);
}

const out = rsvpRows.map((row) => {
  const name = normalizeName(row['Full Name']);
  const email = (row['Email'] || '').toLowerCase().trim();
  const nameKey = slugify(name);
  const linkedinUrl = masterByEmail.get(email) || masterByName.get(nameKey) || '';
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
console.log(`  ${withLi} matched to a LinkedIn URL via email join`);
console.log(`  ${out.length - withLi} missing — slug fell back to name slug`);
