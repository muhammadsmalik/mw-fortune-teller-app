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
  const [currentStage, setCurrentStage] = useState('questionSelection'); // questionSelection, initialFortuneReveal, finalBlueprint
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]); // Combined - no more high/tactical split
  
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

  const handleQuestionConfirmed = async ({ scenarios, persona }) => {
    console.log('[FortuneJourneyPage] Questions confirmed:', { scenarios, persona });
    if (!contextLoaded) {
      console.error("[FortuneJourneyPage] Cannot proceed: Persona context not loaded yet.");
      // Optionally, set an error state to inform the user
      return;
    }

    setSelectedQuestions(scenarios);
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

      const allQuestionsForPersona = personaQuestions[persona].questions;
      const selectedQuestionObjects = allQuestionsForPersona.filter(q => scenarios.includes(q.id));
      const unselectedQuestionObjects = allQuestionsForPersona.filter(q => !scenarios.includes(q.id));

      const payload = {
        fullName: actualFullName,
        companyName: actualCompanyName,
        industryType: actualIndustryType,
        geographicFocus: actualGeographicFocus,
        businessObjective: '', // Optional: can derive from questions if needed
        selectedQuestions: selectedQuestionObjects.map(q => q.text), // Pass for AI context
      };

      console.log('[FortuneJourneyPage] Sending payload to legacy fortune API:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/generate-fortune', {
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

  const handleProceedToBlueprint = () => {
    console.log('[FortuneJourneyPage] Proceeding to final blueprint.');
    localStorage.setItem('selectedScenarioIDs', JSON.stringify(selectedQuestions));
    setCurrentStage('finalBlueprint');
  };

  // Keeping this for backward compatibility with TacticalCardSelection component (will remove in Phase 3)
  const handleTacticalConfirmed = ({ scenarios }) => {
    console.log('[FortuneJourneyPage] Tactical choices confirmed (legacy):', { scenarios });
    setSelectedQuestions(scenarios);
    localStorage.setItem('selectedScenarioIDs', JSON.stringify(scenarios));
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
    if (currentStage === 'finalBlueprint') setCurrentStage('initialFortuneReveal');
    else if (currentStage === 'initialFortuneReveal') setCurrentStage('questionSelection');
    else if (currentStage === 'questionSelection') router.push('/collect-info');
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

    case 'initialFortuneReveal':
    return (
      <DisplayFortuneComponent
          fortuneData={journeyFortuneData}
          onGoBack={handleGoBack}
          onProceedToNextStep={handleProceedToBlueprint}
          audioPlaybackAllowed={isAudioUnlocked}
        />
      );

    case 'finalBlueprint':
      return (
        <BlueprintDisplayComponent
          userInfo={userInfo}
          highLevelChoices={selectedQuestions}
          tacticalChoices={selectedQuestions}
          persona={selectedPersona}
          onComplete={handleCompleteJourney}
          onBack={handleGoBack}
        />
      );

    default:
      return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">An unknown error occurred in your journey.</div>;
  }
} 