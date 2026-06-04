/**
 * Curate an EnrichLayer profile down to the high-signal fields we feed the LLM
 * when writing a match reason + talking points (lib/match-reasons.mjs).
 *
 * Why curate instead of sending the raw ~21KB scrape:
 *  - PII: raw profiles carry `personal_emails` / `personal_numbers` — never sent.
 *  - Noise: `people_also_viewed`, `recommendations`, `similarly_named_profiles`,
 *    `follower_count`, `inferred_salary`, logo/URLs dilute the real signal and burn tokens.
 *  - `skills` is 0% populated across our pool, so it's dropped.
 *
 * The shape is identical whether the profile came from a saved scrape
 * (scripts/output/linkedin-profiles/<slug>/profile_data.json) or a live fetch,
 * so source walk-ins and pool matches curate the same way.
 */

/** Trim whitespace and hard-cap length (keeps prompts lean + predictable). */
function clip(s, max) {
  return (s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Pull the display identity (name, role, company, country, photo) from an
 * EnrichLayer profile. Shared by the live matcher (the source card) and the
 * person lookup (the candidate card) so both read the same fields the same way.
 */
export function extractIdentity(p) {
  if (!p || typeof p !== 'object') return { name: '', role: '', company: '', country: '', photoUrl: '' };
  return {
    name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' '),
    role: p.occupation || p.headline || '',
    company: p.experiences?.[0]?.company || '',
    country: p.country_full_name || p.country || '',
    photoUrl: p.profile_pic_url || '',
  };
}

/** EnrichLayer dates are { day, month, year } | null. Render as "2022–present". */
function years(e) {
  const from = e.starts_at?.year;
  if (!from) return '';
  const to = e.ends_at?.year || 'present';
  return `${from}–${to}`;
}

/**
 * @param {object} p - raw EnrichLayer profile object
 * @returns {object|null} curated profile, or null if the input is unusable
 */
export function extractProfileForLLM(p) {
  if (!p || typeof p !== 'object') return null;

  const experiences = (Array.isArray(p.experiences) ? p.experiences : [])
    .slice(0, 3)
    .map((e) => ({
      title: clip(e.title, 120),
      company: clip(e.company, 120),
      years: years(e),
      description: clip(e.description, 400),
    }))
    .filter((e) => e.title || e.company);

  // Activities = posts/reshares they engage with. Richest signal (84% coverage),
  // and exactly what makes talking points current and specific.
  const activities = (Array.isArray(p.activities) ? p.activities : [])
    .slice(0, 6)
    .map((a) => clip(a.title, 180))
    .filter(Boolean);

  const articles = (Array.isArray(p.articles) ? p.articles : [])
    .slice(0, 5)
    .map((a) => clip(a.title, 160))
    .filter(Boolean);

  return {
    headline: clip(p.headline, 200),
    occupation: clip(p.occupation, 200),
    industry: clip(p.industry, 120),
    country: clip(p.country_full_name || p.country, 80),
    bio: clip(p.summary, 800),
    experiences,
    activities,
    articles,
  };
}
