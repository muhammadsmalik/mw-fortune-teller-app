# Option C: Interactive Tarot Selection with Legacy Fortune

## Final Flow Design

### User Journey (45-60 seconds)

```
SCREEN 1: Question Selection (15 sec)
├─ User picks persona
├─ User selects 2 of 6 questions
└─ Click "Reveal My Fortune"

↓ API CALL to /api/generate-fortune (LEGACY)

SCREEN 2: Legacy Fortune Display (20 sec)
├─ Mystical opening line
├─ 5 emoji-structured insights:
│  ├─ 📍 locationInsight
│  ├─ 👀 audienceOpportunity
│  ├─ 💥 engagementForecast
│  ├─ 💸 transactionsPrediction
│  └─ 🔮 aiAdvice
└─ Click "Discover Your Power Platforms" button

↓ TRANSITION ANIMATION

SCREEN 3: Tarot Card Selection (20 sec)
├─ "The Oracle has drawn your destiny cards..."
├─ Show 7 face-down tarot cards in a row
├─ 2 cards GLOW/PULSE (mapped from questions)
├─ User clicks any 2 cards
└─ Cards they select will flip

↓ CARD FLIP ANIMATION

SCREEN 4: Tarot Card Reveal (15 sec)
├─ 2 cards flip to reveal:
│  ├─ Tarot card artwork (front)
│  ├─ Card name (e.g., "The Judge")
│  ├─ Platform name (e.g., "Measure")
│  └─ 1 prediction line from CHANGES.md
└─ Click "Get Full Fortune via Email"

SCREEN 5: Email Capture
└─ Standard contact-details page
```

---

## Fortune Generation Strategy

### Two Fortune Types:

#### Type 1: Legacy Fortune (AI-Generated, Fun)
**API:** `/api/generate-fortune` (already exists)
**Input:**
- Name, Company, Industry, Location
- **2 Selected Questions** (influences context)

**Output:**
```json
{
  "openingLine": "Ah, SAL, the spirits whisper from the trading floors...",
  "locationInsight": "📍 Singapore's financial district pulses with 50K professionals daily",
  "audienceOpportunity": "👀 C-suite decision-makers commute past premium CBD screens",
  "engagementForecast": "💥 Dynamic content on Marina Bay screens will spike engagement 4x",
  "transactionsPrediction": "💸 Measurable attribution will transform your campaign ROI",
  "aiAdvice": "🔮 Connect offline impressions to online conversions with Moving Walls"
}
```

**Note:** Questions slightly influence the content (AI knows their concerns) but fortune is still fun/mystical, NOT product-focused.

---

#### Type 2: Tarot Card Predictions (Hard-Coded, Product-Focused)
**Source:** `lib/fortune_predictions.json` (already created)
**Mapping:** `lib/question_platform_mapping.json` (already created)

**When User Selects Tarot Cards:**
1. Map card → platform
2. Fetch predictions from fortune_predictions.json
3. Show 1 prediction (first one) on reveal screen
4. Email contains all 3 predictions + product details

---

## Implementation Changes

### 1. Keep Legacy Fortune API ✅ No Changes Needed
`/api/generate-fortune` already works perfectly

### 2. Update Question Selection to Send to Legacy API
**File:** `app/fortune-journey/page.js`

**Change in `handleQuestionConfirmed`:**
```js
// Currently calls: /api/generate-initial-fortune
// Change to call: /api/generate-fortune

const payload = {
  fullName: actualFullName,
  companyName: actualCompanyName,
  industryType: actualIndustryType,
  geographicFocus: actualGeographicFocus,
  businessObjective: '', // Can derive from questions if needed
  selectedQuestions: selectedQuestionObjects.map(q => q.text), // NEW: pass for context
};

const response = await fetch('/api/generate-fortune', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

### 3. Update Legacy API to Accept Questions (Optional Enhancement)
**File:** `app/api/generate-fortune/route.js`

Add to prompt (line ~230):
```js
${selectedQuestions && selectedQuestions.length > 0 ? `
The user is particularly focused on:
1. "${selectedQuestions[0]}"
2. "${selectedQuestions[1]}"

While keeping the mystical fortune format, subtly address these concerns in your insights.
` : ''}
```

### 4. Create New TarotCardSelection Component
**File:** `components/fortune-journey/TarotCardSelection.js`

```jsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import questionPlatformMapping from '@/lib/question_platform_mapping.json';

export default function TarotCardSelection({ persona, selectedQuestions, onConfirm }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [guidedCards, setGuidedCards] = useState([]);

  // All 7 tarot cards
  const allCards = [
    { id: 'architect', name: 'The Architect', platform: 'Studio' },
    { id: 'navigator', name: 'The Navigator', platform: 'Planner' },
    { id: 'connector', name: 'The Connector', platform: 'Influence' },
    { id: 'magician', name: 'The Magician', platform: 'Activate' },
    { id: 'merchant', name: 'The Merchant', platform: 'Market' },
    { id: 'judge', name: 'The Judge', platform: 'Measure' },
    { id: 'oracle', name: 'The Oracle', platform: 'Science' },
  ];

  useEffect(() => {
    // Determine which cards should glow based on questions
    const mapped = selectedQuestions.map(qId => {
      const mapping = questionPlatformMapping[persona][qId];
      return mapping.tarotCard;
    });
    setGuidedCards(mapped);
  }, [persona, selectedQuestions]);

  const handleCardClick = (card) => {
    if (selectedCards.includes(card.id)) {
      setSelectedCards(selectedCards.filter(id => id !== card.id));
    } else if (selectedCards.length < 2) {
      setSelectedCards([...selectedCards, card.id]);
    }
  };

  const handleConfirm = () => {
    if (selectedCards.length === 2) {
      onConfirm(selectedCards);
    }
  };

  return (
    <div className="min-h-screen bg-mw-dark-navy p-8">
      <h2 className="text-3xl text-center text-mw-gold mb-8">
        The Oracle has drawn your destiny cards...
      </h2>
      <p className="text-center text-mw-white/70 mb-12">
        Choose 2 cards to reveal your path
      </p>

      <div className="flex justify-center gap-4 mb-8">
        {allCards.map(card => {
          const isSelected = selectedCards.includes(card.id);
          const isGuided = guidedCards.includes(card.name);

          return (
            <motion.div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`
                w-32 h-48 rounded-lg cursor-pointer
                border-4 transition-all
                ${isSelected ? 'border-mw-gold scale-105' : 'border-mw-light-blue/30'}
                ${isGuided ? 'ring-4 ring-mw-gold/50 animate-pulse' : ''}
              `}
              whileHover={{ scale: 1.05 }}
              style={{
                backgroundImage: 'url(/tarot_cards/card_back.png)',
                backgroundSize: 'cover',
              }}
            >
              {/* Card back design */}
            </motion.div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          onClick={handleConfirm}
          disabled={selectedCards.length !== 2}
          className="bg-mw-gold text-mw-dark-navy px-8 py-3 rounded-lg disabled:opacity-50"
        >
          Reveal Cards ({selectedCards.length}/2)
        </button>
      </div>
    </div>
  );
}
```

### 5. Create Card Reveal Component
**File:** `components/fortune-journey/TarotCardReveal.js`

Shows the 2 selected cards flipping with predictions.

### 6. Update fortune-journey Stage Flow
**File:** `app/fortune-journey/page.js`

Update stages:
```js
const [currentStage, setCurrentStage] = useState('questionSelection');
// Stages: questionSelection → legacyFortuneReveal → tarotCardSelection → tarotCardReveal → finalBlueprint
```

---

## Tarot Card Design Specifications

### Card Dimensions:
- **Size:** 400px width × 600px height
- **Orientation:** Portrait (standard tarot proportions)
- **File format:** PNG with transparency
- **DPI:** 300 (print quality if needed for booth materials)

### Required Files:
```
/public/tarot_cards/
├── card_back.png          (Universal back design)
├── the_architect.png
├── the_navigator.png
├── the_connector.png
├── the_magician.png
├── the_merchant.png
├── the_judge.png
└── the_oracle.png
```

---

## Individual Card Specifications

### 1. THE ARCHITECT (Studio Platform)
**Visual Theme:** Structure, building, creation, foundation
**Color Palette:** Deep blues, silver, architectural lines
**Central Image:**
- Abstract building/skyscraper silhouette
- Digital grid overlay
- Geometric patterns suggesting screens/displays
**Top Text:** "THE ARCHITECT"
**Bottom Text:** "STUDIO"
**Style:** Modern, clean, structural

**Description for Designer:**
*"A mystical architect figure merging digital and physical worlds. Think of a silhouette drawing blueprints made of light, with holographic screens emerging from the designs. Color palette: navy blue background with silver/white geometric patterns. The card should feel orderly, structured, and visionary."*

---

### 2. THE NAVIGATOR (Planner Platform)
**Visual Theme:** Journey, maps, guidance, pathfinding
**Color Palette:** Teal, gold, celestial blues
**Central Image:**
- Compass rose with digital waypoints
- Map constellation connecting cities
- Flowing path lines
**Top Text:** "THE NAVIGATOR"
**Bottom Text:** "PLANNER"
**Style:** Celestial, guiding, strategic

**Description for Designer:**
*"A mystical navigator charting courses through constellations. Imagine a glowing compass overlaid on a map where cities are connected by light trails. The figure holds a staff that projects holographic routes. Color palette: teal background with gold accents and star-like data points. Should feel wise, strategic, and forward-looking."*

---

### 3. THE CONNECTOR (Influence Platform)
**Visual Theme:** Networks, bridges, synchronization, flow
**Color Palette:** Purple, magenta, electric blue
**Central Image:**
- Network nodes connecting
- Bridge between digital/physical
- Energy flowing between points
**Top Text:** "THE CONNECTOR"
**Bottom Text:** "INFLUENCE"
**Style:** Dynamic, flowing, interconnected

**Description for Designer:**
*"A mystical figure weaving threads of light between people and places. Visualize a network of glowing nodes (representing social, digital, and physical touchpoints) all connecting through a central figure. Color palette: deep purple background with magenta and electric blue energy threads. Should feel dynamic, social, and electric."*

---

### 4. THE MAGICIAN (Activate Platform)
**Visual Theme:** Transformation, automation, instant manifestation
**Color Palette:** Crimson red, gold, lightning effects
**Central Image:**
- Hands commanding multiple screens
- Lightning/energy radiating outward
- Symbols of instant activation
**Top Text:** "THE MAGICIAN"
**Bottom Text:** "ACTIVATE"
**Style:** Powerful, instant, commanding

**Description for Designer:**
*"A mystical magician with hands raised, commanding multiple glowing screens into existence simultaneously. Lightning or energy bolts radiate from fingertips, activating campaigns across channels. Color palette: deep crimson background with gold lightning effects. Should feel powerful, immediate, and commanding—like snapping fingers to make things happen."*

---

### 5. THE MERCHANT (Market Platform)
**Visual Theme:** Exchange, marketplace, direct connection, trade
**Color Palette:** Emerald green, gold, rich earth tones
**Central Image:**
- Marketplace scales (balanced)
- Gold coins/currency flowing
- Handshake or exchange symbol
**Top Text:** "THE MERCHANT"
**Bottom Text:** "MARKET"
**Style:** Prosperous, accessible, fair exchange

**Description for Designer:**
*"A mystical merchant presiding over a glowing marketplace. Visualize balanced scales with screens on one side and currency/value on the other, with golden light flowing between them. Background shows a bustling market constellation. Color palette: rich emerald green with gold accents. Should feel prosperous, accessible, and trustworthy."*

---

### 6. THE JUDGE (Measure Platform)
**Visual Theme:** Measurement, truth, clarity, evidence
**Color Palette:** Royal purple, white/silver, crystalline
**Central Image:**
- Scales of justice (modern/digital)
- Data visualization/charts
- Eye of truth/clarity
**Top Text:** "THE JUDGE"
**Bottom Text:** "MEASURE"
**Style:** Authoritative, clear, truthful

**Description for Designer:**
*"A mystical judge holding scales that measure data instead of weight. One side shows traditional impressions, the other shows actual ROI/results. Behind them, transparent data visualizations float like crystal tablets. Color palette: royal purple background with white/silver crystalline elements. Should feel authoritative, transparent, and revealing truth."*

---

### 7. THE ORACLE (Science Platform)
**Visual Theme:** Prediction, AI, future sight, intelligence
**Color Palette:** Deep indigo, electric cyan, neural network patterns
**Central Image:**
- Third eye with data streams
- Neural network patterns
- Crystal ball showing AI predictions
**Top Text:** "THE ORACLE"
**Bottom Text:** "SCIENCE"
**Style:** Prophetic, intelligent, mysterious

**Description for Designer:**
*"A mystical oracle with a glowing third eye, seeing through layers of data to predict the future. Neural network patterns radiate from their head like thought waves. In their hands, a crystal sphere shows AI predictions and optimization patterns. Color palette: deep indigo background with electric cyan neural networks. Should feel prophetic, intelligent, and mysteriously powerful."*

---

### Card Back Design
**Visual Theme:** Universal mysticism, Moving Walls branding
**Color Palette:** Deep navy, gold, mystical symbols
**Central Image:**
- MW logo integrated mystically
- Geometric patterns
- Subtle animation-ready design
**Style:** Elegant, branded, mysterious

**Description for Designer:**
*"Universal card back featuring the Moving Walls logo subtly integrated into mystical geometry. Think Art Deco meets digital age—clean geometric patterns in gold on deep navy background. Should be recognizable as MW branded but feel magical and premium. Add subtle details that hint at data/technology within the mystical aesthetic."*

---

## Design Guidelines:

1. **Consistent Style:** All cards should feel like they belong to the same deck
2. **Mystical + Modern:** Blend tarot mysticism with digital/tech elements
3. **Readable Text:** Card names should be clearly legible
4. **Scalable:** Should look good at both 400px and larger booth display sizes
5. **Print-Ready:** 300 DPI for potential physical booth materials
6. **Dark Mode Optimized:** Will be displayed on dark UI backgrounds

---

## Implementation Checklist:

- [ ] Update question selection to call `/api/generate-fortune`
- [ ] Enhance legacy API to accept selectedQuestions for context
- [ ] Build TarotCardSelection component
- [ ] Build TarotCardReveal component
- [ ] Update fortune-journey stage flow
- [ ] Commission/design 8 tarot card images (7 cards + 1 back)
- [ ] Test guided card glow effect
- [ ] Test card flip animation
- [ ] Verify fortune predictions display correctly
- [ ] Test email with full fortune content

---

## Estimated Timeline:

**Development:** 45 minutes
**Design (external):** 2-3 days for card artwork
**Testing:** 15 minutes

**Total Development Time:** ~60 minutes (excluding card design)
