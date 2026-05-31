import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { embedTextFromProfile, embedOpenAI, norm } from '@/lib/match-core.mjs';
import { selectMatches } from '@/lib/match-select.mjs';
import { extractProfileForLLM } from '@/lib/profile-extract.mjs';
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
    if (parsed.hostname !== 'www.linkedin.com' && parsed.hostname !== 'linkedin.com') return null;
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

export async function POST(request) {
  try {
    const { linkedinUrl: raw } = await request.json();
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
      const body = await profileRes.text();
      console.error('[match] enrichlayer profile failed', profileRes.status, body.slice(0, 200));
      return NextResponse.json({ error: 'Couldn\'t read that LinkedIn profile. Check the URL and try again.' }, { status: 502 });
    }
    const profile = await profileRes.json();
    if (profile?.message && profile?.code) {
      return NextResponse.json({ error: `Profile lookup error: ${profile.message}` }, { status: 502 });
    }

    // 2. Source identity (what the reveal panel + concierge will show).
    const source = {
      name: profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' '),
      role: profile.occupation || profile.headline || '',
      company: profile?.experiences?.[0]?.company || '',
      country: profile.country_full_name || profile.country || '',
      linkedinUrl,
      headshotUrl: profile.profile_pic_url || '',
    };

    // 3. Embed the walk-in the SAME way the pool was built.
    const text = embedTextFromProfile(profile);
    if (!text) return NextResponse.json({ error: 'That profile is too sparse to match on.' }, { status: 422 });
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
      return NextResponse.json({ error: 'No suitable matches found.' }, { status: 404 });
    }

    // 6. Gemini reason + talking points (block-until-ready, all matches in parallel).
    //    Each match keeps its deterministic reasonFor() unless generation succeeds,
    //    so a slow/failed LLM never blocks or degrades the reveal.
    const sourceCurated = { name: source.name, slug: ownUrl, ...extractProfileForLLM(profile) };
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

    return NextResponse.json({ source, matches });
  } catch (err) {
    console.error('[match] unexpected', err);
    return NextResponse.json({ error: 'Something went wrong finding your matches.' }, { status: 500 });
  }
}
