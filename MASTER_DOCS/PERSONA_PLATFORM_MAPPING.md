# Persona-to-Platform Mapping Analysis

**Generated:** 2025-10-07
**Purpose:** Document the complete mapping system from user personas → questions → Moving Walls platform pillars → specific products

---

## Table of Contents

1. [Overview](#overview)
2. [Mapping Architecture](#mapping-architecture)
3. [The Three Personas](#the-three-personas)
4. [Question Categories](#question-categories)
5. [Platform Pillars](#platform-pillars)
6. [Complete Mapping Tables](#complete-mapping-tables)
7. [User Flow Through Mapping](#user-flow-through-mapping)
8. [Gaps & Missing Mappings](#gaps--missing-mappings)
9. [Recommendations](#recommendations)

---

## Overview

The fortune teller app uses a **three-tier mapping system** to guide users from their persona identity through strategic questions to specific Moving Walls products:

```
PERSONA → QUESTIONS → TACTICAL CHOICES → MW PRODUCTS
```

### Key Components

| Component | Count | Purpose |
|-----------|-------|---------|
| **Personas** | 3 | User archetypes (Publisher, Advertiser, Platform) |
| **High-Level Questions** | 6 per persona | Future-focused strategic challenges |
| **Tactical Questions** | 6 per persona | Immediate implementation challenges |
| **Platform Pillars** | 4 | MW product categories |
| **Specific Products** | ~10 unique | Actual MW solutions |

---

## Mapping Architecture

### Tier 1: Persona Selection
Users identify as one of three personas based on their role in the advertising ecosystem.

### Tier 2: Question Selection
- **High-Level (2 required):** Strategic, future-oriented challenges (5-10 years)
- **Tactical (2 required):** Immediate, actionable implementation questions

### Tier 3: Product Mapping
Each **tactical question** maps to:
- **Platform Pillar:** Category of MW solution (Measure, Influence, Reach, Studio, Self Serve)
- **Product Name:** Specific MW product
- **Icon:** Visual identifier
- **One-Liner:** Concise value proposition
- **Features:** List of 2-4 key capabilities

### Important Note
**High-level questions do NOT map to products** - they are used for:
1. Contextualizing the user's strategic mindset
2. Generating AI-powered initial fortune statement
3. Persona-specific insights in the journey

---

## The Three Personas

### 1. Publisher (`publisher`)
**Description:** Media owners who sell advertising inventory (billboards, digital screens, etc.)

**Strategic Focus:**
- Monetizing inventory effectively
- Automating sales processes
- Proving value to advertisers
- Building audience intelligence

**Example Roles:**
- Billboard network operators
- Digital out-of-home publishers
- Transit media companies
- Retail media network owners

**File References:**
- Question bank: `/lib/persona_questions.json` → `publisher`
- Tactical cards: `/public/tactical_cards/publisher/pub_1.png` through `pub_6.png`
- Mappings: `/public/product_mapping.json` → `pub_t1` through `pub_t6`

---

### 2. Advertiser (`advertiser`)
**Description:** Brands and marketers who buy advertising to reach audiences.

**Strategic Focus:**
- Proving ROI of billboard/DOOH spend
- Integrating DOOH with digital campaigns
- Targeting audiences effectively
- Measuring campaign impact

**Example Roles:**
- Brand managers
- Digital marketers
- Media planners
- Marketing directors

**File References:**
- Question bank: `/lib/persona_questions.json` → `advertiser`
- Tactical cards: `/public/tactical_cards/advertiser/adv_1.png` through `adv_6.png`
- Mappings: `/public/product_mapping.json` → `adv_t1` through `adv_t6`

---

### 3. Platform / Service Provider (`platform`)
**Description:** Agencies, trading desks, and platforms that facilitate advertising transactions.

**Strategic Focus:**
- Optimizing campaign performance
- Proving incremental value
- Managing client budgets
- Integrating DOOH with omnichannel strategies

**Example Roles:**
- Media agencies
- Programmatic platforms (DSPs/SSPs)
- Ad tech providers
- Marketing consultants

**File References:**
- Question bank: `/lib/persona_questions.json` → `platform`
- Tactical cards: `/public/tactical_cards/platform/plat_1.png` through `plat_6.png`
- Mappings: `/public/product_mapping.json` → `plat_t1` through `plat_t6`

---

## Question Categories

### High-Level Questions (Strategic)
**Purpose:** Understand user's long-term vision and strategic concerns.

**Characteristics:**
- Future-oriented (5-10 year horizon)
- Technology-focused (AI, blockchain, metaverse)
- Industry trend questions
- "What if?" scenarios

**User Journey Role:**
- Used in **Stage 1** of fortune-journey
- User selects **exactly 2** high-level questions
- Sent to `/api/generate-initial-fortune` for AI-powered fortune generation
- **Not mapped to specific products** (used for context only)

**Example High-Level Questions:**
- **Publisher:** "Will AI automatically target ads based on what people do online?"
- **Advertiser:** "Will blockchain track exactly how billboards drive sales?"
- **Platform:** "Will AI handle most campaign planning, optimization, and reporting automatically?"

---

### Tactical Questions (Implementation)
**Purpose:** Identify immediate, actionable challenges the user faces.

**Characteristics:**
- Present-day focused
- Implementation-oriented
- "How do you...?" questions
- Directly solvable with MW products

**User Journey Role:**
- Used in **Stage 3** of fortune-journey
- User selects **exactly 2** tactical questions via drag-and-drop cards
- Each question **maps to a specific MW product**
- Displayed in final blueprint with product recommendations

**Example Tactical Questions:**
- **Publisher:** "How do you prove billboards actually drive sales?"
- **Advertiser:** "How much of your digital budget should go to billboards?"
- **Platform:** "How do you prove billboards boost your other digital campaigns?"

---

## Platform Pillars

Moving Walls products are organized into **4 main pillars** plus **1 self-serve category**:

### 1. MW Measure 📊
**Purpose:** Measurement, attribution, and reporting solutions.

**Products:**
- Measurement & Reporting
- Campaign Intelligence
- ROI Reporting
- Brand Lift Studies
- Clean-Room Measurement
- Incremental Reach
- Unified KPIs

**Badge Color:** Blue (`bg-blue-500/20 text-blue-300`)

---

### 2. MW Influence 📍
**Purpose:** Audience targeting, intelligence, and activation.

**Products:**
- Audience Intelligence
- Audience-First Planning
- Privacy-First Targeting
- Programmatic Delivery

**Badge Color:** Purple (`bg-purple-500/20 text-purple-300`)

---

### 3. MW Reach 🚀
**Purpose:** Inventory management, programmatic access, and distribution.

**Products:**
- LMX Platform
- Yield Optimization
- Retail Media Sync

**Badge Color:** Teal (`bg-teal-500/20 text-teal-300`)

---

### 4. MW Studio 🧠
**Purpose:** Creative tools and dynamic content delivery.

**Products:**
- Dynamic & Contextual Ads
- Creative Optimization

**Badge Color:** Teal (grouped with Automate)

---

### 5. MW Self Serve 💻
**Purpose:** Self-service booking and campaign management.

**Products:**
- Self-Serve Booking Platform
- Direct Booking Portal
- Packaged Deals

**Badge Color:** Teal (grouped with Automate)

---

## Complete Mapping Tables

### Publisher Tactical Mappings

| Question ID | Question Text | Platform Pillar | Product Name | Icon | Key Features |
|-------------|---------------|-----------------|--------------|------|--------------|
| `pub_t1` | How do you prove billboards actually drive sales? | MW Measure | Measurement & Reporting | 📊 | Brand Lift Studies, Automated Reports, Campaign Insights |
| `pub_t2` | How do you get digital brands interested in billboards? | MW Measure | Campaign Intelligence | 📊 | Automated Pitch Decks, Case Study Builder, Audience Data |
| `pub_t3` | How do you make buying billboards as easy as buying Google ads? | MW Reach | LMX Platform | 🚀 | Inventory Management, Programmatic Access, API Integrations |
| `pub_t4` | What simple tools can automate your sales follow-ups? | MW Self Serve | Self-Serve Booking Platform | 💻 | No-Code Tools, Direct Booking Portal, Billing & Invoicing |
| `pub_t5` | How do you teach sales teams to sell marketing strategies, not just ad space? | MW Influence | Audience Intelligence | 📍 | Audience Profiling, Geo-Targeting, Planner Tool |
| `pub_t6` | How do you get brands to try billboards without big commitments? | MW Self Serve | Self-Serve Booking Platform | 💻 | Packaged Deals, Instant Booking, Marketplace Showcase |

**Card Images:** `/public/tactical_cards/publisher/pub_1.png` through `pub_6.png`

---

### Advertiser Tactical Mappings

| Question ID | Question Text | Platform Pillar | Product Name | Icon | Key Features |
|-------------|---------------|-----------------|--------------|------|--------------|
| `adv_t1` | How do you prove billboards actually increase sales? | MW Measure | MW Measure | 📊 | Sales Lift Reporting, Brand Lift Studies, 3rd Party Measurement |
| `adv_t2` | How much of your digital budget should go to billboards? | MW Measure | ROI Reporting | 📈 | Real-time Reports, Brand Lift Studies, Performance Dashboards |
| `adv_t3` | Should you buy specific billboard locations or target specific audiences? | MW Influence | Audience-First Planning | 📍 | Audience Profiles, Geo/PoI Targeting, Reach & Frequency Planner |
| `adv_t4` | How do you make billboard ads more memorable with QR codes and animations? | MW Studio | Dynamic & Contextual Ads | 🧠 | Rules-based Scheduling, Dynamic Content, Contextual & Daypart Targeting |
| `adv_t5` | How do you use billboards to boost your other digital ads without wasting money? | MW Measure | Incremental Reach | ✨ | Incremental Reach Calculator, Cross-Media Reporting |
| `adv_t6` | How do you use your customer data to target billboard audiences better? | MW Influence | Privacy-First Targeting | 📍 | Geo & Contextual Signals, SSP/DSP Integrations |

**Card Images:** `/public/tactical_cards/advertiser/adv_1.png` through `adv_6.png`

---

### Platform Tactical Mappings

| Question ID | Question Text | Platform Pillar | Product Name | Icon | Key Features |
|-------------|---------------|-----------------|--------------|------|--------------|
| `plat_t1` | How do you prove billboards boost your other digital campaigns? | MW Measure | Clean-Room Measurement | 🛡️ | Privacy-Safe Reporting, Third-party Integrations, MW Measure |
| `plat_t2` | How do you convince clients to shift more digital budget to billboards? | MW Measure | Budget Share Growth | 💰 | Real-time Reports, BLS, Cross-Platform Analytics |
| `plat_t3` | Should you buy premium billboard locations or use AI to target audiences? | MW Reach | Yield Optimization | ⚖️ | Inventory Quality Data, Audience Profiles, Dynamic Pricing Tools |
| `plat_t4` | How do you create personalized billboard content without breaking budgets? | MW Influence | Programmatic Delivery | 🤖 | Ad Server Rules Engine, Dynamic Content Delivery, Header Bidding |
| `plat_t5` | How do you connect billboard campaigns with retail sales tracking? | MW Reach | Retail Media Sync | 🔗 | Retail DSP Integration, In-flight Campaign Sync, Unified Reporting |
| `plat_t6` | How do you combine billboard metrics with digital campaign data? | MW Measure | Unified KPIs | 🎯 | Cross-campaign Reporting, Standardized Metrics, MAX Platform |

**Card Images:** `/public/tactical_cards/platform/plat_1.png` through `plat_6.png`

---

## User Flow Through Mapping

### Step-by-Step Journey

```
1. Welcome Screen (/)
   ↓ User clicks "Reveal My Fortune!"

2. Collect Info (/collect-info)
   ↓ LinkedIn QR scan OR manual entry
   ↓ User data captured

3. [LinkedIn Flow Only] Interlude (/linkedin-interlude)
   ↓ Profile display + narration

4. Fortune Journey - Stage 1 (/fortune-journey)
   ┌─────────────────────────────────────────┐
   │ PERSONA SELECTION                       │
   │ User chooses: Publisher / Advertiser /  │
   │               Platform                  │
   └─────────────────┬───────────────────────┘
                     ↓
   ┌─────────────────────────────────────────┐
   │ HIGH-LEVEL QUESTION SELECTION           │
   │ User selects 2 of 6 strategic questions│
   │ Example: "Will AI automate targeting?" │
   └─────────────────┬───────────────────────┘
                     ↓
   ┌─────────────────────────────────────────┐
   │ AI FORTUNE GENERATION                   │
   │ POST /api/generate-initial-fortune      │
   │ Input: selectedQuestions, persona, user │
   │ Output: Opening fortune statement       │
   └─────────────────┬───────────────────────┘
                     ↓

5. Fortune Journey - Stage 2
   ┌─────────────────────────────────────────┐
   │ DISPLAY FORTUNE                         │
   │ Shows AI-generated opening statement    │
   │ Optional TTS narration                  │
   └─────────────────┬───────────────────────┘
                     ↓

6. Fortune Journey - Stage 3
   ┌─────────────────────────────────────────┐
   │ TACTICAL CARD SELECTION                 │
   │ User drags 2 of 6 tactical question    │
   │ cards (tarot-style design)              │
   │ Each card has:                          │
   │ - Unique artwork (PNG image)            │
   │ - Question text                         │
   │ - Drag-and-drop interaction             │
   └─────────────────┬───────────────────────┘
                     ↓
   ┌─────────────────────────────────────────┐
   │ PRODUCT MAPPING LOOKUP                  │
   │ For each selected tactical question ID: │
   │ 1. Load from product_mapping.json       │
   │ 2. Extract:                             │
   │    - platformPillar (Measure/Influence) │
   │    - productName                        │
   │    - oneLiner (value prop)              │
   │    - features (array)                   │
   └─────────────────┬───────────────────────┘
                     ↓

7. Fortune Journey - Stage 4
   ┌─────────────────────────────────────────┐
   │ BLUEPRINT DISPLAY                       │
   │                                         │
   │ "Your Chosen Solutions"                 │
   │ ┌───────────────────────────────────┐   │
   │ │ [Card Image] MW Measure           │   │
   │ │ Measurement & Reporting           │   │
   │ │ "Offer advertisers proof..."      │   │
   │ │ • Brand Lift Studies              │   │
   │ │ • Automated Reports               │   │
   │ └───────────────────────────────────┘   │
   │ ┌───────────────────────────────────┐   │
   │ │ [Card Image] MW Influence         │   │
   │ │ Audience Intelligence             │   │
   │ │ "Use location data..."            │   │
   │ │ • Audience Profiling              │   │
   │ │ • Geo-Targeting                   │   │
   │ └───────────────────────────────────┘   │
   │                                         │
   │ "Other Paths to Explore"                │
   │ - Remaining 4 tactical questions        │
   │   with product names (no full details)  │
   └─────────────────┬───────────────────────┘
                     ↓
   ┌─────────────────────────────────────────┐
   │ BLUEPRINT HTML GENERATION               │
   │ generateBlueprintHtml()                 │
   │ Creates email-ready HTML version        │
   │ Stored in localStorage: 'blueprintHtml' │
   └─────────────────┬───────────────────────┘
                     ↓

8. Contact Details (/contact-details)
   ┌─────────────────────────────────────────┐
   │ EMAIL CAPTURE & SEND                    │
   │ - Auto-submit lead to Google Sheets     │
   │ - Send blueprint HTML via Resend        │
   └─────────────────┬───────────────────────┘
                     ↓

9. Archetype Discovery (/archetype-discovery)
   ┌─────────────────────────────────────────┐
   │ CONFERENCE ARCHETYPE MATCHING           │
   │ - AI matches user to attendee archetype │
   │ - Generates personalized avatar         │
   │ - Suggests networking connections       │
   └─────────────────────────────────────────┘
```

---

## Code Implementation Details

### File: `TacticalCardSelection.js`

**Key Logic:**
```javascript
// Persona determines card image path
const personaPathConfig = {
  advertiser: { prefix: 'adv', folder: 'advertiser' },
  publisher: { prefix: 'pub', folder: 'publisher' },
  platform: { prefix: 'plat', folder: 'platform' }
};

// Card image constructed from index
const imagePath = `/tactical_cards/${config.folder}/${config.prefix}_${index + 1}.png`;
// Example: /tactical_cards/publisher/pub_1.png
```

**Selection Logic:**
- User can select exactly 2 cards (`MAX_SELECTIONS = 2`)
- Click to select/deselect
- Golden border + checkmark on selected cards
- Disabled state if 2 already selected

**Output:**
```javascript
onConfirm({ scenarios: ['pub_t1', 'pub_t5'] }); // Example selected IDs
```

---

### File: `BlueprintDisplay.js`

**Key Logic:**
```javascript
// Map tactical IDs to products
const tacticalSolutions = tacticalChoices.map(id => {
  const question = allQuestions[persona].tactical.find(q => q.id === id);
  return {
    id,
    questionText: question.text,
    solution: productMappingData[id], // Lookup from JSON
    imagePath: `/tactical_cards/${config.folder}/${config.prefix}_${index + 1}.png`
  };
});
```

**Product Display:**
```javascript
{tacticalSolutions.map(item => (
  <div>
    <Image src={item.imagePath} /> {/* Card image */}
    <span>{item.solution.platformPillar}</span> {/* Pillar badge */}
    <h3>{item.solution.productName}</h3>
    <p>{item.solution.oneLiner}</p>
    {item.solution.features.map(feature => (
      <div>{feature}</div>
    ))}
  </div>
))}
```

**Unselected Questions:**
```javascript
const unselectedQuestions = allQuestions[persona].tactical
  .filter(q => !tacticalChoices.includes(q.id))
  .map(q => ({
    id: q.id,
    text: q.text,
    solution: productMappingData[q.id]?.productName || 'Mystery solution'
  }));
```

---

### File: `product_mapping.json`

**Structure:**
```json
{
  "pub_t1": {
    "icon": "📊",
    "platformPillar": "MW Measure",
    "productName": "Measurement & Reporting",
    "oneLiner": "Offer advertisers proof of performance and premium insights as a value-added service.",
    "features": [
      "Brand Lift Studies",
      "Automated Campaign Reports",
      "Campaign Insights"
    ]
  }
}
```

**Keys:** All tactical question IDs (18 total)
- `pub_t1` through `pub_t6` (6)
- `adv_t1` through `adv_t6` (6)
- `plat_t1` through `plat_t6` (6)

**Fields:**
- `icon` (emoji) - Used in blueprint display
- `platformPillar` - Maps to MW product category
- `productName` - Specific MW product
- `oneLiner` - Value proposition
- `features` - Array of 2-4 key capabilities

---

## Gaps & Missing Mappings

### 1. High-Level Questions Not Mapped
**Status:** ❌ No product mappings exist

**Affected IDs:**
- `pub_h1` through `pub_h6` (6 questions)
- `adv_h1` through `adv_h6` (6 questions)
- `plat_h1` through `plat_h6` (6 questions)

**Total:** 18 unmapped questions

**Current Usage:**
- Used only for AI context in `/api/generate-initial-fortune`
- User selects 2, but they don't appear in final blueprint
- Sent to Gemini/OpenAI for fortune generation

**Recommendation:**
- **Option A:** Leave as-is (strategic context only)
- **Option B:** Add high-level product mappings to MW's vision/roadmap products
- **Option C:** Map to white papers, research reports, or consulting services

---

### 2. Duplicate Product Names
**Status:** ⚠️ Some products appear multiple times with different contexts

**Examples:**
- **Self-Serve Booking Platform:**
  - `pub_t4`: Focus on CRM automation
  - `pub_t6`: Focus on trial campaigns
  - *Different features but same product name*

- **MW Measure:**
  - `adv_t1`: Standalone product name
  - Multiple others reference "MW Measure" as feature

**Impact:**
- Blueprint may show same product twice if user selects both
- Could confuse users ("Didn't I already select this?")

**Recommendation:**
- Differentiate product names (e.g., "MW Measure - Sales Lift" vs "MW Measure - ROI")
- OR: Merge features if user selects related questions
- OR: Prevent selection of duplicate products

---

### 3. Platform Pillar Inconsistencies
**Status:** ⚠️ Minor formatting inconsistencies

**Issues Found:**
- Some pillars have trailing spaces: `"MW Reach "` (note space)
- Inconsistent naming: "MW Self Serve" vs "MW Self-Serve"

**Files Affected:**
- `/public/product_mapping.json` lines 18, 39

**Recommendation:**
- Standardize pillar names (remove trailing spaces)
- Update badge logic in `BlueprintDisplay.js` to handle variations

---

### 4. Missing Pillar Badge Colors
**Status:** ⚠️ Some pillars use fallback color

**Current Badge Logic:**
```javascript
item.solution.platformPillar === 'Measure' ? 'bg-blue-500/20' :
item.solution.platformPillar === 'Influence' ? 'bg-purple-500/20' :
'bg-teal-500/20' // Default for Reach, Studio, Self Serve
```

**Issue:** No distinct colors for:
- MW Reach
- MW Studio
- MW Self Serve

**Recommendation:**
- Add specific colors:
  - Reach: `bg-green-500/20 text-green-300`
  - Studio: `bg-orange-500/20 text-orange-300`
  - Self Serve: `bg-pink-500/20 text-pink-300`

---

### 5. Card Image Naming Convention
**Status:** ✅ Consistent and working

**Current Convention:**
```
/public/tactical_cards/{persona_folder}/{prefix}_{number}.png

Examples:
- /tactical_cards/publisher/pub_1.png
- /tactical_cards/advertiser/adv_3.png
- /tactical_cards/platform/plat_6.png
```

**Index Mapping:**
- Card number = index + 1 (1-based, not 0-based)
- Matches question order in `persona_questions.json`

**Validation:**
- ✅ All 18 card images should exist (6 per persona)
- ⚠️ No fallback if image missing (would show broken image)

**Recommendation:**
- Add image existence check
- Provide fallback icon-based cards if images missing

---

## Recommendations

### Immediate Improvements

#### 1. Standardize product_mapping.json
**Priority:** High

**Actions:**
```json
// Remove trailing spaces from pillar names
"platformPillar": "MW Reach" // Not "MW Reach "

// Differentiate duplicate products
"pub_t4": {
  "productName": "Self-Serve Booking - CRM Automation"
},
"pub_t6": {
  "productName": "Self-Serve Booking - Trial Campaigns"
}
```

#### 2. Add Pillar Badge Color Mapping
**Priority:** Medium

**Code Update in BlueprintDisplay.js:**
```javascript
const getPillarColor = (pillar) => {
  const normalized = pillar.trim();
  const colorMap = {
    'MW Measure': 'bg-blue-500/20 text-blue-300',
    'MW Influence': 'bg-purple-500/20 text-purple-300',
    'MW Reach': 'bg-green-500/20 text-green-300',
    'MW Studio': 'bg-orange-500/20 text-orange-300',
    'MW Self Serve': 'bg-pink-500/20 text-pink-300'
  };
  return colorMap[normalized] || 'bg-teal-500/20 text-teal-300';
};
```

#### 3. Prevent Duplicate Product Selection
**Priority:** Medium

**Logic Update in TacticalCardSelection.js:**
```javascript
const handleSelectCard = (id) => {
  const newProduct = productMappingData[id]?.productName;
  const alreadySelected = selectedIds.some(selectedId =>
    productMappingData[selectedId]?.productName === newProduct
  );

  if (alreadySelected && !selectedIds.includes(id)) {
    setError('You have already selected a solution for this challenge.');
    return;
  }

  // ... existing selection logic
};
```

#### 4. Add Image Fallback
**Priority:** Low

**Code Update in TacticalCardSelection.js:**
```javascript
<Image
  src={imagePath}
  alt={`Card for: ${q.text}`}
  width={500}
  height={750}
  onError={(e) => {
    e.target.style.display = 'none';
    // Show icon-based fallback
  }}
  className="rounded-lg w-full h-full object-cover"
/>
```

---

### Future Enhancements

#### 1. High-Level Question Utilization
**Idea:** Map high-level questions to MW thought leadership content

**Possible Mappings:**
- White papers on AI in advertising
- Future of DOOH research reports
- Blockchain in advertising case studies
- Webinars and events

**Blueprint Section:**
```
"Strategic Insights Based on Your Vision"
- Selected high-level questions
- Link to relevant MW content/research
- Invitation to future-focused discussions
```

#### 2. Dynamic Product Bundling
**Idea:** Suggest product bundles based on selected combinations

**Example:**
```
User selects:
- pub_t1 (Measurement & Reporting)
- pub_t5 (Audience Intelligence)

Suggestion:
"These solutions work even better together as the
MW Measure + Influence Bundle. Get 15% off when combined."
```

#### 3. Persona-Specific Product Filtering
**Idea:** Hide/show products based on persona relevance

**Current State:** Same 6 tactical questions per persona, but products could overlap

**Enhancement:** Ensure each persona gets truly unique product recommendations

#### 4. A/B Test Question Variations
**Idea:** Test different question phrasings to improve selection rates

**Metrics to Track:**
- Which tactical questions are selected most often?
- Which high-level questions correlate with better engagement?
- Persona distribution (are most users publishers?)

#### 5. Visual Product Roadmap
**Idea:** Show how selected products fit into MW ecosystem

**Blueprint Addition:**
```
"Your MW Platform Journey"
[Visual diagram showing how selected products connect]
```

---

## Summary

### What Works Well ✅

1. **Clean three-tier architecture** - Personas → Questions → Products is intuitive
2. **Beautiful card-based UI** - Tarot card design makes tactical selection engaging
3. **Complete tactical mappings** - All 18 tactical questions map to real MW products
4. **Flexible AI integration** - High-level questions feed AI fortune generation
5. **Clear product descriptions** - One-liners and feature lists are concise and actionable

### What Needs Attention ⚠️

1. **Standardize product_mapping.json** formatting (trailing spaces, duplicate names)
2. **Add distinct pillar badge colors** for all 5 categories
3. **Prevent duplicate product selection** or merge features intelligently
4. **Add image fallback logic** for missing tactical card PNGs
5. **Validate card image existence** (18 expected images)

### Strategic Considerations 💡

1. **High-level questions are underutilized** - Could map to thought leadership
2. **Product bundles not suggested** - Missed cross-sell opportunity
3. **No usage analytics** - Don't know which questions/products are most popular
4. **Static mappings** - Could be dynamic based on user industry or company size

---

**Conclusion:**
The persona-to-platform mapping system is **well-designed and functional**, with a clear flow from user identity → strategic challenges → tactical solutions → MW products. Minor standardization and enhancement opportunities exist, but the core architecture is solid and ready for production use.

---

**Maintained by:** Moving Walls Team
**Last Updated:** 2025-10-07
**Related Docs:** [CODEBASE_MAP.md](CODEBASE_MAP.md)
