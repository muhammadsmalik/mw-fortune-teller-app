'use client';

import { useState, useEffect } from 'react';
// import ScenarioSelection from '@/components/fortune-journey/ScenarioSelection';
// import DisplayFortune from '@/components/fortune-journey/DisplayFortune';
import { useRouter } from 'next/navigation'; // For initial redirection if needed or back to /collect-info from parent
import personaQuestions from '@/lib/persona_questions.json';

// Dynamic imports for component lazy loading
let ScenarioSelectionComponent, DisplayFortuneComponent, TacticalCardSelectionComponent, BlueprintDisplayComponent;

const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

export default function FortuneJourneyPage() {
  const [currentStage, setCurrentStage] = useState('highLevelSelection'); // highLevelSelection, initialFortuneReveal, tacticalSelection, finalBlueprint
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [highLevelChoices, setHighLevelChoices] = useState([]);
  const [tacticalChoices, setTacticalChoices] = useState([]);
  
  const [journeyFortuneData, setJourneyFortuneData] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);

  // State for persona context files
  const [brandOwnerContext, setBrandOwnerContext] = useState('');
  const [mediaOwnerContext, setMediaOwnerContext] = useState('');
  const [mediaAgencyContext, setMediaAgencyContext] = useState('');

  const router = useRouter();

  useEffect(() => {
    // Load components and persona context concurrently
    const loadAssets = async () => {
      try {
        await Promise.all([
          import('@/components/fortune-journey/ScenarioSelection').then(mod => ScenarioSelectionComponent = mod.default),
          import('@/components/fortune-journey/DisplayFortune').then(mod => DisplayFortuneComponent = mod.default),
          import('@/components/fortune-journey/TacticalCardSelection').then(mod => TacticalCardSelectionComponent = mod.default),
          import('@/components/fortune-journey/BlueprintDisplay').then(mod => BlueprintDisplayComponent = mod.default),
        ]);
        setComponentsLoaded(true);
        console.log('[FortuneJourneyPage] All journey components dynamically loaded.');

        const [brandOwnerRes, mediaOwnerRes, mediaAgencyRes] = await Promise.all([
          fetch('/personas/brand_owner.md'),
          fetch('/personas/media_owner.md'),
          fetch('/personas/media_agency.md'),
        ]);

        if (!brandOwnerRes.ok || !mediaOwnerRes.ok || !mediaAgencyRes.ok) {
          throw new Error('Failed to fetch one or more persona context files.');
        }

        setBrandOwnerContext(await brandOwnerRes.text());
        setMediaOwnerContext(await mediaOwnerRes.text());
        setMediaAgencyContext(await mediaAgencyRes.text());
        
        setContextLoaded(true);
        console.log('[FortuneJourneyPage] All persona contexts loaded.');

      } catch (err) {
        console.error("[FortuneJourneyPage] Failed to load assets:", err);
      }
    };

    loadAssets();
  }, []);

  const handleHighLevelConfirmed = async ({ scenarios, persona }) => {
    console.log('[FortuneJourneyPage] High-level choices confirmed:', { scenarios, persona });
    if (!contextLoaded) {
      console.error("[FortuneJourneyPage] Cannot proceed: Persona context not loaded yet.");
      // Optionally, set an error state to inform the user
      return;
    }

    setHighLevelChoices(scenarios);
    setSelectedPersona(persona);
    setCurrentStage('initialFortuneReveal');
    setIsAudioUnlocked(true);
    setJourneyFortuneData(null);

    try {
      // --- Extract ACTUAL user data from localStorage ---
      const storedUserInfo = JSON.parse(localStorage.getItem('userInfoForFortune')) || {};
      const pendingRequestBody = JSON.parse(localStorage.getItem('pendingFortuneRequestBody')) || {};
      const fetchedLinkedInData = JSON.parse(localStorage.getItem('fetchedLinkedInData')) || {};
      
      // Prioritize actual stored data over placeholder values
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

      // Persist the finalized user info for the contact-details page
      localStorage.setItem('fortuneApp_fullName', currentUserInfo.fullName);
      localStorage.setItem('fortuneApp_companyName', currentUserInfo.companyName);
      localStorage.setItem('fortuneApp_industry', currentUserInfo.industryType);

      console.log('[FortuneJourneyPage] Using actual user data:', currentUserInfo);

      const allHighLevelQuestionsForPersona = personaQuestions[persona].high;
      const selectedQuestionObjects = allHighLevelQuestionsForPersona.filter(q => scenarios.includes(q.id));
      const unselectedQuestionObjects = allHighLevelQuestionsForPersona.filter(q => !scenarios.includes(q.id));

      const payload = {
        fullName: actualFullName,
        companyName: actualCompanyName,
        industryType: actualIndustryType,
        geographicFocus: actualGeographicFocus,
        selectedPersona: persona,
        selectedQuestions: selectedQuestionObjects.map(q => q.text),
        unselectedQuestions: unselectedQuestionObjects.map(q => q.text),
        brandOwnerContext,
        mediaOwnerContext,
        mediaAgencyContext,
        // Include additional context if available
        linkedinData: fetchedLinkedInData,
      };
      
      console.log('[FortuneJourneyPage] Sending payload to API:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('/api/generate-initial-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate initial fortune.');
      }

      const initialFortune = await response.json();

      localStorage.setItem('fortuneData', JSON.stringify(initialFortune));
      setJourneyFortuneData(initialFortune);

    } catch (error) {
      console.error("[FortuneJourneyPage] Error fetching initial fortune:", error);
      const errorFortune = {
        openingStatement: "A disturbance in the cosmic ether...",
        error: `The Oracle's vision is clouded. ${error.message}. Please try again.`
      };
      setJourneyFortuneData(errorFortune);
    }
  };

  const handleProceedToTactical = () => {
    console.log('[FortuneJourneyPage] Proceeding to tactical selection stage.');
    setCurrentStage('tacticalSelection');
  };

  const handleTacticalConfirmed = ({ scenarios }) => {
    console.log('[FortuneJourneyPage] Tactical choices confirmed:', { scenarios });
    setTacticalChoices(scenarios);
    const allSelectedIds = [...highLevelChoices, ...scenarios];
    localStorage.setItem('selectedScenarioIDs', JSON.stringify(allSelectedIds));
    console.log('[FortuneJourneyPage] All choices saved. Proceeding to final blueprint.');
    setCurrentStage('finalBlueprint');
  };

  const handleCompleteJourney = (blueprintHtml) => {
    // Navigate to the final contact page or show a summary
    if (blueprintHtml) {
      localStorage.setItem('blueprintHtml', blueprintHtml);
      console.log('[FortuneJourneyPage] Blueprint HTML saved to localStorage.');
    }
    router.push('/contact-details');
  };

  const handleGoBack = () => {
    if (currentStage === 'finalBlueprint') setCurrentStage('tacticalSelection');
    else if (currentStage === 'tacticalSelection') setCurrentStage('initialFortuneReveal');
    else if (currentStage === 'initialFortuneReveal') setCurrentStage('highLevelSelection');
    else if (currentStage === 'highLevelSelection') router.push('/collect-info');
  };
  
  // This useEffect will redirect if user lands here without completing previous steps.
  // For now, we assume the flow starts from /collect-info or similar.
  // You might want to add logic to check for required data in localStorage
  // and redirect to /collect-info if it's missing.
  useEffect(() => {
    // Example: if (!localStorage.getItem('someInitialDataFromCollectInfo')) {
    //   router.push('/collect-info');
    // }
  }, [router]);

  if (!componentsLoaded || !contextLoaded) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">Preparing your journey... The Oracle is consulting the archives.</div>;
    }

  switch (currentStage) {
    case 'highLevelSelection':
      return (
        <ScenarioSelectionComponent
          onScenariosConfirmed={handleHighLevelConfirmed}
          onBack={handleGoBack}
          questionType="high"
          title="What Challenges Cloud Your Future?"
          subtitle="Choose the two that concern you most to reveal a glimpse of what's to come."
          ctaLabel="Predict My Fortune"
        />
      );
    
    case 'initialFortuneReveal':
    return (
      <DisplayFortuneComponent
          fortuneData={journeyFortuneData}
          onGoBack={handleGoBack}
          onProceedToNextStep={handleProceedToTactical}
          audioPlaybackAllowed={isAudioUnlocked}
        />
      );

    case 'tacticalSelection':
      return (
        <TacticalCardSelectionComponent
          persona={selectedPersona}
          onConfirm={handleTacticalConfirmed}
          onBack={handleGoBack}
        />
      );

    case 'finalBlueprint':
      return (
        <BlueprintDisplayComponent
          userInfo={userInfo}
          highLevelChoices={highLevelChoices}
          tacticalChoices={tacticalChoices}
          persona={selectedPersona}
          onComplete={handleCompleteJourney}
          onBack={handleGoBack}
        />
      );

    default:
      return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">An unknown error occurred in your journey.</div>;
  }
} 