'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
// useRouter will be removed if all navigation is handled by parent props
// For now, router.back() is replaced by onGoBack, but internal pushes like /scenario-answers might remain
import { useRouter } from 'next/navigation'; 
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';

const TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie's voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

**Cadence & Rhythm:**
The speech has a *deliberate elegance*, often flowing like ancient poetry or song, with rhythmic pauses that make each word feel significant—*measured, but not slow*. It can shift instantly, becoming quick and unpredictable, like a spark leaping from fire when the genie is amused, annoyed, or impatient.

**Accents & Inflections:**
There might be traces of archaic or exotic accents, difficult to place—part Middle Eastern, part celestial, part something entirely unearthly. The vowels stretch luxuriously, and the consonants often land with a whispered crispness, like dry leaves brushing against stone. When casting spel`;

const SMOKE_EFFECT_DURATION_MS = 2000;

const CEO_TRANSCRIPT = [
  { text: "You've been searching, wandering...", start: 0, end: 2.8 },
  { text: "wondering if this is truly your time.", start: 2.9, end: 6.32 },
  { text: "Let me tell you, the signs are undeniable.", start: 7.1, end: 10.88 },
  { text: "You've come to the right place.", start: 11.3, end: 12.96 },
  { text: "This is where visions become reality...", start: 13.6, end: 16.49 },
  { text: "...and dreams are no longer just whispers in the dark.", start: 16.5, end: 20.89 },
  { text: "The ones you meet here...", start: 21.2, end: 22.97 },
  { text: "...they will help you shape your destiny.", start: 23.2, end: 25.53 }
];

export default function DisplayFortune({ fortuneData: propFortuneData, onGoBack, audioPlaybackAllowed: propAudioPlaybackAllowed }) {
  console.log('[DisplayFortuneComponent] Component rendered. Received props:', { propFortuneData, propAudioPlaybackAllowed });
  const router = useRouter(); // Kept for router.push('/scenario-answers')
  const [init, setInit] = useState(false);
  const [fortune, setFortune] = useState('');
  const [isLoadingFortune, setIsLoadingFortune] = useState(true);
  
  // This component will now primarily rely on propAudioPlaybackAllowed
  // The internal state can be used to reflect the prop or for local UI elements if any still need it.
  const [audioPlaybackAllowed, setAudioPlaybackAllowed] = useState(propAudioPlaybackAllowed);

  const [openingLineToNarrate, setOpeningLineToNarrate] = useState('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [narrationError, setNarrationError] = useState(null);
  const [currentCeoCaption, setCurrentCeoCaption] = useState('');

  const [narrationStage, setNarrationStage] = useState('idle');

  const audioContextRef = useRef(null);
  const howlNarrationRef = useRef(null);
  const revealChimeRef = useRef(null);
  const ceoAudioRef = useRef(null);

  const [hasPreRevealed, setHasPreRevealed] = useState(false); // This might be determined by parent in Phase 2

  const [isTransitioningToCeo, setIsTransitioningToCeo] = useState(false);
  const [showCeoImage, setShowCeoImage] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Update internal audioPlaybackAllowed state when prop changes
  useEffect(() => {
    setAudioPlaybackAllowed(propAudioPlaybackAllowed);
  }, [propAudioPlaybackAllowed]);

  const getAudioContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          return null;
        }
      }
      return audioContextRef.current;
    }
    return null;
  }, []);

  const handleCeoTimeUpdate = useCallback(() => {
    if (ceoAudioRef.current) {
      const currentTime = ceoAudioRef.current.currentTime;
      const activePhrase = CEO_TRANSCRIPT.find(
        (phrase) => currentTime >= phrase.start && currentTime <= phrase.end
      );
      if (activePhrase) {
        setCurrentCeoCaption(activePhrase.text);
      } else {
        setCurrentCeoCaption('');
      }
    }
  }, []);

  useEffect(() => {
    console.log('[DisplayFortuneComponent] Main useEffect triggered. init:', init, 'propFortuneData:', propFortuneData);
    if (!init) {
        console.log('[DisplayFortuneComponent] Main useEffect: init is false, returning.');
        return;
    }

    setIsLoadingFortune(true);
    setOpeningLineToNarrate('');
    setNarrationError(null);
    setNarrationStage('idle');
    setIsTransitioningToCeo(false);
    setShowCeoImage(false);

    // In Phase 2, propFortuneData is the ONLY source.
    // The localStorage.getItem('fortuneData') fallback is removed.
    let htmlString = '';
    let localOpeningLine = "A mysterious silence...";

    if (propFortuneData) {
      console.log('[DisplayFortuneComponent] Main useEffect: propFortuneData IS PRESENT. Attempting to process.', propFortuneData);
      // Check if it's an error object passed from parent
      if (propFortuneData.error) {
        console.log('[DisplayFortuneComponent] Main useEffect: propFortuneData contains an error object.', propFortuneData.error);
        htmlString = `<p class=\"text-mw-white/70 text-center text-xl p-4\">${propFortuneData.error}</p>`;
        localOpeningLine = propFortuneData.openingLine || "An Error Has Occurred";
        setFortune(htmlString);
        setOpeningLineToNarrate(localOpeningLine);
        setIsLoadingFortune(false);
        setHasPreRevealed(true); // Set to true to show the error card
        console.log('[DisplayFortuneComponent] Main useEffect: Processed error from propFortuneData. Fortune HTML set to error message. localOpeningLine:', localOpeningLine);
        return; // Stop further processing if it's an error
      }

      try {
        // Data is already an object from the prop
        const parsedData = propFortuneData; 
        
        localOpeningLine = parsedData.openingLine || "A mysterious silence...";
        htmlString += `<p class="font-caveat text-2xl sm:text-3xl text-mw-white mb-6 text-center">${localOpeningLine}</p>`;
        htmlString += `<div class="space-y-3 text-mw-white/95">`;

        if (parsedData.locationInsight) {
          htmlString += `<div class="flex items-start"><p><strong class="text-mw-light-blue/90">Location Insight:</strong> ${parsedData.locationInsight}</p></div>`;
        }
        if (parsedData.audienceOpportunity) {
          htmlString += `<div class="flex items-start"><p><strong class="text-mw-light-blue/90">Audience Opportunity:</strong> ${parsedData.audienceOpportunity}</p></div>`;
        }
        if (parsedData.engagementForecast) {
          htmlString += `<div class="flex items-start"><p><strong class="text-mw-light-blue/90">Engagement Forecast:</strong> ${parsedData.engagementForecast}</p></div>`;
        }
        if (parsedData.transactionsPrediction) {
          htmlString += `<div class="flex items-start"><p><strong class="text-mw-light-blue/90">Transactions Prediction:</strong> ${parsedData.transactionsPrediction}</p></div>`;
        }
        if (parsedData.aiAdvice) {
          htmlString += `<div class="flex items-start"><p><strong class="text-mw-light-blue/90">AI Oracle's Guidance:</strong> ${parsedData.aiAdvice}</p></div>`;
        }
        htmlString += `</div>`;
      } catch (error) {
        console.error("[DisplayFortune] Error processing propFortuneData:", error);
        htmlString = '<p class="text-mw-white/70 text-center">There was a slight distortion in the cosmic message. Please try again.</p>';
        localOpeningLine = "A glitch in the astral plane..."; // Update opening line for error too
      }
    } else {
      // This case will be hit if propFortuneData is null or undefined
      console.log('[DisplayFortuneComponent] Main useEffect: propFortuneData IS NULL or UNDEFINED. Setting to silent/awaiting message.');
      htmlString = '<p class="text-mw-white/70 text-center">The Oracle is currently silent. Your fortune awaits its moment.</p>';
      localOpeningLine = "The Oracle prepares...";
    }

    setFortune(htmlString);
    setOpeningLineToNarrate(localOpeningLine);
    
    // Updated condition to ensure hasPreRevealed is true if any content (even error) is set.
    if (htmlString) { 
        setIsLoadingFortune(false);
        setHasPreRevealed(true); 
        console.log('[DisplayFortuneComponent] Main useEffect: Processed valid data or error. hasPreRevealed set to true. HTML:', htmlString.substring(0,100));
    } else {
        setIsLoadingFortune(false);
        setHasPreRevealed(false); 
        console.log('[DisplayFortuneComponent] Main useEffect: No htmlString generated (should not happen if error/silent states are handled).');
    }

  }, [init, propFortuneData]);

  useEffect(() => {
    // Audio playback logic now heavily relies on the `audioPlaybackAllowed` prop (via internal state)
    if (!init || !audioPlaybackAllowed || !openingLineToNarrate || !hasPreRevealed) {
      if (openingLineToNarrate && !audioPlaybackAllowed && hasPreRevealed && narrationStage === 'idle') {
        // This log might change based on how parent controls audio enabling
        console.log('[DisplayFortuneComponent] Narration useEffect: Waiting for audio to be allowed by parent. Line:', openingLineToNarrate, 'Audio Allowed:', audioPlaybackAllowed, 'Has PreRevealed:', hasPreRevealed);
      }
      return;
    }

    console.log('[DisplayFortuneComponent] Narration useEffect: Conditions met. Stage:', narrationStage, 'Opening Line:', openingLineToNarrate, 'Audio Allowed:', audioPlaybackAllowed, 'Has PreRevealed:', hasPreRevealed);
    if (narrationStage === 'idle' && openingLineToNarrate && hasPreRevealed && audioPlaybackAllowed) {
      setNarrationStage('openingLine');
      return;
    }

    const playNarrationSegment = async (textToNarrate, onEndedCallback) => {
      if (isNarrating && howlNarrationRef.current && howlNarrationRef.current.playing() && narrationStage === 'openingLine') {
        return;
      }
      if (howlNarrationRef.current) {
        howlNarrationRef.current.unload();
        howlNarrationRef.current = null;
      }
      const encodedTextInput = encodeURIComponent(textToNarrate);
      const voice = 'ballad';
      const streamUrl = `/api/generate-narration?voice=${voice}&textInput=${encodedTextInput}`;
      const sound = new Howl({
        src: [streamUrl],
        format: ['mp3'],
        html5: true, // Recommended for streaming
        onload: () => setIsNarrating(true),
        onplay: () => {
          setIsNarrating(true);
          setNarrationError(null);
        },
        onend: () => {
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
        onloaderror: (id, error) => {
          setNarrationError(`The Oracle's voice stream couldn't be loaded. Code: ${id}`);
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
        onplayerror: (id, error) => {
          let errorMessage = `The Oracle's voice stream couldn't play. Code: ${id}`;
          // Error message for user interaction can be less prominent if parent handles unlock
          setNarrationError(errorMessage);
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
      });
      howlNarrationRef.current = sound;
      sound.play();
    };

    if (narrationStage === 'openingLine' && !isNarrating) {
      playNarrationSegment(openingLineToNarrate, () => {
        setNarrationStage('ceoNarration');
      });
    } else if (narrationStage === 'ceoNarration' && !isNarrating) {
      if (ceoAudioRef.current && audioPlaybackAllowed) {
        console.log('[DisplayFortune] Attempting to play CEO audio mp3. AudioPlaybackAllowed: true');
        setCurrentCeoCaption('');
        const audioEl = ceoAudioRef.current;

        console.log(`[DisplayFortune] CEO Audio Element State: paused=${audioEl.paused}, ended=${audioEl.ended}, readyState=${audioEl.readyState}`);
        if (!audioEl.paused || audioEl.ended) {
            console.log('[DisplayFortune] CEO audio already playing or ended, resetting for new play attempt.');
            audioEl.currentTime = 0;
        }

        const handleCeoAudioPlay = () => {
          console.log('[DisplayFortune] CEO audio mp3 playback started via event.');
          setIsNarrating(true);
          setNarrationError(null);
        };

        const handleCeoAudioEnd = () => {
          console.log('[DisplayFortune] CEO audio mp3 playback ended.');
          setIsNarrating(false);
          setCurrentCeoCaption('');
          setNarrationStage('transitioning');
          audioEl.removeEventListener('ended', handleCeoAudioEnd);
          audioEl.removeEventListener('error', handleCeoAudioError);
          audioEl.removeEventListener('timeupdate', handleCeoTimeUpdate);
          audioEl.removeEventListener('play', handleCeoAudioPlay);
        };

        const handleCeoAudioError = (e) => {
          console.error('[DisplayFortune] Error playing CEO audio mp3:', e);
          setNarrationError("The Oracle's message seems to be incomplete. Please try again later.");
          setIsNarrating(false);
          setCurrentCeoCaption('');
          setNarrationStage('done'); 
          audioEl.removeEventListener('ended', handleCeoAudioEnd);
          audioEl.removeEventListener('error', handleCeoAudioError);
          audioEl.removeEventListener('timeupdate', handleCeoTimeUpdate);
          audioEl.removeEventListener('play', handleCeoAudioPlay);
        };

        audioEl.removeEventListener('ended', handleCeoAudioEnd);
        audioEl.removeEventListener('error', handleCeoAudioError);
        audioEl.removeEventListener('timeupdate', handleCeoTimeUpdate);
        audioEl.removeEventListener('play', handleCeoAudioPlay);

        audioEl.addEventListener('ended', handleCeoAudioEnd);
        audioEl.addEventListener('error', handleCeoAudioError);
        audioEl.addEventListener('timeupdate', handleCeoTimeUpdate);
        audioEl.addEventListener('play', handleCeoAudioPlay);
        
        console.log('[DisplayFortune] Attempting to call .play() on CEO audio element.');
        const playPromise = audioEl.play();

        if (playPromise !== undefined) {
          playPromise.then(_ => {
            console.log('[DisplayFortune] CEO audio .play() initiated successfully via promise.');
          })
          .catch(error => {
            console.error('[DisplayFortune] CEO audio .play() promise rejected:', error);
            handleCeoAudioError(error); 
          });
        } else {
            console.log('[DisplayFortune] CEO audio .play() does not return a promise. Relying on events.');
        }

      } else {
        if (!audioPlaybackAllowed) {
            console.warn('[DisplayFortune] CEO audio narration SKIPPED: Audio playback not allowed.');
        } else if (!ceoAudioRef.current) {
            console.error('[DisplayFortune] ceoAudioRef.current is null. Cannot play CEO audio.');
        }
        setNarrationStage('transitioning');
      }
    }

    return () => {
      if (howlNarrationRef.current) {
        howlNarrationRef.current.unload();
        howlNarrationRef.current = null;
      }
      if (revealChimeRef.current) {
        revealChimeRef.current.pause();
        if (revealChimeRef.current) revealChimeRef.current.currentTime = 0;
      }
      if (ceoAudioRef.current) {
        // Simplified cleanup, specific listeners removed within handlers
        ceoAudioRef.current.removeEventListener('timeupdate', handleCeoTimeUpdate);
      }
    };
  }, [init, openingLineToNarrate, getAudioContext, audioPlaybackAllowed, hasPreRevealed, narrationStage, handleCeoTimeUpdate]);

  useEffect(() => {
    if (narrationStage === 'transitioning') {
      setIsTransitioningToCeo(true);
      if (revealChimeRef.current) {
        revealChimeRef.current.play().catch(e => console.error("Error playing chime:",e));
      }
      const timer = setTimeout(() => {
        setShowCeoImage(true);
        setIsTransitioningToCeo(false);
        setNarrationStage('done');
      }, SMOKE_EFFECT_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [narrationStage]);

  const particlesLoaded = useCallback(async (container) => {},
   []);

  const particleOptions = useMemo(() => ({
    particles: {
      number: { value: 40, density: { enable: true, value_area: 800 } },
      color: { value: ["#FFFFFF", "#5BADDE"] },
      shape: { type: "circle" },
      opacity: { value: 0.3, random: true, anim: { enable: true, speed: 0.6, opacity_min: 0.1, sync: false } },
      size: { value: { min: 1, max: 3 }, random: true },
      move: { enable: true, speed: 0.6, direction: "none", random: true, straight: false, outModes: { default: "out" }, bounce: false },
    },
    interactivity: {
      detect_on: "canvas",
      events: { onhover: { enable: false }, onclick: { enable: false }, resize: true },
    },
    detectRetina: true,
  }), []);

  const handleSaveAndShare = () => {
    router.push('/scenario-answers'); // This navigation can remain internal
  };

  // The 'Enable Sound' button might become redundant if parent correctly sets audioPlaybackAllowed
  // after the first user interaction on the ScenarioSelection part of the journey.
  // For Phase 1, we keep it, but it will be driven by `!audioPlaybackAllowed` (which reflects the prop).
  const handleEnableAudio = () => {
    // This function might not be called by a button anymore if parent handles unlock.
    // If it is, it should try to resume the context.
    // However, the `propAudioPlaybackAllowed` should ideally be true already.
    setAudioPlaybackAllowed(true); // Reflects user intent for this component instance
    const audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(e => console.error('Error resuming AudioContext via local Enable Sound:', e));
    }
    // Prime audio elements if needed
    if (revealChimeRef.current) {
        revealChimeRef.current.play().then(() => revealChimeRef.current.pause()).catch(() => {});
    }
    if (ceoAudioRef.current) {
        ceoAudioRef.current.play().then(() => ceoAudioRef.current.pause()).catch(() => {});
    }
  };

  if (!init || (isLoadingFortune && !propFortuneData?.error)) {
    console.log('[DisplayFortuneComponent] Rendering loading state. init:', init, 'isLoadingFortune:', isLoadingFortune, 'propFortuneDataError:', propFortuneData?.error);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <svg className="animate-spin h-10 w-10 text-mw-light-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg">Unveiling your destiny...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      {init && Particles && (
         <Particles
            id="tsparticles-display-fortune-component" // Changed ID
            particlesLoaded={particlesLoaded}
            options={particleOptions}
            className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
      )}
      <audio ref={revealChimeRef} src="/audio/reveal_chime.mp3" preload="auto" />
      <audio ref={ceoAudioRef} src="/audio/reach_out_to_mw.mp3" preload="auto" />
      
      <Button
          variant="outline"
          size="icon"
          className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
          onClick={onGoBack} // Use onGoBack prop
        >
          <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Enable Sound button visibility now depends on the audioPlaybackAllowed state (from prop) */}
      {!audioPlaybackAllowed && hasPreRevealed && (
        <div className="absolute top-6 right-6 z-20">
          <Button
            onClick={handleEnableAudio} // This button might be removed in Phase 2
            variant="outline"
            size="sm"
            className="bg-mw-light-blue/20 text-mw-white hover:bg-mw-light-blue/40 border-mw-light-blue/50"
          >
            Enable Sound
          </Button>
        </div>
      )}

      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      {/* hasPreRevealed might also become a prop or directly tied to fortuneData presence */}
      {hasPreRevealed && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-3xl z-10 mx-4"
        >
          <Card className="bg-card rounded-lg shadow-lg w-full">
            <CardHeader className="text-center pt-6 sm:pt-8">
              <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
                Your Fortune Reveals...
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-8">
                <div className="w-[150px] sm:w-[180px] md:w-[200px] flex-shrink-0 order-1 md:order-none flex flex-col items-center relative">
                  {isTransitioningToCeo && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-mw-dark-navy/50 backdrop-blur-sm">
                    </div>
                  )}
                  <AnimatePresence>
                    {!showCeoImage && !isTransitioningToCeo && (
                      <motion.div
                        key="fortune-teller"
                        initial={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: SMOKE_EFFECT_DURATION_MS / 2000 } }}
                        className="w-full rounded-lg shadow-md overflow-hidden"
                      >
                        <Image
                          src="/avatar/fortune-reveal.png"
                          alt="The Fortune Teller Oracle"
                          width={822}
                          height={1012}
                          layout="responsive"
                          className="rounded-lg"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {showCeoImage && (
                    <motion.div
                      key="ceo"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1, transition: { duration: SMOKE_EFFECT_DURATION_MS / 2000, delay: SMOKE_EFFECT_DURATION_MS / 2000 } }}
                      className="w-full rounded-lg shadow-md overflow-hidden"
                    >
                      <Image
                        src="/MW-logo-web.svg" // Should this be CEO image or MW logo?
                        alt="Moving Walls Logo" // Alt text matches src
                        width={822}
                        height={822}
                        layout="responsive"
                        className="rounded-lg"
                      />
                    </motion.div>
                  )}
                  {!isTransitioningToCeo && (
                    <p className="text-center text-mw-white mt-3 font-semibold">
                      {showCeoImage ? "Moving Walls" : narrationStage === 'ceoNarration' ? "Moving Walls" : "Fortune Teller"}
                    </p>
                  )}
                  <div className="h-12 mt-2 flex flex-col items-center justify-center w-full px-1 min-w-[180px]">
                    {isNarrating && narrationStage === 'openingLine' && openingLineToNarrate && (
                      <div className="bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium text-center shadow-lg max-w-full flex items-center">
                        <Loader2 className="inline-block mr-2 h-3 w-3 animate-spin flex-shrink-0" />
                        <span>{openingLineToNarrate}</span>
                      </div>
                    )}
                    {isNarrating && narrationStage === 'ceoNarration' && currentCeoCaption && (
                      <div className="bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium text-center shadow-lg max-w-full">
                        {currentCeoCaption}
                      </div>
                    )}
                    {narrationError && !isNarrating && (
                      <p className="text-red-400 text-xs mt-1 text-center px-2">{narrationError}</p>
                    )}
                  </div>
                </div>

                <div className="w-full md:flex-1 order-2 md:order-none">
                  <div className="bg-mw-dark-navy p-4 sm:p-6 rounded-md border border-mw-light-blue/30 min-h-[200px] flex flex-col justify-center h-full">
                    {fortune ? (
                      <div
                        className="text-mw-white text-sm sm:text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: fortune }}
                      />
                    ) : (
                      <p className="text-mw-white/70 text-center">Your fortune is being summoned (or an error occurred)...</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
              <Button
                onClick={handleSaveAndShare}
                size="lg"
                className="px-8 py-3 text-lg font-semibold \
                           bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] \
                           text-mw-dark-navy \
                           hover:opacity-90 \
                           rounded-lg shadow-md transform transition-all duration-150 \
                           hover:shadow-xl active:scale-95"
              >
                Click to Realize Your Dreams
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
} 