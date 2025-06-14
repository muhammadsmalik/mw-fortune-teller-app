'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const BEHOLD_AUDIO_PATH = '/audio/behold.mp3';

export default function ScenarioAnswersScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [categorizedAnswers, setCategorizedAnswers] = useState({
    general: [],
    mediaOwner: [],
    agency: [],
    other: [] // For any answers that don't fit the known prefixes
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audio state and refs
  const audioContextRef = useRef(null);
  const [isBeholdAudioPlaying, setIsBeholdAudioPlaying] = useState(false);
  const [beholdAudioError, setBeholdAudioError] = useState(null);
  const beholdAudioSourceRef = useRef(null);

  // Initialize Particles
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
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

  // Function to initialize AudioContext safely on client
  const getAudioContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!audioContextRef.current) {
        try {
          console.log('[TTS Frontend - ScenarioAnswers] Attempting to create AudioContext with 24kHz sample rate.');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          console.log('[TTS Frontend - ScenarioAnswers] AudioContext created. State:', audioContextRef.current.state, 'SampleRate:', audioContextRef.current.sampleRate);
        } catch (e) {
          console.error('[TTS Frontend - ScenarioAnswers] Error creating AudioContext:', e);
          setBeholdAudioError("Failed to initialize audio system. " + e.message);
          return null;
        }
      }
      return audioContextRef.current;
    }
    console.log('[TTS Frontend - ScenarioAnswers] Window undefined, cannot create AudioContext.');
    return null;
  }, []);

  // playBeholdAudio function
  const playBeholdAudio = useCallback(async (filePath) => {
    const audioContext = getAudioContext();
    if (!audioContext) {
      console.error('[TTS Frontend - ScenarioAnswers] playBeholdAudio: AudioContext not available.');
      setBeholdAudioError(`Audio system not ready: ${filePath}`);
      setIsBeholdAudioPlaying(false);
      return;
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.error(`[TTS Frontend - ScenarioAnswers] Error resuming AudioContext for ${filePath}:`, e);
        setBeholdAudioError(`Could not start audio ${filePath}. Check browser permissions.`);
        setIsBeholdAudioPlaying(false);
        return;
      }
    }

    setIsBeholdAudioPlaying(true);
    setBeholdAudioError(null);

    try {
      console.log(`[TTS Frontend - ScenarioAnswers] Fetching audio file: ${filePath}`);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file ${filePath} (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if (beholdAudioSourceRef.current) {
        beholdAudioSourceRef.current.stop();
        beholdAudioSourceRef.current.disconnect();
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        console.log(`[TTS Frontend - ScenarioAnswers] Audio playback ended for: ${filePath}`);
        beholdAudioSourceRef.current = null;
        setIsBeholdAudioPlaying(false);
      };
      source.onerror = (err) => {
          console.error(`[TTS Frontend - ScenarioAnswers] Error playing audio file ${filePath}:`, err);
          setBeholdAudioError(`Error playing sound ${filePath}.`);
          setIsBeholdAudioPlaying(false);
          beholdAudioSourceRef.current = null;
      };
      
      console.log(`[TTS Frontend - ScenarioAnswers] Starting audio playback for: ${filePath}.`);
      source.start();
      beholdAudioSourceRef.current = source;

    } catch (error) {
      console.error(`[TTS Frontend - ScenarioAnswers] Error in playBeholdAudio for ${filePath}:`, error);
      setBeholdAudioError(`The spirits are quiet for ${filePath}: ${error.message}.`);
      setIsBeholdAudioPlaying(false);
    }
  }, [getAudioContext]);

  useEffect(() => {
    const fetchAnswers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const storedScenarioIdsString = localStorage.getItem('selectedScenarioIDs');
        if (!storedScenarioIdsString) {
          throw new Error("No scenarios selected. Please go back and select scenarios.");
        }
        
        const selectedScenarioIDs = JSON.parse(storedScenarioIdsString);
        if (!Array.isArray(selectedScenarioIDs) || selectedScenarioIDs.length === 0) {
            throw new Error("Selected scenarios are invalid. Please re-select.");
        }

        const response = await fetch('/api/generate-scenario-answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedScenarios: selectedScenarioIDs }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "API error response unreadable" }));
          throw new Error(errorData.error || `Failed to fetch scenario answers (${response.status})`);
        }

        const data = await response.json();
        const newCategorizedAnswers = { general: [], mediaOwner: [], agency: [], other: [] };

        if (data.scenarioAnswers) {
          data.scenarioAnswers.forEach(answer => {
            if (answer.id && answer.id.startsWith('gen_')) {
              newCategorizedAnswers.general.push(answer);
            } else if (answer.id && answer.id.startsWith('mo_')) {
              newCategorizedAnswers.mediaOwner.push(answer);
            } else if (answer.id && answer.id.startsWith('ag_')) {
              newCategorizedAnswers.agency.push(answer);
            } else {
              newCategorizedAnswers.other.push(answer); // Catch any other types
            }
          });
          setCategorizedAnswers(newCategorizedAnswers);
        } else {
          throw new Error("Scenario answers not found in API response.");
        }
      } catch (err) {
        console.error("Error fetching scenario answers:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnswers();
  }, []);

  // useEffect for behold audio cleanup
  useEffect(() => {
    return () => {
      if (beholdAudioSourceRef.current) {
        console.log('[TTS Frontend - ScenarioAnswers] Cleanup: Stopping behold audio source.');
        beholdAudioSourceRef.current.stop();
        beholdAudioSourceRef.current.disconnect();
        beholdAudioSourceRef.current = null;
      }
    };
  }, []);

  const handleNavigateToContacts = () => {
    router.push('/contact-details');
  };
  
  const categoryTitles = {
    general: "Future Outlook",
    mediaOwner: "For Media Owners",
    agency: "For Agencies",
    other: "Other Insights"
  };

  if (!init) { // Wait for particles to be ready if it's a core visual element
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate">
      {init && Particles && (
        <Particles
          id="tsparticles-scenario-answers"
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
      )}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>
       <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
         <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
         <span className="font-semibold">Moving Walls</span>
       </div>

      {/* Fixed Globe Logo for lg screens */}
      <div className="hidden lg:block fixed top-1/2 -translate-y-1/2 left-8 xl:left-12 z-20">
        <Image 
          src="/assets/globe-logo.jpeg" 
          alt="Globe Logo"
          width={150}
          height={150}
          className="rounded-full shadow-lg"
        />
      </div>

      {/* Main content area with Card */}
      <main className="w-full flex flex-col items-center justify-center z-10 my-8 px-2 sm:px-0 lg:px-0 lg:pl-[214px] lg:pr-[314px] xl:pl-[230px] xl:pr-[330px]">
        {/* Center: Scenario Answers Card Wrapper */}
        <div className="w-full lg:w-auto max-w-4xl">
          <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
            <CardHeader className="text-center pt-6 sm:pt-8">
              <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
                Insights for Your Chosen Scenarios
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
              {isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-mw-white/80">
                  <Loader2 className="h-10 w-10 animate-spin text-mw-light-blue mb-4" />
                  <p className="text-lg">Unveiling strategic insights...</p>
                </div>
              )}

              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-red-400 bg-red-900/20 p-6 rounded-md">
                  <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
                  <p className="text-xl font-semibold">A Cosmic Glitch!</p>
                  <p className="text-center mt-2">{error}</p>
                  <Button 
                      onClick={() => {
                          // Attempt to go back to scenario selection, or to collect-info as a fallback
                          const previousUserPath = localStorage.getItem('userLinkedInProfile') ? '/linkedin-interlude' : '/fortune-journey';
                          // Heuristic: if linkedin profile exists, user was likely on interlude before display-fortune -> scenario-answers
                          // If no linkedin, they were on scenario-selection before generating-fortune -> display-fortune -> scenario-answers
                          // A more robust way would be to store the actual previous path if possible or use a query param.
                          // For now, this tries to send them to a logical place to re-select scenarios.
                          router.push(localStorage.getItem('userInfoForFortune') ? '/fortune-journey' : '/collect-info');
                      }} 
                      className="mt-6"
                  >Try Selecting Scenarios Again</Button>
                </div>
              )}

              {!isLoading && !error && 
                Object.values(categorizedAnswers).every(category => category.length === 0) && (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-mw-white/70">
                      <p className="text-lg">No scenario insights available at the moment.</p>
                      <p className="text-sm mt-2">Please try selecting scenarios again.</p>
                  </div>
               )}

              {!isLoading && !error && Object.entries(categorizedAnswers).map(([categoryKey, answers]) => (
                answers.length > 0 && (
                  <div key={categoryKey} className="mb-12"> {/* Increased bottom margin for better separation */}
                    <h2 className="text-2xl sm:text-3xl font-bold text-mw-gold mb-6 text-center">{categoryTitles[categoryKey]}</h2>
                    <div className="space-y-8">
                      {answers.map((answer, index) => (
                        <div key={index} className="p-5 rounded-lg bg-mw-dark-blue/30 border border-mw-light-blue/20 shadow-md">
                          <h3 className="text-xl font-semibold text-mw-gold mb-3">{answer.scenario}</h3>
                          {answer.insight && (
                            <>
                              <p className="text-mw-white/80 italic mb-4">{answer.insight.subQuestion}</p>
                              <div className="mb-4">
                                <h4 className="text-md font-semibold text-mw-light-blue mb-2">How MW Helps:</h4>
                                <ul className="space-y-2 list-inside">
                                  {answer.insight.howMWHelps?.map((point, pIndex) => (
                                    <li key={pIndex} className="flex items-start">
                                      <span className="text-xl mr-2">{point.icon}</span>
                                      <span className="text-mw-white/90">{point.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-md font-semibold text-mw-light-blue mb-2">Business Impact:</h4>
                                <p className="text-mw-white/90">{answer.insight.businessImpact}</p>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </CardContent>
            {!isLoading && !error && (
              <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
                <Button
                  onClick={handleNavigateToContacts}
                  size="lg"
                  className="px-8 py-3 text-lg font-semibold \
                             bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] \
                             text-mw-dark-navy \
                             hover:opacity-90 \
                             rounded-lg shadow-md transform transition-all duration-150 \
                             hover:shadow-xl active:scale-95"
                >
                  Save & Share This Wisdom
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>

      {/* Fixed Genie Avatar for lg screens */}
      <div className="hidden lg:block fixed top-1/2 -translate-y-1/2 right-8 xl:right-12 z-20">
        <div 
          className="cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
          onClick={() => {
            if (!isBeholdAudioPlaying) {
              playBeholdAudio(BEHOLD_AUDIO_PATH);
            }
            // Removed console.log for brevity as it's not essential user feedback here
          }}
          title="Hear a revelation"
        >
          <Image 
            src="/avatar/genie-pointing-right.png" 
            alt="Fortune Teller Avatar pointing right"
            width={250}
            height={375}
            className={`drop-shadow-xl ${isBeholdAudioPlaying ? 'animate-pulse' : ''}`}
          />
        </div>
      </div>

      {/* Behold Audio Error Display */}
      {beholdAudioError && (
        <div className="fixed bottom-8 right-8 z-30 p-3 text-xs text-orange-300 bg-orange-800/70 border border-orange-600/50 rounded-md max-w-xs">
          <p className="font-semibold">Avatar Hiccup:</p>
          <p>{beholdAudioError}</p>
        </div>
      )}
    </div>
  );
} 