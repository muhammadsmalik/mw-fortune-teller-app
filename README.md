# MW Fortune Teller App

An interactive lead-generation experience for Moving Walls. Users scan a LinkedIn QR code (or enter details manually), pick from persona-specific questions, draw tarot-themed tactical cards, and receive a personalised AI-generated business "fortune" — a strategic blueprint emailed to them and captured as a lead.

Built with Next.js 15 (App Router), React 19, Tailwind, Google Gemini + OpenAI, and a Google Sheets lead pipeline.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
# Fill in keys (ask the project owner — secrets are not in the repo)

# 3. Run
npm run dev
# Open http://localhost:3000
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server on `localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

---

## Where to start reading

Documentation lives in [`MASTER_DOCS/`](./MASTER_DOCS). Read in this order:

1. **[`MASTER_DOCS/CODEBASE_MAP.md`](./MASTER_DOCS/CODEBASE_MAP.md)** — full architecture, user flows, every route, every API, every component, data flow, deprecated code. The appendix at the bottom covers everything added since October 2025 (tarot cards, new end-of-journey flow, product links, expanded lead capture).
2. **[`MASTER_DOCS/SATELLITE_EVENT_V1_PLAN.md`](./MASTER_DOCS/SATELLITE_EVENT_V1_PLAN.md)** — current initiative: repurposing the app as a networking / "twinning" tool for the WOO Forum.
3. **[`MASTER_DOCS/PERSONA_PLATFORM_MAPPING.md`](./MASTER_DOCS/PERSONA_PLATFORM_MAPPING.md)** and **[`MASTER_DOCS/TAROT_CARD_MAPPING.md`](./MASTER_DOCS/TAROT_CARD_MAPPING.md)** — domain logic for persona questions and tarot card mappings.
4. **[`MASTER_DOCS/CHANGES.md`](./MASTER_DOCS/CHANGES.md)** — change history.
5. `git log --oneline -30` — recent context.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.3.8 (App Router) |
| UI | React 19, Radix UI, Tailwind 3, Framer Motion, Lottie |
| Audio | Howler.js + custom AudioContext |
| LLM (primary) | Google Gemini 2.5 Flash |
| LLM (fallback + TTS + DALL-E) | OpenAI |
| LinkedIn data | EnrichLayer API |
| Speech-to-text | Deepgram |
| Email | Resend |
| Lead storage | Google Sheets API |

---

## High-level user flow

```
Landing (/)
  → /collect-info        LinkedIn QR scan OR manual entry (with QR-image upload fallback)
  → /generating-fortune  [LinkedIn only] fetch profile, kick off background fortune
  → /linkedin-interlude  [LinkedIn only] profile reveal + Oracle TTS greeting
  → /fortune-journey     4 stages: persona pick → high-level Qs → initial fortune → tarot tactical cards → blueprint
  → /contact-details     auto-submit lead to Sheets, send email, show product links + "Start New Journey"
```

`/archetype-discovery` exists but is no longer in the default flow (see appendix in `CODEBASE_MAP.md`).

---

## Environment variables

All keys live in `.env` (gitignored). See [`.env.example`](./.env.example) for the full list with comments. Required to run the full flow:

- `GEMINI_API_KEY` (LLM)
- `OPENAI_API_KEY` (TTS, avatars, fallback LLM)
- `ENRICHLAYER_API_KEY` (LinkedIn profile data)
- `DEEPGRAM_API_KEY` (voice input in manual flow)
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (email delivery)
- `GOOGLE_SHEETS_CLIENT_EMAIL` + `GOOGLE_SHEETS_PRIVATE_KEY` + `GOOGLE_SHEET_ID` (lead capture)

Detailed Google Sheets setup: [`.cursor/DOCUMENTATION/SETUP_GOOGLE_SHEETS_INTEGRATION.md`](./.cursor/DOCUMENTATION/SETUP_GOOGLE_SHEETS_INTEGRATION.md).

---

## Project layout

```
app/                      Next.js App Router pages + API routes
  api/                    10 routes: fortune gen, narration, avatar, archetype,
                          LinkedIn, transcribe, submit-lead, send-email, ...
components/
  fortune-journey/        Stage components: ScenarioSelection, DisplayFortune,
                          TacticalCardSelection (tarot), BlueprintDisplay
  ui/                     Radix wrappers + Tailwind
  AudioPlayer.js, BackgroundMusic.js
contexts/AudioContext.js  Global mute state
lib/                      Static data: persona_questions, archetypes_data,
                          fortune_predictions, predefined_scenarios
public/                   Animations, audio, avatars, tarot card art, personas
MASTER_DOCS/              All design/planning docs (see "Where to start reading")
MEETINGS/                 (gitignored) internal meeting notes
scripts/                  POC scripts for WOO Forum networking pivot (research-only,
                          not wired into the app)
```

See `CODEBASE_MAP.md` for the full tree.

---

## Deployment

Hosted on Vercel. Push to `main` deploys to production; PRs get preview URLs automatically.

---

## Conventions

- JavaScript (no TypeScript)
- ESLint via `eslint-config-next` — fix warnings before committing
- All pages are client-rendered (`'use client'`)
- State persistence is mostly via `localStorage` — see the "Data Flow" section of `CODEBASE_MAP.md` for the key inventory
- LLM calls use Gemini first, fall back to OpenAI when `ENABLE_LLM_FALLBACK=true`
- Match existing copy tone: British English spellings, mystical/oracle voice

---

## Maintainer

Moving Walls team. Questions → ping Salman.
