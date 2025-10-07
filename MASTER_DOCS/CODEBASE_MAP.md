# MW Fortune Teller App - Codebase Map

**Generated:** 2025-10-07
**Version:** 0.1.0
**Framework:** Next.js 15.3.2 (App Router)

---

## Table of Contents

1. [Overview](#overview)
2. [User Journey Flow](#user-journey-flow)
3. [Architecture](#architecture)
4. [Directory Structure](#directory-structure)
5. [Page Routes](#page-routes)
6. [API Routes](#api-routes)
7. [Components](#components)
8. [Data Flow](#data-flow)
9. [Deprecated Code](#deprecated-code)
10. [Dependencies](#dependencies)
11. [Environment Variables](#environment-variables)
12. [Recommendations](#recommendations)

---

## Overview

The **MW Fortune Teller App** is an interactive lead generation tool that provides personalized business insights using AI/LLM technology. Users scan their LinkedIn QR code or manually enter information to receive a customized "fortune" - strategic business recommendations presented in a mystical, fortune-teller theme.

### Key Features
- **Dual Input Flow:** LinkedIn QR scanner or manual data entry
- **AI-Powered Insights:** Google Gemini (primary) + OpenAI (fallback)
- **TTS Narration:** Oracle voice using OpenAI Text-to-Speech
- **Avatar Generation:** Personalized DALL-E avatars
- **Archetype Matching:** Conference attendee personality matching
- **Lead Capture:** Google Sheets integration
- **Email Delivery:** Automated fortune email via Resend

---

## User Journey Flow

### A. LinkedIn Flow (Primary Path)

```
1. Welcome Screen (/)
   ↓ User clicks "Reveal My Fortune!"

2. Information Collection (/collect-info)
   ↓ User scans LinkedIn QR code
   ↓ Validates LinkedIn URL
   ↓ Auto-proceeds on success

3. Fortune Generation (/generating-fortune)
   ↓ Fetches LinkedIn profile data
   ↓ Initiates background fortune API call
   ↓ Immediately redirects to...

4. LinkedIn Interlude (/linkedin-interlude)
   ↓ Displays profile info (name, company, role)
   ↓ "Tap door to reveal" interactive overlay
   ↓ Plays TTS Oracle greeting
   ↓ Waits for background fortune completion
   ↓ Polls localStorage for fortuneData

5. Fortune Journey (/fortune-journey)

   Stage 1: High-Level Selection
   ↓ User selects persona (Advertiser/Publisher/Platform)
   ↓ Chooses 2 high-level challenge questions
   ↓ Calls /api/generate-initial-fortune

   Stage 2: Initial Fortune Reveal
   ↓ Displays AI-generated opening statement
   ↓ Plays narration (optional)
   ↓ User clicks "Proceed to Tactical"

   Stage 3: Tactical Selection
   ↓ Drag-and-drop tactical focus cards
   ↓ Confirms selection

   Stage 4: Blueprint Display
   ↓ Generates comprehensive strategic blueprint
   ↓ Displays actionable recommendations
   ↓ User clicks "Complete Journey"

6. Contact Details (/contact-details)
   ↓ Auto-fills email from LinkedIn
   ↓ Auto-submits lead to Google Sheets
   ↓ Auto-sends fortune email via Resend
   ↓ Auto-redirects to...

7. Archetype Discovery (/archetype-discovery)
   ↓ Matches user to conference archetype
   ↓ Generates personalized avatar
   ↓ Suggests networking connections
   ↓ Plays archetype reveal narration
   ↓ User clicks "Start New Fortune" → back to /
```

### B. Manual Flow (Alternative Path)

```
1. Welcome Screen (/)
   ↓
2. Information Collection (/collect-info)
   ↓ User switches to manual entry
   ↓ Enters: Full Name, Industry, Company (required)
   ↓ Optional: Geographic Focus, Business Objective (voice input available)
   ↓ Clicks "Generate My Fortune!"
   ↓ Skips /generating-fortune and /linkedin-interlude

3. Fortune Journey (/fortune-journey)
   ↓ Same stages as LinkedIn flow

4. Contact Details (/contact-details)
   ↓ Manual email entry required
   ↓ Rest is same

5. Archetype Discovery (/archetype-discovery)
   ↓ Same as LinkedIn flow
```

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.3.2 (App Router) |
| Language | JavaScript (ES6+) |
| UI Library | React 19 + Radix UI |
| Styling | Tailwind CSS 3.4.17 |
| Animations | Framer Motion + Lottie React |
| Audio | Howler.js + Web Audio API |
| State | React Hooks + localStorage |
| AI/LLM | Google Gemini 2.5 Flash + OpenAI GPT-4o |
| External APIs | EnrichLayer (LinkedIn), Deepgram (STT), Resend (Email) |
| Data Storage | Google Sheets API |

### Key Patterns

1. **Client-Side Rendering:** All pages use `'use client'` directive
2. **Dynamic Imports:** Components lazy-loaded in fortune-journey
3. **localStorage-First:** Heavy use of browser storage for state persistence
4. **Background API Calls:** Fortune generation runs in parallel during interlude
5. **Particle Effects:** tsparticles for mystical background on all screens
6. **Global Audio Context:** Centralized audio state management
7. **Error Handling:** Try-catch with user-friendly Oracle-themed messages

---

## Directory Structure

```
mw-fortune-teller-app/
├── app/                              # Next.js App Router pages
│   ├── layout.js                     # Root layout (fonts, providers)
│   ├── page.js                       # Welcome screen
│   ├── globals.css                   # Global styles
│   ├── collect-info/page.js          # LinkedIn QR scanner + manual entry
│   ├── generating-fortune/page.js    # LinkedIn data fetch + background API
│   ├── linkedin-interlude/page.js    # Profile display + TTS greeting
│   ├── fortune-journey/page.js       # Multi-stage fortune experience
│   ├── contact-details/page.js       # Lead capture + email
│   ├── archetype-discovery/page.js   # Archetype matching + avatar
│   ├── scenario-answers/page.js      # ⚠️ DEPRECATED - old scenario display
│   ├── display-fortune/page.js       # ⚠️ DEPRECATED - old fortune display
│   └── api/                          # API routes
│       ├── generate-fortune/route.js              # Legacy fortune generation
│       ├── generate-initial-fortune/route.js      # New journey fortune
│       ├── generate-scenario-answers/route.js     # Scenario insights (TODO: LLM)
│       ├── generate-narration/route.js            # TTS audio (OpenAI)
│       ├── generate-avatar/route.js               # DALL-E avatar
│       ├── match-archetype/route.js               # Archetype matching (Gemini)
│       ├── get-linkedin-company-details/route.js  # EnrichLayer API
│       ├── transcribe-audio/route.js              # Deepgram STT
│       ├── submit-lead/route.js                   # Google Sheets
│       └── send-email/route.js                    # Resend email
├── components/                       # React components
│   ├── ui/                           # Radix UI wrappers
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── dialog.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── select.jsx
│   │   ├── textarea.jsx
│   │   ├── BrandFooter.js            # Moving Walls footer
│   │   └── SingleWaveUnit.js         # Wave animation
│   ├── fortune-journey/              # Journey-specific components
│   │   ├── ScenarioSelection.js      # High-level question picker
│   │   ├── DisplayFortune.js         # Fortune reveal with narration
│   │   ├── TacticalCardSelection.js  # Drag-drop tactical cards
│   │   ├── BlueprintDisplay.js       # Final strategic blueprint
│   │   └── ScenarioAnswers.js        # ⚠️ UNUSED
│   ├── AudioPlayer.js                # Custom audio player
│   ├── BackgroundMusic.js            # Global background music
│   └── theme-provider.js             # next-themes wrapper
├── contexts/
│   └── AudioContext.js               # Global audio state
├── lib/
│   ├── utils.js                      # Tailwind utility helpers
│   ├── persona_questions.json        # Advertiser/Publisher/Platform questions
│   ├── archetypes_data.json          # Conference archetype definitions
│   └── predefined_scenarios.json     # Scenario data
├── public/
│   ├── animations/                   # Lottie JSON files
│   ├── audio/                        # Sound effects + voice
│   ├── avatar/                       # Oracle/genie images
│   ├── assets/                       # Misc images
│   ├── personas/                     # Persona context MD files
│   ├── product_mapping.json          # MW product mappings
│   └── MW-logo-web.svg               # Brand logo
├── scrape_linkedin_data.js           # ⚠️ DEPRECATED - Proxycurl scraper
├── combine_linkedin_data.js          # ⚠️ DEPRECATED - Data combiner
├── linkedin_output/                  # ⚠️ DEPRECATED - Old scraped data
├── combined_linkedin_data.txt        # ⚠️ DEPRECATED - Old data file
├── tailwind.config.js                # Tailwind config
├── next.config.mjs                   # Next.js config
├── package.json                      # Dependencies
└── README.md                         # ⚠️ Generic Next.js README
```

---

## Page Routes

| Route | File | Purpose | Entry Point |
|-------|------|---------|-------------|
| `/` | `app/page.js` | Welcome screen with avatar video | Yes |
| `/collect-info` | `app/collect-info/page.js` | LinkedIn QR scanner + manual entry | From `/` |
| `/generating-fortune` | `app/generating-fortune/page.js` | LinkedIn data fetch + background API | LinkedIn flow only |
| `/linkedin-interlude` | `app/linkedin-interlude/page.js` | Profile display + TTS greeting | LinkedIn flow only |
| `/fortune-journey` | `app/fortune-journey/page.js` | Multi-stage fortune experience | Both flows |
| `/contact-details` | `app/contact-details/page.js` | Lead capture + email | Both flows |
| `/archetype-discovery` | `app/archetype-discovery/page.js` | Archetype matching + avatar | Both flows |
| `/scenario-answers` | `app/scenario-answers/page.js` | ⚠️ DEPRECATED - Old scenario display | N/A |
| `/display-fortune` | `app/display-fortune/page.js` | ⚠️ DEPRECATED - Old fortune display | N/A |

---

## API Routes

### Active Routes

| Route | Method | Purpose | Called By | AI Provider |
|-------|--------|---------|-----------|-------------|
| `/api/generate-initial-fortune` | POST | Generate opening fortune for journey | `fortune-journey/page.js` | Gemini → OpenAI |
| `/api/generate-fortune` | POST | Legacy full fortune generation | `generating-fortune/page.js` (background) | Gemini → OpenAI |
| `/api/generate-scenario-answers` | POST | Generate scenario insights | `scenario-answers/page.js` | ⚠️ Predefined (TODO: LLM) |
| `/api/generate-narration` | GET | TTS audio streaming | `linkedin-interlude`, `display-fortune` | OpenAI TTS |
| `/api/generate-avatar` | POST | Personalized avatar from profile pic | `archetype-discovery/page.js` | OpenAI DALL-E 3 |
| `/api/match-archetype` | POST | Match user to conference archetype | `archetype-discovery/page.js` | Gemini |
| `/api/get-linkedin-company-details` | POST | Fetch LinkedIn profile + company data | `generating-fortune/page.js` | EnrichLayer API |
| `/api/transcribe-audio` | POST | Voice-to-text transcription | `collect-info/page.js` | Deepgram |
| `/api/submit-lead` | POST | Save lead to Google Sheets | `contact-details/page.js` | Google Sheets API |
| `/api/send-email` | POST | Send fortune via email | `contact-details/page.js` | Resend |

### API Route Details

#### `/api/generate-initial-fortune`
**Purpose:** Generate the opening fortune statement for the fortune-journey flow.

**Input:**
```javascript
{
  fullName: string,
  companyName: string,
  industryType: string,
  geographicFocus: string,
  selectedPersona: 'advertiser' | 'publisher' | 'platform',
  selectedQuestions: string[], // High-level question texts
  unselectedQuestions: string[],
  advertiserContext: string, // MD file content
  publisherContext: string,
  platformContext: string,
  linkedinData: object // Optional
}
```

**Output:**
```javascript
{
  openingStatement: string, // AI-generated fortune
  error?: string
}
```

**AI Logic:**
- Uses Gemini 2.5 Flash (primary)
- Falls back to OpenAI GPT-4o on failure
- Includes persona context + selected questions
- Returns mystical opening statement

#### `/api/generate-fortune`
**Purpose:** Legacy full fortune generation (still used in background for LinkedIn flow).

**Input:**
```javascript
{
  fullName: string,
  industryType: string,
  companyName: string,
  geographicFocus?: string,
  businessObjective?: string,
  debugProvider?: 'GEMINI' | 'OPENAI'
}
```

**Output:**
```javascript
{
  fortune: string, // Full fortune text
  structuredFortune?: object, // Optional structured data
  error?: string
}
```

**AI Logic:**
- Uses Gemini or OpenAI based on env
- Debug mode allows forcing provider
- Includes geographic and business context

#### `/api/get-linkedin-company-details`
**Purpose:** Fetch LinkedIn profile and company data via EnrichLayer API.

**Input:**
```javascript
{
  linkedinUrl: string // e.g., https://www.linkedin.com/in/johndoe
}
```

**Output:**
```javascript
{
  profileData: {
    full_name: string,
    occupation: string,
    city: string,
    country_full_name: string,
    experiences: array,
    public_identifier: string,
    // ... more fields
  },
  latestCompanyData: {
    name: string,
    industry: string,
    // ... more fields
  }
}
```

**External API:** EnrichLayer (formerly Proxycurl)

#### `/api/match-archetype`
**Purpose:** Match user profile to conference attendee archetype using AI.

**Input:**
```javascript
{
  fullName: string,
  companyName: string,
  industryType: string,
  geographicFocus: string,
  businessObjective: string
}
```

**Output:**
```javascript
{
  archetype: {
    id: string,
    name: string,
    description: string,
    headline: string,
    company: string,
    profile_picture: string,
    reasoning: string // AI-generated explanation
  },
  suggestedConnections: array // 3 similar profiles
}
```

**AI Logic:**
- Uses Gemini to analyze user profile
- Matches against `/lib/archetypes_data.json`
- Returns best match + reasoning

#### `/api/generate-avatar`
**Purpose:** Generate personalized avatar using DALL-E from profile picture.

**Input:**
```javascript
{
  profilePictureUrl: string, // LinkedIn profile pic
  archetypeDescription: string
}
```

**Output:**
```javascript
{
  avatarUrl: string, // Generated DALL-E image URL
  error?: string
}
```

**AI Logic:**
- Uses OpenAI DALL-E 3
- Takes profile pic as base
- Applies mystical/fortune-teller styling

---

## Components

### UI Components (`/components/ui/`)

All UI components are Radix UI primitives wrapped with Tailwind styling:

- **button.jsx** - Button component with variants
- **card.jsx** - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **dialog.jsx** - Modal dialog
- **input.jsx** - Text input field
- **label.jsx** - Form label
- **select.jsx** - Dropdown select
- **textarea.jsx** - Multi-line text input
- **BrandFooter.js** - Moving Walls footer with logo
- **SingleWaveUnit.js** - Animated wave effect

### Fortune Journey Components (`/components/fortune-journey/`)

#### `ScenarioSelection.js`
**Purpose:** High-level persona question selection (Stage 1).

**Props:**
```javascript
{
  onScenariosConfirmed: ({ scenarios, persona }) => void,
  onBack: () => void,
  questionType: 'high' | 'tactical',
  title: string,
  subtitle: string,
  ctaLabel: string
}
```

**Features:**
- Persona selection: Advertiser, Publisher, Platform
- Exactly 2 questions must be selected
- Animated card selection
- Back button navigation

#### `DisplayFortune.js`
**Purpose:** Display AI-generated fortune with narration (Stage 2).

**Props:**
```javascript
{
  fortuneData: { openingStatement: string, error?: string },
  onGoBack: () => void,
  onProceedToNextStep: () => void,
  audioPlaybackAllowed: boolean
}
```

**Features:**
- Animated fortune reveal
- Optional TTS narration
- Loading state while generating
- Error display

#### `TacticalCardSelection.js`
**Purpose:** Drag-and-drop tactical focus selection (Stage 3).

**Props:**
```javascript
{
  persona: string,
  onConfirm: ({ scenarios }) => void,
  onBack: () => void
}
```

**Features:**
- react-dnd drag-and-drop
- Variable selection count based on persona
- Card preview on hover
- Animated transitions

#### `BlueprintDisplay.js`
**Purpose:** Final strategic blueprint display (Stage 4).

**Props:**
```javascript
{
  userInfo: object,
  highLevelChoices: array,
  tacticalChoices: array,
  persona: string,
  onComplete: (blueprintHtml) => void,
  onBack: () => void
}
```

**Features:**
- Generates comprehensive blueprint
- Actionable recommendations
- Shareable format
- Stores HTML in localStorage

### Audio Components

#### `BackgroundMusic.js`
**Purpose:** Global background music player.

**Features:**
- Plays ambient music on all pages
- Global mute toggle
- Respects user preferences
- Volume control

#### `AudioPlayer.js`
**Purpose:** Custom audio player for narration.

**Features:**
- Play/pause controls
- Progress bar
- Volume control
- Error handling

### Context Providers

#### `AudioContext.js`
**Purpose:** Global audio state management.

**Provided State:**
```javascript
{
  isMuted: boolean,
  toggleMute: () => void,
  setMuted: (boolean) => void
}
```

**Usage:** Centralized mute control across all components.

---

## Data Flow

### localStorage Keys

**User Data:**
```javascript
'userLinkedInProfile'           // LinkedIn URL
'fetchedLinkedInData'           // Full profile + company JSON
'userInfoForFortune'            // Manual entry data
'fortuneApp_fullName'           // Final user name
'fortuneApp_industry'           // Final industry
'fortuneApp_companyName'        // Final company name
'fortuneApp_geographicFocus'    // Geographic info
'fortuneApp_businessObjective'  // Business objective
'fortuneApp_contactMethod'      // Email address
```

**Flow Control:**
```javascript
'forceRefreshLinkedInData'      // Signal to refresh LinkedIn cache
'pendingFortuneRequestBody'     // Request payload for fortune API
'fortuneGenerationError'        // Background error flag
```

**Fortune Data:**
```javascript
'fortuneData'                   // Generated fortune JSON
'selectedScenarioIDs'           // User's selected question IDs
'blueprintHtml'                 // Final blueprint HTML
'fortuneApp_fortuneText'        // Shareable fortune text
'fortuneApp_structuredFortune'  // Structured fortune JSON
```

### Data Flow Diagram

```
┌─────────────────┐
│  User Input     │
│ (QR or Manual)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐      ┌──────────────────┐
│  LinkedIn API Fetch     │ OR   │  Manual Entry    │
│  (EnrichLayer)          │      │  Form Submit     │
└───────────┬─────────────┘      └────────┬─────────┘
            │                              │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  localStorage Caching    │
            │  - fetchedLinkedInData   │
            │  - userInfoForFortune    │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  Background Fortune      │
            │  Generation (Gemini)     │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  Fortune Journey         │
            │  - Persona Selection     │
            │  - High-Level Questions  │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  Initial Fortune API     │
            │  (Gemini + Context)      │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  Tactical Selection      │
            │  (Drag-and-Drop)         │
            └──────────────┬───────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │  Blueprint Generation    │
            │  (Comprehensive Plan)    │
            └──────────────┬───────────┘
                           │
                           ▼
     ┌─────────────────────┴───────────────────┐
     │                                          │
     ▼                                          ▼
┌────────────────┐                  ┌─────────────────┐
│  Lead Submit   │                  │  Email Send     │
│  (Google       │                  │  (Resend API)   │
│   Sheets)      │                  │                 │
└────────┬───────┘                  └────────┬────────┘
         │                                   │
         └───────────────┬───────────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │  Archetype Matching       │
         │  (Gemini AI)              │
         └──────────────┬────────────┘
                        │
                        ▼
         ┌───────────────────────────┐
         │  Avatar Generation        │
         │  (DALL-E 3)               │
         └──────────────┬────────────┘
                        │
                        ▼
         ┌───────────────────────────┐
         │  End (Start New Fortune)  │
         └───────────────────────────┘
```

---

## Deprecated Code

### Files to Mark as Deprecated

#### 1. `/app/scenario-answers/page.js`
**Status:** ⚠️ DEPRECATED - Not in main user flow

**Reason:**
- Not referenced in any active navigation
- TODO comment indicates future LLM integration planned
- Uses predefined JSON instead of dynamic generation

**Recommendation:**
- Add deprecation comment at top of file
- Consider removal in next major version
- Or repurpose for admin/testing route

**Code to Add:**
```javascript
/**
 * @deprecated This route is not part of the main user flow.
 * Retained for backward compatibility but may be removed in future versions.
 * Consider using fortune-journey flow instead.
 *
 * TODO: This section would be replaced with a call to OpenAI in a future phase.
 */
```

#### 2. `/app/display-fortune/page.js`
**Status:** ⚠️ DEPRECATED - Replaced by DisplayFortune component

**Reason:**
- Similar functionality exists in `/components/fortune-journey/DisplayFortune.js`
- Not part of current user journey
- May have been old standalone fortune display

**Recommendation:**
- Add deprecation comment
- Document as legacy route
- Consider removal or repurpose as direct fortune link

**Code to Add:**
```javascript
/**
 * @deprecated This standalone fortune display page has been replaced by
 * the multi-stage fortune-journey flow using DisplayFortune component.
 * Retained for backward compatibility with old fortune links.
 *
 * Use /fortune-journey instead for the full experience.
 */
```

#### 3. `/components/fortune-journey/ScenarioAnswers.js`
**Status:** ⚠️ UNUSED - No references found

**Reason:**
- Not imported by any page or component
- Appears to be duplicate of scenario-answers page functionality

**Recommendation:**
- Safe to remove
- No impact on existing flow

#### 4. `scrape_linkedin_data.js` (root level)
**Status:** ⚠️ DEPRECATED - Proxycurl API replaced by EnrichLayer

**Reason:**
- Uses deprecated Proxycurl API
- Bulk scraping script, not part of main app
- EnrichLayer integration already implemented in `/api/get-linkedin-company-details`

**Recommendation:**
- Add deprecation comment
- Move to `/scripts/legacy/` directory
- Document migration to EnrichLayer

**Code to Add:**
```javascript
/**
 * @deprecated This script uses the deprecated Proxycurl API.
 * The app now uses EnrichLayer via /api/get-linkedin-company-details route.
 *
 * Retained for historical reference only.
 * Migration date: 2025-10-01 (per git log)
 */
```

#### 5. `combine_linkedin_data.js` (root level)
**Status:** ⚠️ LEGACY UTILITY - Not part of main app

**Reason:**
- Helper script for bulk data processing
- Not referenced by app code

**Recommendation:**
- Move to `/scripts/legacy/`
- Add documentation on purpose

#### 6. `/linkedin_output/` directory
**Status:** ⚠️ STALE DATA - Old scraped LinkedIn data

**Reason:**
- Contains 18 files from old Proxycurl scraping
- No longer used by app
- May contain sensitive data

**Recommendation:**
- Archive or delete
- Not needed for app functionality

#### 7. `combined_linkedin_data.txt`
**Status:** ⚠️ STALE DATA - Old combined data file

**Reason:**
- 496KB text file from old scraping
- Not referenced by app

**Recommendation:**
- Delete or move to archive

### Functions/Code Patterns to Deprecate

#### 1. Proxycurl API References
**Location:** Comments in API routes

**Issue:** API provider changed to EnrichLayer

**Status:** Already noted in comments, no action needed

#### 2. Direct `/api/generate-fortune` Usage
**Location:** `generating-fortune/page.js`

**Issue:** Complex legacy endpoint, new flow uses `generate-initial-fortune`

**Status:** Still used in LinkedIn flow background call

**Recommendation:**
- Monitor usage
- Consider consolidation in future refactor

---

## Dependencies

### Production Dependencies

| Package | Version | Purpose | Critical |
|---------|---------|---------|----------|
| `next` | 15.3.2 | Framework | ✅ |
| `react` | 19.0.0 | UI library | ✅ |
| `react-dom` | 19.0.0 | React DOM | ✅ |
| `@google/generative-ai` | 0.24.1 | Gemini AI | ✅ |
| `openai` | 4.98.0 | OpenAI API (fallback + TTS/DALL-E) | ✅ |
| `@deepgram/sdk` | 4.1.0 | Speech-to-text | ⚠️ Manual flow only |
| `howler` | 2.2.4 | Audio playback | ⚠️ Optional feature |
| `framer-motion` | 12.12.1 | Animations | ⚠️ UX enhancement |
| `lottie-react` | 2.4.1 | Lottie animations | ⚠️ UX enhancement |
| `@tsparticles/engine` | 3.8.1 | Particle effects | ⚠️ UX enhancement |
| `@tsparticles/react` | 3.0.0 | React integration | ⚠️ UX enhancement |
| `@tsparticles/slim` | 3.8.1 | Slim particle bundle | ⚠️ UX enhancement |
| `resend` | 4.5.1 | Email service | ✅ |
| `googleapis` | 148.0.0 | Google Sheets API | ✅ |
| `@yudiel/react-qr-scanner` | 2.3.1 | QR code scanning | ✅ LinkedIn flow |
| `qrcode.react` | 4.2.0 | QR code generation | ⚠️ Display only |
| `react-dnd` | 16.0.1 | Drag and drop | ⚠️ Tactical selection |
| `react-dnd-html5-backend` | 16.0.1 | DnD backend | ⚠️ Tactical selection |
| `react-phone-number-input` | 3.4.12 | Phone input | ⚠️ Future feature? |
| `next-themes` | 0.4.6 | Theme management | ⚠️ Dark mode only |
| `tailwindcss` | 3.4.17 | CSS framework | ✅ |
| `@radix-ui/react-*` | Various | UI primitives | ✅ |
| `class-variance-authority` | 0.7.1 | CV utility | ✅ |
| `clsx` | 2.1.1 | Class merging | ✅ |
| `tailwind-merge` | 3.2.0 | Tailwind class merge | ✅ |
| `tailwindcss-animate` | 1.0.7 | Tailwind animations | ✅ |
| `lucide-react` | 0.508.0 | Icons | ✅ |
| `dotenv` | 16.5.0 | Environment variables | ✅ |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@eslint/eslintrc` | ^3 | ESLint config |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 15.3.2 | Next.js ESLint |
| `autoprefixer` | 10.4.21 | CSS prefixing |
| `postcss` | 8.5.3 | CSS processing |

### External APIs

| Service | Purpose | Env Variable |
|---------|---------|--------------|
| **EnrichLayer** | LinkedIn profile data | `ENRICHLAYER_API_KEY` |
| **Google Gemini** | AI fortune generation | `GEMINI_API_KEY` |
| **OpenAI** | Fallback AI + TTS + DALL-E | `OPENAI_API_KEY` |
| **Deepgram** | Voice-to-text | `DEEPGRAM_API_KEY` |
| **Resend** | Email delivery | `RESEND_API_KEY` |
| **Google Sheets** | Lead storage | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` |

---

## Environment Variables

### Required Environment Variables

Create a `.env.local` file with:

```bash
# ===========================================
# AI/LLM Configuration
# ===========================================

# Google Gemini (Primary AI Provider)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-2.5-flash-preview-04-17

# OpenAI (Fallback AI + TTS + DALL-E)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL_NAME=gpt-4o-2024-08-06

# LLM Provider Selection
LLM_PROVIDER=GEMINI # Options: GEMINI, OPENAI
ENABLE_LLM_FALLBACK=true # Set to false to disable fallback

# ===========================================
# External APIs
# ===========================================

# EnrichLayer (LinkedIn Data) - formerly Proxycurl
ENRICHLAYER_API_KEY=your_enrichlayer_api_key_here

# Deepgram (Speech-to-Text)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Resend (Email Service)
RESEND_API_KEY=your_resend_api_key_here

# ===========================================
# Google Sheets Integration
# ===========================================

# Google Service Account for Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_sheet_id

# ===========================================
# Development/Debug
# ===========================================

# Enable debug mode (shows provider selection buttons)
NEXT_PUBLIC_DEBUG=false # Set to true for debug mode
```

### Environment Variable Usage by Feature

| Feature | Required Env Vars | Optional |
|---------|-------------------|----------|
| **Core Fortune Generation** | `GEMINI_API_KEY` or `OPENAI_API_KEY` | `LLM_PROVIDER`, `ENABLE_LLM_FALLBACK` |
| **LinkedIn Flow** | `ENRICHLAYER_API_KEY` | - |
| **Manual Voice Input** | `DEEPGRAM_API_KEY` | Manual flow only |
| **TTS Narration** | `OPENAI_API_KEY` | Optional feature |
| **Avatar Generation** | `OPENAI_API_KEY` | Optional feature |
| **Lead Capture** | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` | Required |
| **Email Delivery** | `RESEND_API_KEY` | Required |
| **Debug Mode** | - | `NEXT_PUBLIC_DEBUG=true` |

---

## Recommendations

### Immediate Actions (High Priority)

#### 1. Documentation
- [ ] **Update README.md** with actual project documentation
  - Current README is generic Next.js boilerplate
  - Add: Overview, Features, Setup Instructions, API Keys, Deployment

- [ ] **Create `.env.example`** file
  - Copy `.env.local` structure
  - Replace values with placeholders
  - Add comments for each variable

- [ ] **Add JSDoc comments** to API routes
  - Document input/output schemas
  - Add example requests/responses

#### 2. Code Cleanup
- [ ] **Mark deprecated files** with clear comments
  - `app/scenario-answers/page.js`
  - `app/display-fortune/page.js`
  - `scrape_linkedin_data.js`
  - `combine_linkedin_data.js`

- [ ] **Remove unused component**
  - Delete `components/fortune-journey/ScenarioAnswers.js`

- [ ] **Archive legacy data**
  - Move `linkedin_output/` to `archive/`
  - Delete `combined_linkedin_data.txt`

#### 3. Security
- [ ] **Audit localStorage usage**
  - Ensure no sensitive data stored long-term
  - Add expiration logic for cached data

- [ ] **Review API error messages**
  - Ensure no API keys exposed in errors

### Short-Term Improvements (Medium Priority)

#### 1. Error Handling
- [ ] **Add React Error Boundaries**
  - Wrap pages in error boundaries
  - Provide fallback UI for crashes

- [ ] **Improve API error responses**
  - Standardize error format across routes
  - Add error codes for client handling

#### 2. Performance
- [ ] **Analyze bundle size**
  - Use Next.js bundle analyzer
  - Lazy load heavy dependencies (Howler, Lottie)

- [ ] **Add loading states**
  - Skeleton screens for slow API calls
  - Progress indicators for multi-step processes

#### 3. UX Enhancements
- [ ] **Add analytics tracking**
  - Track user journey completion rates
  - Monitor API success/failure rates
  - Identify drop-off points

- [ ] **Implement session persistence**
  - Add "Resume Fortune" functionality
  - Save progress to backend (optional)

### Long-Term Enhancements (Low Priority)

#### 1. Architecture
- [ ] **Migrate to TypeScript**
  - Add type safety
  - Improve developer experience

- [ ] **Implement proper state management**
  - Consider Zustand or React Context for global state
  - Reduce localStorage dependencies

- [ ] **Add backend database**
  - Store fortune data in DB instead of localStorage
  - Enable cross-device resume

#### 2. Features
- [ ] **Implement LLM-based scenario answers**
  - Replace predefined JSON in `/api/generate-scenario-answers`
  - Use Gemini for dynamic insights

- [ ] **Consolidate fortune APIs**
  - Merge `generate-fortune` and `generate-initial-fortune`
  - Simplify API structure

- [ ] **Add social sharing**
  - Share fortune on LinkedIn, Twitter
  - Generate shareable images

#### 3. Testing
- [ ] **Add unit tests**
  - Test API routes
  - Test utility functions

- [ ] **Add E2E tests**
  - Test complete user journeys
  - Use Playwright or Cypress

### Breaking Changes to Consider

#### 1. Remove Deprecated Routes
- After 2-3 minor versions, consider removing:
  - `app/scenario-answers/page.js`
  - `app/display-fortune/page.js`

#### 2. Simplify Data Flow
- Move from localStorage-first to API-first
- Add session management with backend

#### 3. Standardize AI Providers
- Abstract AI provider logic into a service layer
- Make provider swapping seamless

---

## Conclusion

This codebase is a **well-structured, feature-rich Next.js application** with dual user flows, sophisticated AI integration, and engaging UX. Key strengths include:

✅ **Clear user journey** with progressive disclosure
✅ **Robust AI fallback** mechanism (Gemini → OpenAI)
✅ **Rich multimedia** experience (TTS, animations, particles)
✅ **Dual input flows** (LinkedIn automation + manual entry)
✅ **Comprehensive lead capture** (Google Sheets + Email)

Areas for improvement:

⚠️ **Deprecated code cleanup** (scenario-answers, display-fortune pages)
⚠️ **Documentation gaps** (README, API docs, env examples)
⚠️ **Heavy localStorage usage** (consider backend state)
⚠️ **No TypeScript** (type safety would benefit complex data flow)
⚠️ **Limited error handling** (needs error boundaries)

Overall, the app is **production-ready** with minor cleanup recommended for maintainability.

---

**Generated by:** Claude Code
**Date:** 2025-10-07
**Maintainer:** Moving Walls Team
