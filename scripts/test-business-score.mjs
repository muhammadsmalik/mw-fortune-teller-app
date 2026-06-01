/**
 * Manual check for lib/business-scores.mjs — scores ONE business with the live
 * grounded engine and prints results. NOT wired into the app.
 * RUN:  node scripts/test-business-score.mjs
 * REQUIRES in .env: GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY)
 */
import 'dotenv/config';
import { scoreBusiness, DIM_KEYS } from '../lib/business-scores.mjs';

const PROFILE = {
  fullName: 'Sean Reilly',
  title: 'Chief Executive Officer',
  company: 'Lamar Advertising Company',
  region: 'USA',
  linkedinUrl: 'https://www.linkedin.com/company/lamar-advertising-company/',
  context: 'One of the largest OOH advertising companies in the US; billboard, transit and airport inventory; large digital (DOOH) network.',
};

const { scores, sources, summary } = await scoreBusiness(PROFILE);
for (const k of DIM_KEYS) {
  const d = scores[k];
  console.log(`\n${d.label}: ${d.score ?? '— (withheld)'}${d.lowConfidence && d.score != null ? ' (low confidence)' : ''}`);
  (d.bullets || []).forEach((b) => console.log(`  ${b.verified ? '✓' : '⚠'} ${b.point}  [${(b.groundedBy || []).join(', ') || b.evidence || 'no source'}]`));
}
console.log(`\nSUMMARY: ${summary}`);
console.log(`Total sources: ${sources.length}`);
