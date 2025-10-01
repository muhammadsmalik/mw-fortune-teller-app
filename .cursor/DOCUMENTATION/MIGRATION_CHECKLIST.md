# Hybrid Architecture Migration Checklist

**Migration Start Date:** [TBD]
**Expected Completion:** [TBD]
**Current Phase:** Phase 0 - Planning

---

## Phase 0: Planning & Documentation ✅

- [x] Create HYBRID_ARCHITECTURE.md
- [x] Create MIGRATION_CHECKLIST.md
- [ ] Review and approve documentation with team
- [ ] Create git tag: `v1-before-hybrid`
- [ ] Create feature branch: `feature/hybrid-architecture`
- [ ] Set up testing environment

---

## Phase 1: Backup & Rename (Safe Operations)

### 1.1 Git Backup
- [ ] Commit all current changes
- [ ] Create tag: `git tag -a v1-before-hybrid -m "Pre-hybrid migration snapshot"`
- [ ] Push tag: `git push origin v1-before-hybrid`
- [ ] Create branch: `git checkout -b feature/hybrid-architecture`

### 1.2 Rename API Endpoints
- [ ] Rename `app/api/generate-initial-fortune/route.js`
  - [ ] → `app/api/generate-initial-fortune/route-v1-deprecated.js`
  - [ ] Verify no active imports reference this file
  - [ ] Update any documentation references

### 1.3 Rename Page Files
- [ ] Rename `app/fortune-journey/page.js`
  - [ ] → `app/fortune-journey/page-v1-deprecated.js`
  - [ ] Keep folder structure intact
  - [ ] Note: Routes will temporarily break (expected)

- [ ] Rename `app/display-fortune/page.js`
  - [ ] → `app/display-fortune/page-v1-legacy.js`
  - [ ] Add comment at top: "LEGACY: Keep for reference only"

- [ ] Rename `app/generating-fortune/page.js`
  - [ ] → `app/generating-fortune/page-v1-deprecated.js`
  - [ ] Document why this is being deprecated

### 1.4 Rename Components
- [ ] Rename `components/fortune-journey/DisplayFortune.js`
  - [ ] → `components/fortune-journey/DisplayFortune-v1-deprecated.js`
  - [ ] Update any active imports (likely from deprecated page only)

### 1.5 Verification After Renaming
- [ ] Run `npm run build` - expect errors (normal at this stage)
- [ ] Verify git shows all renames correctly
- [ ] Commit: `git commit -m "Phase 1: Rename deprecated files with v1 suffix"`

---

## Phase 2: Create New Structure (No Breaking Changes)

### 2.1 Create New API Endpoint
- [ ] Create `app/api/generate-blueprint/route.js`
  - [ ] Set up basic structure
  - [ ] Add request/response TypeScript interfaces (as comments)
  - [ ] Implement blueprint generation logic
  - [ ] Add error handling
  - [ ] Add debug logging
  - [ ] Test independently with Postman/curl

**Testing:**
```bash
# Test with sample payload
curl -X POST http://localhost:3000/api/generate-blueprint \
  -H "Content-Type: application/json" \
  -d @test-data/blueprint-payload.json
```

- [ ] Verify response format matches schema
- [ ] Commit: `git commit -m "Phase 2: Create /api/generate-blueprint endpoint"`

### 2.2 Create DisplayLegacyFortune Component
- [ ] Create `components/fortune-journey/DisplayLegacyFortune.js`
  - [ ] Copy particle system from DisplayFortune-v1-deprecated
  - [ ] Implement 6-field fortune layout
  - [ ] Add emoji icons (📍 👀 💥 💸 🔮)
  - [ ] Add optional "Challenge Insights" section
  - [ ] Add CEO transition logic (optional, from display-fortune)
  - [ ] Add audio narration hooks
  - [ ] Make component responsive

**Props Interface:**
```javascript
{
  fortuneData: {
    openingLine: string,
    locationInsight: string,
    audienceOpportunity: string,
    engagementForecast: string,
    transactionsPrediction: string,
    aiAdvice: string
  },
  onGoBack: function,
  onProceedToNextStep: function,
  audioPlaybackAllowed: boolean,
  userChallenges?: array // Optional for context
}
```

- [ ] Create sample data file: `test-data/sample-legacy-fortune.json`
- [ ] Test component in Storybook or isolation
- [ ] Verify all 6 fields render correctly
- [ ] Test narration trigger (if implemented)
- [ ] Test responsive layout (mobile/tablet/desktop)
- [ ] Commit: `git commit -m "Phase 2: Create DisplayLegacyFortune component"`

### 2.3 Create Fortune Journey V2 Page (Shell Only)
- [ ] Create `app/fortune-journey-v2/page.js`
  - [ ] Set up basic structure with stage state machine
  - [ ] Add placeholder for each stage
  - [ ] Import required components
  - [ ] Add localStorage key constants
  - [ ] Add navigation guards

**Initial Stages:**
```javascript
const STAGES = {
  HIGH_LEVEL_SELECTION: 'highLevelSelection',
  GENERATING_FORTUNE: 'generatingLegacyFortune',
  FORTUNE_REVEAL: 'legacyFortuneReveal',
  TACTICAL_SELECTION: 'tacticalSelection',
  FINAL_BLUEPRINT: 'finalBlueprint'
};
```

- [ ] Add basic error boundaries
- [ ] Add loading states for each stage
- [ ] Do NOT connect to navigation yet
- [ ] Test direct navigation: `http://localhost:3000/fortune-journey-v2`
- [ ] Verify stage transitions work locally
- [ ] Commit: `git commit -m "Phase 2: Create fortune-journey-v2 page shell"`

---

## Phase 3: Enhance Existing Files (Critical Changes)

### 3.1 Enhance `/api/generate-fortune`
**File:** `app/api/generate-fortune/route.js`

- [ ] **Add new request parameters**
  ```javascript
  const {
    // Existing
    fullName,
    industryType,
    companyName,
    geographicFocus,
    businessObjective,
    debugProvider,
    // NEW
    selectedPersona,
    selectedChallenges,
    selectedChallengeTexts,
    personaContext,
    linkedinData
  } = requestBody;
  ```

- [ ] **Add version detection logic**
  ```javascript
  const isEnhancedCall = selectedPersona && selectedChallenges;
  console.log(`[generate-fortune] Enhanced mode: ${isEnhancedCall}`);
  ```

- [ ] **Enhance prompt generation**
  - [ ] Create `buildEnhancedPrompt()` function
  - [ ] Integrate persona context
  - [ ] Integrate challenge texts
  - [ ] Ensure natural weaving of insights

- [ ] **Keep backward compatibility**
  - [ ] Test with old payload format
  - [ ] Test with new payload format
  - [ ] Ensure both return 6-field format

- [ ] **Add enhanced response metadata**
  ```javascript
  return new Response(JSON.stringify({
    ...fortune,
    meta: {
      persona: selectedPersona || 'generic',
      challenges: selectedChallenges || [],
      generatedAt: new Date().toISOString(),
      version: isEnhancedCall ? 'v2' : 'v1'
    }
  }));
  ```

**Testing:**
- [ ] Test Case 1: Old format (no persona)
  ```bash
  curl -X POST http://localhost:3000/api/generate-fortune \
    -H "Content-Type: application/json" \
    -d '{"fullName":"Test User","industryType":"tech","companyName":"TestCo"}'
  ```
  - [ ] Verify returns 6 fields
  - [ ] Verify meta.version = 'v1'

- [ ] Test Case 2: New format (with persona)
  ```bash
  curl -X POST http://localhost:3000/api/generate-fortune \
    -H "Content-Type: application/json" \
    -d @test-data/enhanced-fortune-payload.json
  ```
  - [ ] Verify returns 6 fields
  - [ ] Verify meta.version = 'v2'
  - [ ] Verify fortune content references challenges

- [ ] Test Case 3: Edge cases
  - [ ] Empty selectedChallenges array
  - [ ] Missing personaContext
  - [ ] Very long challenge texts

- [ ] Commit: `git commit -m "Phase 3: Enhance /api/generate-fortune with persona awareness"`

### 3.2 Update LinkedIn Interlude Page
**File:** `app/linkedin-interlude/page.js`

- [ ] **Remove background fortune generation**
  - [ ] Remove lines 172-208 (background fetch logic)
  - [ ] Remove `fortuneGenerationError` localStorage handling
  - [ ] Keep profile display and narration

- [ ] **Update navigation target**
  - [ ] Change `router.push('/fortune-journey')`
  - [ ] To: `router.push('/fortune-journey-v2')`

- [ ] **Simplify state management**
  - [ ] Remove `isGeneratingFortune` state
  - [ ] Remove fortune polling logic
  - [ ] Keep only profile display states

- [ ] **Test in isolation**
  - [ ] Navigate to `/linkedin-interlude` with test data
  - [ ] Verify profile displays correctly
  - [ ] Verify narration plays (if enabled)
  - [ ] Verify "Reveal Destiny" button navigates to v2

- [ ] Commit: `git commit -m "Phase 3: Simplify linkedin-interlude, remove bg fortune generation"`

### 3.3 Update Collect Info Page
**File:** `app/collect-info/page.js`

- [ ] **Update LinkedIn flow navigation**
  - [ ] Line 274: Keep `router.push('/linkedin-interlude')` as-is

- [ ] **Update manual flow navigation**
  - [ ] Line 274: Change from `router.push('/fortune-journey')`
  - [ ] To: `router.push('/fortune-journey-v2')`

- [ ] **Test both flows**
  - [ ] Test LinkedIn QR scan → interlude
  - [ ] Test manual entry → journey-v2

- [ ] Commit: `git commit -m "Phase 3: Update collect-info navigation to v2"`

---

## Phase 4: Complete Fortune Journey V2 Implementation

### 4.1 Implement Stage 1: High-Level Selection
- [ ] Import `ScenarioSelection` component (reuse existing)
- [ ] Load persona questions from JSON
- [ ] Handle persona + challenge selection
- [ ] Store selections in component state
- [ ] Transition to Stage 2 on confirm

### 4.2 Implement Stage 2: Generate Legacy Fortune
- [ ] Show loading state with crystal ball animation
- [ ] Construct enhanced API payload
  ```javascript
  {
    ...userInfo,
    selectedPersona,
    selectedChallenges,
    selectedChallengeTexts,
    personaContext
  }
  ```
- [ ] Call `/api/generate-fortune` (enhanced)
- [ ] Store fortune data in state
- [ ] Handle API errors gracefully
- [ ] Transition to Stage 3 on success

### 4.3 Implement Stage 3: Display Legacy Fortune
- [ ] Render `DisplayLegacyFortune` component
- [ ] Pass fortune data as props
- [ ] Optional: Add "Challenge Insights" section
- [ ] Handle audio narration
- [ ] Transition to Stage 4 on user action

### 4.4 Implement Stage 4: Tactical Selection
- [ ] Import `TacticalCardSelection` component (reuse existing)
- [ ] Pass persona to component
- [ ] Handle tactical challenge selection (2)
- [ ] Store selections in state
- [ ] Transition to Stage 5 on confirm

### 4.5 Implement Stage 5: Generate Blueprint
- [ ] Import `BlueprintDisplay` component (modified)
- [ ] Construct blueprint API payload
  ```javascript
  {
    userInfo,
    legacyFortune,
    persona,
    highLevelSelections,
    tacticalSelections,
    personaContext
  }
  ```
- [ ] Call `/api/generate-blueprint`
- [ ] Display blueprint preview
- [ ] Handle download/email
- [ ] Navigate to `/contact-details` on complete

### 4.6 Add Navigation Guards
- [ ] Check for required localStorage data on mount
- [ ] Redirect to `/collect-info` if missing
- [ ] Prevent skipping stages
- [ ] Handle browser back button
- [ ] Add confirmation dialog on refresh

### 4.7 Testing Fortune Journey V2
- [ ] Test full LinkedIn flow end-to-end
- [ ] Test full manual flow end-to-end
- [ ] Test each stage transition
- [ ] Test error handling at each stage
- [ ] Test navigation guards
- [ ] Test localStorage persistence
- [ ] Test audio features
- [ ] Test responsive layout
- [ ] Test browser back button
- [ ] Test page refresh recovery

- [ ] Commit: `git commit -m "Phase 4: Complete fortune-journey-v2 implementation"`

---

## Phase 5: Update BlueprintDisplay Component

### 5.1 Modify Component to Accept Legacy Fortune
**File:** `components/fortune-journey/BlueprintDisplay.js`

- [ ] Update props to accept `legacyFortune` instead of `initialFortune`
- [ ] Modify blueprint generation logic
  - [ ] Extract insights from 6 fields
  - [ ] Combine with high-level selections
  - [ ] Combine with tactical selections
  - [ ] Generate comprehensive HTML

- [ ] Update API call to `/api/generate-blueprint`
- [ ] Test with sample legacy fortune data
- [ ] Verify HTML output quality
- [ ] Test email sending

- [ ] Commit: `git commit -m "Phase 5: Update BlueprintDisplay for legacy format"`

---

## Phase 6: End-to-End Testing

### 6.1 LinkedIn Flow Testing
- [ ] **Start**: Landing page
- [ ] Navigate to `/collect-info`
- [ ] Scan LinkedIn QR code (use test profile)
- [ ] Verify redirect to `/linkedin-interlude`
- [ ] Wait for narration to complete
- [ ] Click "Reveal My Destiny"
- [ ] **Stage 1**: Select persona
- [ ] **Stage 1**: Select 2 high-level challenges
- [ ] Click "Predict My Fortune"
- [ ] Verify loading state appears
- [ ] **Stage 3**: Verify legacy fortune displays (6 fields)
- [ ] Verify fortune content references challenges
- [ ] Verify narration plays (if enabled)
- [ ] Click "Unlock Tactical Playbook"
- [ ] **Stage 4**: Select 2 tactical challenges
- [ ] Click "Generate Blueprint"
- [ ] **Stage 5**: Verify blueprint displays
- [ ] Verify blueprint includes all data
- [ ] Navigate to `/contact-details`
- [ ] Submit email
- [ ] Verify blueprint email received
- [ ] **COMPLETE**

### 6.2 Manual Flow Testing
- [ ] **Start**: Landing page
- [ ] Navigate to `/collect-info`
- [ ] Click "Enter details manually"
- [ ] Fill all required fields
- [ ] Click "Generate My Fortune"
- [ ] Verify redirect to `/fortune-journey-v2`
- [ ] **Stage 1**: Select persona
- [ ] **Stage 1**: Select 2 high-level challenges
- [ ] Click "Predict My Fortune"
- [ ] Verify loading state appears
- [ ] **Stage 3**: Verify legacy fortune displays (6 fields)
- [ ] Click next
- [ ] **Stage 4**: Select 2 tactical challenges
- [ ] Click "Generate Blueprint"
- [ ] **Stage 5**: Verify blueprint displays
- [ ] Navigate to `/contact-details`
- [ ] Submit email
- [ ] Verify blueprint email received
- [ ] **COMPLETE**

### 6.3 Error Handling Testing
- [ ] Test API failure at fortune generation
- [ ] Test API failure at blueprint generation
- [ ] Test invalid user data
- [ ] Test missing localStorage keys
- [ ] Test network timeout
- [ ] Test rate limiting
- [ ] Test invalid persona selection
- [ ] Test insufficient challenge selections

### 6.4 Cross-Browser Testing
- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (iOS mobile)
- [ ] Chrome (Android mobile)

### 6.5 Performance Testing
- [ ] Test with slow 3G connection
- [ ] Test with offline mode
- [ ] Test localStorage limits
- [ ] Test with large LinkedIn profiles
- [ ] Measure fortune generation time
- [ ] Measure blueprint generation time

---

## Phase 7: Cleanup & Documentation

### 7.1 Remove Deprecated Files
- [ ] Verify v2 system is stable for 1 week
- [ ] Delete `app/api/generate-initial-fortune/route-v1-deprecated.js`
- [ ] Delete `app/fortune-journey/page-v1-deprecated.js`
- [ ] Delete `app/generating-fortune/page-v1-deprecated.js`
- [ ] Delete `components/fortune-journey/DisplayFortune-v1-deprecated.js`
- [ ] Keep `app/display-fortune/page-v1-legacy.js` (for reference)
- [ ] Commit: `git commit -m "Phase 7: Remove deprecated v1 files"`

### 7.2 Update Documentation
- [ ] Update README.md with new architecture
- [ ] Update CODEBASE_DOCUMENTATION.md
- [ ] Add comments to complex logic
- [ ] Update API documentation
- [ ] Update environment variable docs
- [ ] Create troubleshooting guide

### 7.3 Code Quality
- [ ] Run linter: `npm run lint`
- [ ] Fix all lint warnings
- [ ] Remove console.logs (keep important ones with prefix)
- [ ] Add JSDoc comments to new functions
- [ ] Optimize bundle size
- [ ] Run security audit: `npm audit`

### 7.4 Final Testing
- [ ] Run all tests: `npm test`
- [ ] Test on staging environment
- [ ] Perform load testing
- [ ] Check analytics tracking
- [ ] Verify SEO tags
- [ ] Check accessibility (a11y)

---

## Phase 8: Deployment

### 8.1 Pre-Deployment
- [ ] Merge feature branch to develop
- [ ] Perform QA on develop environment
- [ ] Get stakeholder approval
- [ ] Schedule deployment window
- [ ] Prepare rollback plan

### 8.2 Deployment
- [ ] Merge develop to main
- [ ] Tag release: `git tag -a v2.0.0 -m "Hybrid architecture release"`
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Monitor analytics
- [ ] Monitor performance metrics

### 8.3 Post-Deployment
- [ ] Verify LinkedIn flow works in production
- [ ] Verify manual flow works in production
- [ ] Monitor for 24 hours
- [ ] Check email delivery rates
- [ ] Review user feedback
- [ ] Update CHANGELOG.md

---

## Rollback Plan

### If Critical Issues Arise:

**Option 1: Quick Fix**
- [ ] Identify and fix issue
- [ ] Deploy hotfix
- [ ] Monitor for 1 hour

**Option 2: Temporary Revert**
- [ ] Revert to `v1-before-hybrid` tag
- [ ] Deploy previous version
- [ ] Investigate issue offline
- [ ] Plan fix and re-deployment

**Option 3: Navigation Rollback (Minimal)**
- [ ] Keep all new files
- [ ] Revert navigation changes in:
  - [ ] `app/collect-info/page.js`
  - [ ] `app/linkedin-interlude/page.js`
- [ ] Restore deprecated files temporarily
- [ ] Users route back to old flow
- [ ] Fix issues, then re-enable v2

---

## Success Criteria

### Technical Success
- [ ] Zero critical bugs in production for 1 week
- [ ] Fortune generation success rate > 95%
- [ ] Blueprint generation success rate > 95%
- [ ] Average fortune generation time < 10 seconds
- [ ] Email delivery rate > 98%
- [ ] Mobile experience matches desktop

### Business Success
- [ ] User completion rate maintained or improved
- [ ] User feedback is positive
- [ ] Support tickets do not increase
- [ ] Analytics show normal behavior patterns

---

## Team Sign-off

- [ ] Developer 1: _________________ Date: _______
- [ ] Developer 2: _________________ Date: _______
- [ ] QA Lead: ____________________ Date: _______
- [ ] Product Owner: ______________ Date: _______
- [ ] Stakeholder: ________________ Date: _______

---

## Notes & Blockers

### Blockers
- [ ] None currently

### Notes
- Migration should take approximately 2-3 weeks
- Each phase should be committed separately
- Do NOT skip testing phases
- Keep deprecated files until Phase 7

---

**Last Updated:** 2025-10-01
