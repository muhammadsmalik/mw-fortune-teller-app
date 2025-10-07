# Tarot Card Content Mapping

**Generated:** 2025-10-07
**Purpose:** Document the complete mapping from source research files to tarot card artwork and data structures

---

## Table of Contents

1. [Overview](#overview)
2. [Source Files](#source-files)
3. [Card Anatomy](#card-anatomy)
4. [Complete Card Mappings](#complete-card-mappings)
5. [Data Flow](#data-flow)
6. [File Naming Convention](#file-naming-convention)

---

## Overview

The tactical question tarot cards are generated from research documents stored in `.cursor/PERSONAS/` directory. Each card displays a **"Crisp:"** label from these markdown files, which are condensed versions of the full tactical questions stored in `/lib/persona_questions.json`.

### Key Insight
The **"Crisp:"** labels in the PERSONAS markdown files are the **actual text shown on the tarot card artwork**, while the `persona_questions.json` file contains the full question text used in the UI.

---

## Source Files

### Research Documents (Design/Planning Phase)

| File | Persona | Contains |
|------|---------|----------|
| `.cursor/PERSONAS/publisher.md` | Publisher | 12 questions (6 futuristic + 6 current) with "Crisp:" labels |
| `.cursor/PERSONAS/advertiser.md` | Advertiser | 12 questions (6 futuristic + 6 current) with "Crisp:" labels |
| `.cursor/PERSONAS/platform_and_service_provider.md` | Platform | 12 questions (6 futuristic + 6 current) with "Crisp:" labels |

**Format in Markdown Files:**
```markdown
1. Data: How will publishers orchestrate audience sequences across OOH, CTV, and retail media?
Crisp: Data: Omni Media Sequencing?
Focus: [Detailed explanation...]
```

The **"Crisp:"** line is what appears on the tarot card artwork.

### Application Data Files (Runtime)

| File | Purpose | Format |
|------|---------|--------|
| `/lib/persona_questions.json` | Full question text for UI | JSON with `id` and `text` fields |
| `/public/product_mapping.json` | Tactical question → MW Product mappings | JSON with product details |
| `/public/tactical_cards/{persona}/*.png` | Tarot card artwork | PNG images (500x750) |

---

## Card Anatomy

Each tarot card PNG contains:

### Visual Elements

1. **Category Label** (Top Banner)
   - Format: `CATEGORY: SHORTENED QUESTION?`
   - Examples: "DATA: Unified Audience Graphs?", "ROI: LINKING DOOH TO SALES?"
   - Source: "Crisp:" line from `.cursor/PERSONAS/*.md`

2. **Fortune Teller Portrait**
   - Mystical character with turban/headscarf
   - Eyes closed in concentration
   - Hands positioned over crystal ball

3. **Crystal Ball**
   - Central element containing symbolic icons
   - Icons represent the topic (data networks, shopping carts, APIs, etc.)
   - Glowing/magical effect

4. **Ornate Border**
   - Gold art nouveau-style frame
   - Decorative elements: stars, moons, gears, network nodes
   - Corner flourishes

5. **Background**
   - Dark mystical atmosphere
   - Color-coded by persona:
     - **Publisher:** Teal/turquoise backgrounds
     - **Advertiser:** Dark blue/purple backgrounds
     - **Platform:** Varied warm tones (browns, reds)

### Text Displayed on Cards

**Top Banner:** Category + shortened question from "Crisp:" label

**Examples:**
- `DATA: Unified Audience Graphs?`
- `ROI: LINKING DOOH TO SALES?`
- `CREATIVE: DYNAMIC CONTENT for RECALL?`
- `INTEGRATION: RETAIL MEDIA SYNC?`

**Categories Used:**
- DATA
- MARKETING
- DISTRIBUTION
- TECHNOLOGY
- PEOPLE
- PRODUCTS
- ROI
- BUDGET
- PROGRAMMATIC
- CREATIVE
- INTEGRATION
- AUDIENCE

---

## Complete Card Mappings

### Publisher Cards (`pub_1.png` through `pub_6.png`)

| Card File | Crisp Label (on card) | Full Question (in JSON) | Source Line |
|-----------|----------------------|-------------------------|-------------|
| `pub_1.png` | DATA: Unified Audience Graphs? | How to implement first-party audience graphs that unify OOH exposure data with CRM lead profiles? | `.cursor/PERSONAS/publisher.md:48` |
| `pub_2.png` | MARKETING: Inbound Case Studies? | How to replace cold outreach with inbound lead engines using SEO-optimized OOH case studies? | `.cursor/PERSONAS/publisher.md:53` |
| `pub_3.png` | DISTRIBUTION: Vertical SaaS APIs? | How to integrate OOH booking APIs into vertical SaaS tools (e.g., Shopify, Salesforce)? | `.cursor/PERSONAS/publisher.md:58` |
| `pub_4.png` | TECHNOLOGY: Low-Code CRM? | What low-code tools can publishers adopt to automate lead scoring and CRM workflows? | `.cursor/PERSONAS/publisher.md:63` |
| `pub_5.png` | PEOPLE: Audience Architects? | How to restructure sales teams into "audience architects" who sell omni-media journeys, not billboards? | `.cursor/PERSONAS/publisher.md:68` |
| `pub_6.png` | PRODUCTS: Dynamic Trial Campaigns? | Can publishers offer "try-before-you-buy" OOH campaigns with dynamic creative testing? | `.cursor/PERSONAS/publisher.md:73` |

**Visual Verification:**
- ✅ pub_1.png shows: Old wise fortune teller with turban, crystal ball with data network icons
- ✅ pub_3.png shows: Fortune teller with buildings and API symbols in crystal ball

---

### Advertiser Cards (`adv_1.png` through `adv_6.png`)

| Card File | Crisp Label (on card) | Full Question (in JSON) | Source Line |
|-----------|----------------------|-------------------------|-------------|
| `adv_1.png` | ROI: LINKING DOOH TO SALES? | How to attribute DOOH campaigns to sales lifts or digital engagements (searches, downloads, visits)? | `.cursor/PERSONAS/advertiser.md:57` |
| `adv_2.png` | BUDGET: DOOH % of Digital? | What percentage of digital budgets should shift to DOOH for omni-media impact? | `.cursor/PERSONAS/advertiser.md:65` |
| `adv_3.png` | PROGRAMMATIC: Location vs. Audience? | What mix of guaranteed location buys vs. audience-based buys drives conversions? | `.cursor/PERSONAS/advertiser.md:73` |
| `adv_4.png` | CREATIVE: DYNAMIC CONTENT for RECALL? | How to layer dynamic elements (countdowns, QR codes) to boost memory retention? | `.cursor/PERSONAS/advertiser.md:81` |
| `adv_5.png` | INTEGRATION: Incremental Reach? | How can DOOH amplify digital campaigns' reach without audience overlap? | `.cursor/PERSONAS/advertiser.md:89` |
| `adv_6.png` | AUDIENCE: 1st-Party Data Activation? | How to use first-party data (CRM/CDP) for targeting and closed-loop attribution? | `.cursor/PERSONAS/advertiser.md:97` |

**Visual Verification:**
- ✅ adv_1.png shows: Fortune teller with crystal ball showing shopping cart, graphs, store icons
- ✅ adv_4.png shows: Fortune teller with hourglass and QR code in crystal ball

---

### Platform Cards (`plat_1.png` through `plat_6.png`)

| Card File | Crisp Label (on card) | Full Question (in JSON) | Source Line |
|-----------|----------------------|-------------------------|-------------|
| `plat_1.png` | ROI: CLEAN ROOM ATTRIBUTION? | How to prove DOOH's incremental impact on digital campaigns using clean room integrations? | `.cursor/PERSONAS/platform_and_service_provider.md:57` |
| `plat_2.png` | BUDGET: DOOH's Digital Share? | How to convince advertisers to allocate 15–25% of digital budgets to DOOH? | `.cursor/PERSONAS/platform_and_service_provider.md:65` |
| `plat_3.png` | PROGRAMMATIC: Prime vs. Audience Mix? | How to balance guaranteed prime locations with audience-based buys for performance? | `.cursor/PERSONAS/platform_and_service_provider.md:73` |
| `plat_4.png` | CREATIVE: Affordable Dynamic Ads? | How to scale dynamic content production without inflating costs? | `.cursor/PERSONAS/platform_and_service_provider.md:81` |
| `plat_5.png` | INTEGRATION: RETAIL MEDIA SYNC? | How to embed DOOH into retail media networks for closed-loop attribution? | `.cursor/PERSONAS/platform_and_service_provider.md:89` |
| `plat_6.png` | AUDIENCE: Unified KPIs? | How to overcome data silos and unify OOH metrics with digital KPIs? | `.cursor/PERSONAS/platform_and_service_provider.md:97` |

**Visual Verification:**
- ✅ plat_1.png shows: Fortune teller with crystal ball showing AI/data network with head silhouette
- ✅ plat_5.png shows: Fortune teller with shopping cart and retail store symbols

---

## Data Flow

### Design/Planning Phase

```
1. Strategic Research
   ↓
   .cursor/PERSONAS/*.md files created
   ↓
   Each question gets:
   - Full text (for context)
   - "Crisp:" label (for card artwork)
   - Focus area (for implementation)

2. Card Artwork Generation
   ↓
   Designer creates tarot cards using "Crisp:" labels
   ↓
   /public/tactical_cards/{persona}/{prefix}_{num}.png

3. Data Structure Creation
   ↓
   Questions transcribed to /lib/persona_questions.json
   ↓
   Products mapped to /public/product_mapping.json
```

### Runtime Application Flow

```
1. User selects persona
   ↓
2. TacticalCardSelection.js loads questions from persona_questions.json
   ↓
3. Card images loaded from /public/tactical_cards/{persona}/
   ↓
   Image path: tactical_cards/{folder}/{prefix}_{index+1}.png
   Example: tactical_cards/publisher/pub_1.png
   ↓
4. User selects 2 cards
   ↓
5. BlueprintDisplay.js maps selected IDs to product_mapping.json
   ↓
6. Displays product recommendations + card images
```

---

## File Naming Convention

### Card Images

**Pattern:** `/public/tactical_cards/{persona_folder}/{prefix}_{number}.png`

**Persona Mapping:**
```javascript
const personaPathConfig = {
  advertiser: { prefix: 'adv', folder: 'advertiser' },
  publisher: { prefix: 'pub', folder: 'publisher' },
  platform: { prefix: 'plat', folder: 'platform' }
};
```

**Examples:**
- Publisher card 1: `/public/tactical_cards/publisher/pub_1.png`
- Advertiser card 3: `/public/tactical_cards/advertiser/adv_3.png`
- Platform card 6: `/public/tactical_cards/platform/plat_6.png`

**Index Calculation:**
```javascript
const tacticalIndex = allQuestions[persona].tactical.findIndex(q => q.id === id);
const imagePath = `/tactical_cards/${config.folder}/${config.prefix}_${tacticalIndex + 1}.png`;
```

**Important:** Card numbers are 1-based (not 0-based), matching the array index + 1.

---

## Question ID Structure

### Pattern
`{persona_prefix}_{type}{number}`

**Types:**
- `h` = high-level (futuristic/strategic)
- `t` = tactical (current priorities)

**Examples:**
- `pub_h1` = Publisher high-level question 1
- `pub_t1` = Publisher tactical question 1 (maps to pub_1.png)
- `adv_t3` = Advertiser tactical question 3 (maps to adv_3.png)
- `plat_t5` = Platform tactical question 5 (maps to plat_5.png)

---

## Mapping Verification Checklist

### ✅ Verified Mappings

- [x] All 18 tactical card PNG files exist
- [x] All "Crisp:" labels match card artwork
- [x] All tactical questions in `persona_questions.json` have corresponding product mappings
- [x] Card file names match expected pattern `{prefix}_{1-6}.png`
- [x] Source markdown files contain all "Crisp:" labels used in cards

### Card Counts

| Persona | High-Level Questions | Tactical Questions | Card Images | Product Mappings |
|---------|---------------------|-------------------|-------------|------------------|
| Publisher | 6 (pub_h1-h6) | 6 (pub_t1-t6) | 6 PNG files | 6 mappings |
| Advertiser | 6 (adv_h1-h6) | 6 (adv_t1-t6) | 6 PNG files | 6 mappings |
| Platform | 6 (plat_h1-h6) | 6 (plat_t1-t6) | 6 PNG files | 6 mappings |
| **Total** | **18** | **18** | **18** | **18** |

---

## Category Label Reference

Complete list of category labels used across all cards:

### Publisher Categories
- DATA
- MARKETING
- DISTRIBUTION
- TECHNOLOGY
- PEOPLE
- PRODUCTS

### Advertiser Categories
- ROI
- BUDGET
- PROGRAMMATIC
- CREATIVE
- INTEGRATION
- AUDIENCE

### Platform Categories
- ROI
- BUDGET
- PROGRAMMATIC
- CREATIVE
- INTEGRATION
- AUDIENCE

**Note:** Advertiser and Platform use the same category set, while Publisher uses a distinct set focused on media owner challenges.

---

## Crystal Ball Iconography

### Symbols Used in Card Artwork

| Card Topic | Icons in Crystal Ball |
|------------|---------------------|
| Data/Audience | Network nodes, person silhouettes, database icons |
| ROI/Sales | Shopping carts, graphs, retail stores |
| Creative | Hourglass, QR codes, dynamic elements |
| Technology | Gears, API symbols, code blocks |
| Distribution | Buildings, WiFi signals, connection symbols |
| Integration | Chain links, synchronized icons, retail symbols |
| Programmatic | Network graphs, targeting symbols |

---

## Related Documentation

- [CODEBASE_MAP.md](CODEBASE_MAP.md) - Full application architecture
- [PERSONA_PLATFORM_MAPPING.md](PERSONA_PLATFORM_MAPPING.md) - Persona to MW product mappings
- `/lib/persona_questions.json` - Runtime question data
- `/public/product_mapping.json` - Product recommendation data

---

## Maintenance Notes

### When Adding New Cards

1. **Update `.cursor/PERSONAS/{persona}.md`:**
   - Add full question text
   - Add "Crisp:" label for card artwork

2. **Generate card artwork:**
   - Use "Crisp:" label as card title
   - Follow naming convention: `{prefix}_{number}.png`
   - Save to `/public/tactical_cards/{persona}/`

3. **Update `/lib/persona_questions.json`:**
   - Add new question with unique ID
   - Use full question text (not "Crisp:" label)

4. **Update `/public/product_mapping.json`:**
   - Map question ID to MW product
   - Include: icon, platformPillar, productName, oneLiner, features

5. **Update this document:**
   - Add to appropriate mapping table
   - Increment card counts

### Consistency Checks

Run these checks when modifying cards:

```bash
# Verify all 18 tactical card images exist
find ./public/tactical_cards -name "*.png" | wc -l
# Should return: 18

# Count tactical questions in JSON
grep -o '"id": "[a-z]*_t[0-9]"' ./lib/persona_questions.json | wc -l
# Should return: 18

# Count product mappings
grep -o '"[a-z]*_t[0-9]":' ./public/product_mapping.json | wc -l
# Should return: 18
```

---

**Maintained by:** Moving Walls Team
**Last Updated:** 2025-10-07
**Version:** 1.0
