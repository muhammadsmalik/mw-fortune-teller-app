'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CheckSquare, Square, Loader2 } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import scenariosData from '@/lib/predefined_scenarios.json'; // Importing the JSON directly
import { motion, AnimatePresence } from 'framer-motion';

const MAX_SELECTIONS = 2;
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

// Define audio file paths (moved from linkedin-interlude)
const TRANSITION_VOICE_PATH = '/audio/transition_audio.mp3';
const TRANSITION_SHIMMER_PATH = '/audio/shimmer-glass.mp3';
const AVATAR_GREETING_AUDIO_PATH = '/audio/5-questions.mp3';

export default function ScenarioSelectionScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [allScenarios, setAllScenarios] = useState([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [error, setError] = useState(null);

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

  // Load scenarios from imported JSON
  useEffect(() => {
    if (scenariosData && Array.isArray(scenariosData)) {
      setAllScenarios(scenariosData.map(s => ({ id: s.id, displayText: s.displayText })));
    } else {
      console.error("Failed to load scenarios data or data is not in expected format.");
      setError("Could not load scenarios. Please try refreshing the page.");
    }
  }, []);

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
      if (prevSelected.length < MAX_SELECTIONS) {
        return [...prevSelected, scenarioId];
      }
      console.warn(`Cannot select more than ${MAX_SELECTIONS} scenarios.`);
      return prevSelected;
    });
  };

  const handleProceed = async () => {
    if (selectedScenarioIds.length !== MAX_SELECTIONS) {
      setError(`Please select exactly ${MAX_SELECTIONS} scenarios to proceed.`);
      return;
    }
    setError(null);
    localStorage.setItem('selectedScenarioIDs', JSON.stringify(selectedScenarioIds));
    
    const isLinkedInFlow = !!localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);

    if (isLinkedInFlow) {
      // For LinkedIn flow, fortuneData should already be in localStorage from the interlude's background fetch.
      localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
    } else {
      // For Manual flow, we still need to generate the main fortune.
      // This path will also go through transition now.
    }
    console.log('[ScenarioSelection] Proceed clicked. Initiating transition sequence.');
    await playTransitionSequence();
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

  if (!init || allScenarios.length === 0 && !error) { // Wait for particles and scenarios to load
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p>Loading Scenarios...</p>
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
      <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
         <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
         <span className="font-semibold">Moving Walls</span>
       </div>

      {/* New main container for Avatar and Card */}
      <main className="w-full flex flex-row items-center justify-center gap-8 z-10 my-12 px-4 sm:px-0">
        {/* Avatar Image - Now to the left of the card */}
        {!isTransitionAudioPlaying && (
          <div 
            className="z-20 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 self-center hidden lg:block" // hidden on smaller screens, adjust as needed
            onClick={() => {
              if (!isGreetingAudioPlaying) {
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
              width={250} // Increased size
              height={375} // Increased size, adjust aspect ratio if needed
              className={`drop-shadow-xl ${isGreetingAudioPlaying ? 'animate-pulse' : ''}`}
            />
          </div>
        )}

        {/* Card container - keeping its original max-width and styling */}
        <div className="w-full max-w-3xl">
          <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
            <CardHeader className="text-center pt-6 sm:pt-8">
              <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
                Choose Two Scenarios to Explore
              </CardTitle>
              <p className="text-mw-white/70 text-sm mt-2">
                Select exactly {MAX_SELECTIONS} scenarios that resonate most with your current business focus.
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
                !error && <p className="text-center text-mw-white/70">Loading scenarios...</p>
              )}
            </CardContent>
            {allScenarios.length > 0 && (
              <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
                <Button
                  onClick={handleProceed}
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
                    `Proceed with ${selectedScenarioIds.length}/${MAX_SELECTIONS} Selected`
                  }
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>

      {/* Greeting Audio Error Display - position might need adjustment based on new layout */}
      {greetingAudioError && (
        <div className="fixed bottom-8 left-8 z-30 p-3 text-xs text-orange-300 bg-orange-800/70 border border-orange-600/50 rounded-md max-w-xs">
          <p className="font-semibold">Avatar Hiccup:</p>
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