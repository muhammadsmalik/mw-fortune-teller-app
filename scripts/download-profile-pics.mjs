/**
 * Download scraped LinkedIn profile pictures into public/match-photos/<index>.jpg
 * so the booth flow serves them locally (no dependency on the scraper CDN at the
 * event). Keyed by the stable profile index from linkedin-profile-index-map.json.
 *
 * Idempotent: skips indexes already downloaded. Re-run any time.
 * RUN:  node scripts/download-profile-pics.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHOTO_DIR_REL, photoFile } from './lib/match-photos.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexMap = JSON.parse(fs.readFileSync(path.join(root, 'MASTER_DOCS/linkedin-profile-index-map.json'), 'utf8'));
const outDir = path.join(root, PHOTO_DIR_REL);
fs.mkdirSync(outDir, { recursive: true });

const picUrl = (publicId) => {
  if (!publicId) return '';
  for (const id of [publicId, decodeURIComponent(publicId)]) {
    const f = path.join(root, 'scripts/output/linkedin-profiles', id, 'profile_data.json');
    if (!fs.existsSync(f)) continue;
    try {
      let u = JSON.parse(fs.readFileSync(f, 'utf8')).profile_pic_url;
      if (u && typeof u === 'object') u = u.url || u.original || Object.values(u)[0];
      return typeof u === 'string' && u.startsWith('http') ? u : '';
    } catch {
      return '';
    }
  }
  return '';
};

// Build the work list: indexes that have a pic URL and aren't downloaded yet.
const jobs = [];
for (const [idx, p] of Object.entries(indexMap)) {
  const dest = photoFile(root, idx);
  if (fs.existsSync(dest)) continue;
  const url = picUrl(p.public_identifier);
  if (url) jobs.push({ idx, url, dest });
}

let ok = 0;
let failed = 0;
const CONCURRENCY = 8;

async function worker(queue) {
  while (queue.length) {
    const { idx, url, dest } = queue.shift();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      ok += 1;
    } catch (e) {
      failed += 1;
      console.warn(`  ! #${idx}: ${e.message}`);
    }
  }
}

console.log(`Downloading ${jobs.length} profile pictures into public/match-photos/ ...`);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(jobs)));
const total = fs.readdirSync(outDir).filter((f) => f.endsWith('.jpg')).length;
console.log(`Done. downloaded: ${ok}, failed: ${failed}, total on disk: ${total}`);
