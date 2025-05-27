'use client';

import { useState, useEffect } from 'react';
// import ScenarioSelection from '@/components/fortune-journey/ScenarioSelection';
// import DisplayFortune from '@/components/fortune-journey/DisplayFortune';
import { useRouter } from 'next/navigation'; // For initial redirection if needed or back to /collect-info from parent

const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

export default function FortuneJourneyPage() {
  const [currentView, setCurrentView] = useState('scenarioSelection'); // 'scenarioSelection' or 'displayFortune'
  const [journeyFortuneData, setJourneyFortuneData] = useState(null);
  const [journeySelectedScenarios, setJourneySelectedScenarios] = useState(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const router = useRouter();

  // Placeholder: In Phase 2, this will handle data from ScenarioSelection
  // and prepare data for DisplayFortune.
  const handleScenariosConfirmed = (confirmedScenariosData) => {
    console.log('[FortuneJourneyPage] Scenarios Confirmed:', confirmedScenariosData.scenarios);
    setJourneySelectedScenarios(confirmedScenariosData.scenarios);

    // Logic to align with previous flow where fortuneData is expected in localStorage
    // This might have been set by a /generating-fortune page or /linkedin-interlude page

    if (localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY)) {
        console.log('[FortuneJourneyPage] LinkedIn flow artifact found, removing.');
        localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
    }

    const storedFortuneDataString = localStorage.getItem('fortuneData');
    const storedFortuneError = localStorage.getItem('fortuneGenerationError');

    let fortuneToSet = null;

    if (storedFortuneError) {
        console.error("[FortuneJourneyPage] Error from previous fortune generation step found:", storedFortuneError);
        // Create an error object structure that DisplayFortune can understand or display
        fortuneToSet = {
            openingLine: "A disturbance in the stars...",
            error: `A cosmic disturbance occurred: ${storedFortuneError}. Please try starting over.`
            // You might want to add other fields DisplayFortune expects, or have it handle an 'error' prop specifically
        };
        localStorage.removeItem('fortuneGenerationError'); // Clear the error after processing
    } else if (storedFortuneDataString) {
        try {
            const parsedFortuneData = JSON.parse(storedFortuneDataString);
            console.log('[FortuneJourneyPage] Successfully retrieved and parsed fortuneData from localStorage:', parsedFortuneData);
            fortuneToSet = parsedFortuneData;
        } catch (e) {
            console.error('[FortuneJourneyPage] Failed to parse fortuneData from localStorage:', e);
            fortuneToSet = {
                openingLine: "The Oracle's message is corrupted...",
                error: "Failed to interpret the stars. The stored fortune data was unreadable. Please try starting over."
            };
        }
    } else {
        console.warn('[FortuneJourneyPage] fortuneData NOT found in localStorage. This is unexpected if a prior generation step was assumed.');
        // This is a critical missing piece if the flow relies on a prior page setting this.
        // For now, set an error state. In a full implementation, you might redirect or show a more specific error.
        fortuneToSet = {
            openingLine: "The path to your fortune is unclear...",
            error: "The Oracle\'s vision is missing. No fortune data was found from previous steps. Please ensure you have completed all prior stages or try starting over."
        };
        // As a temporary measure for testing, you could re-insert mock data here, but ideally, the flow should ensure data exists.
        // fortuneToSet = { /* mock data if absolutely needed for continued testing of subsequent UI */ };
    }
    
    setJourneyFortuneData(fortuneToSet); 

    setIsAudioUnlocked(true); 
    console.log('[FortuneJourneyPage] Audio unlocked state set, attempting to set view to displayFortune.');
    setCurrentView('displayFortune');
  };

  const handleGoBackToScenarios = () => {
    setCurrentView('scenarioSelection');
    // Reset states if necessary
    setJourneyFortuneData(null);
    setIsAudioUnlocked(false); // Re-lock audio state if needed, or manage context appropriately
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

  // Dynamically import components to ensure they are client-side
  const [ScenarioSelectionComponent, setScenarioSelectionComponent] = useState(null);
  const [DisplayFortuneComponent, setDisplayFortuneComponent] = useState(null);

  useEffect(() => {
    import('@/components/fortune-journey/ScenarioSelection')
      .then(mod => setScenarioSelectionComponent(() => mod.default))
      .catch(err => console.error("[FortuneJourneyPage] Failed to load ScenarioSelection:", err));

    import('@/components/fortune-journey/DisplayFortune')
      .then(mod => {
        console.log('[FortuneJourneyPage] Dynamic import of DisplayFortune component SUCCEEDED.');
        setDisplayFortuneComponent(() => mod.default);
      })
      .catch(err => console.error("[FortuneJourneyPage] Failed to load DisplayFortune:", err));
  }, []);


  if (currentView === 'scenarioSelection') {
    if (!ScenarioSelectionComponent) {
      return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">Loading Scenario Selection Module...</div>;
    }
    return <ScenarioSelectionComponent onScenariosConfirmed={handleScenariosConfirmed} />;
  }

  if (currentView === 'displayFortune') {
    if (!DisplayFortuneComponent) {
      console.log('[FortuneJourneyPage] Current view is displayFortune, but DisplayFortuneComponent is NOT YET LOADED. Showing loading message.');
      return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">Loading Your Fortune Display Module...</div>;
    }
    console.log('[FortuneJourneyPage] Current view is displayFortune, DisplayFortuneComponent IS LOADED. Attempting to render DisplayFortuneComponent with journeyFortuneData:', journeyFortuneData);
    return (
      <DisplayFortuneComponent
        fortuneData={journeyFortuneData} // In Phase 2, this will be the primary source
        onGoBack={handleGoBackToScenarios}
        audioPlaybackAllowed={isAudioUnlocked} // This will enable automatic audio playback
      />
    );
  }

  return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">Loading your journey...</div>;
} 