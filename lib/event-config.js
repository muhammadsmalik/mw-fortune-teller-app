// Which attendee personas the intake offers for the current event.
//
// London WOO Forum (June 2026) = Media Owners only -> the persona picker is
// skipped and Media Owner is auto-selected. For multi-persona events, enable
// all of them and the picker reappears.
//
// Override without a code change via the env var, e.g.
//   NEXT_PUBLIC_ENABLED_PERSONAS="media_owner,brand_owner,media_agency"

const VALID_PERSONAS = ['media_owner', 'brand_owner', 'media_agency'];

const fromEnv = (process.env.NEXT_PUBLIC_ENABLED_PERSONAS || '')
  .split(',')
  .map((s) => s.trim())
  .filter((p) => VALID_PERSONAS.includes(p));

export const ENABLED_PERSONAS = fromEnv.length > 0 ? fromEnv : ['media_owner'];
