import path from 'node:path';

// Single source of truth for where downloaded profile pics live and how they're
// served. Shared by download-profile-pics.mjs (writes) and build-twin-matches.mjs
// (references), keyed by the stable profile index, so the two can't drift.
export const PHOTO_DIR_REL = 'public/match-photos';

// Absolute path on disk for a given index, e.g. <root>/public/match-photos/254.jpg
export const photoFile = (root, idx) => path.join(root, PHOTO_DIR_REL, `${idx}.jpg`);

// Public URL the app serves, e.g. /match-photos/254.jpg
export const photoPublicPath = (idx) => `/match-photos/${idx}.jpg`;
