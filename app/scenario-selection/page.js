'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CheckSquare, Square, Loader2, ArrowLeft, Users, Building } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import scenariosData from '@/lib/predefined_scenarios.json'; // Importing the JSON directly
import { motion, AnimatePresence } from 'framer-motion';

const MAX_SELECTIONS = 2;
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

// Define audio file paths (moved from linkedin-interlude)
const TRANSITION_VOICE_PATH = '/audio/transition_audio.mp3';
const TRANSITION_SHIMMER_PATH = '/audio/shimmer-glass.mp3';
const AVATAR_GREETING_AUDIO_PATH = '/audio/6-questions.mp3';

// Define initial general scenarios
const initialGeneralScenarios = [
  { id: 'gen_s1', displayText: 'I want to know what my top revenue streams will look like in 5 years.' },
  { id: 'gen_s2', displayText: 'If I suddenly had unlimited budget, I\'d want to know which tech investment would give me the biggest competitive edge.' },
  { id: 'gen_s3', displayText: 'I\'ve always wondered—do I really understand my audience?' },
  { id: 'gen_s4', displayText: 'As the industry evolves, what kind of talent or roles should I be building into my team?' },
  { id: 'gen_s5', displayText: 'By 2030, will my assets be selling just impressions—or real impact?' },
];

// Define new scenario questions
const mediaOwnerQuestions = [
  { id: 'mo_q1', displayText: 'How do I get advertisers to keep coming back?' },
  { id: 'mo_q2', displayText: 'How do I optimize my inventory pricing and utilization?' },
  { id: 'mo_q3', displayText: 'How do I attract digital budgets?' },
  { id: 'mo_q4', displayText: 'How do I attract SMEs and direct clients?' },
  { id: 'mo_q5', displayText: 'How do I reduce manual workload in operations?' },
  { id: 'mo_q6', displayText: 'What new innovations or monetization models can I explore?' },
];

const agencyQuestions = [
  { id: 'ag_q1', displayText: 'How do I get clients to reinvest in OOH?' },
  { id: 'ag_q2', displayText: 'How do I optimize campaign delivery and pricing?' },
  { id: 'ag_q3', displayText: 'How do I transition my clients into programmatic OOH?' },
  { id: 'ag_q4', displayText: 'How do I attract new types of advertisers to OOH?' },
  { id: 'ag_q5', displayText: 'How do I improve planning speed and accuracy?' },
  { id: 'ag_q6', displayText: 'How do I use data to win more proposals?' },
];

export default function ScenarioSelectionScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [allScenarios, setAllScenarios] = useState([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [error, setError] = useState(null);
  const [isNavigationInProgress, setIsNavigationInProgress] = useState(false);

  // Updated state: currentView can be 'initialAndUserTypeSelection' or 'roleSpecificScenarioSelection'
  const [currentView, setCurrentView] = useState('initialAndUserTypeSelection');
  const [userType, setUserType] = useState(null); // 'mediaOwner' or 'agency'
  const [initialSelections, setInitialSelections] = useState([]); // To store selections from the first step
  const [hasPlayedGreetingForSession, setHasPlayedGreetingForSession] = useState(false);

  // State and Refs for audio transition (moved from linkedin-interlude)
  const [isTransitionAudioPlaying, setIsTransitionAudioPlaying] = useState(false);
  const [transitionAudioError, setTransitionAudioError] = useState(null);
  const audioContextRef = useRef(null);
  const transitionAudioSourceRef = useRef(null);

  // State and Ref for avatar greeting audio
  const [isGreetingAudioPlaying, setIsGreetingAudioPlaying] = useState(false);
  const [greetingAudioError, setGreetingAudioError] = useState(null);
  const greetingAudioSourceRef = useRef(null);

  // Initialize Particles
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Load scenarios based on currentView and userType
  useEffect(() => {
    setError(null); // Clear error on view change
    setSelectedScenarioIds([]); // Clear selections on view change

    if (currentView === 'initialAndUserTypeSelection') {
      setAllScenarios(initialGeneralScenarios);
      // User type is also selected on this screen, so no specific scenario loading logic here for it.
      // Reset greeting session if returning to this primary selection screen.
      setHasPlayedGreetingForSession(false);
    } else if (currentView === 'roleSpecificScenarioSelection' && userType) {
      if (userType === 'mediaOwner') {
        setAllScenarios(mediaOwnerQuestions);
      } else if (userType === 'agency') {
        setAllScenarios(agencyQuestions);
      }
      // Play greeting audio only once when role-specific scenario selection is shown
      if (!isGreetingAudioPlaying && !hasPlayedGreetingForSession && AVATAR_GREETING_AUDIO_PATH) {
        console.log('[TTS Frontend - ScenarioSelection] Attempting to play greeting audio for role-specific scenarios.');
        playGreetingAudio(AVATAR_GREETING_AUDIO_PATH);
        setHasPlayedGreetingForSession(true); 
      }
    } else if (currentView === 'userTypeSelection') { // This view is being removed
      // Logic for 'userTypeSelection' view will be removed or merged.
      // For safety, we can clear scenarios if this state is ever reached, though it shouldn't be.
      setAllScenarios([]); 
      setHasPlayedGreetingForSession(false); 
    }
  }, [currentView, userType, isGreetingAudioPlaying, hasPlayedGreetingForSession]); // playGreetingAudio removed from deps

  const particlesLoaded = useCallback(async (container) => {}, []);

  const particleOptions = useMemo(() => ({
    particles: {
      number: { value: 30, density: { enable: true, value_area: 800 } },
      color: { value: ["#FFFFFF", "#5BADDE"] },
      shape: { type: "circle" },
      opacity: { value: 0.2, random: true, anim: { enable: true, speed: 0.4, opacity_min: 0.1, sync: false } },
      size: { value: { min: 1, max: 2 }, random: true },
      move: { enable: true, speed: 0.5, direction: "none", random: true, straight: false, outModes: { default: "out" }, bounce: false },
    },
    interactivity: { detect_on: "canvas", events: { onhover: { enable: false }, onclick: { enable: false }, resize: true } },
    detectRetina: true,
  }), []);

  // Function to initialize AudioContext safely on client (moved from linkedin-interlude)
  const getAudioContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!audioContextRef.current) {
        try {
          console.log('[TTS Frontend - ScenarioSelection] Attempting to create AudioContext with 24kHz sample rate.');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          console.log('[TTS Frontend - ScenarioSelection] AudioContext created. State:', audioContextRef.current.state, 'SampleRate:', audioContextRef.current.sampleRate);
        } catch (e) {
          console.error('[TTS Frontend - ScenarioSelection] Error creating AudioContext:', e);
          setTransitionAudioError("Failed to initialize audio system for transition. " + e.message);
          return null;
        }
      }
      return audioContextRef.current;
    }
    console.log('[TTS Frontend - ScenarioSelection] Window undefined, cannot create AudioContext.');
    return null;
  }, []);

  // Function to navigate after transition (new)
  const navigateToDisplayFortune = useCallback(() => {
    setIsNavigationInProgress(true);
    const storedFortuneDataString = localStorage.getItem('fortuneData');
    const storedFortuneError = localStorage.getItem('fortuneGenerationError');

    if (storedFortuneError) {
      console.error("[ScenarioSelection] Error from background fortune generation picked up before display:", storedFortuneError);
      setError(`A cosmic disturbance occurred: ${storedFortuneError}. Redirecting to start...`);
      localStorage.removeItem('fortuneGenerationError');
      localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
      setTimeout(() => router.push('/collect-info'), 5000);
      return;
    }

    if (storedFortuneDataString) {
      console.log('[ScenarioSelection] Fortune data confirmed. Proceeding to display fortune.');
      setTransitionAudioError(null);
      router.push('/display-fortune');
    } else {
      console.error('[ScenarioSelection] Fortune data NOT found before display. This is unexpected. Redirecting to start.');
      setError("Your fortune seems to have vanished. Please try again from the start.");
      localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
      setTimeout(() => router.push('/collect-info'), 4000);
    }
  }, [router, setError]);

  // playAudioFile function (moved and adapted from linkedin-interlude)
  const playAudioFile = useCallback(async (filePath, isLastInSequence = false) => {
    const audioContext = getAudioContext();
    if (!audioContext) {
      console.error('[TTS Frontend - ScenarioSelection] playAudioFile: AudioContext not available.');
      setTransitionAudioError(`Audio system not ready for transition sound: ${filePath}`);
      setIsTransitionAudioPlaying(false);
      return Promise.reject(new Error("AudioContext not available"));
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.error(`[TTS Frontend - ScenarioSelection] Error resuming AudioContext for ${filePath}:`, e);
        setTransitionAudioError(`Could not start transition audio ${filePath}. Check browser permissions.`);
        setIsTransitionAudioPlaying(false);
        return Promise.reject(e);
      }
    }

    try {
      console.log(`[TTS Frontend - ScenarioSelection] Fetching audio file: ${filePath}`);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file ${filePath} (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[TTS Frontend - ScenarioSelection] Audio file ${filePath} fetched, decoding ${arrayBuffer.byteLength} bytes...`);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log(`[TTS Frontend - ScenarioSelection] Audio file ${filePath} decoded.`);

      if (transitionAudioSourceRef.current) {
        transitionAudioSourceRef.current.stop();
        transitionAudioSourceRef.current.disconnect();
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      return new Promise((resolve, reject) => {
        source.onended = () => {
          console.log(`[TTS Frontend - ScenarioSelection] Audio playback ended for: ${filePath}`);
          transitionAudioSourceRef.current = null;
          if (isLastInSequence) {
            setIsTransitionAudioPlaying(false);
            console.log('[TTS Frontend - ScenarioSelection] Last transition audio ended, navigating to display fortune.');
            navigateToDisplayFortune();
          }
          resolve();
        };
        source.onerror = (err) => {
            console.error(`[TTS Frontend - ScenarioSelection] Error playing audio file ${filePath}:`, err);
            setTransitionAudioError(`Error playing transition sound ${filePath}.`);
            setIsTransitionAudioPlaying(false);
            transitionAudioSourceRef.current = null;
            // If the last sound in sequence errors, we should still try to navigate or offer a way forward
            if (isLastInSequence) {
              console.warn(`[TTS Frontend - ScenarioSelection] Last transition audio errored. Attempting to navigate anyway.`);
              navigateToDisplayFortune();
            }
            reject(err);
        };
        console.log(`[TTS Frontend - ScenarioSelection] Starting audio playback for: ${filePath}.`);
        source.start();
        transitionAudioSourceRef.current = source;
      });

    } catch (error) {
      console.error(`[TTS Frontend - ScenarioSelection] Error in playAudioFile for ${filePath}:`, error);
      setTransitionAudioError(`The spirits are quiet for ${filePath}: ${error.message}.`);
      setIsTransitionAudioPlaying(false);
      // If an error occurs, especially for the last sound, attempt to navigate as a fallback.
      if (isLastInSequence) {
        console.warn(`[TTS Frontend - ScenarioSelection] Error in playAudioFile processing for last sound. Attempting to navigate anyway.`);
        navigateToDisplayFortune();
      }
      return Promise.reject(error);
    }
  }, [getAudioContext, navigateToDisplayFortune]);

  // playGreetingAudio function (for avatar)
  const playGreetingAudio = useCallback(async (filePath) => {
    const audioContext = getAudioContext();
    if (!audioContext) {
      console.error('[TTS Frontend - ScenarioSelection] playGreetingAudio: AudioContext not available.');
      setGreetingAudioError(`Audio system not ready for greeting: ${filePath}`);
      setIsGreetingAudioPlaying(false);
      return;
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.error(`[TTS Frontend - ScenarioSelection] Error resuming AudioContext for greeting ${filePath}:`, e);
        setGreetingAudioError(`Could not start greeting audio ${filePath}. Check browser permissions.`);
        setIsGreetingAudioPlaying(false);
        return;
      }
    }

    setIsGreetingAudioPlaying(true);
    setGreetingAudioError(null);

    try {
      console.log(`[TTS Frontend - ScenarioSelection] Fetching greeting audio file: ${filePath}`);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch greeting audio file ${filePath} (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (greetingAudioSourceRef.current) {
        greetingAudioSourceRef.current.stop();
        greetingAudioSourceRef.current.disconnect();
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        console.log(`[TTS Frontend - ScenarioSelection] Greeting audio playback ended for: ${filePath}`);
        greetingAudioSourceRef.current = null;
        setIsGreetingAudioPlaying(false);
      };
      source.onerror = (err) => {
          console.error(`[TTS Frontend - ScenarioSelection] Error playing greeting audio file ${filePath}:`, err);
          setGreetingAudioError(`Error playing greeting sound ${filePath}.`);
          setIsGreetingAudioPlaying(false);
          greetingAudioSourceRef.current = null;
      };
      
      console.log(`[TTS Frontend - ScenarioSelection] Starting greeting audio playback for: ${filePath}.`);
      source.start();
      greetingAudioSourceRef.current = source;

    } catch (error) {
      console.error(`[TTS Frontend - ScenarioSelection] Error in playGreetingAudio for ${filePath}:`, error);
      setGreetingAudioError(`The spirits are quiet for greeting ${filePath}: ${error.message}.`);
      setIsGreetingAudioPlaying(false);
    }
  }, [getAudioContext]);

  // playTransitionSequence function (moved and adapted from linkedin-interlude)
  const playTransitionSequence = useCallback(async () => {
    console.log('[TTS Frontend - ScenarioSelection] Starting transition audio sequence.');
    setIsTransitionAudioPlaying(true);
    setTransitionAudioError(null);

    try {
      await playAudioFile(TRANSITION_VOICE_PATH, false);
      console.log('[TTS Frontend - ScenarioSelection] Transition voice finished, playing shimmer.');
      await playAudioFile(TRANSITION_SHIMMER_PATH, true);
      console.log('[TTS Frontend - ScenarioSelection] Transition shimmer finished (or initiated navigation).');
    } catch (error) {
      console.error('[TTS Frontend - ScenarioSelection] Error during transition audio sequence:', error);
      // Error state is set by playAudioFile. setIsTransitionAudioPlaying(false) is also handled there.
      // Fallback: if sequence fails, attempt to proceed.
      setIsTransitionAudioPlaying(false); // Ensure this is reset
      console.warn('[TTS Frontend - ScenarioSelection] Transition audio sequence failed. Attempting to proceed to display fortune anyway.');
      navigateToDisplayFortune();
    }
  }, [playAudioFile, navigateToDisplayFortune]);

  const handleScenarioToggle = (scenarioId) => {
    setSelectedScenarioIds(prevSelected => {
      if (prevSelected.includes(scenarioId)) {
        return prevSelected.filter(id => id !== scenarioId);
      }
      // For roleSpecificScenarioSelection, MAX_SELECTIONS applies to that step's own list.
      // For initialAndUserTypeSelection, MAX_SELECTIONS applies to the general scenarios.
      if (prevSelected.length < MAX_SELECTIONS) {
        return [...prevSelected, scenarioId];
      }
      console.warn(`Cannot select more than ${MAX_SELECTIONS} scenarios for this step.`);
      return prevSelected;
    });
  };

  const handleProceedFromInitialAndUserType = () => {
    if (!userType) {
      setError('Please select your role (Media Owner or Agency).');
      return;
    }
    if (selectedScenarioIds.length !== MAX_SELECTIONS) {
      setError(`Please select exactly ${MAX_SELECTIONS} general scenarios to proceed.`);
      return;
    }
    setInitialSelections(selectedScenarioIds);
    // User type is already set via handleUserTypeSelect on this view
    setCurrentView('roleSpecificScenarioSelection');
    setError(null);
  };

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    // If they change user type, and error was about scenario selection, clear it,
    // as they might now be able to proceed if scenarios were already selected.
    if (error && error.includes("general scenarios")) {
        // Don't clear error if it was about selecting role.
    } else {
        setError(null);
    }
  };

  const handleProceedToFortune = async () => {
    if (selectedScenarioIds.length !== MAX_SELECTIONS) {
      setError(`Please select exactly ${MAX_SELECTIONS} ${userType === 'mediaOwner' ? 'Media Owner' : 'Agency'} scenarios.`);
      return;
    }
    setError(null);
    
    const finalSelectedScenarioIds = [...initialSelections, ...selectedScenarioIds];
    localStorage.setItem('selectedScenarioIDs', JSON.stringify(finalSelectedScenarioIds));
    console.log('[ScenarioSelection] Final selections (initial + role-specific):', finalSelectedScenarioIds);

    const isLinkedInFlow = !!localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);

    if (isLinkedInFlow) {
      // For LinkedIn flow, fortuneData should already be in localStorage from the interlude's background fetch.
      localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
    } else {
      // For Manual flow, fortune should already be generated by generating-fortune page.
    }
    console.log('[ScenarioSelection] Proceed clicked. Initiating transition sequence.');
    await playTransitionSequence();
  };

  const handleBack = () => {
    setError(null);
    setTransitionAudioError(null);
    if (currentView === 'roleSpecificScenarioSelection') {
      // Go back to the combined initial and user type selection screen
      setCurrentView('initialAndUserTypeSelection');
      // setUserType(null); // Keep userType, they might just want to change initial scenarios
      setSelectedScenarioIds(initialSelections); // Restore initial selections for editing
      // Stop greeting audio if playing when going back from role-specific questions
        if (greetingAudioSourceRef.current) {
            greetingAudioSourceRef.current.stop();
            greetingAudioSourceRef.current.disconnect();
            greetingAudioSourceRef.current = null;
            setIsGreetingAudioPlaying(false);
        }
        setHasPlayedGreetingForSession(false); // Allow greeting to play again if they pick a role and proceed
    } else if (currentView === 'initialAndUserTypeSelection') {
      // Already on the first screen of this page, so navigate to previous page
      router.push('/collect-info');
    }
  };

  // useEffect for cleanup
  useEffect(() => {
    return () => {
      if (transitionAudioSourceRef.current) {
        console.log('[TTS Frontend - ScenarioSelection] Cleanup: Stopping transition audio source.');
        transitionAudioSourceRef.current.stop();
        transitionAudioSourceRef.current.disconnect();
        transitionAudioSourceRef.current = null;
      }
      // Cleanup for greeting audio
      if (greetingAudioSourceRef.current) {
        console.log('[TTS Frontend - ScenarioSelection] Cleanup: Stopping greeting audio source.');
        greetingAudioSourceRef.current.stop();
        greetingAudioSourceRef.current.disconnect();
        greetingAudioSourceRef.current = null;
      }
    };
  }, []);

  if (!init) { // Simplified initial loader
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p>Summoning the Oracle...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate">
      {init && Particles && (
        <Particles
          id="tsparticles-scenario-selection"
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
      )}
      {/* Always show a back button unless on the first step of this page and going to /collect-info */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
        onClick={handleBack}
        title={currentView === 'initialAndUserTypeSelection' ? "Back to Information Collection" : "Go Back"}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      {/* Conditional Rendering based on currentView */}
      
      {/* View 1: Combined Initial Scenario and User Type Selection */}
      {currentView === 'initialAndUserTypeSelection' && !isNavigationInProgress && (
        <main className="w-full flex flex-row items-start justify-center gap-8 z-10 my-12 px-4 sm:px-0">
          {/* Avatar - positioned to the left */}
          {!isTransitionAudioPlaying && (
            <div 
              className="z-20 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 self-center hidden lg:block pt-16" // Adjusted padding/margin as needed
              title="The Oracle awaits..."
            >
              <Image 
                src="/avatar/genie-pointing-left.png" 
                alt="Fortune Teller Avatar"
                width={250} // Restored original size or adjust as preferred
                height={375}
                className={`drop-shadow-xl ${isGreetingAudioPlaying ? 'animate-pulse' : ''}`} 
              />
            </div>
          )}
          <div className="w-full max-w-3xl"> {/* This div now sits to the right of the avatar */}
            <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
              <CardHeader className="text-center pt-6 sm:pt-8">
                <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
                  Chart Your Course
                </CardTitle>
                <p className="text-mw-white/70 text-sm mt-2">
                  First, tell us who you are, then choose two initial paths that resonate most.
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
                {error && (
                    <div className="mb-6 p-3 text-center text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        {error}
                    </div>
                )}

                {/* User Type Selection - Integrated */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-mw-light-blue mb-3 text-center">I am a...</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleUserTypeSelect('mediaOwner')}
                      variant={userType === 'mediaOwner' ? 'default' : 'outline'}
                      className={`w-full text-base py-6 border-2 group
                                  ${userType === 'mediaOwner' 
                                    ? 'bg-mw-gold text-mw-dark-navy border-mw-gold font-semibold shadow-lg opacity-100'
                                    : 'border-mw-light-blue/50 text-mw-white hover:border-mw-gold hover:bg-mw-light-blue/10'} 
                                  transition-all duration-200`}
                    >
                      <Building className={`mr-2 h-6 w-6 ${userType === 'mediaOwner' ? 'text-mw-dark-navy' : 'text-mw-light-blue group-hover:text-mw-gold'} transition-colors`} />
                      Media Owner
                    </Button>
                    <Button
                      onClick={() => handleUserTypeSelect('agency')}
                      variant={userType === 'agency' ? 'default' : 'outline'}
                      className={`w-full text-base py-6 border-2 group
                                  ${userType === 'agency' 
                                    ? 'bg-mw-gold text-mw-dark-navy border-mw-gold font-semibold shadow-lg opacity-100'
                                    : 'border-mw-light-blue/50 text-mw-white hover:border-mw-gold hover:bg-mw-light-blue/10'} 
                                  transition-all duration-200`}
                    >
                      <Users className={`mr-2 h-6 w-6 ${userType === 'agency' ? 'text-mw-dark-navy' : 'text-mw-light-blue group-hover:text-mw-gold'} transition-colors`} />
                      Agency Representative
                    </Button>
                  </div>
                </div>

                {/* Initial Scenario Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-mw-light-blue mb-3 text-center">My Initial Questions...</h3>
                  {allScenarios.length > 0 ? (
                    <div className="space-y-3">
                      {allScenarios.map((scenario) => {
                        const isSelected = selectedScenarioIds.includes(scenario.id);
                        return (
                          <div
                            key={scenario.id}
                            onClick={() => handleScenarioToggle(scenario.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ease-in-out 
                                        flex items-center space-x-3
                                        ${isSelected 
                                          ? 'bg-mw-light-blue/20 border-mw-light-blue shadow-md' 
                                          : 'bg-mw-dark-blue/30 border-mw-light-blue/30 hover:bg-mw-light-blue/10'}
                                    `}
                          >
                            {isSelected ? 
                              <CheckSquare className="h-5 w-5 text-mw-gold flex-shrink-0" /> : 
                              <Square className="h-5 w-5 text-mw-white/50 flex-shrink-0" />
                            }
                            <span className={`text-sm ${isSelected ? 'text-mw-white font-medium' : 'text-mw-white/80'}`}>
                              {scenario.displayText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[150px]">
                      <Loader2 className="h-8 w-8 animate-spin text-mw-light-blue mb-3" />
                      <p className="text-center text-mw-white/70">Loading initial questions...</p>
                    </div>
                  )}
                </div>
              </CardContent>
              {allScenarios.length > 0 && (
                <CardFooter className="pt-4 pb-6 sm:pb-8 flex justify-center">
                  <Button
                    onClick={handleProceedFromInitialAndUserType}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-md transform transition-all duration-150 hover:shadow-xl active:scale-95"
                    disabled={!userType || selectedScenarioIds.length !== MAX_SELECTIONS}
                  >
                    {`Next (${selectedScenarioIds.length}/${MAX_SELECTIONS} Questions Selected)`}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </main>
      )}

      {/* View 2: User Type Selection - THIS VIEW IS NOW REMOVED / MERGED */}
      {/* {currentView === 'userTypeSelection' && !isNavigationInProgress && ( ... )} */}
      
      {/* View 3: Role Specific Scenario Selection (remains largely the same, but back button logic and entry point changes) */}
      {currentView === 'roleSpecificScenarioSelection' && !isNavigationInProgress && (
        <main className="w-full flex flex-row items-start justify-center gap-8 z-10 my-12 px-4 sm:px-0">
          {!isTransitionAudioPlaying && (
            <div 
              className="z-20 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 self-center hidden lg:block pt-16"
              onClick={() => {
                if (!isGreetingAudioPlaying && AVATAR_GREETING_AUDIO_PATH) {
                  playGreetingAudio(AVATAR_GREETING_AUDIO_PATH);
                } else {
                  console.log('[TTS Frontend - ScenarioSelection] Greeting audio already playing or action pending.');
                }
              }}
              title="Hear a greeting"
            >
              <Image 
                src="/avatar/genie-pointing-left.png" 
                alt="Fortune Teller Avatar"
                width={250}
                height={375}
                className={`drop-shadow-xl ${isGreetingAudioPlaying ? 'animate-pulse' : ''}`}
              />
            </div>
          )}

          <div className="w-full max-w-3xl">
            <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
              <CardHeader className="text-center pt-6 sm:pt-8">
                <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
                  {userType === 'mediaOwner' ? "Media Owner Challenges" : "Agency Ambitions"}
                </CardTitle>
                <p className="text-mw-white/70 text-sm mt-2">
                  Your previous choices have guided us here. Now, select exactly {MAX_SELECTIONS} areas you wish to illuminate further.
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
                {error && !isTransitionAudioPlaying && (
                    <div className="mb-4 p-3 text-center text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        {error}
                    </div>
                )}
                {transitionAudioError && (
                  <div className="mb-4 p-3 text-center text-orange-400 bg-orange-900/30 border border-orange-500/50 rounded-md">
                    <p className="font-semibold">Transition Disrupted:</p>
                    <p>{transitionAudioError}</p>
                    <Button variant="link" onClick={navigateToDisplayFortune} className="text-mw-light-blue hover:text-mw-gold mt-1">
                        Attempt to Proceed Anyway?
                    </Button>
                  </div>
                )}
                {allScenarios.length > 0 ? (
                  <div className="space-y-4">
                    {allScenarios.map((scenario) => {
                      const isSelected = selectedScenarioIds.includes(scenario.id);
                      return (
                        <div
                          key={scenario.id}
                          onClick={() => handleScenarioToggle(scenario.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ease-in-out 
                                      flex items-center space-x-3 
                                      ${isSelected 
                                        ? 'bg-mw-light-blue/20 border-mw-light-blue shadow-lg' 
                                        : 'bg-mw-dark-blue/30 border-mw-light-blue/30 hover:bg-mw-light-blue/10'}
                                  `}
                        >
                          {isSelected ? 
                            <CheckSquare className="h-6 w-6 text-mw-gold flex-shrink-0" /> : 
                            <Square className="h-6 w-6 text-mw-white/50 flex-shrink-0" />
                          }
                          <span className={`text-base ${isSelected ? 'text-mw-white font-semibold' : 'text-mw-white/80'}`}>
                            {scenario.displayText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !error && 
                  <div className="flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-mw-light-blue mb-3" />
                    <p className="text-center text-mw-white/70">Loading {userType === 'mediaOwner' ? 'Media Owner' : 'Agency'} questions...</p>
                  </div>
                )}
              </CardContent>
              {allScenarios.length > 0 && (
                <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
                  <Button
                    onClick={handleProceedToFortune}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold \
                               bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] \
                               text-mw-dark-navy \
                               hover:opacity-90 \
                               rounded-lg shadow-md transform transition-all duration-150 \
                               hover:shadow-xl active:scale-95"
                    disabled={selectedScenarioIds.length !== MAX_SELECTIONS || isTransitionAudioPlaying}
                  >
                    {isTransitionAudioPlaying ? 
                      <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> The Veil Thins...</> :
                      `Reveal My Fortune (${selectedScenarioIds.length}/${MAX_SELECTIONS} Selected)`
                    }
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </main>
      )}

      {/* Greeting Audio Error Display - position might need adjustment based on new layout */}
      {greetingAudioError && (
        <div className="fixed bottom-8 left-8 z-30 p-3 text-xs text-orange-300 bg-orange-800/70 border border-orange-600/50 rounded-md max-w-xs">
          <p className="font-semibold">Oracle&apos;s Whisper Faltered:</p>
          <p>{greetingAudioError}</p>
        </div>
      )}

      {/* Transition Audio Animation Overlay (moved from linkedin-interlude) */}
      <AnimatePresence>
        {!error && isTransitionAudioPlaying && !transitionAudioError && (
          <motion.div
            key="transitionAudioVeilScenario"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.7, ease: "circOut" } }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.5, ease: "circIn" } }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-mw-dark-navy/90 backdrop-blur-md text-mw-white p-4 isolate z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="flex flex-col items-center text-center"
            >
              <Image
                src="/avatar/fortune-teller-eyes-glow.png"
                alt="Mystical Eyes"
                width={300}
                height={225}
                className="mb-6"
                priority
              />
              <p className="text-3xl font-caveat text-mw-light-blue animate-pulse">
                The veil between worlds grows thin...
              </p>
              <p className="text-lg text-mw-white/80 mt-3">
                Listen closely...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 