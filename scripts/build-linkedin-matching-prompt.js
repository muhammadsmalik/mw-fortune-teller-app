const fs = require('fs').promises;
const path = require('path');

const DEFAULT_INPUT_DIR = path.join('scripts', 'output', 'linkedin-profiles');
const DEFAULT_PROMPT_OUTPUT = path.join('MASTER_DOCS', 'AGENT_WALLI', 'matching', 'linkedin-profile-matching-prompt-filled.md');
const DEFAULT_INDEX_OUTPUT = path.join('MASTER_DOCS', 'AGENT_WALLI', 'matching', 'linkedin-profile-index-map.json');

function parseArgs(argv) {
  const args = {
    inputDir: DEFAULT_INPUT_DIR,
    promptOutput: DEFAULT_PROMPT_OUTPUT,
    indexOutput: DEFAULT_INDEX_OUTPUT,
    includeNames: false,
    limit: null,
    maxBioChars: 650,
    maxDescriptionChars: 300,
    maxSkills: 12,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--input-dir' && next) {
      args.inputDir = next;
      index += 1;
    } else if (arg === '--prompt-output' && next) {
      args.promptOutput = next;
      index += 1;
    } else if (arg === '--index-output' && next) {
      args.indexOutput = next;
      index += 1;
    } else if (arg === '--include-names') {
      args.includeNames = true;
    } else if (arg === '--limit' && next) {
      args.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--max-bio-chars' && next) {
      args.maxBioChars = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--max-description-chars' && next) {
      args.maxDescriptionChars = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--max-skills' && next) {
      args.maxSkills = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  for (const [name, value] of Object.entries({
    limit: args.limit,
    maxBioChars: args.maxBioChars,
    maxDescriptionChars: args.maxDescriptionChars,
    maxSkills: args.maxSkills,
  })) {
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      throw new Error(`--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} must be a positive integer`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/build-linkedin-matching-prompt.js [options]

Options:
  --include-names               Include names in the generated profile blocks.
  --limit <n>                   Generate only the first n profiles.
  --input-dir <dir>             Scraped profile output directory.
  --prompt-output <file>        Filled prompt markdown output path.
  --index-output <file>         Index-to-person JSON map output path.
  --max-bio-chars <n>           Bio text cap. Defaults to 650.
  --max-description-chars <n>   Experience description cap. Defaults to 300.
  --max-skills <n>              Skill count cap. Defaults to 12.
`);
}

function cleanText(value) {
  if (!value) return '';
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxChars) {
  const text = cleanText(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}...`;
}

function dateValue(dateObj) {
  if (!dateObj || typeof dateObj.year !== 'number') return 0;
  const month = typeof dateObj.month === 'number' ? dateObj.month : 1;
  const day = typeof dateObj.day === 'number' ? dateObj.day : 1;
  return new Date(dateObj.year, month - 1, day).getTime();
}

function experienceRelevanceScore(experience = {}) {
  const text = [
    experience.title,
    experience.company,
    experience.description,
  ].map(cleanText).join(' ').toLowerCase();

  const positiveSignals = [
    'chief executive',
    'ceo',
    'founder',
    'co-founder',
    'managing director',
    'director',
    'president',
    'vp',
    'vice president',
    'commercial',
    'sales',
    'partnership',
    'strategy',
    'marketing',
    'advertising',
    'outdoor',
    'out-of-home',
    'ooh',
    'dooh',
    'programmatic',
    'media',
    'adtech',
    'platform',
  ];

  const sideRoleSignals = [
    'pilot',
    'adventure flight',
    'volunteer',
    'board member',
    'advisor',
    'investor',
  ];

  let score = 0;
  for (const signal of positiveSignals) {
    if (text.includes(signal)) score += 3;
  }
  for (const signal of sideRoleSignals) {
    if (text.includes(signal)) score -= 2;
  }

  return score;
}

function chooseCurrentOrLatestExperience(experiences = []) {
  if (!Array.isArray(experiences) || experiences.length === 0) return null;

  const sorted = [...experiences].sort((a, b) => {
    const aIsCurrent = !a.ends_at;
    const bIsCurrent = !b.ends_at;
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;

    const relevanceDifference = experienceRelevanceScore(b) - experienceRelevanceScore(a);
    if (relevanceDifference !== 0) return relevanceDifference;

    const aEnd = dateValue(a.ends_at);
    const bEnd = dateValue(b.ends_at);
    if (aEnd !== bEnd) return bEnd - aEnd;

    return dateValue(b.starts_at) - dateValue(a.starts_at);
  });

  return sorted[0];
}

function normalizeSkills(skills, maxSkills) {
  if (!skills) return [];
  const raw = Array.isArray(skills) ? skills : String(skills).split(',');
  const names = raw.map((skill) => {
    if (typeof skill === 'string') return skill;
    return skill.name || skill.title || skill.skill || '';
  });

  return [...new Set(names.map(cleanText).filter(Boolean))].slice(0, maxSkills);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function loadProfiles(inputDir, args) {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const profiles = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const profileDir = path.join(inputDir, entry.name);
    const profileData = await readJsonIfExists(path.join(profileDir, 'profile_data.json'));
    if (!profileData) continue;

    const metadata = await readJsonIfExists(path.join(profileDir, 'source_metadata.json'));
    const currentExperience = chooseCurrentOrLatestExperience(profileData.experiences);

    profiles.push({
      directoryName: entry.name,
      profileData,
      metadata,
      currentExperience,
    });
  }

  profiles.sort((a, b) => {
    const aRow = a.metadata?.csvRowNumber || Number.MAX_SAFE_INTEGER;
    const bRow = b.metadata?.csvRowNumber || Number.MAX_SAFE_INTEGER;
    const aSource = a.metadata?.sourceFile || '';
    const bSource = b.metadata?.sourceFile || '';
    return aSource.localeCompare(bSource) || aRow - bRow || a.directoryName.localeCompare(b.directoryName);
  });

  return args.limit ? profiles.slice(0, args.limit) : profiles;
}

function buildBio(profileData, maxBioChars) {
  const parts = [
    profileData.headline,
    profileData.occupation,
    profileData.summary,
  ].map(cleanText).filter(Boolean);

  return truncate([...new Set(parts)].join(' | '), maxBioChars) || 'No bio available.';
}

function buildProfileBlock(profile, index, args) {
  const data = profile.profileData;
  const exp = profile.currentExperience || {};
  const country = cleanText(data.country_full_name || data.country || data.location_str || [data.city, data.state].filter(Boolean).join(', '));
  const skills = normalizeSkills(data.skills, args.maxSkills);
  const lines = [`[${index}]`];

  if (args.includeNames) {
    lines.push(`Name: ${cleanText(data.full_name) || profile.directoryName}`);
  }

  lines.push(`Bio: ${buildBio(data, args.maxBioChars)}`);
  lines.push('Current or most recent experience:');
  lines.push(`- Title: ${cleanText(exp.title)}`);
  lines.push(`- Company: ${cleanText(exp.company)}`);
  lines.push(`- Description: ${truncate(exp.description, args.maxDescriptionChars)}`);
  lines.push(`- Location: ${cleanText(exp.location)}`);
  lines.push(`Industry: ${cleanText(data.industry)}`);
  lines.push(`Country/region: ${country}`);
  lines.push(`Skills/themes: ${skills.join(', ')}`);

  return lines.join('\n');
}

function buildPrompt(profileBlocks) {
  return `# Filled LinkedIn Profile Matching Prompt

You are matching event attendees for high-value business conversations.

You will receive an indexed list of LinkedIn-derived profiles. Each profile is intentionally compact to reduce token usage. Names may be excluded, so refer to people only by their profile index.

Your task:

1. Review all indexed profiles.
2. For each profile, identify its top 3 strongest matches from the rest of the list.
3. Return only the source profile index, matched profile indexes, and a concise justification for each match.
4. Do not invent details. Use only the profile information provided.
5. Do not include generic networking advice, talking points, intro messages, or biographies.

Matching criteria:

- Prioritize complementary business relevance, not just similarity.
- Prioritize cross-company, cross-market, and cross-capability matches that create new conversations.
- Strong matches can be based on buyer-seller fit, geographic expansion, product/platform compatibility, audience/channel overlap, measurement/data needs, leadership peer relevance, or strategic partnership potential.
- Avoid matching people only because both are senior or both are in advertising.
- Prefer matches where there is a clear reason they would have something specific and useful to discuss.
- Avoid same-company matches by default; delegates from the same company likely already know each other and often attend together.
- Treat obvious company variants, parent/subsidiary names, and same delegation groups as same-company unless the profile data clearly says otherwise.
- Same-company matches are allowed only as rare exceptions when their roles are clearly complementary across different functions, regions, business units, or buyer-seller responsibilities.
- If you choose a same-company match, the reason must state the specific cross-functional value, not company overlap.
- Each profile's 3 matches should be diverse: avoid matches all coming from the same company, delegation group, country cluster, or narrow functional peer set.
- If the data is thin, say the match is lower confidence instead of overstating it.

Important interpretation notes:

- Treat Bio as the main signal; it combines LinkedIn headline, occupation, and summary.
- Treat the current role as the experience where \`ends_at\` is null.
- If multiple roles had \`ends_at: null\`, the profile builder selected the role that sorted as current/latest.
- If no current role existed, the profile builder selected the latest role by \`ends_at\`, then \`starts_at\`.
- Do not expose names if names are omitted from the input.

Output format:

Return valid minified JSON only, with this compact shape:

\`\`\`json
{"1":[[3,"H","reason"],[2,"M","reason"],[7,"M","reason"]],"2":[[1,"H","reason"],[3,"H","reason"],[8,"M","reason"]]}
\`\`\`

Format meaning:

- Object key = source profile index as a string.
- Each value = exactly 3 match tuples.
- Tuple format = \`[matchedProfileIndex, confidence, reason]\`.
- Confidence codes: \`H\` = high, \`M\` = medium, \`L\` = low.

Constraints:

- Return one object key for every input profile.
- Each profile must have exactly 3 matches.
- A profile must never match to itself.
- Match direction matters: profile 1 can choose profile 2 even if profile 2 has different top matches.
- It is acceptable for many profiles to choose the same strong connector profile if justified by the data.
- Prefer all 3 matches to be from different companies than the source profile.
- Same-company matches are capped at 1 per source profile, and only when clearly stronger than external alternatives.
- Prefer the 3 matches to come from 3 different companies unless the input set lacks enough useful alternatives.
- Do not use same-company matches as filler; if only weak same-company value exists, choose a lower-confidence external match instead.
- Do not give a same-company match \`H\` confidence unless the cross-functional or cross-market value is exceptional.
- Keep each reason under 22 words.
- Confidence must be one of: \`H\`, \`M\`, \`L\`.
- Minify the JSON: no indentation, no line breaks, no markdown, no commentary.

Profiles:

\`\`\`text
${profileBlocks.join('\n\n')}
\`\`\`
`;
}

function buildIndexMapEntry(profile, index) {
  const data = profile.profileData;
  const source = profile.metadata ? {
    normalizedUrl: profile.metadata.normalizedUrl || null,
    username: profile.metadata.username || null,
    sourceFile: profile.metadata.sourceFile || null,
    csvRowNumber: profile.metadata.csvRowNumber || null,
    attendee: profile.metadata.attendee ? {
      fullName: profile.metadata.attendee.fullName || null,
      company: profile.metadata.attendee.company || null,
      country: profile.metadata.attendee.country || null,
    } : null,
  } : null;

  return {
    index,
    full_name: data.full_name || null,
    public_identifier: data.public_identifier || null,
    linkedin_url: data.public_identifier ? `https://www.linkedin.com/in/${data.public_identifier}` : profile.metadata?.normalizedUrl || null,
    headline: data.headline || null,
    occupation: data.occupation || null,
    company: profile.currentExperience?.company || null,
    title: profile.currentExperience?.title || null,
    country: data.country_full_name || data.country || null,
    source,
  };
}

async function ensureParentDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv);
  const profiles = await loadProfiles(args.inputDir, args);
  const blocks = profiles.map((profile, index) => buildProfileBlock(profile, index + 1, args));
  const indexMap = profiles.map((profile, index) => buildIndexMapEntry(profile, index + 1));

  await ensureParentDir(args.promptOutput);
  await ensureParentDir(args.indexOutput);
  await fs.writeFile(args.promptOutput, buildPrompt(blocks));
  await fs.writeFile(args.indexOutput, JSON.stringify(indexMap, null, 2));

  console.log(`Wrote ${profiles.length} indexed profiles to ${args.promptOutput}`);
  console.log(`Wrote index map to ${args.indexOutput}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
