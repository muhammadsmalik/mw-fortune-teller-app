import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { embedTextFromProfile, embedOpenAI, norm } from '@/lib/match-core.mjs';
import { selectMatches } from '@/lib/match-select.mjs';
import { extractProfileForLLM, extractIdentity } from '@/lib/profile-extract.mjs';
import { generateReasonAndPoints } from '@/lib/match-reasons.mjs';

export const runtime = 'nodejs';

// ── Candidate pool: load the precomputed 453 vectors once per server process. ──
// Built offline by scripts/build-match-embeddings.mjs. Cached at module scope so
// each request is just one embed call + an in-memory cosine sweep.
let POOL = null;
function getPool() {
  if (POOL) return POOL;
  const file = path.join(process.cwd(), 'lib', 'match_embeddings.json');
  POOL = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return POOL;
}

// ── Curated profiles for the pool (slug → curated), for LLM reason/talking-points.
// Built offline by scripts/build-match-profiles.mjs. Optional: if absent, matches
// keep the deterministic reasonFor() + empty talking points.
let PROFILES = null;
function getProfiles() {
  if (PROFILES) return PROFILES;
  try {
    PROFILES = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib', 'match_profiles.json'), 'utf-8'));
  } catch {
    PROFILES = {};
  }
  return PROFILES;
}

function normalizeLinkedInUrl(url) {
  try {
    const parsed = new URL(String(url).trim());
    // Accept linkedin.com, www.linkedin.com, and any country subdomain
    // (sg./uk./in./… — LinkedIn serves localized hosts that resolve to the same profile).
    const host = parsed.hostname.toLowerCase();
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;
    const m = parsed.pathname.match(/^\/in\/([A-Za-z0-9\-_%]+)\/?$/);
    if (!m) return null;
    return `https://www.linkedin.com/in/${m[1]}`;
  } catch {
    return null;
  }
}

// Deterministic, no-LLM match reason: surface a shared professional theme + the
// match's country (the cross-market angle). Honest and on-brand, costs nothing.
const THEMES = [
  ['leadership', /ceo|founder|owner|president|managing|director|chief|head of/],
  ['sales & commercial', /sales|revenue|commercial|business development/],
  ['marketing & brand', /marketing|brand/],
  ['data & measurement', /data|measurement|analytics|insight/],
  ['product & technology', /tech|product|engineering|platform|software/],
  ['media & OOH', /media|advertis|ooh|out.of.home|outdoor|dooh/],
];
function reasonFor(srcRole, m) {
  const a = (srcRole || '').toLowerCase();
  const b = (m.role || '').toLowerCase();
  for (const [label, rx] of THEMES) {
    if (rx.test(a) && rx.test(b)) return `Shared ${label} focus · ${m.country || 'global'}`;
  }
  return `Cross-market connection · ${m.country || 'global'}`;
}

// Turn an EnrichLayer profile into { source, matches }. Shared by both entry
// points: the LinkedIn-URL paste (fetches the profile first) and the
// name+company resolve path (hands us the already-enriched profile, no re-fetch).
// Throws an Error with a `.status` for the known degraded cases (sparse → 422,
// no matches → 404); the caller maps those to responses.
async function runMatch(profile, linkedinUrl) {
    // 2. Source identity (what the reveal panel + concierge will show).
    const { photoUrl, ...identity } = extractIdentity(profile);
    const source = { ...identity, linkedinUrl, headshotUrl: photoUrl };

    // 3. Embed the walk-in the SAME way the pool was built.
    const text = embedTextFromProfile(profile);
    if (!text) { const e = new Error('That profile is too sparse to match on.'); e.status = 422; throw e; }
    const vec = await embedOpenAI(text);

    // 4-5. Exclusion + composition, shared with the precomputed picker graph via
    //      lib/match-select.mjs so a walk-in and a name-picker get the same rules.
    //      No capacity cap on the live path: a single walk-in can't over-expose
    //      anyone, and it has no view of the day's running match totals.
    const pool = getPool();
    const chosen = selectMatches(
      vec,
      { linkedinUrl, company: source.company, country: source.country },
      pool.vectors,
    );

    const matches = chosen.map(({ c, sim, confidence }) => ({
      slug: c.slug,
      index: c.index,
      name: c.name,
      role: c.role,
      company: c.company,
      country: c.country,
      lists: c.lists || [],
      confidence,
      matchReason: reasonFor(source.role, c),
      linkedinUrl: c.linkedinUrl,
      headshotUrl: c.headshotUrl,
      talkingPoints: [],
      _sim: Math.round(sim * 1000) / 1000, // debug aid; harmless in the payload
    }));

    if (matches.length === 0) {
      const e = new Error('No suitable matches found.'); e.status = 404; throw e;
    }

    // 6. Gemini reason + talking points (block-until-ready, all matches in parallel).
    //    Each match keeps its deterministic reasonFor() unless generation succeeds,
    //    so a slow/failed LLM never blocks or degrades the reveal.
    const sourceCurated = { name: source.name, slug: linkedinUrl, ...extractProfileForLLM(profile) };
    const profiles = getProfiles();
    await Promise.all(
      matches.map(async (m) => {
        const matchCurated = profiles[m.slug];
        if (!matchCurated) return; // no curated profile → keep deterministic reason
        const out = await generateReasonAndPoints(sourceCurated, { name: m.name, slug: m.slug, ...matchCurated });
        if (out) {
          m.matchReason = out.reason;
          m.talkingPoints = out.talkingPoints;
        }
      }),
    );

    return { source, matches };
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Mode A — resolve path: the profile was already enriched by /api/resolve-profile,
    // so embed it directly (no second EnrichLayer fetch).
    if (body?.profile && typeof body.profile === 'object') {
      const linkedinUrl = normalizeLinkedInUrl(body.linkedinUrl) || '';
      const result = await runMatch(body.profile, linkedinUrl);
      return NextResponse.json(result);
    }

    // Mode B — paste path: fetch the profile by LinkedIn URL, then match.
    const raw = body?.linkedinUrl;
    if (!raw) return NextResponse.json({ error: 'LinkedIn URL is required.' }, { status: 400 });

    const linkedinUrl = normalizeLinkedInUrl(raw);
    if (!linkedinUrl) return NextResponse.json({ error: 'That doesn\'t look like a LinkedIn profile URL.' }, { status: 400 });

    const apiKey = process.env.ENRICHLAYER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Server config error: enrichment key missing.' }, { status: 500 });

    // 1. Live profile fetch (same service that scraped the 453).
    const profileRes = await fetch(
      `https://enrichlayer.com/api/v2/profile?url=${encodeURIComponent(linkedinUrl)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!profileRes.ok) {
      const text = await profileRes.text();
      console.error('[match] enrichlayer profile failed', profileRes.status, text.slice(0, 200));
      return NextResponse.json({ error: 'Couldn\'t read that LinkedIn profile. Check the URL and try again.' }, { status: 502 });
    }
    const profile = await profileRes.json();
    if (profile?.message && profile?.code) {
      return NextResponse.json({ error: `Profile lookup error: ${profile.message}` }, { status: 502 });
    }

    const result = await runMatch(profile, linkedinUrl);
    return NextResponse.json(result);
  } catch (err) {
    if (err?.status) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('[match] unexpected', err);
    return NextResponse.json({ error: 'Something went wrong finding your matches.' }, { status: 500 });
  }
}
