/**
 * Shared match SELECTION — the one place that turns a source embedding into its
 * top-3 matches, used by BOTH the live walk-in matcher (app/api/match/route.js)
 * and the offline picker-graph builder (scripts/build-twin-matches.mjs).
 *
 * Sharing this is the whole point: a person who PICKS their name and a person who
 * WALKS UP and pastes their LinkedIn must get the same kind of match, or two
 * people standing side by side at the booth would be matched by different rules.
 *
 * The rules (from the 2026-05-29 meeting + the 3-list spec):
 *   1. Never match someone to themselves.
 *   2. Exclusion: a valid match differs in BOTH company and country (favours
 *      genuine cross-market intros). Graceful relaxation if that leaves us short.
 *   3. Composition: guarantee 1 WOO attendee (shown first / High — they're
 *      physically at the event), then fill the other slots with the best
 *      remaining candidates from WOO ∪ CRM by similarity.
 *   4. Optional capacity (twin-5 cap): the batch builder passes a `hasCapacity`
 *      predicate so no target is shown as a match more than N times across the
 *      whole graph. The live path passes none — one walk-in can't over-expose
 *      anyone, and it has no view of the day's running totals anyway.
 */

import { cosine, norm } from './match-core.mjs';

const isWoo = (c) => Array.isArray(c.lists) && c.lists.includes('woo');

// Tokens that don't distinguish one employer from another: legal suffixes, generic
// industry filler, and country/region words. Stripping them lets us see that
// "JCDecaux Australia" and "JCDecaux UK" are the SAME employer — so we don't pitch
// a cross-country colleague as an "international" intro.
const COMPANY_STOP = new Set([
  'ltd', 'limited', 'inc', 'incorporated', 'llc', 'llp', 'plc', 'gmbh', 'ag', 'sa', 'sas', 'srl', 'bv', 'nv', 'pty',
  'co', 'company', 'group', 'holding', 'holdings', 'corp', 'corporation',
  'media', 'outdoor', 'ooh', 'dooh', 'advertising', 'ads', 'adtech', 'marketing', 'communications', 'comms',
  'network', 'networks', 'digital', 'agency', 'global', 'international', 'worldwide', 'intl', 'neo',
  'uk', 'usa', 'us', 'australia', 'aus', 'espana', 'spain', 'portugal', 'brasil', 'brazil', 'ireland', 'finland',
  'germany', 'deutschland', 'france', 'italia', 'italy', 'canada', 'mexico', 'chile', 'peru', 'colombia', 'argentina',
  'nederland', 'netherlands', 'sweden', 'norway', 'denmark', 'poland', 'romania', 'turkey', 'türkiye', 'uae',
  'emirates', 'india', 'china', 'japan', 'korea', 'africa', 'asia', 'europe', 'emea', 'latam', 'nordics', 'zealand', 'nz',
]);

/** Distinctive brand tokens of a company name; '' if nothing distinctive remains.
 *  Splits on ANY punctuation/separator ("Weischer.OOH", "APG|SGA AG") so brand
 *  tokens aren't glued together the way norm() would. */
function companyRoot(company) {
  return String(company || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !COMPANY_STOP.has(t))
    .join(' ');
}

/**
 * @param {number[]} vec      source embedding
 * @param {object}   source   { linkedinUrl?, slug?, company?, country? } — identity for self-exclusion + exclusion rule
 * @param {object[]} vectors  candidate pool entries, each { slug, lists, company, country, vec, ... }
 * @param {object}   [opts]
 * @param {(slug:string)=>boolean} [opts.hasCapacity]  cap predicate (default: always true)
 * @param {number}   [opts.limit]  how many matches to return (default 3)
 * @returns {{c: object, sim: number, confidence: string}[]}  chosen candidates, High first then Medium
 */
export function selectMatches(vec, source, vectors, opts = {}) {
  const { hasCapacity = () => true, limit = 3 } = opts;

  const ownUrl = norm(source.linkedinUrl || '');
  const ownSlug = source.slug || '';
  const srcCompany = norm(source.company);
  const srcRoot = companyRoot(source.company);
  const srcCountry = norm(source.country);

  const scored = vectors
    .filter((c) => {
      if (ownSlug && c.slug === ownSlug) return false;            // self (picker: by slug)
      if (ownUrl && norm(c.linkedinUrl) === ownUrl) return false; // self (walk-in: by url)
      return true;
    })
    .map((c) => ({ c, sim: cosine(vec, c.vec) }))
    .sort((a, b) => b.sim - a.sim);

  // Exclusion: differ in BOTH company and country. If strict leaves us empty,
  // relax to different-company only (keeps the cross-org intent, drops country).
  // NOTE(region, deferred): this excludes same-COUNTRY per the 2026-05-29 wording.
  // If "international connection" meant cross-REGION, swap the hard country exclude
  // for a soft sim penalty (match-twins.mjs has SAME_REGION_PENALTY=0.12) — pending
  // confirmation from Salman.
  const diffCompany = ({ c }) => {
    if (!srcCompany) return true;                                  // no source company → skip
    if (norm(c.company) === srcCompany) return false;              // identical string
    if (srcRoot && companyRoot(c.company) === srcRoot) return false; // same brand, diff country/suffix
    return true;
  };
  const diffCountry = ({ c }) => !srcCountry || norm(c.country) !== srcCountry;
  let pool = scored.filter((x) => diffCompany(x) && diffCountry(x));
  if (pool.length < limit) {
    const companyOnly = scored.filter(diffCompany);
    pool = pool.length ? pool : companyOnly;
  }

  // Composition + cap. Two-pass per slot so the cap stays SOFT: prefer an
  // under-cap candidate, but if none is left, take the best over-cap one rather
  // than drop the source below `limit` matches (truncation was the explicit
  // non-goal — everyone keeps their 3 twins).
  const chosen = [];
  const pickFrom = (filter) => {
    // capacity-respecting first, then ignore capacity as a fallback
    for (const cap of [true, false]) {
      for (const x of pool) {
        if (chosen.includes(x)) continue;
        if (!filter(x)) continue;
        if (cap && !hasCapacity(x.c.slug)) continue;
        return x;
      }
    }
    return null;
  };

  const woo = pickFrom(({ c }) => isWoo(c)); // guarantee 1 WOO attendee
  if (woo) chosen.push(woo);
  while (chosen.length < limit) {
    const next = pickFrom(() => true);
    if (!next) break;
    chosen.push(next);
  }

  return chosen.map((x, i) => ({ ...x, confidence: i === 0 ? 'High' : 'Medium' }));
}
