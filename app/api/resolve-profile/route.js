import { NextResponse } from 'next/server';
import { extractIdentity } from '@/lib/profile-extract.mjs';

export const runtime = 'nodejs';

// Booth walk-ins often can't find their LinkedIn URL. This resolves a person from
// name + company instead, via EnrichLayer's Person Lookup. We ask it to enrich the
// result so the returned profile carries the photo/headline/company the confirm
// card shows AND the full profile shape /api/match embeds — so confirming reuses
// this profile with no second EnrichLayer fetch.
//
// EnrichLayer resolve returns ONE closest match (with similarity_checks=include it
// discards false positives → null rather than the wrong person). We surface that one
// as a single "is this you?" card; a miss falls through to the LinkedIn-paste path.

// `company_domain` accepts a company name OR a domain. Users may paste a full URL,
// so reduce a URL down to its host; otherwise pass the text through untouched.
function normalizeCompany(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(raw)) {
    try {
      const host = new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname;
      return host.replace(/^www\./i, '');
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function POST(request) {
  try {
    const { firstName, lastName, company } = await request.json();

    const first = String(firstName || '').trim();
    const companyDomain = normalizeCompany(company);
    if (!first || !companyDomain) {
      return NextResponse.json({ error: 'First name and company (or website) are required.' }, { status: 400 });
    }

    const apiKey = process.env.ENRICHLAYER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Server config error: enrichment key missing.' }, { status: 500 });

    const params = new URLSearchParams({
      company_domain: companyDomain,
      first_name: first,
      similarity_checks: 'include', // discard wrong-person false positives → null over a bad guess
      enrich_profile: 'enrich',     // +1 credit: returns the full profile (photo + embeddable body)
    });
    const last = String(lastName || '').trim();
    if (last) params.set('last_name', last);

    const res = await fetch(`https://enrichlayer.com/api/v2/profile/resolve?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[resolve-profile] enrichlayer failed', res.status, text.slice(0, 200));
      return NextResponse.json({ error: 'Lookup failed. Try your LinkedIn URL instead.' }, { status: 502 });
    }
    const data = await res.json();

    // No confident match: resolve returns a null url (similarity checks rejected the
    // closest candidate). Tell the client to fall back to the LinkedIn-paste path.
    const profile = data?.profile;
    if (!data?.url || !profile) {
      return NextResponse.json({ error: 'No confident match found.' }, { status: 404 });
    }

    const { name, role, company: matchedCompany, country, photoUrl } = extractIdentity(profile);
    const candidate = { name, headline: role, company: matchedCompany, country, photoUrl, linkedinUrl: data.url };

    // Pass the full profile back so the confirm step embeds it directly (no re-fetch).
    return NextResponse.json({ candidate, profile });
  } catch (err) {
    console.error('[resolve-profile] unexpected', err);
    return NextResponse.json({ error: 'Something went wrong looking you up.' }, { status: 500 });
  }
}
