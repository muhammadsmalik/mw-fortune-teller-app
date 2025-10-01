/**
 * Fortune Journey V2 (Hybrid Architecture)
 *
 * Main orchestrator for the hybrid multi-stage fortune journey.
 * Combines persona selection + legacy 6-field fortune format + tactical selection + blueprint.
 *
 * STAGES:
 * 1. highLevelSelection - Persona + 2 high-level challenge selection
 * 2. generatingLegacyFortune - Loading state while calling enhanced /api/generate-fortune
 * 3. legacyFortuneReveal - Display 6-field legacy fortune with DisplayLegacyFortune component
 * 4. tacticalSelection - Select 2 tactical challenges
 * 5. finalBlueprint - Generate and display comprehensive blueprint
 *
 * KEY DIFFERENCES FROM V1:
 * - Uses /api/generate-fortune (enhanced with persona awareness) instead of /api/generate-initial-fortune
 * - Displays 6-field fortune format instead of openingStatement + 2 insights
 * - Single fortune generation (no wasteful double generation)
 * - Unified flow for both LinkedIn and manual entry
 *
 * Created: 2025-10-01 (Phase 2 of hybrid migration)
 * Replaces: /fortune-journey (v1-deprecated)
 * See: .cursor/DOCUMENTATION/HYBRID_ARCHITECTURE.md
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import personaQuestions from '@/lib/persona_questions.json';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic imports for lazy loading
const ScenarioSelection = dynamic(() => import('@/components/fortune-journey/ScenarioSelection'), { ssr: false });
const DisplayLegacyFortune = dynamic(() => import('@/components/fortune-journey/DisplayLegacyFortune'), { ssr: false });
const TacticalCardSelection = dynamic(() => import('@/components/fortune-journey/TacticalCardSelection'), { ssr: false });
const BlueprintDisplay = dynamic(() => import('@/components/fortune-journey/BlueprintDisplay'), { ssr: false });

// LocalStorage keys
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

export default function FortuneJourneyV2Page() {
  const router = useRouter();

  // Stage management
  const [currentStage, setCurrentStage] = useState('highLevelSelection');
  // Stages: highLevelSelection, generatingLegacyFortune, legacyFortuneReveal, tacticalSelection, finalBlueprint

  // User data
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [highLevelChoices, setHighLevelChoices] = useState([]);
  const [tacticalChoices, setTacticalChoices] = useState([]);
  const [userInfo, setUserInfo] = useState(null);

  // Fortune data
  const [legacyFortuneData, setLegacyFortuneData] = useState(null);

  // Persona context
  const [advertiserContext, setAdvertiserContext] = useState('');
  const [publisherContext, setPublisherContext] = useState('');
  const [platformContext, setPlatformContext] = useState('');
  const [contextLoaded, setContextLoaded] = useState(false);

  // Audio playback (user interaction flag)
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // Error handling
  const [error, setError] = useState(null);

  // Load persona context on mount
  useEffect(() => {
    const loadPersonaContext = async () => {
      try {
        const [advRes, pubRes, platRes] = await Promise.all([
          fetch('/personas/advertiser.md'),
          fetch('/personas/publisher.md'),
          fetch('/personas/platform_and_service_provider.md'),
        ]);

        if (!advRes.ok || !pubRes.ok || !platRes.ok) {
          throw new Error('Failed to fetch persona context files.');
        }

        setAdvertiserContext(await advRes.text());
        setPublisherContext(await pubRes.text());
        setPlatformContext(await platRes.text());
        setContextLoaded(true);

        console.log('[FortuneJourneyV2] Persona contexts loaded.');
      } catch (err) {
        console.error("[FortuneJourneyV2] Failed to load persona context:", err);
        setError("Failed to load required resources. Please refresh.");
      }
    };

    loadPersonaContext();
  }, []);

  /**
   * Stage 1: High-Level Selection Confirmed
   */
  const handleHighLevelConfirmed = async ({ scenarios, persona }) => {
    console.log('[FortuneJourneyV2] High-level choices confirmed:', { scenarios, persona });

    if (!contextLoaded) {
      console.error("[FortuneJourneyV2] Cannot proceed: Persona context not loaded yet.");
      setError("System not ready. Please wait and try again.");
      return;
    }

    setHighLevelChoices(scenarios);
    setSelectedPersona(persona);
    setIsAudioUnlocked(true); // User interacted, unlock audio

    // Move to generating stage
    setCurrentStage('generatingLegacyFortune');

    try {
      // --- Extract ACTUAL user data from localStorage ---
      const storedUserInfo = JSON.parse(localStorage.getItem('userInfoForFortune') || '{}');
      const pendingRequestBody = JSON.parse(localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY) || '{}');
      const fetchedLinkedInData = JSON.parse(localStorage.getItem('fetchedLinkedInData') || '{}');

      // Prioritize actual stored data
      const actualFullName = localStorage.getItem('fortuneApp_fullName') ||
        pendingRequestBody.fullName ||
        fetchedLinkedInData.profileData?.full_name ||
        storedUserInfo.fullName ||
        'Valued User';

      const actualCompanyName = localStorage.getItem('fortuneApp_companyName') ||
        pendingRequestBody.companyName ||
        fetchedLinkedInData.latestCompanyData?.name ||
        storedUserInfo.companyName ||
        'Your Company';

      const actualIndustryType = localStorage.getItem('fortuneApp_industry') ||
        pendingRequestBody.industryType ||
        fetchedLinkedInData.latestCompanyData?.industry ||
        fetchedLinkedInData.profileData?.occupation ||
        storedUserInfo.industryType ||
        'Your Industry';

      const actualGeographicFocus = pendingRequestBody.geographicFocus ||
        storedUserInfo.geographicFocus ||
        (fetchedLinkedInData.profileData ?
          `${fetchedLinkedInData.profileData.city || 'Global Reach'}, ${fetchedLinkedInData.profileData.country_full_name || 'Cosmic Planes'}` :
          'Your Region');

      const currentUserInfo = {
        fullName: actualFullName,
        companyName: actualCompanyName,
        industryType: actualIndustryType,
        geographicFocus: actualGeographicFocus
      };
      setUserInfo(currentUserInfo);

      // Persist for contact-details page
      localStorage.setItem('fortuneApp_fullName', currentUserInfo.fullName);
      localStorage.setItem('fortuneApp_companyName', currentUserInfo.companyName);
      localStorage.setItem('fortuneApp_industry', currentUserInfo.industryType);

      console.log('[FortuneJourneyV2] Using user data:', currentUserInfo);

      // Get selected challenge texts
      const allHighLevelQuestionsForPersona = personaQuestions[persona].high;
      const selectedQuestionObjects = allHighLevelQuestionsForPersona.filter(q => scenarios.includes(q.id));
      const selectedChallengeTexts = selectedQuestionObjects.map(q => q.text);

      // Get persona context
      const personaContextMap = {
        'advertiser': advertiserContext,
        'publisher': publisherContext,
        'platform': platformContext,
      };
      const selectedPersonaContext = personaContextMap[persona] || '';

      // Construct ENHANCED payload for /api/generate-fortune
      const payload = {
        // Original fields (backward compatible)
        fullName: actualFullName,
        companyName: actualCompanyName,
        industryType: actualIndustryType,
        geographicFocus: actualGeographicFocus,
        businessObjective: '', // Optional

        // NEW FIELDS for hybrid/enhanced mode
        selectedPersona: persona,
        selectedChallenges: scenarios,
        selectedChallengeTexts: selectedChallengeTexts,
        personaContext: selectedPersonaContext,
        linkedinData: fetchedLinkedInData,
      };

      console.log('[FortuneJourneyV2] Calling enhanced /api/generate-fortune with payload:', payload);

      const response = await fetch('/api/generate-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate legacy fortune.');
      }

      const legacyFortune = await response.json();
      console.log('[FortuneJourneyV2] Legacy fortune generated:', legacyFortune);

      // Store for potential future use
      localStorage.setItem('fortuneData', JSON.stringify(legacyFortune));

      // COMPATIBILITY FIX: Convert legacy 6-field format to v1 format for contact-details page
      // contact-details expects: { openingStatement, insight1: {challenge, insight}, insight2: {challenge, insight} }
      const compatibilityFortune = {
        openingStatement: legacyFortune.openingLine || '',
        insight1: {
          challenge: selectedChallengeTexts[0] || 'Your First Challenge',
          insight: `${legacyFortune.locationInsight || ''}\n\n${legacyFortune.audienceOpportunity || ''}`
        },
        insight2: {
          challenge: selectedChallengeTexts[1] || 'Your Second Challenge',
          insight: `${legacyFortune.engagementForecast || ''}\n\n${legacyFortune.transactionsPrediction || ''}\n\n${legacyFortune.aiAdvice || ''}`
        }
      };
      // Overwrite with compatible format for contact-details
      localStorage.setItem('fortuneData', JSON.stringify(compatibilityFortune));

      setLegacyFortuneData(legacyFortune);
      setCurrentStage('legacyFortuneReveal');

    } catch (error) {
      console.error("[FortuneJourneyV2] Error generating legacy fortune:", error);
      setError(`Fortune generation failed: ${error.message}`);
      setCurrentStage('highLevelSelection'); // Go back to allow retry
    }
  };

  /**
   * Stage 3: Proceed from Legacy Fortune to Tactical Selection
   */
  const handleProceedToTactical = () => {
    console.log('[FortuneJourneyV2] Proceeding to tactical selection stage.');
    setCurrentStage('tacticalSelection');
  };

  /**
   * Stage 4: Tactical Selection Confirmed
   */
  const handleTacticalConfirmed = ({ scenarios }) => {
    console.log('[FortuneJourneyV2] Tactical choices confirmed:', { scenarios });
    setTacticalChoices(scenarios);

    const allSelectedIds = [...highLevelChoices, ...scenarios];
    localStorage.setItem('selectedScenarioIDs', JSON.stringify(allSelectedIds));

    console.log('[FortuneJourneyV2] All choices saved. Proceeding to final blueprint.');
    setCurrentStage('finalBlueprint');
  };

  /**
   * Stage 5: Complete Journey
   */
  const handleCompleteJourney = (blueprintHtml) => {
    if (blueprintHtml) {
      localStorage.setItem('blueprintHtml', blueprintHtml);
      console.log('[FortuneJourneyV2] Blueprint HTML saved to localStorage.');
    }
    router.push('/contact-details');
  };

  /**
   * Back navigation handler
   */
  const handleGoBack = () => {
    if (currentStage === 'finalBlueprint') setCurrentStage('tacticalSelection');
    else if (currentStage === 'tacticalSelection') setCurrentStage('legacyFortuneReveal');
    else if (currentStage === 'legacyFortuneReveal') setCurrentStage('highLevelSelection');
    else if (currentStage === 'generatingLegacyFortune') setCurrentStage('highLevelSelection');
    else if (currentStage === 'highLevelSelection') router.push('/collect-info');
  };

  // Loading state while persona context loads
  if (!contextLoaded && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p className="text-lg">Preparing your journey... The Oracle is consulting the archives.</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4 text-center">
        <h2 className="text-2xl font-bold text-red-400">A Cosmic Disturbance!</h2>
        <p className="text-lg">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setCurrentStage('highLevelSelection');
          }}
          className="mt-4 px-6 py-2 bg-mw-light-blue text-mw-dark-navy rounded-lg font-semibold hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render current stage
  switch (currentStage) {
    case 'highLevelSelection':
      return (
        <ScenarioSelection
          onScenariosConfirmed={handleHighLevelConfirmed}
          onBack={handleGoBack}
          questionType="high"
          title="What Challenges Cloud Your Future?"
          subtitle="Choose the two that concern you most to reveal a glimpse of what's to come."
          ctaLabel="Predict My Fortune"
        />
      );

    case 'generatingLegacyFortune':
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
          <p className="text-lg">Weaving your destiny... This might take a moment.</p>
          <p className="text-sm text-mw-white/70">Consulting the digital oracles...</p>
        </div>
      );

    case 'legacyFortuneReveal':
      return (
        <DisplayLegacyFortune
          fortuneData={legacyFortuneData}
          onGoBack={handleGoBack}
          onProceedToNextStep={handleProceedToTactical}
          audioPlaybackAllowed={isAudioUnlocked}
          userChallenges={highLevelChoices.map(id => {
            const allQuestions = personaQuestions[selectedPersona]?.high || [];
            const question = allQuestions.find(q => q.id === id);
            return question?.text || id;
          })}
        />
      );

    case 'tacticalSelection':
      return (
        <TacticalCardSelection
          persona={selectedPersona}
          onConfirm={handleTacticalConfirmed}
          onBack={handleGoBack}
        />
      );

    case 'finalBlueprint':
      return (
        <BlueprintDisplay
          userInfo={userInfo}
          legacyFortune={legacyFortuneData}
          highLevelChoices={highLevelChoices}
          tacticalChoices={tacticalChoices}
          persona={selectedPersona}
          onComplete={handleCompleteJourney}
          onBack={handleGoBack}
        />
      );

    default:
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
          <p className="text-lg">An unknown error occurred in your journey.</p>
          <button
            onClick={() => setCurrentStage('highLevelSelection')}
            className="mt-4 px-6 py-2 bg-mw-light-blue text-mw-dark-navy rounded-lg font-semibold hover:opacity-90"
          >
            Start Over
          </button>
        </div>
      );
  }
}
