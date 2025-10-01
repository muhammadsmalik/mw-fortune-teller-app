# Hybrid Architecture Documentation

**Last Updated:** 2025-10-01
**Status:** Planning Phase
**Purpose:** Document the transition from dual-endpoint system to hybrid multi-stage journey with legacy fortune format

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Comparison](#architecture-comparison)
3. [File Status & Naming Conventions](#file-status--naming-conventions)
4. [API Endpoints](#api-endpoints)
5. [Component Mapping](#component-mapping)
6. [Data Flow](#data-flow)
7. [Migration Strategy](#migration-strategy)
8. [Testing Checklist](#testing-checklist)

---

## Overview

### Current System (Before Hybrid)

The app currently has **TWO PARALLEL SYSTEMS**:

1. **Legacy System**: Simple fortune generation
   - Endpoint: `/api/generate-fortune`
   - Format: 6 fields (openingLine, locationInsight, audienceOpportunity, engagementForecast, transactionsPrediction, aiAdvice)
   - Screen: `/display-fortune` (currently unreachable in main flow)
   - Used by: LinkedIn flow only (background generation)

2. **Journey System**: Multi-stage persona-driven experience
   - Endpoint: `/api/generate-initial-fortune`
   - Format: openingStatement + 2 challenge-insight pairs
   - Screen: `/fortune-journey` (4-stage process)
   - Used by: Manual flow + LinkedIn interlude

### Hybrid System (After Migration)

**SINGLE UNIFIED SYSTEM** that combines the best of both:

- Multi-stage journey structure (from Journey System)
- Legacy 6-field fortune format (from Legacy System)
- Persona-aware generation (enhanced)
- Challenge-driven insights (integrated into legacy format)

---

## Architecture Comparison

### Current Flow (Before)

```
                    ┌─────────────────────────┐
                    │    /collect-info        │
                    └────────┬───────┬────────┘
                             │       │
                 ┌───────────┘       └──────────┐
                 │ LinkedIn              Manual │
                 ▼                              ▼
    ┌────────────────────────┐    ┌────────────────────────┐
    │ /generating-fortune    │    │ /fortune-journey       │
    │ (calls generate-       │    │ (calls generate-       │
    │  fortune API)          │    │  initial-fortune API)  │
    └──────────┬─────────────┘    └──────────┬─────────────┘
               │                              │
               ▼                              │
    ┌────────────────────────┐               │
    │ /linkedin-interlude    │               │
    │ (waits for bg fortune) │               │
    └──────────┬─────────────┘               │
               │                              │
               └──────────┬───────────────────┘
                          ▼
              ┌────────────────────────┐
              │   /fortune-journey     │
              │   (4-stage process)    │
              └────────────────────────┘

    UNUSED: /display-fortune (orphaned)
```

### Hybrid Flow (After)

```
                    ┌─────────────────────────┐
                    │    /collect-info        │
                    └────────┬───────┬────────┘
                             │       │
                 ┌───────────┴───────┴──────────┐
                 │   BOTH FLOWS UNIFIED         │
                 ▼                              │
    ┌────────────────────────┐                 │
    │ /linkedin-interlude    │                 │
    │ (LinkedIn flow only)   │                 │
    └──────────┬─────────────┘                 │
               │                                │
               └──────────┬─────────────────────┘
                          ▼
              ┌────────────────────────────────┐
              │   /fortune-journey-v2          │
              │   (Hybrid 5-stage process)     │
              │                                │
              │   1. Persona + Challenge Select│
              │   2. Generate Legacy Fortune   │
              │      (enhanced API)            │
              │   3. Display Legacy Fortune    │
              │   4. Tactical Selection        │
              │   5. Blueprint Generation      │
              └────────────────────────────────┘

    DEPRECATED: /display-fortune
    DEPRECATED: /generating-fortune (merged into journey)
```

---

## File Status & Naming Conventions

### Naming Convention Strategy

To avoid confusion, we'll use suffixes:

- **`-v1`**: Original/current implementation (will be deprecated)
- **`-v2`**: New hybrid implementation (active)
- **`-legacy`**: Old standalone screens (for reference/backup)
- **`-deprecated`**: Marked for removal after migration complete

### API Endpoints

| Endpoint | Status | Rename To | Purpose |
|----------|--------|-----------|---------|
| `/api/generate-fortune` | **ACTIVE → ENHANCED** | Keep name, add v2 logic | Main fortune generation (enhanced with persona) |
| `/api/generate-initial-fortune` | **DEPRECATED** | `/api/generate-initial-fortune-v1-deprecated` | Old persona-based fortune (no longer needed) |
| `/api/generate-blueprint` | **NEW** | - | Final blueprint combining all stages |
| `/api/match-archetype` | **KEEP AS-IS** | - | Archetype matching (independent feature) |
| `/api/get-linkedin-company-details` | **KEEP AS-IS** | - | LinkedIn data fetching |
| `/api/transcribe-audio` | **KEEP AS-IS** | - | Voice input support |
| `/api/generate-narration` | **KEEP AS-IS** | - | TTS for narrations |

### Page Files (Routes)

| File | Current Status | New Status | Action |
|------|----------------|------------|--------|
| `app/page.js` | Active | **KEEP** | Landing page |
| `app/collect-info/page.js` | Active | **KEEP (modify)** | Entry point - needs redirect logic update |
| `app/generating-fortune/page.js` | Active (LI only) | **DEPRECATED** | Rename to `page-v1-deprecated.js` |
| `app/linkedin-interlude/page.js` | Active (LI only) | **KEEP (modify)** | Remove fortune generation, just show profile |
| `app/fortune-journey/page.js` | Active | **RENAME** | → `page-v1-deprecated.js` |
| `app/fortune-journey-v2/page.js` | - | **CREATE NEW** | New hybrid journey orchestrator |
| `app/display-fortune/page.js` | Orphaned | **DEPRECATED** | Rename to `page-v1-legacy.js` (keep for reference) |
| `app/archetype-discovery/page.js` | Active | **KEEP** | Independent feature |
| `app/contact-details/page.js` | Active | **KEEP** | Final stage |
| `app/scenario-answers/page.js` | Active | **KEEP** | Blueprint display |

### Component Files

| File | Current Status | New Status | Action |
|------|----------------|------------|--------|
| `components/fortune-journey/ScenarioSelection.js` | Active | **KEEP** | Reusable for both high-level & tactical |
| `components/fortune-journey/DisplayFortune.js` | Active (journey v1) | **RENAME** | → `DisplayFortune-v1-deprecated.js` |
| `components/fortune-journey/DisplayLegacyFortune.js` | - | **CREATE NEW** | Shows 6-field fortune format |
| `components/fortune-journey/TacticalCardSelection.js` | Active | **KEEP** | Reusable |
| `components/fortune-journey/BlueprintDisplay.js` | Active | **KEEP (modify)** | Needs to accept legacy fortune format |
| `components/fortune-journey/ScenarioAnswers.js` | Active | **KEEP** | Final display component |

---

## API Endpoints

### 1. `/api/generate-fortune` (Enhanced)

**Status:** ENHANCED (backward compatible)
**File:** `app/api/generate-fortune/route.js`

**Current Request Schema:**
```typescript
{
  fullName: string;
  industryType: string;
  companyName: string;
  geographicFocus?: string;
  businessObjective?: string;
  debugProvider?: 'GEMINI' | 'OPENAI';
}
```

**Enhanced Request Schema (v2):**
```typescript
{
  // Original fields (backward compatible)
  fullName: string;
  industryType: string;
  companyName: string;
  geographicFocus?: string;
  businessObjective?: string;
  debugProvider?: 'GEMINI' | 'OPENAI';

  // NEW FIELDS for hybrid mode
  selectedPersona?: 'advertiser' | 'publisher' | 'platform';
  selectedChallenges?: string[]; // Array of challenge IDs
  selectedChallengeTexts?: string[]; // Array of challenge text
  personaContext?: string; // Rich context from MD files
  linkedinData?: object; // Full LinkedIn profile data
}
```

**Response Schema (unchanged):**
```typescript
{
  openingLine: string;
  locationInsight: string;
  audienceOpportunity: string;
  engagementForecast: string;
  transactionsPrediction: string;
  aiAdvice: string;
}
```

**Backward Compatibility:**
- If `selectedPersona` is absent → Use original prompt logic
- If `selectedPersona` is present → Use enhanced persona-aware prompt

---

### 2. `/api/generate-initial-fortune` (Deprecated)

**Status:** DEPRECATED
**File:** `app/api/generate-initial-fortune/route.js`
**Action:** Rename to `route-v1-deprecated.js`

**Reason for Deprecation:**
- Functionality merged into enhanced `/api/generate-fortune`
- No longer needed in hybrid architecture
- Keep file for reference during transition

---

### 3. `/api/generate-blueprint` (New)

**Status:** NEW
**File:** `app/api/generate-blueprint/route.js` (to be created)

**Purpose:**
Combines all journey data into final comprehensive blueprint

**Request Schema:**
```typescript
{
  userInfo: {
    fullName: string;
    companyName: string;
    industryType: string;
    geographicFocus: string;
  };
  legacyFortune: {
    openingLine: string;
    locationInsight: string;
    audienceOpportunity: string;
    engagementForecast: string;
    transactionsPrediction: string;
    aiAdvice: string;
  };
  persona: 'advertiser' | 'publisher' | 'platform';
  highLevelSelections: string[]; // 2 high-level challenge IDs
  tacticalSelections: string[]; // 2 tactical challenge IDs
  personaContext: string;
}
```

**Response Schema:**
```typescript
{
  blueprintHtml: string; // Full HTML for email
  blueprintSummary: string; // Executive summary
  actionItems: string[]; // Concrete next steps
  generatedAt: string; // ISO timestamp
}
```

---

## Component Mapping

### Fortune Display Components

#### Current System

```
DisplayFortune (components/fortune-journey/DisplayFortune.js)
├── Purpose: Display journey v1 fortune (openingStatement + 2 insights)
├── Data Format: { openingStatement, insight1: {challenge, insight}, insight2: {...} }
├── Used By: fortune-journey v1
└── Status: TO BE DEPRECATED
```

#### Hybrid System

```
DisplayLegacyFortune (components/fortune-journey/DisplayLegacyFortune.js)
├── Purpose: Display 6-field legacy fortune format
├── Data Format: { openingLine, locationInsight, audienceOpportunity, ... }
├── Used By: fortune-journey-v2
└── Status: NEW (TO BE CREATED)

Features:
- Shows all 6 fortune fields with emoji icons
- Optional "Challenge Insights" section
- CEO transition animation (optional)
- Audio narration support
```

### Journey Orchestrators

#### Current System

```
app/fortune-journey/page.js
├── Stages: highLevelSelection → initialFortuneReveal → tacticalSelection → finalBlueprint
├── API: /api/generate-initial-fortune
├── Fortune Format: openingStatement + insights
└── Status: TO BE DEPRECATED
```

#### Hybrid System

```
app/fortune-journey-v2/page.js
├── Stages:
│   1. highLevelSelection (persona + challenges)
│   2. generatingLegacyFortune (loading state)
│   3. legacyFortuneReveal (6-field display)
│   4. tacticalSelection
│   5. finalBlueprint
├── API: /api/generate-fortune (enhanced)
├── Fortune Format: 6 fields (legacy)
└── Status: NEW (TO BE CREATED)
```

---

## Data Flow

### Current LinkedIn Flow

```
1. /collect-info (LinkedIn QR scan)
   ├── Stores: userLinkedInProfile
   └── Navigates: /generating-fortune

2. /generating-fortune
   ├── Fetches: LinkedIn data via /api/get-linkedin-company-details
   ├── Stores: fetchedLinkedInData, pendingFortuneRequestBody
   ├── Initiates background: /api/generate-fortune
   └── Navigates immediately: /linkedin-interlude

3. /linkedin-interlude
   ├── Shows: Profile summary + narration
   ├── Waits for: fortuneData in localStorage
   └── Navigates: /fortune-journey

4. /fortune-journey (v1)
   ├── Calls: /api/generate-initial-fortune (NEW fortune, ignoring background one)
   ├── Shows: 4-stage journey
   └── Navigates: /contact-details
```

**Problem:** Generates TWO fortunes (one from /generate-fortune gets ignored)

### Hybrid LinkedIn Flow

```
1. /collect-info (LinkedIn QR scan)
   ├── Stores: userLinkedInProfile
   └── Navigates: /linkedin-interlude

2. /linkedin-interlude
   ├── Fetches: LinkedIn data via /api/get-linkedin-company-details
   ├── Stores: fetchedLinkedInData
   ├── Shows: Profile summary + narration
   └── Navigates: /fortune-journey-v2

3. /fortune-journey-v2
   ├── Stage 1: Persona + Challenge selection
   ├── Stage 2: Calls /api/generate-fortune (enhanced, ONE time)
   ├── Stage 3: Display legacy fortune
   ├── Stage 4: Tactical selection
   ├── Stage 5: Calls /api/generate-blueprint
   └── Navigates: /contact-details

4. /contact-details
   └── Final capture + download
```

**Solution:** ONE fortune generation, enhanced with persona context

### Current Manual Flow

```
1. /collect-info (manual entry)
   ├── Stores: userInfoForFortune
   └── Navigates: /fortune-journey

2. /fortune-journey (v1)
   ├── Calls: /api/generate-initial-fortune
   ├── Shows: 4-stage journey
   └── Navigates: /contact-details
```

### Hybrid Manual Flow

```
1. /collect-info (manual entry)
   ├── Stores: userInfoForFortune
   └── Navigates: /fortune-journey-v2

2. /fortune-journey-v2
   ├── Stage 1: Persona + Challenge selection
   ├── Stage 2: Calls /api/generate-fortune (enhanced)
   ├── Stage 3: Display legacy fortune
   ├── Stage 4: Tactical selection
   ├── Stage 5: Calls /api/generate-blueprint
   └── Navigates: /contact-details
```

**Change:** Both flows unified, no more parallel systems

---

## Migration Strategy

### Phase 1: Preparation (Documentation & Backup)

**Files to Create:**
- ✅ `HYBRID_ARCHITECTURE.md` (this file)
- ⬜ `MIGRATION_CHECKLIST.md`
- ⬜ Backup current working version (git tag: `v1-before-hybrid`)

**Files to Rename (Deprecation):**
```bash
# API Endpoints
app/api/generate-initial-fortune/route.js
  → app/api/generate-initial-fortune/route-v1-deprecated.js

# Pages
app/fortune-journey/page.js
  → app/fortune-journey/page-v1-deprecated.js

app/display-fortune/page.js
  → app/display-fortune/page-v1-legacy.js

app/generating-fortune/page.js
  → app/generating-fortune/page-v1-deprecated.js

# Components
components/fortune-journey/DisplayFortune.js
  → components/fortune-journey/DisplayFortune-v1-deprecated.js
```

### Phase 2: Create New Files

**New API Endpoint:**
```bash
app/api/generate-blueprint/route.js
```

**New Page:**
```bash
app/fortune-journey-v2/page.js
```

**New Component:**
```bash
components/fortune-journey/DisplayLegacyFortune.js
```

### Phase 3: Enhance Existing Files

**Files to Modify:**

1. **`app/api/generate-fortune/route.js`**
   - Add persona-aware prompt logic
   - Keep backward compatibility
   - Add version detection

2. **`app/collect-info/page.js`**
   - Update navigation: `/fortune-journey` → `/fortune-journey-v2`
   - For LinkedIn: Navigate to `/linkedin-interlude`
   - For manual: Navigate to `/fortune-journey-v2`

3. **`app/linkedin-interlude/page.js`**
   - Remove background fortune generation logic
   - Just show profile + navigate to `/fortune-journey-v2`

4. **`components/fortune-journey/BlueprintDisplay.js`**
   - Accept legacy fortune format
   - Combine with tactical selections

### Phase 4: Testing & Validation

**Test Scenarios:**

1. ✅ LinkedIn flow → fortune-journey-v2 → complete blueprint
2. ✅ Manual flow → fortune-journey-v2 → complete blueprint
3. ✅ Backward compatibility: Old API calls still work
4. ✅ All localStorage keys properly managed
5. ✅ Audio narration works in new flow
6. ✅ CEO transition works (optional)

### Phase 5: Cleanup

**After successful migration:**

1. Remove deprecated files (keep in git history)
2. Update all documentation
3. Remove unused localStorage keys
4. Update environment variable documentation

---

## Testing Checklist

### Pre-Migration Tests (Current System)

- [ ] LinkedIn flow completes successfully
- [ ] Manual flow completes successfully
- [ ] Both flows reach contact-details page
- [ ] Fortunes are generated and displayed
- [ ] Blueprint emails are sent

### Post-Migration Tests (Hybrid System)

#### LinkedIn Flow
- [ ] QR code scanning works
- [ ] LinkedIn data fetching succeeds
- [ ] Interlude screen shows profile correctly
- [ ] Persona selection screen appears
- [ ] High-level challenge selection works (select 2)
- [ ] Legacy fortune is generated with persona context
- [ ] 6-field fortune displays correctly
- [ ] Tactical challenge selection works
- [ ] Final blueprint combines all data
- [ ] Contact details capture works
- [ ] Email with blueprint is sent

#### Manual Flow
- [ ] Manual form accepts all inputs
- [ ] Validation works correctly
- [ ] Persona selection screen appears
- [ ] High-level challenge selection works
- [ ] Legacy fortune is generated
- [ ] 6-field fortune displays correctly
- [ ] Tactical challenge selection works
- [ ] Final blueprint combines all data
- [ ] Contact details capture works
- [ ] Email with blueprint is sent

#### Backward Compatibility
- [ ] Old API calls (without persona) still work
- [ ] Legacy fortune format is consistent
- [ ] No breaking changes for external integrations

#### Audio/Visual Features
- [ ] Narration works on fortune reveal
- [ ] CEO transition animation works (if enabled)
- [ ] Particle effects render correctly
- [ ] Mobile responsive on all screens

---

## Implementation Order

### Recommended Sequence

1. **Document & Backup** (Current task)
   - Create this documentation ✅
   - Tag current version in git
   - Create backup branch

2. **Rename Deprecated Files** (Low risk)
   - Rename files with `-v1-deprecated` suffix
   - Update import references temporarily
   - Verify app still runs

3. **Enhance `/api/generate-fortune`** (Medium risk)
   - Add persona-aware prompt logic
   - Keep backward compatibility
   - Test with old and new request formats

4. **Create `DisplayLegacyFortune` Component** (Low risk)
   - Build component in isolation
   - Test with sample data
   - Add to component library

5. **Create `/api/generate-blueprint`** (Low risk)
   - New endpoint, no conflicts
   - Test independently

6. **Create `/fortune-journey-v2` Page** (High risk)
   - Orchestrates entire new flow
   - Most complex piece
   - Thorough testing needed

7. **Update Navigation** (Medium risk)
   - Modify `collect-info` redirects
   - Modify `linkedin-interlude` logic
   - Update all internal links

8. **End-to-End Testing** (Critical)
   - Test both flows completely
   - Fix any integration issues

9. **Cleanup & Documentation** (Low risk)
   - Remove deprecated files
   - Update README
   - Update environment docs

---

## Key Differences: Current vs Hybrid

| Aspect | Current (v1) | Hybrid (v2) |
|--------|--------------|-------------|
| **Endpoints** | 2 separate (generate-fortune, generate-initial-fortune) | 1 enhanced (generate-fortune) |
| **Fortune Format** | 2 formats (6-field vs insights) | 1 format (6-field) |
| **Flow Unification** | Separate LinkedIn/manual | Unified flow |
| **Persona Integration** | Only in journey v1 | Integrated into fortune generation |
| **Challenge Usage** | Only in journey v1 | Informs fortune generation |
| **Stages** | 4 stages | 5 stages |
| **Fortune Generation** | Twice for LinkedIn (wasteful) | Once per journey |

---

## Questions & Answers

### Q: Why not just delete old files immediately?

**A:** Keep deprecated files during transition for:
- Reference during development
- Rollback capability if issues arise
- Understanding context of old decisions
- Git history preservation

### Q: Why create fortune-journey-v2 instead of modifying existing?

**A:** Safer approach:
- No risk of breaking current production flow
- Easy A/B testing
- Clean rollback path
- Parallel development possible

### Q: Can we still use /display-fortune for anything?

**A:** Keep as legacy reference, but:
- Not in main flow
- Could be useful for debugging
- Contains CEO transition logic we might reuse
- Archive after successful migration

### Q: What if we want to revert?

**A:** Revert strategy:
1. All old files preserved with `-v1-deprecated` suffix
2. Git tag at migration start point
3. Navigation changes are minimal
4. Can switch back by changing routes only

---

## Next Steps

After documentation approval:

1. Create `MIGRATION_CHECKLIST.md` with detailed task list
2. Set up feature flag for gradual rollout (optional)
3. Create git branch: `feature/hybrid-architecture`
4. Begin Phase 1: Preparation & Backup
5. Proceed through implementation phases sequentially

---

## Notes & Decisions

### Decision Log

**2025-10-01:** Decided to use hybrid approach instead of complete rewrite
- Reason: Preserve multi-stage journey, use proven legacy fortune format
- Trade-off: More complex migration, but safer

**2025-10-01:** Decided to create v2 pages instead of modifying existing
- Reason: Safety, rollback capability, parallel development
- Trade-off: Temporary file duplication

**2025-10-01:** Decided to enhance `/api/generate-fortune` instead of creating new endpoint
- Reason: Consolidate functionality, reduce maintenance
- Trade-off: Must maintain backward compatibility

---

## Contact & Support

For questions about this architecture:
- Check git history for detailed commit messages
- Review deprecated files for original implementation
- Consult `CODEBASE_DOCUMENTATION.md` for general context

---

**End of Documentation**
