/**
 * Twin Tracker — WOO Forum "twinning" pipeline, the DETERMINISTIC core (Item 3).
 *
 * The matching strategy avoids context pollution: we never hand Gemini all ~400
 * people at once. Instead Gemini PROPOSES pairs from a small batch, and THIS file
 * ENFORCES the hard rules in code:
 *   • 1:1 — each person belongs to exactly one match (no duplicates).
 *   • full coverage — loop until nobody is left unmatched.
 *   • odd-one-out — the final leftover is attached to an existing pair as a trio.
 *
 * State is a plain JSON file (scripts/twins.json) — zero deps, and resumable: a
 * run can crash mid-way and the matched/unmatched state is preserved on disk.
 *
 * DATA MODEL (twins.json)
 *   people:  [{ id, name, linkedin_data, google_search_data }]
 *   matches: [{ id, a, b, c|null, kind:'pair'|'trio', reason, created_at }]
 *   - linkedin_data       = raw LinkedIn text (POC stand-in: the archetypes_data.json summary)
 *   - google_search_data  = enrichment object from scripts/enrich-attendee.mjs --all
 *
 * THE LOOP (run by an operator / a driver script)
 *   1. init                                 # build the table once
 *   2. while >1 unmatched:
 *        batch --size 20 --out b.json       # emit unmatched batch (small → no pollution)
 *        <send b.json to Gemini, get back proposed pairs as pairs.json>
 *        record-batch pairs.json            # extract the 2-id pairs; dupes auto-rejected
 *   3. leftover --auto                       # attach the final odd person to a pair (trio)
 *   4. status                                # confirm everyone is matched
 *
 * USAGE
 *   node scripts/twin-tracker.mjs init
 *   node scripts/twin-tracker.mjs status
 *   node scripts/twin-tracker.mjs batch --size 20 [--out b.json]
 *   node scripts/twin-tracker.mjs record --a 2 --b 15 --reason "both ANZ OOH"
 *   node scripts/twin-tracker.mjs record-batch pairs.json
 *   node scripts/twin-tracker.mjs leftover [--auto]
 *   node scripts/twin-tracker.mjs assign-trio --leftover 6 --pair 1
 *   node scripts/twin-tracker.mjs reset
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.dirname(HERE);
const STORE_PATH = path.join(HERE, 'twins.json');
const ARCHETYPES_PATH = path.join(ROOT, 'lib', 'archetypes_data.json');
const ENRICHED_PATH = path.join(HERE, 'enriched_attendees.json');

const rel = (p) => path.relative(ROOT, p);

// ─────────────────────────────────────────────────────────────────────────────
// JSON store helpers
// ─────────────────────────────────────────────────────────────────────────────
function loadStore() {
  if (!fs.existsSync(STORE_PATH)) return { people: [], matches: [] };
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
}
function saveStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}
function matchedIds(store) {
  const ids = new Set();
  for (const m of store.matches) {
    ids.add(m.a);
    ids.add(m.b);
    if (m.c != null) ids.add(m.c);
  }
  return ids;
}
function unmatchedPeople(store) {
  const done = matchedIds(store);
  return store.people.filter((p) => !done.has(p.id));
}
function nameOf(store, id) {
  return store.people.find((p) => p.id === id)?.name ?? id;
}
const nowIso = () => new Date().toISOString().slice(0, 19) + 'Z';

// ─────────────────────────────────────────────────────────────────────────────
// arg parsing (tiny)
// ─────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};
const has = (name) => argv.includes(name);
const positional = () => argv.slice(1).find((a) => !a.startsWith('--'));

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────
function cmdInit() {
  if (!fs.existsSync(ARCHETYPES_PATH)) {
    console.error(`✗ Missing ${ARCHETYPES_PATH}`);
    process.exit(1);
  }
  const attendees = JSON.parse(fs.readFileSync(ARCHETYPES_PATH, 'utf-8'));

  // Optional enrichment cache (from enrich-attendee.mjs --all), joined by name.
  const enrichedByName = new Map();
  if (fs.existsSync(ENRICHED_PATH)) {
    for (const e of JSON.parse(fs.readFileSync(ENRICHED_PATH, 'utf-8'))) {
      const key = (e.fullName || '').trim().toLowerCase();
      if (key) enrichedByName.set(key, e);
    }
  } else {
    console.log(`  · No enrichment cache yet (${rel(ENRICHED_PATH)}).`);
    console.log('    google_search_data will be null until you run: node scripts/enrich-attendee.mjs --all');
  }

  const store = loadStore(); // preserve any existing matches
  const byId = new Map(store.people.map((p) => [p.id, p]));
  attendees.forEach((a, idx) => {
    const id = idx + 1;
    const name = a.name || `Attendee ${id}`;
    const enriched = enrichedByName.get(name.trim().toLowerCase()) || null;
    const existing = byId.get(id);
    byId.set(id, {
      id,
      name,
      linkedin_data: a.summary ?? null, // POC stand-in for raw LinkedIn data
      // keep prior enrichment if this run has none
      google_search_data: enriched ?? existing?.google_search_data ?? null,
    });
  });
  store.people = [...byId.values()].sort((x, y) => x.id - y.id);
  saveStore(store);
  const nEnriched = store.people.filter((p) => p.google_search_data).length;
  console.log(`✓ Loaded ${store.people.length} people into ${rel(STORE_PATH)} (${nEnriched} with google_search_data).`);
}

function cmdStatus() {
  const store = loadStore();
  const total = store.people.length;
  const unmatched = unmatchedPeople(store);
  console.log(`\n  People:    ${total}`);
  console.log(`  Matched:   ${total - unmatched.length}`);
  console.log(`  Unmatched: ${unmatched.length}`);

  if (store.matches.length) {
    console.log(`\n  Matches (${store.matches.length}):`);
    for (const m of store.matches) {
      let label = `${nameOf(store, m.a)} ↔ ${nameOf(store, m.b)}`;
      if (m.c != null) label += ` + ${nameOf(store, m.c)} (trio)`;
      console.log(`    #${m.id} [${m.kind}] ${label}${m.reason ? `  — ${m.reason}` : ''}`);
    }
  }
  if (unmatched.length) {
    console.log(`\n  Still unmatched:`);
    for (const p of unmatched) console.log(`    ${p.id}: ${p.name}`);
  }
  console.log();
}

function cmdBatch() {
  const store = loadStore();
  const size = Number(flag('--size') ?? 20);
  const pool = unmatchedPeople(store);
  const batch = pool.slice(0, size).map((p) => ({
    id: p.id,
    name: p.name,
    linkedin_data: p.linkedin_data,
    google_search_data: p.google_search_data,
  }));
  const out = JSON.stringify(batch, null, 2);
  const outFile = flag('--out');
  if (outFile) {
    fs.writeFileSync(outFile, out);
    console.log(`✓ Wrote batch of ${batch.length} (of ${pool.length} unmatched) → ${outFile}`);
  } else {
    console.log(out);
  }
}

// Validate + insert one pair. Returns { ok, msg }.
function recordPair(store, a, b, reason) {
  const ids = new Set(store.people.map((p) => p.id));
  if (a === b) return { ok: false, msg: `skip: a and b are the same id (${a})` };
  if (!ids.has(a)) return { ok: false, msg: `skip: id ${a} not in people` };
  if (!ids.has(b)) return { ok: false, msg: `skip: id ${b} not in people` };
  const done = matchedIds(store);
  if (done.has(a)) return { ok: false, msg: `skip: id ${a} already matched (duplicate)` };
  if (done.has(b)) return { ok: false, msg: `skip: id ${b} already matched (duplicate)` };
  const nextId = (store.matches.at(-1)?.id ?? 0) + 1;
  store.matches.push({ id: nextId, a, b, c: null, kind: 'pair', reason: reason ?? null, created_at: nowIso() });
  return { ok: true, msg: `✓ matched ${a} ↔ ${b}` };
}

function cmdRecord() {
  const store = loadStore();
  const a = Number(flag('--a'));
  const b = Number(flag('--b'));
  const { ok, msg } = recordPair(store, a, b, flag('--reason'));
  console.log(msg);
  if (ok) saveStore(store);
  else process.exit(1);
}

function cmdRecordBatch() {
  const file = positional();
  if (!file) {
    console.error('✗ usage: record-batch <gemini_response.json>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const pairs = Array.isArray(data) ? data : data.pairs ?? [];
  const store = loadStore();
  let recorded = 0;
  let skipped = 0;
  for (const item of pairs) {
    const a = Array.isArray(item) ? item[0] : item.a;
    const b = Array.isArray(item) ? item[1] : item.b;
    const reason = Array.isArray(item) ? null : item.reason;
    const { ok, msg } = recordPair(store, Number(a), Number(b), reason);
    console.log(`  ${msg}`);
    ok ? recorded++ : skipped++;
  }
  saveStore(store);
  console.log(`\n✓ Recorded ${recorded}, skipped ${skipped}.`);
}

function cmdLeftover() {
  const store = loadStore();
  const pool = unmatchedPeople(store);
  if (pool.length === 0) {
    console.log('✓ Everyone is matched. Nothing left to do.');
    return;
  }
  if (pool.length > 1) {
    console.log(`  ${pool.length} people still unmatched — keep batching, this isn't the final leftover yet:`);
    for (const p of pool) console.log(`    ${p.id}: ${p.name}`);
    return;
  }
  const leftover = pool[0];
  const pairs = store.matches.filter((m) => m.kind === 'pair');
  if (!pairs.length) {
    console.error(`✗ ${leftover.name} is unmatched but there are no pairs to attach to yet.`);
    process.exit(1);
  }
  console.log(`  Final leftover: ${leftover.id}: ${leftover.name}`);
  if (has('--auto')) {
    pairs[0].c = leftover.id;
    pairs[0].kind = 'trio';
    saveStore(store);
    console.log(`✓ Attached to match #${pairs[0].id} as a trio.`);
  } else {
    console.log('  Candidate pairs to attach to (choose the most relevant, then run assign-trio):');
    for (const m of pairs) console.log(`    pair #${m.id}: ${nameOf(store, m.a)} ↔ ${nameOf(store, m.b)}`);
  }
}

function cmdAssignTrio() {
  const store = loadStore();
  const leftover = Number(flag('--leftover'));
  const pairId = Number(flag('--pair'));
  if (matchedIds(store).has(leftover)) {
    console.error(`✗ id ${leftover} is already matched.`);
    process.exit(1);
  }
  const m = store.matches.find((x) => x.id === pairId);
  if (!m) {
    console.error(`✗ no match with id ${pairId}.`);
    process.exit(1);
  }
  if (m.c != null) {
    console.error(`✗ match #${pairId} is already a trio.`);
    process.exit(1);
  }
  m.c = leftover;
  m.kind = 'trio';
  saveStore(store);
  console.log(`✓ Attached ${leftover} to match #${pairId} as a trio.`);
}

function cmdReset() {
  if (fs.existsSync(STORE_PATH)) {
    fs.rmSync(STORE_PATH);
    console.log(`✓ Removed ${rel(STORE_PATH)}`);
  } else {
    console.log('· No store to remove.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
const commands = {
  init: cmdInit,
  status: cmdStatus,
  batch: cmdBatch,
  record: cmdRecord,
  'record-batch': cmdRecordBatch,
  leftover: cmdLeftover,
  'assign-trio': cmdAssignTrio,
  reset: cmdReset,
};

if (!commands[cmd]) {
  console.error(`Unknown command: ${cmd ?? '(none)'}\nCommands: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}
commands[cmd]();
