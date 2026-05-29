import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { embedTextFromProfile, embedOpenAI, cosine, norm } from '@/lib/match-core.mjs';

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

    // 4. Cosine vs the whole pool.
    const pool = getPool();
    const ownUrl = norm(linkedinUrl);
    const scored = pool.vectors
      .filter((c) => norm(c.linkedinUrl) !== ownUrl) // never match someone to themselves
      .map((c) => ({ c, sim: cosine(vec, c.vec) }))
      .sort((x, y) => y.sim - x.sim);

    // 5. Exclusion rule (from the 2026-05-29 meeting): a valid match must differ
    //    in BOTH company and country — favours genuine cross-market intros.
    //
    //    TODO(region): this excludes same-COUNTRY, per the meeting wording. If
    //    Salman meant "international connection" = cross-REGION (note match-twins.mjs
    //    has a `complementary` mode with SAME_REGION_PENALTY = 0.12), make it a SOFT
    //    penalty rather than a hard exclude so a strong same-region match isn't banned:
    //      const regionOf = (country) => COUNTRY_TO_REGION[norm(country)] || 'Unknown';
    //      // in the .map(): sim -= (regionOf(c.country) === regionOf(source.country) ? 0.12 : 0)
    //    Then sort by the penalised sim. ~5-min change; left out pending confirmation.
    const srcCompany = norm(source.company);
    const srcCountry = norm(source.country);
    const passesStrict = ({ c }) =>
      (!srcCompany || norm(c.company) !== srcCompany) &&
      (!srcCountry || norm(c.country) !== srcCountry);

    let pick = scored.filter(passesStrict);
    // Graceful relaxation if the strict rule leaves us short (e.g. sparse country data):
    // drop the country constraint but always keep different-company.
    if (pick.length < 3) {
      const companyOnly = scored.filter(({ c }) => !srcCompany || norm(c.company) !== srcCompany);
      pick = pick.length ? pick : companyOnly;
    }

    const matches = pick.slice(0, 3).map(({ c, sim }, i) => ({
      slug: c.slug,
      index: c.index,
      name: c.name,
      role: c.role,
      company: c.company,
      country: c.country,
      confidence: i === 0 ? 'High' : 'Medium',
      matchReason: reasonFor(source.role, c),
      linkedinUrl: c.linkedinUrl,
      headshotUrl: c.headshotUrl,
      talkingPoints: [],
      _sim: Math.round(sim * 1000) / 1000, // debug aid; harmless in the payload
    }));

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No suitable matches found.' }, { status: 404 });
    }

    return NextResponse.json({ source, matches });
  } catch (err) {
    console.error('[match] unexpected', err);
    return NextResponse.json({ error: 'Something went wrong finding your matches.' }, { status: 500 });
  }
}
