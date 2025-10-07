'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Kept for /collect-info navigation
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CheckSquare, Square, Loader2, ArrowLeft, Users, Building, Combine } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, AnimatePresence } from 'framer-motion';
import personaQuestions from '@/lib/persona_questions.json';
import { useAudio } from '@/contexts/AudioContext';

const MAX_SELECTIONS = 2;
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

// Define audio file paths
const TRANSITION_VOICE_PATH = '/audio/transition_audio.mp3';
const TRANSITION_SHIMMER_PATH = '/audio/shimmer-glass.mp3';
const AVATAR_GREETING_AUDIO_PATH = '/audio/6-questions.mp3';

const personaKeys = ['media_owner', 'brand_owner', 'media_agency'];

const personaDisplayNames = {
  media_owner: 'Media Owner',
  brand_owner: 'Brand Owner',
  media_agency: 'Media Agency',
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
  const { audioContext, masterGain, initializeAudio } = useAudio();
  const [init, setInit] = useState(false);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [currentPersona, setCurrentPersona] = useState(persona);
  const [error, setError] = useState(null);

  const [isTransitionAudioPlaying, setIsTransitionAudioPlaying] = useState(false);
  const [transitionAudioError, setTransitionAudioError] = useState(null);
  const transitionAudioSourceRef = useRef(null);

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

  const playAudioFile = useCallback(async (audioSystem, filePath, isLastInSequence = false, onAudioEndCallback) => {
    const { audioContext, masterGain } = audioSystem;
    if (!audioContext || !masterGain) {
      setTransitionAudioError(`Audio system not ready. Please interact with the page first.`);
      setIsTransitionAudioPlaying(false);
      if (onAudioEndCallback) onAudioEndCallback(new Error("AudioContext not available"));
      return Promise.reject(new Error("AudioContext not available"));
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        setTransitionAudioError(`Could not start transition audio. Check browser permissions.`);
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
      source.connect(masterGain);
      
      return new Promise((resolve, reject) => {
        source.onended = () => {
          transitionAudioSourceRef.current = null;
          if (isLastInSequence) {
            setIsTransitionAudioPlaying(false);
          }
          if(onAudioEndCallback) onAudioEndCallback(null);
          resolve();
        };
        source.onerror = (err) => {
            setTransitionAudioError(`Error playing transition sound ${filePath}.`);
            setIsTransitionAudioPlaying(false);
            transitionAudioSourceRef.current = null;
            if(onAudioEndCallback) onAudioEndCallback(err);
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
  }, []);
  
  const playTransitionSequence = useCallback(async (audioSystem, callbackOnCompletion) => {
    console.log('[ScenarioSelection] Starting transition audio sequence (internal to component).');
    setIsTransitionAudioPlaying(true);
    setTransitionAudioError(null);

    try {
      await playAudioFile(audioSystem, TRANSITION_VOICE_PATH, false, null);
      console.log('[ScenarioSelection] Transition voice finished, playing shimmer.');
      await playAudioFile(audioSystem, TRANSITION_SHIMMER_PATH, true, (error) => {
          setIsTransitionAudioPlaying(false);
          if (error) {
              console.error('[ScenarioSelection] Error during shimmer sound:', error);
          }
          if (callbackOnCompletion) callbackOnCompletion(error);
      });
      console.log('[ScenarioSelection] Transition shimmer finished (or initiated callback).');
    } catch (error) {
      console.error('[ScenarioSelection] Error during transition audio sequence:', error);
      setIsTransitionAudioPlaying(false);
      if (callbackOnCompletion) callbackOnCompletion(error);
    }
  }, [playAudioFile]);

  const handlePersonaSelect = (personaKey) => {
    setCurrentPersona(personaKey);
    setSelectedScenarioIds([]);
    setError(null);
  };

  const handleScenarioToggle = (scenarioId) => {
    setSelectedScenarioIds(prevSelected => {
      if (prevSelected.includes(scenarioId)) {
        return prevSelected.filter(id => id !== scenarioId);
      }
      if (prevSelected.length < MAX_SELECTIONS) {
        return [...prevSelected, scenarioId];
      }
      return prevSelected;
    });
  };

  const handleConfirmSelections = async () => {
    if (selectedScenarioIds.length !== MAX_SELECTIONS) {
      setError(`Please select exactly ${MAX_SELECTIONS} questions.`);
      return;
    }
    setError(null);
    
    let audioSystem = { audioContext, masterGain };
    if (!audioSystem.audioContext) {
      audioSystem = initializeAudio();
    }

    if (!audioSystem || !audioSystem.audioContext) {
      console.warn("[ScenarioSelection] Audio system not available, skipping audio transition.");
      // Proceed without audio
      onScenariosConfirmed({ scenarios: selectedScenarioIds, persona: currentPersona });
      return;
    }

    await playTransitionSequence(audioSystem, (transitionError) => {
      const payload = { 
        scenarios: selectedScenarioIds,
        persona: currentPersona
      };
      if (transitionError) {
        console.warn('[ScenarioSelection] Transition audio failed, but proceeding.', transitionError);
      }
      onScenariosConfirmed(payload);
    });
  };

  const handleBack = () => {
    setError(null);
    setTransitionAudioError(null);
    if (currentPersona) {
      setCurrentPersona(null);
      setSelectedScenarioIds([]);
    } else {
      onBack();
    }
  };

  const getArticle = (noun) => {
    if (!noun) return '';
    const firstLetter = noun[0].toLowerCase();
    if (['a', 'e', 'i', 'o', 'u'].includes(firstLetter)) {
        return 'an';
    }
    return 'a';
  }

  useEffect(() => {
    return () => {
      if (transitionAudioSourceRef.current) {
        transitionAudioSourceRef.current.stop();
        transitionAudioSourceRef.current.disconnect();
        transitionAudioSourceRef.current = null;
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate">
      {init && Particles && (
        <Particles
          id="tsparticles-scenario-selection-component"
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
        title={currentPersona ? "Back to Persona Selection" : "Go Back"}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>
      
      <main className="w-full flex items-start justify-center gap-8 z-10 my-12 px-4 sm:px-0">
        {!isTransitionAudioPlaying && (
          <div 
            className="z-20 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 self-center hidden lg:block pt-16"
            title="Select your path"
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
        <div className="w-full max-w-4xl">
          <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
            {!currentPersona ? (
              <>
                <CardHeader className="text-center pt-6 sm:pt-8">
                  <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
                    First, Tell the Oracle Who You Are
                  </CardTitle>
                  <p className="text-mw-white/70 text-sm mt-2">
                    Your path determines the questions you may ask.
                  </p>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {personaKeys.map((personaKey) => (
                      <div
                        key={personaKey}
                        onClick={() => handlePersonaSelect(personaKey)}
                        className="p-6 rounded-lg border border-mw-light-blue/30 bg-mw-dark-blue/40 hover:bg-mw-light-blue/20 hover:border-mw-light-blue/70 cursor-pointer transition-all duration-300 transform hover:scale-105 flex flex-col items-center text-center"
                      >
                        <div className="mb-4">
                          {personaKey === 'media_owner' && <Building className="h-12 w-12 text-mw-gold" />}
                          {personaKey === 'brand_owner' && <Users className="h-12 w-12 text-mw-gold" />}
                          {personaKey === 'media_agency' && <Combine className="h-12 w-12 text-mw-gold" />}
                        </div>
                        <h3 className="text-xl font-bold text-mw-white">
                          {personaDisplayNames[personaKey]}
                        </h3>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="text-center pt-6 sm:pt-8">
                  <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
                    {`Challenges for ${getArticle(personaDisplayNames[currentPersona])} ${personaDisplayNames[currentPersona]}`}
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
                  <div className="bg-mw-dark-blue/40 border border-mw-light-blue/30 rounded-lg p-4">
                    <div className="space-y-3">
                      {(personaQuestions[currentPersona]?.[questionType] || []).map((scenario) => {
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
                            <span className={`text-lg md:text-xl leading-snug break-words ${isSelected ? 'text-mw-white font-semibold' : 'text-mw-white/80'}`}> 
                              {scenario.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
                      `${ctaLabel} (${selectedScenarioIds.length}/${MAX_SELECTIONS})`
                    )}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </main>
      
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