require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');

const DEFAULT_INPUT_DIR = 'ATTENDEES-RSVP-LISTS';
const DEFAULT_OUTPUT_DIR = path.join('scripts', 'output', 'linkedin-profiles');
const DEFAULT_LIMIT = 5;

const ENRICHLAYER_API_KEY = process.env.ENRICHLAYER_API_KEY;

function parseArgs(argv) {
  const args = {
    inputDir: DEFAULT_INPUT_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    limit: DEFAULT_LIMIT,
    all: false,
    refresh: false,
    dryRun: false,
    delayMs: 250,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--input-dir' && next) {
      args.inputDir = next;
      index += 1;
    } else if (arg === '--output-dir' && next) {
      args.outputDir = next;
      index += 1;
    } else if (arg === '--limit' && next) {
      args.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--all') {
      args.all = true;
      args.limit = null;
    } else if (arg === '--refresh') {
      args.refresh = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--delay-ms' && next) {
      args.delayMs = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!args.all && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }

  if (!Number.isInteger(args.delayMs) || args.delayMs < 0) {
    throw new Error('--delay-ms must be a non-negative integer');
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/scrape-attendee-linkedin-profiles.js [options]

Options:
  --limit <n>       Number of new profiles to scrape. Defaults to 5.
  --all             Scrape every discovered profile URL.
  --refresh         Re-fetch profiles even when profile_data.json exists.
  --dry-run         Extract and print candidate profile URLs without API calls.
  --input-dir <dir> Directory containing RSVP CSV files.
  --output-dir <dir> Directory for scraped profile JSON.
  --delay-ms <n>    Delay between API calls. Defaults to 250.
`);
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function rowToObject(headers, row) {
  return headers.reduce((record, header, index) => {
    const key = header.trim() || `Column ${index + 1}`;
    record[key] = (row[index] || '').trim();
    return record;
  }, {});
}

function normalizeLinkedInProfileUrl(rawUrl) {
  if (!rawUrl || !rawUrl.includes('linkedin.com')) {
    return null;
  }

  try {
    const url = new URL(rawUrl.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    if (!hostname.endsWith('linkedin.com')) {
      return null;
    }

    const match = url.pathname.match(/^\/in\/([^/?#]+)/i);
    if (!match) {
      return null;
    }

    const slug = decodeURIComponent(match[1]).replace(/\/+$/, '');
    if (!slug) {
      return null;
    }

    return {
      normalizedUrl: `https://www.linkedin.com/in/${encodeURIComponent(slug)}`,
      username: slug.replace(/[^a-zA-Z0-9_-]/g, '_'),
    };
  } catch {
    return null;
  }
}

function findProfileUrls(headers, row) {
  const linkedinColumnIndexes = headers
    .map((header, index) => ({ header: header.toLowerCase(), index }))
    .filter(({ header }) => header.includes('linkedin'))
    .map(({ index }) => index);

  const orderedIndexes = [
    ...linkedinColumnIndexes,
    ...row.map((_, index) => index).filter((index) => !linkedinColumnIndexes.includes(index)),
  ];

  const found = [];
  for (const index of orderedIndexes) {
    const value = row[index] || '';
    const matches = value.match(/https?:\/\/[^\s,"]*linkedin\.com[^\s,"]*/gi) || [];
    for (const match of matches) {
      const normalized = normalizeLinkedInProfileUrl(match);
      if (normalized) {
        found.push(normalized);
      }
    }
  }

  return found;
}

async function discoverProfiles(inputDir) {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const csvFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
    .map((entry) => path.join(inputDir, entry.name))
    .sort();

  const profilesByUrl = new Map();

  for (const csvFile of csvFiles) {
    const content = await fs.readFile(csvFile, 'utf8');
    const rows = parseCsv(content);
    if (rows.length === 0) {
      continue;
    }

    const headers = rows[0].map((header) => header.trim());

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const profileUrls = findProfileUrls(headers, row);

      for (const profile of profileUrls) {
        if (!profilesByUrl.has(profile.normalizedUrl)) {
          const record = rowToObject(headers, row);
          profilesByUrl.set(profile.normalizedUrl, {
            ...profile,
            sourceFile: csvFile,
            csvRowNumber: rowIndex + 1,
            attendee: {
              fullName: record['Full Name'] || record.Name || '',
              company: record.Company || record['Company Name'] || '',
              email: record.Email || '',
              country: record.Country || '',
            },
          });
        }
      }
    }
  }

  return [...profilesByUrl.values()];
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function appendJsonl(filePath, payload) {
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`);
}

async function fetchProfile(profileUrl) {
  const apiUrl = new URL('https://enrichlayer.com/api/v2/profile');
  apiUrl.searchParams.set('url', profileUrl);
  apiUrl.searchParams.set('use_cache', 'if-present');
  apiUrl.searchParams.set('fallback_to_cache', 'on-error');

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${ENRICHLAYER_API_KEY}`,
    },
  });

  const bodyText = await response.text();
  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { rawResponse: bodyText };
  }

  if (!response.ok) {
    const error = new Error(`EnrichLayer profile request failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeProfile(profile, outputDir, options) {
  const profileDir = path.join(outputDir, profile.username);
  const profileDataPath = path.join(profileDir, 'profile_data.json');
  const metadataPath = path.join(profileDir, 'source_metadata.json');
  const errorPath = path.join(profileDir, 'profile_error.json');

  await ensureDir(profileDir);

  if (!options.refresh && await fileExists(profileDataPath)) {
    return { status: 'skipped', reason: 'profile_data.json already exists', profile };
  }

  await fs.writeFile(metadataPath, JSON.stringify(profile, null, 2));

  try {
    const data = await fetchProfile(profile.normalizedUrl);
    await fs.writeFile(profileDataPath, JSON.stringify(data, null, 2));
    return { status: 'scraped', profile };
  } catch (error) {
    const errorPayload = {
      message: error.message,
      status: error.status || null,
      body: error.body || null,
      profile,
      scrapedAt: new Date().toISOString(),
    };
    await fs.writeFile(errorPath, JSON.stringify(errorPayload, null, 2));
    return { status: 'error', error: error.message, profile };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const profiles = await discoverProfiles(args.inputDir);

  console.log(`Discovered ${profiles.length} unique LinkedIn profile URLs in ${args.inputDir}.`);

  if (args.dryRun) {
    profiles.slice(0, args.limit || profiles.length).forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.attendee.fullName || '(no name)'} - ${profile.normalizedUrl}`);
    });
    return;
  }

  if (!ENRICHLAYER_API_KEY) {
    throw new Error('ENRICHLAYER_API_KEY is not set in the environment.');
  }

  await ensureDir(args.outputDir);

  const manifestPath = path.join(args.outputDir, 'scrape-manifest.jsonl');
  const candidates = profiles.slice(0, args.limit || profiles.length);

  console.log(`Processing ${candidates.length} profile(s). Use --all for every discovered URL.`);

  for (const [index, profile] of candidates.entries()) {
    console.log(`[${index + 1}/${candidates.length}] ${profile.normalizedUrl}`);
    const result = await scrapeProfile(profile, args.outputDir, args);
    await appendJsonl(manifestPath, {
      ...result,
      scrapedAt: new Date().toISOString(),
    });
    console.log(`  ${result.status}${result.reason ? `: ${result.reason}` : ''}`);

    if (index < candidates.length - 1 && args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
