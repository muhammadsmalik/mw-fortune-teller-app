# Phase 3: Implementation Plan - Option C Flow

## Overview
Implement the 5-screen interactive tarot experience with legacy fortune format.

---

## Sub-Phases Breakdown

### Phase 3.1: Update API to Use Legacy Fortune (10 min)

**Goal:** Switch from `generate-initial-fortune` to `generate-fortune` (legacy)

#### Changes Required:

**File 1:** `app/fortune-journey/page.js`

**Current (Line ~84-176):**
```js
const response = await fetch('/api/generate-initial-fortune', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

**New:**
```js
const response = await fetch('/api/generate-fortune', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: actualFullName,
    companyName: actualCompanyName,
    industryType: actualIndustryType,
    geographicFocus: actualGeographicFocus,
    businessObjective: '', // Optional: can infer from questions
    selectedQuestions: selectedQuestionObjects.map(q => q.text), // NEW: for context
  }),
});
```

**File 2:** `app/api/generate-fortune/route.js`

**Add (Line ~230, within prompt):**
```js
${selectedQuestions && selectedQuestions.length > 0 ? `

**USER'S CURRENT FOCUS:**
The user has expressed particular interest in:
1. "${selectedQuestions[0]}"
2. "${selectedQuestions[1]}"

While maintaining the mystical fortune format with emoji insights, subtly weave in wisdom
that addresses these specific concerns. Make them feel like the fortune speaks directly
to their challenges.
` : ''}
```

**Test:**
- [ ] Select persona + 2 questions
- [ ] Verify API returns legacy format (openingLine, locationInsight, etc.)
- [ ] Confirm questions influence content (check console logs)

---

### Phase 3.2: Update DisplayFortune to Show Legacy Format (15 min)

**Goal:** Show 5 emoji insights instead of bullet points

#### Changes Required:

**File:** `components/fortune-journey/DisplayFortune.js`

**Find current insights rendering (around line 450-550)**

**Replace with:**
```jsx
{/* Legacy Fortune Display */}
<div className="space-y-6">
  {/* Opening Line */}
  {fortuneData?.openingLine && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xl font-bold text-mw-gold text-center mb-8"
    >
      {fortuneData.openingLine}
    </motion.div>
  )}

  {/* Location Insight */}
  {fortuneData?.locationInsight && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="flex items-start gap-4 p-4 bg-mw-dark-blue/40 rounded-lg border border-mw-light-blue/30"
    >
      <span className="text-3xl flex-shrink-0">📍</span>
      <p className="text-mw-white/90">{fortuneData.locationInsight}</p>
    </motion.div>
  )}

  {/* Audience Opportunity */}
  {fortuneData?.audienceOpportunity && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="flex items-start gap-4 p-4 bg-mw-dark-blue/40 rounded-lg border border-mw-light-blue/30"
    >
      <span className="text-3xl flex-shrink-0">👀</span>
      <p className="text-mw-white/90">{fortuneData.audienceOpportunity}</p>
    </motion.div>
  )}

  {/* Engagement Forecast */}
  {fortuneData?.engagementForecast && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="flex items-start gap-4 p-4 bg-mw-dark-blue/40 rounded-lg border border-mw-light-blue/30"
    >
      <span className="text-3xl flex-shrink-0">💥</span>
      <p className="text-mw-white/90">{fortuneData.engagementForecast}</p>
    </motion.div>
  )}

  {/* Transactions Prediction */}
  {fortuneData?.transactionsPrediction && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8 }}
      className="flex items-start gap-4 p-4 bg-mw-dark-blue/40 rounded-lg border border-mw-light-blue/30"
    >
      <span className="text-3xl flex-shrink-0">💸</span>
      <p className="text-mw-white/90">{fortuneData.transactionsPrediction}</p>
    </motion.div>
  )}

  {/* AI Advice */}
  {fortuneData?.aiAdvice && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.0 }}
      className="flex items-start gap-4 p-4 bg-mw-dark-blue/40 rounded-lg border border-mw-gold/30"
    >
      <span className="text-3xl flex-shrink-0">🔮</span>
      <p className="text-mw-white/90">{fortuneData.aiAdvice}</p>
    </motion.div>
  )}
</div>

{/* CTA Button */}
<div className="mt-8 text-center">
  <Button
    onClick={onProceedToNextStep}
    className="bg-mw-gold text-mw-dark-navy hover:bg-mw-gold/90 px-8 py-3 text-lg"
  >
    Discover Your Power Platforms
  </Button>
</div>
```

**Test:**
- [ ] Fortune displays with 5 emoji sections
- [ ] Animations stagger properly
- [ ] Button leads to next stage

---

### Phase 3.3: Create TarotCardSelection Component (20 min)

**Goal:** New component for selecting 2 of 7 cards

#### Create New File:

**File:** `components/fortune-journey/TarotCardSelection.js`

```jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import questionPlatformMapping from '@/lib/question_platform_mapping.json';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function TarotCardSelection({
  persona,
  selectedQuestionIds,
  onConfirm,
  onBack
}) {
  const [init, setInit] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [error, setError] = useState(null);

  // All 7 tarot cards (universal)
  const allCards = [
    { id: 'architect', name: 'The Architect', platform: 'Studio' },
    { id: 'navigator', name: 'The Navigator', platform: 'Planner' },
    { id: 'connector', name: 'The Connector', platform: 'Influence' },
    { id: 'magician', name: 'The Magician', platform: 'Activate' },
    { id: 'merchant', name: 'The Merchant', platform: 'Market' },
    { id: 'judge', name: 'The Judge', platform: 'Measure' },
    { id: 'oracle', name: 'The Oracle', platform: 'Science' },
  ];

  // Determine which cards should glow (guided by questions)
  const guidedCardNames = useMemo(() => {
    if (!persona || !selectedQuestionIds) return [];

    return selectedQuestionIds.map(questionId => {
      const mapping = questionPlatformMapping[persona]?.[questionId];
      return mapping?.tarotCard;
    }).filter(Boolean);
  }, [persona, selectedQuestionIds]);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const handleCardClick = (card) => {
    if (selectedCards.includes(card.id)) {
      // Deselect
      setSelectedCards(selectedCards.filter(id => id !== card.id));
      setError(null);
    } else if (selectedCards.length < 2) {
      // Select
      setSelectedCards([...selectedCards, card.id]);
      setError(null);
    } else {
      setError('You may only choose 2 cards. Deselect one first.');
    }
  };

  const handleConfirm = () => {
    if (selectedCards.length !== 2) {
      setError('Please select exactly 2 cards to continue.');
      return;
    }

    // Map selected card IDs to full card objects
    const selectedCardObjects = allCards.filter(card => selectedCards.includes(card.id));
    onConfirm(selectedCardObjects);
  };

  const particleOptions = useMemo(() => ({
    particles: {
      number: { value: 50, density: { enable: true, value_area: 800 } },
      color: { value: ["#FFD700", "#5BADDE"] },
      shape: { type: "circle" },
      opacity: { value: 0.3, random: true, anim: { enable: true, speed: 0.5, opacity_min: 0.1, sync: false } },
      size: { value: { min: 1, max: 3 }, random: true },
      move: { enable: true, speed: 0.8, direction: "none", random: true, straight: false, outModes: { default: "out" } },
    },
    detectRetina: true,
  }), []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative">
      {init && (
        <Particles
          id="tarot-selection-particles"
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-0"
        />
      )}

      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
        onClick={onBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70 z-20">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <div className="max-w-6xl w-full z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-mw-gold mb-4">
            The Oracle Has Drawn Your Destiny Cards
          </h1>
          <p className="text-lg text-mw-white/70">
            Choose 2 cards to reveal your path to success
          </p>
          {guidedCardNames.length > 0 && (
            <p className="text-sm text-mw-light-blue mt-2 italic">
              ✨ The glowing cards are aligned with your chosen challenges
            </p>
          )}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-6 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-400"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Grid */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {allCards.map((card, index) => {
            const isSelected = selectedCards.includes(card.id);
            const isGuided = guidedCardNames.includes(card.name);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleCardClick(card)}
                className={`
                  relative cursor-pointer transition-all duration-300
                  ${isSelected ? 'scale-105' : 'hover:scale-105'}
                `}
              >
                <div
                  className={`
                    w-32 h-48 sm:w-40 sm:h-60 rounded-lg
                    border-4 transition-all
                    ${isSelected ? 'border-mw-gold shadow-2xl shadow-mw-gold/50' : 'border-mw-light-blue/30'}
                    ${isGuided && !isSelected ? 'ring-4 ring-mw-gold/50 animate-pulse' : ''}
                    bg-gradient-to-br from-mw-dark-blue to-mw-navy
                    flex items-center justify-center
                  `}
                >
                  {/* Placeholder for card back image */}
                  <div className="text-center">
                    <div className="text-4xl mb-2">🃏</div>
                    <div className="text-xs text-mw-white/50">Card Back</div>
                  </div>
                </div>

                {/* Card Name Label (appears on hover or selection) */}
                {(isSelected || isGuided) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -bottom-8 left-0 right-0 text-center text-sm text-mw-gold font-semibold"
                  >
                    {card.name}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Selection Counter */}
        <div className="text-center mb-8">
          <p className="text-mw-white/70">
            Selected: <span className="text-mw-gold font-bold">{selectedCards.length}</span> / 2
          </p>
        </div>

        {/* Confirm Button */}
        <div className="text-center">
          <Button
            onClick={handleConfirm}
            disabled={selectedCards.length !== 2}
            className="bg-mw-gold text-mw-dark-navy hover:bg-mw-gold/90 px-12 py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reveal Your Cards
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Test:**
- [ ] 7 cards display in a row
- [ ] 2 cards glow (based on questions)
- [ ] Can select any 2 cards
- [ ] Selection counter updates
- [ ] Error shows if trying to select 3rd card
- [ ] Confirm button enabled only when 2 selected

---

### Phase 3.4: Create TarotCardReveal Component (20 min)

**Goal:** Show selected cards flipping with predictions

#### Create New File:

**File:** `components/fortune-journey/TarotCardReveal.js`

```jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import questionPlatformMapping from '@/lib/question_platform_mapping.json';
import fortunePredictions from '@/lib/fortune_predictions.json';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function TarotCardReveal({
  selectedCards, // Array of card objects from TarotCardSelection
  persona,
  userInfo,
  onComplete,
  onBack
}) {
  const [init, setInit] = useState(false);
  const [cardsFlipped, setCardsFlipped] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));

    // Auto-flip cards after 1 second
    const timer = setTimeout(() => setCardsFlipped(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Get predictions for each card
  const cardData = useMemo(() => {
    return selectedCards.map(card => {
      const predictions = fortunePredictions[persona]?.[card.platform] || [];

      // Personalize predictions
      const personalizedPredictions = predictions.map(pred =>
        pred
          .replace('${Name}', userInfo?.fullName || 'Seeker')
          .replace('${Company Name}', userInfo?.companyName || 'your company')
          .replace('${Industry}', userInfo?.industryType || 'your industry')
      );

      return {
        ...card,
        predictions: personalizedPredictions,
        // Get interpretation from mapping
        interpretation: Object.values(questionPlatformMapping[persona] || {})
          .find(m => m.tarotCard === card.name)?.interpretation || ''
      };
    });
  }, [selectedCards, persona, userInfo]);

  const particleOptions = useMemo(() => ({
    particles: {
      number: { value: 60, density: { enable: true, value_area: 800 } },
      color: { value: ["#FFD700", "#5BADDE", "#FFFFFF"] },
      shape: { type: "circle" },
      opacity: { value: 0.4, random: true, anim: { enable: true, speed: 0.6, opacity_min: 0.1, sync: false } },
      size: { value: { min: 1, max: 4 }, random: true },
      move: { enable: true, speed: 1, direction: "none", random: true, straight: false, outModes: { default: "out" } },
    },
    detectRetina: true,
  }), []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative overflow-hidden">
      {init && (
        <Particles
          id="tarot-reveal-particles"
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-0"
        />
      )}

      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
        onClick={onBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70 z-20">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <div className="max-w-6xl w-full z-10">
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-mw-gold text-center mb-12"
        >
          Your Destiny Revealed
        </motion.h1>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {cardData.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: cardsFlipped ? 180 : 0 }}
              transition={{ delay: index * 0.3, duration: 0.8 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative"
            >
              <div
                className="bg-mw-dark-blue/60 backdrop-blur-sm rounded-lg border border-mw-gold/30 p-6 shadow-2xl"
                style={{
                  transform: cardsFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  backfaceVisibility: 'hidden'
                }}
              >
                {/* Card Front (after flip) */}
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="text-center pb-4 border-b border-mw-gold/30">
                    <div className="text-6xl mb-3">🃏</div>
                    <h2 className="text-3xl font-bold text-mw-gold mb-2">
                      {card.name}
                    </h2>
                    <p className="text-xl text-mw-light-blue">
                      {card.platform}
                    </p>
                  </div>

                  {/* Interpretation */}
                  <p className="text-center text-mw-white/80 italic text-sm">
                    {card.interpretation}
                  </p>

                  {/* First Prediction (main one for reveal screen) */}
                  <div className="bg-mw-navy/50 rounded-lg p-4 border border-mw-light-blue/20">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl text-mw-gold flex-shrink-0">✦</span>
                      <p className="text-lg text-mw-white/90 leading-relaxed">
                        {card.predictions[0]}
                      </p>
                    </div>
                  </div>

                  {/* Note about full fortune */}
                  <p className="text-xs text-center text-mw-white/50 mt-4">
                    + 2 more insights in your full fortune email
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="text-center"
        >
          <Button
            onClick={onComplete}
            className="bg-mw-gold text-mw-dark-navy hover:bg-mw-gold/90 px-12 py-4 text-lg font-semibold"
          >
            Get Full Fortune via Email
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
```

**Test:**
- [ ] Cards display side-by-side
- [ ] Cards flip after 1 second
- [ ] Card fronts show name, platform, interpretation
- [ ] Shows 1st prediction from fortune_predictions.json
- [ ] Variables (${Name}, etc.) are replaced
- [ ] Button leads to email capture

---

### Phase 3.5: Update fortune-journey Stage Flow (15 min)

**Goal:** Wire up all new stages

#### Changes Required:

**File:** `app/fortune-journey/page.js`

**Update stages (Line ~15):**
```js
const [currentStage, setCurrentStage] = useState('questionSelection');
// Stages: questionSelection → legacyFortuneReveal → tarotCardSelection → tarotCardReveal → emailCapture
```

**Add state for selected tarot cards:**
```js
const [selectedTarotCards, setSelectedTarotCards] = useState([]);
```

**Update handleProceedToBlueprint to go to tarotCardSelection:**
```js
const handleProceedToTarot = () => {
  console.log('[FortuneJourneyPage] Proceeding to tarot card selection.');
  setCurrentStage('tarotCardSelection');
};
```

**Add handler for tarot selection:**
```js
const handleTarotCardsSelected = (cards) => {
  console.log('[FortuneJourneyPage] Tarot cards selected:', cards);
  setSelectedTarotCards(cards);
  setCurrentStage('tarotCardReveal');
};
```

**Add handler for tarot reveal complete:**
```js
const handleTarotRevealComplete = () => {
  console.log('[FortuneJourneyPage] Tarot reveal complete, going to email capture.');
  router.push('/contact-details'); // Or however you handle email capture
};
```

**Update switch statement (Line ~222):**
```js
switch (currentStage) {
  case 'questionSelection':
    return (
      <ScenarioSelectionComponent
        onScenariosConfirmed={handleQuestionConfirmed}
        onBack={handleGoBack}
        title="What Challenges Guide Your Path?"
        subtitle="Choose the two that matter most to reveal your strategic fortune."
        ctaLabel="Reveal My Fortune"
      />
    );

  case 'legacyFortuneReveal':
    return (
      <DisplayFortuneComponent
        fortuneData={journeyFortuneData}
        onGoBack={handleGoBack}
        onProceedToNextStep={handleProceedToTarot}
        audioPlaybackAllowed={isAudioUnlocked}
        persona={selectedPersona}
        userInfo={userInfo}
      />
    );

  case 'tarotCardSelection':
    return (
      <TarotCardSelectionComponent
        persona={selectedPersona}
        selectedQuestionIds={selectedQuestions}
        onConfirm={handleTarotCardsSelected}
        onBack={handleGoBack}
      />
    );

  case 'tarotCardReveal':
    return (
      <TarotCardRevealComponent
        selectedCards={selectedTarotCards}
        persona={selectedPersona}
        userInfo={userInfo}
        onComplete={handleTarotRevealComplete}
        onBack={handleGoBack}
      />
    );

  default:
    return <div className="min-h-screen flex items-center justify-center bg-mw-dark-navy text-mw-white">
      An unknown error occurred in your journey.
    </div>;
}
```

**Update imports at top:**
```js
let ScenarioSelectionComponent, DisplayFortuneComponent, TarotCardSelectionComponent, TarotCardRevealComponent;

// In loadAssets:
await Promise.all([
  import('@/components/fortune-journey/ScenarioSelection').then(mod => ScenarioSelectionComponent = mod.default),
  import('@/components/fortune-journey/DisplayFortune').then(mod => DisplayFortuneComponent = mod.default),
  import('@/components/fortune-journey/TarotCardSelection').then(mod => TarotCardSelectionComponent = mod.default),
  import('@/components/fortune-journey/TarotCardReveal').then(mod => TarotCardRevealComponent = mod.default),
]);
```

**Update back button navigation:**
```js
const handleGoBack = () => {
  if (currentStage === 'tarotCardReveal') setCurrentStage('tarotCardSelection');
  else if (currentStage === 'tarotCardSelection') setCurrentStage('legacyFortuneReveal');
  else if (currentStage === 'legacyFortuneReveal') setCurrentStage('questionSelection');
  else if (currentStage === 'questionSelection') router.push('/collect-info');
};
```

**Test:**
- [ ] Full flow works: questions → legacy fortune → card selection → card reveal → email
- [ ] Back button works at each stage
- [ ] State persists correctly

---

### Phase 3.6: Update Email/Blueprint to Include Full Fortune (15 min)

**Goal:** Email should contain both legacy fortune AND tarot card predictions

#### Changes Required:

**File:** `app/contact-details/page.js` or wherever email is sent

**Update email payload to include:**
```js
const emailPayload = {
  email: emailAddress,
  fullName: userInfo.fullName,
  companyName: userInfo.companyName,

  // Legacy Fortune
  legacyFortune: {
    openingLine: journeyFortuneData.openingLine,
    locationInsight: journeyFortuneData.locationInsight,
    audienceOpportunity: journeyFortuneData.audienceOpportunity,
    engagementForecast: journeyFortuneData.engagementForecast,
    transactionsPrediction: journeyFortuneData.transactionsPrediction,
    aiAdvice: journeyFortuneData.aiAdvice,
  },

  // Tarot Cards
  tarotCards: selectedTarotCards.map(card => ({
    name: card.name,
    platform: card.platform,
    predictions: fortunePredictions[persona][card.platform],
  })),
};
```

**Update email template to show both sections**

**Test:**
- [ ] Email contains legacy fortune
- [ ] Email contains both tarot cards with all 3 predictions each
- [ ] Formatting looks good

---

## Testing Checklist (Phase 3 Complete)

- [ ] **Flow 1: Happy Path**
  - Pick persona + 2 questions
  - See legacy fortune (5 emoji insights)
  - Click "Discover Your Power Platforms"
  - See 7 cards (2 glowing)
  - Select 2 cards
  - Cards flip and reveal
  - Click "Get Full Fortune via Email"
  - Email capture works

- [ ] **Flow 2: Guided Selection**
  - Verify the 2 glowing cards match the questions picked
  - Select different cards (not glowing ones)
  - Verify predictions match the selected cards, not questions

- [ ] **Flow 3: Back Navigation**
  - From each stage, click back button
  - Verify returns to previous stage
  - Verify state is preserved

- [ ] **Flow 4: Error Handling**
  - Try to select 3 cards (should show error)
  - Try to proceed without selecting 2 (should show error)
  - Verify error messages clear on correction

- [ ] **Flow 5: Personalization**
  - Verify ${Name} replaced in predictions
  - Verify ${Company Name} replaced
  - Verify ${Industry} replaced

- [ ] **Flow 6: Email Content**
  - Verify legacy fortune appears in email
  - Verify both tarot cards appear with all 3 predictions
  - Verify formatting is readable

---

## Timeline Summary

| Sub-Phase | Task | Time |
|-----------|------|------|
| 3.1 | Update API to legacy | 10 min |
| 3.2 | Update DisplayFortune | 15 min |
| 3.3 | Create TarotCardSelection | 20 min |
| 3.4 | Create TarotCardReveal | 20 min |
| 3.5 | Wire up stage flow | 15 min |
| 3.6 | Update email/blueprint | 15 min |
| **Testing** | Full flow testing | 15 min |
| **TOTAL** | | **110 min (~2 hours)** |

---

## Dependencies

**Blockers:**
- None (all mapping files already exist)

**Nice-to-have (can implement with placeholders):**
- Tarot card artwork (8 images)
- Card back design
- Can use emoji 🃏 or placeholder boxes initially

---

## Rollback Plan

If Option C doesn't work:
1. Revert to Phase 2 state
2. Use simplified Option A (auto-reveal cards, no selection)
3. All code is modular, can swap components easily

---

## Next Steps After Phase 3

**Phase 4:** Design tarot card artwork (external designer)
**Phase 5:** Remove archetype discovery flow
**Phase 6:** Polish animations and transitions
**Phase 7:** Add audio narration to legacy fortune
**Phase 8:** Final booth testing

---

## Ready to Start?

Say "yes" and I'll begin with Phase 3.1 (Update API to legacy fortune).
