'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Kept for /collect-info navigation
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CheckSquare, Square, Loader2, ArrowLeft, Users, Building, Combine } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
// Scenarios data is imported directly, adjust path if necessary if this file moves deeper
// For now, assuming components.json maps @/* correctly relative to this new location.
import scenariosData from '@/lib/predefined_scenarios.json';
import { motion, AnimatePresence } from 'framer-motion';
import personaQuestions from '@/lib/persona_questions.json';

const MAX_SELECTIONS = 2;
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

// Define audio file paths
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

const personaKeys = ['publisher', 'advertiser', 'platform'];

const personaDisplayNames = {
  publisher: 'Publisher',
  advertiser: 'Advertiser',
  platform: 'Platform / Service Provider',
};

export default function ScenarioSelection({ 
  onScenariosConfirmed,
  onBack,
  questionType = 'high',
  persona = null,
  title = "Chart Your Course",
  subtitle = `Choose exactly ${MAX_SELECTIONS} questions that resonate most.`,
  ctaLabel = "Reveal My Blueprint"
}) {
  const router = useRouter(); // Still used for navigating back to /collect-info
  const [init, setInit] = useState(false);
  const [allScenarios, setAllScenarios] = useState([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [lockedPersona, setLockedPersona] = useState(persona);
  const [error, setError] = useState(null);
  // const [isNavigationInProgress, setIsNavigationInProgress] = useState(false); // Managed by parent

  const [currentView, setCurrentView] = useState('initialAndUserTypeSelection');
  const [userType, setUserType] = useState(null);
  const [initialSelections, setInitialSelections] = useState([]);
  const [hasPlayedGreetingForSession, setHasPlayedGreetingForSession] = useState(false);

  const [isTransitionAudioPlaying, setIsTransitionAudioPlaying] = useState(false);
  const [transitionAudioError, setTransitionAudioError] = useState(null);
  const audioContextRef = useRef(null);
  const transitionAudioSourceRef = useRef(null);

  const [isGreetingAudioPlaying, setIsGreetingAudioPlaying] = useState(false);
  const [greetingAudioError, setGreetingAudioError] = useState(null);
  const greetingAudioSourceRef = useRef(null);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  useEffect(() => {
    setError(null);
    setSelectedScenarioIds([]);

    if (currentView === 'initialAndUserTypeSelection') {
      setAllScenarios(initialGeneralScenarios);
      setHasPlayedGreetingForSession(false);
    } else if (currentView === 'roleSpecificScenarioSelection' && userType) {
      if (userType === 'mediaOwner') {
        setAllScenarios(mediaOwnerQuestions);
      } else if (userType === 'agency') {
        setAllScenarios(agencyQuestions);
      }
      if (!isGreetingAudioPlaying && !hasPlayedGreetingForSession && AVATAR_GREETING_AUDIO_PATH) {
        playGreetingAudio(AVATAR_GREETING_AUDIO_PATH);
        setHasPlayedGreetingForSession(true);
      }
    } else if (currentView === 'userTypeSelection') {
      setAllScenarios([]);
      setHasPlayedGreetingForSession(false);
    }
  }, [currentView, userType, isGreetingAudioPlaying, hasPlayedGreetingForSession]); // playGreetingAudio removed

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

    const getAudioContext = useCallback(() => {
      if (typeof window !== 'undefined') {
        if (!audioContextRef.current) {
          try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          } catch (e) {
            setTransitionAudioError("Failed to initialize audio system for transition. " + e.message);
            return null;
          }
        }
        return audioContextRef.current;
      }
      return null;
    }, []);
    
    // navigateToDisplayFortune is removed as parent handles view change.
    // The parent will set its own error states if needed post-confirmation.

    const playAudioFile = useCallback(async (filePath, isLastInSequence = false, onAudioEndCallback) => {
      const audioContext = getAudioContext();
      if (!audioContext) {
        setTransitionAudioError(`Audio system not ready for transition sound: ${filePath}`);
        setIsTransitionAudioPlaying(false);
        if (onAudioEndCallback) onAudioEndCallback(new Error("AudioContext not available"));
        return Promise.reject(new Error("AudioContext not available"));
      }

      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (e) {
          setTransitionAudioError(`Could not start transition audio ${filePath}. Check browser permissions.`);
          setIsTransitionAudioPlaying(false);
          if (onAudioEndCallback) onAudioEndCallback(e);
          return Promise.reject(e);
        }
      }

      try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to fetch audio file ${filePath} (${response.status})`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        if (transitionAudioSourceRef.current) {
          transitionAudioSourceRef.current.stop();
          transitionAudioSourceRef.current.disconnect();
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        return new Promise((resolve, reject) => {
          source.onended = () => {
            transitionAudioSourceRef.current = null;
            if (isLastInSequence) {
              setIsTransitionAudioPlaying(false);
            }
            if(onAudioEndCallback) onAudioEndCallback(null); // Signal success or completion to callback
            resolve();
          };
          source.onerror = (err) => {
              setTransitionAudioError(`Error playing transition sound ${filePath}.`);
              setIsTransitionAudioPlaying(false);
              transitionAudioSourceRef.current = null;
              if(onAudioEndCallback) onAudioEndCallback(err); // Signal error to callback
              reject(err);
          };
          source.start();
          transitionAudioSourceRef.current = source;
        });

      } catch (error) {
        setTransitionAudioError(`The spirits are quiet for ${filePath}: ${error.message}.`);
        setIsTransitionAudioPlaying(false);
        if (onAudioEndCallback) onAudioEndCallback(error);
        return Promise.reject(error);
      }
    }, [getAudioContext]);

    const playGreetingAudio = useCallback(async (filePath) => {
      const audioContext = getAudioContext();
      if (!audioContext) {
        setGreetingAudioError(`Audio system not ready for greeting: ${filePath}`);
        setIsGreetingAudioPlaying(false);
        return;
      }

      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (e) {
          setGreetingAudioError(`Could not start greeting audio ${filePath}. Check browser permissions.`);
          setIsGreetingAudioPlaying(false);
          return;
        }
      }

      setIsGreetingAudioPlaying(true);
      setGreetingAudioError(null);

      try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to fetch greeting audio file ${filePath} (${response.status})`);
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
          greetingAudioSourceRef.current = null;
          setIsGreetingAudioPlaying(false);
        };
        source.onerror = (err) => {
            setGreetingAudioError(`Error playing greeting sound ${filePath}.`);
            setIsGreetingAudioPlaying(false);
            greetingAudioSourceRef.current = null;
        };
        source.start();
        greetingAudioSourceRef.current = source;

      } catch (error) {
        setGreetingAudioError(`The spirits are quiet for greeting ${filePath}: ${error.message}.`);
        setIsGreetingAudioPlaying(false);
      }
    }, [getAudioContext]);

    const playTransitionSequence = useCallback(async (callbackOnCompletion) => {
      console.log('[ScenarioSelection] Starting transition audio sequence (internal to component).');
      setIsTransitionAudioPlaying(true);
      setTransitionAudioError(null);
  
      try {
        await playAudioFile(TRANSITION_VOICE_PATH, false, null); // No specific action on voice end needed here
        console.log('[ScenarioSelection] Transition voice finished, playing shimmer.');
        await playAudioFile(TRANSITION_SHIMMER_PATH, true, (error) => {
            // This callback is from the *last* audio file in sequence.
            setIsTransitionAudioPlaying(false); // Ensure this is reset
            if (error) {
                console.error('[ScenarioSelection] Error during shimmer sound:', error);
                // Error state is set by playAudioFile.
            }
            // Signal completion (with or without error) to the main handler
            if (callbackOnCompletion) callbackOnCompletion(error);
        });
        console.log('[ScenarioSelection] Transition shimmer finished (or initiated callback).');
      } catch (error) {
        console.error('[ScenarioSelection] Error during transition audio sequence:', error);
        setIsTransitionAudioPlaying(false); // Ensure this is reset
        if (callbackOnCompletion) callbackOnCompletion(error); // Signal completion with error
      }
    }, [playAudioFile]);

    const handleScenarioToggle = (scenarioId) => {
      // This logic only applies to the high-level selection stage
      if (questionType === 'high') {
        const getPersonaFromId = (id) => {
          if (id.startsWith('pub_')) return 'publisher';
          if (id.startsWith('adv_')) return 'advertiser';
          if (id.startsWith('plat_')) return 'platform';
          return null;
        };
        const clickedPersona = getPersonaFromId(scenarioId);

        setSelectedScenarioIds(prevSelected => {
          const isAlreadySelected = prevSelected.includes(scenarioId);
          if (isAlreadySelected) {
            const newSelection = prevSelected.filter(id => id !== scenarioId);
            if (newSelection.length === 0) setLockedPersona(null);
            return newSelection;
          }
          if (lockedPersona && lockedPersona !== clickedPersona) return prevSelected;
          if (prevSelected.length < MAX_SELECTIONS) {
            if (prevSelected.length === 0) setLockedPersona(clickedPersona);
            return [...prevSelected, scenarioId];
          }
          return prevSelected;
        });
      } else {
        // Simpler logic for tactical stage where persona is already locked
      setSelectedScenarioIds(prevSelected => {
        if (prevSelected.includes(scenarioId)) {
          return prevSelected.filter(id => id !== scenarioId);
        }
        if (prevSelected.length < MAX_SELECTIONS) {
          return [...prevSelected, scenarioId];
        }
        return prevSelected;
      });
      }
    };

    const handleConfirmSelections = async () => {
      if (selectedScenarioIds.length !== MAX_SELECTIONS) {
        setError(`Please select exactly ${MAX_SELECTIONS} questions.`);
        return;
      }
      setError(null);
      
      await playTransitionSequence((transitionError) => {
        const payload = { 
          scenarios: selectedScenarioIds,
          persona: lockedPersona || persona
        };
        if (transitionError) {
          console.warn('[ScenarioSelection] Transition audio failed, but proceeding.', transitionError);
        }
        onScenariosConfirmed(payload);
      });
    };

    const handleUserTypeSelect = (type) => {
      setUserType(type);
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
      
      // Stop greeting audio if it's playing
      if (greetingAudioSourceRef.current) {
        greetingAudioSourceRef.current.stop();
        greetingAudioSourceRef.current.disconnect();
        greetingAudioSourceRef.current = null;
        setIsGreetingAudioPlaying(false); // Ensure state is updated
        console.log('[ScenarioSelection] Greeting audio stopped before proceeding to fortune.');
      }

      const finalSelectedScenarioIds = [...initialSelections, ...selectedScenarioIds];
      localStorage.setItem('selectedScenarioIDs', JSON.stringify(finalSelectedScenarioIds));
      console.log('[ScenarioSelection] Final selections:', finalSelectedScenarioIds);

      // For LinkedIn flow, fortuneData should already be in localStorage.
      // For Manual flow, fortune should also be in localStorage from generating-fortune page.
      // The PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY logic is for the interlude page.
      // If this key exists, it might indicate a specific flow, but the main thing is fortuneData.
      if (localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY)) {
         localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
      }
      
      // Play transition sequence, then call onScenariosConfirmed
      await playTransitionSequence((transitionError) => {
        if (transitionError) {
            console.warn('[ScenarioSelection] Transition audio sequence failed. Proceeding to confirm scenarios anyway with error info.');
            // Potentially set an error state that the parent could also observe or pass the error
            // For now, we call onScenariosConfirmed, parent should be robust.
            onScenariosConfirmed({ scenarios: finalSelectedScenarioIds, transitionError: transitionError.message });
        } else {
            console.log('[ScenarioSelection] Transition sequence complete. Confirming scenarios.');
            onScenariosConfirmed({ scenarios: finalSelectedScenarioIds });
        }
      });
    };

    const handleBack = () => {
      setError(null);
      setTransitionAudioError(null);
      if (currentView === 'roleSpecificScenarioSelection') {
        setCurrentView('initialAndUserTypeSelection');
        setSelectedScenarioIds(initialSelections);
          if (greetingAudioSourceRef.current) {
              greetingAudioSourceRef.current.stop();
              greetingAudioSourceRef.current.disconnect();
              greetingAudioSourceRef.current = null;
              setIsGreetingAudioPlaying(false);
          }
          setHasPlayedGreetingForSession(false);
      } else if (currentView === 'initialAndUserTypeSelection') {
        // Stop greeting audio if it was somehow playing, though less likely here.
        if (greetingAudioSourceRef.current) {
            greetingAudioSourceRef.current.stop();
            greetingAudioSourceRef.current.disconnect();
            greetingAudioSourceRef.current = null;
            setIsGreetingAudioPlaying(false);
        }
        router.push('/collect-info'); // Navigate to a page outside this component's flow
      }
      setSelectedScenarioIds([]);
      setLockedPersona(null);
    };

    useEffect(() => {
      return () => {
        if (transitionAudioSourceRef.current) {
          transitionAudioSourceRef.current.stop();
          transitionAudioSourceRef.current.disconnect();
          transitionAudioSourceRef.current = null;
        }
        if (greetingAudioSourceRef.current) {
          greetingAudioSourceRef.current.stop();
          greetingAudioSourceRef.current.disconnect();
          greetingAudioSourceRef.current = null;
        }
      };
    }, []);

  if (!init) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p>Summoning the Oracle...</p>
      </div>
    );
  }

  return (
    // The main div structure remains the same as the original page.js
    // Only router.push to display-fortune is replaced by onScenariosConfirmed prop call.
    // isNavigationInProgress is removed from conditions as parent manages view.
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate">
      {init && Particles && (
        <Particles
          id="tsparticles-scenario-selection-component" // Changed ID to avoid conflict if old page is still around
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
      )}
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
      
      {currentView === 'initialAndUserTypeSelection' && (
        <main className="w-full flex flex-row items-start justify-center gap-8 z-10 my-12 px-4 sm:px-0">
          {!isTransitionAudioPlaying && (
            <div 
              className="z-20 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 self-center hidden lg:block pt-16"
              title="Select questions"
            >
              <Image 
                src="/avatar/genie-pointing-left.png" 
                alt="Fortune Teller Avatar pointing left"
                width={250}
                height={375}
                className="drop-shadow-xl" 
              />
            </div>
          )}
          <div className="w-full max-w-6xl">
            <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
              <CardHeader className="text-center pt-6 sm:pt-8">
                <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
                  {title}
                </CardTitle>
                <p className="text-mw-white/70 text-sm mt-2">
                  {subtitle}
                </p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
                {error && (
                    <div className="mb-6 p-3 text-center text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {personaKeys.map((personaKey) => {
                    const isLocked = lockedPersona && lockedPersona !== personaKey;
                    return (
                      <div 
                        key={personaKey} 
                        className={`transition-opacity duration-300 ${isLocked ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}
                    >
                        <h3 className="text-2xl font-bold text-mw-gold mb-4 text-center sm:text-left">
                          {personaDisplayNames[personaKey]}
                        </h3>
                        <div className="bg-mw-dark-blue/40 border border-mw-light-blue/30 rounded-lg p-4 h-full">
                    <div className="space-y-3">
                            {personaQuestions[personaKey][questionType].map((scenario) => {
                        const isSelected = selectedScenarioIds.includes(scenario.id);
                        return (
                          <div
                            key={scenario.id}
                            onClick={() => handleScenarioToggle(scenario.id)}
                                  className={`flex items-start space-x-2 cursor-pointer rounded-md p-3 transition-all duration-200 border 
                                        ${isSelected 
                                                ? 'bg-mw-light-blue/30 border-mw-light-blue shadow-lg' 
                                                : 'bg-mw-dark-blue/20 border-transparent hover:border-mw-light-blue/50 hover:bg-mw-light-blue/10'}`}
                          >
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-mw-gold flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="h-5 w-5 text-mw-white/50 flex-shrink-0 mt-0.5" />
                                  )}
                                  <span className={`text-base md:text-lg leading-snug break-words ${isSelected ? 'text-mw-white font-semibold' : 'text-mw-white/80'}`}> 
                                    {scenario.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                        </div>
                    </div>
                    );
                  })}
                </div>
              </CardContent>
                <CardFooter className="pt-4 pb-6 sm:pb-8 flex justify-center">
                  <Button
                  onClick={handleConfirmSelections}
                    size="lg"
                    className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-md transform transition-all duration-150 hover:shadow-xl active:scale-95"
                  disabled={selectedScenarioIds.length !== MAX_SELECTIONS || isTransitionAudioPlaying}
                  >
                  {isTransitionAudioPlaying ? (
                    <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> The Veil Thins...</>
                  ) : (
                    ctaLabel
                  )}
                  </Button>
                </CardFooter>
            </Card>
          </div>
        </main>
      )}
      
      {currentView === 'roleSpecificScenarioSelection' && (
        <main className="w-full flex flex-row items-start justify-center gap-8 z-10 my-12 px-4 sm:px-0">
          {!isTransitionAudioPlaying && (
            <div 
              className="z-20 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 self-center hidden lg:block pt-16"
              onClick={() => {
                if (!isGreetingAudioPlaying && AVATAR_GREETING_AUDIO_PATH) {
                  playGreetingAudio(AVATAR_GREETING_AUDIO_PATH);
                }
              }}
              title="Hear a greeting"
            >
              <Image 
                src="/avatar/genie-pointing-left.png" 
                alt="Fortune Teller Avatar pointing left"
                width={250}
                height={375}
                className={`drop-shadow-xl ${isGreetingAudioPlaying ? 'animate-pulse' : ''}`}
              />
            </div>
          )}

          <div className="w-full max-w-6xl">
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

      {greetingAudioError && (
        <div className="fixed bottom-8 left-8 z-30 p-3 text-xs text-orange-300 bg-orange-800/70 border border-orange-600/50 rounded-md max-w-xs">
          <p className="font-semibold">Oracle&apos;s Whisper Faltered:</p>
          <p>{greetingAudioError}</p>
        </div>
      )}

      <AnimatePresence>
        {!error && isTransitionAudioPlaying && !transitionAudioError && (
          <motion.div
            key="transitionAudioVeilScenarioComponent"
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
                alt="Mystical glowing eyes of the fortune teller"
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