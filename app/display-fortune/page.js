'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';

const TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie's voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

**Cadence & Rhythm:**
The speech has a *deliberate elegance*, often flowing like ancient poetry or song, with rhythmic pauses that make each word feel significant—*measured, but not slow*. It can shift instantly, becoming quick and unpredictable, like a spark leaping from fire when the genie is amused, annoyed, or impatient.

**Accents & Inflections:**
There might be traces of archaic or exotic accents, difficult to place—part Middle Eastern, part celestial, part something entirely unearthly. The vowels stretch luxuriously, and the consonants often land with a whispered crispness, like dry leaves brushing against stone. When casting spel`;

// const CEO_NARRATION_TEXT = "But fate does not speak idly. It brings you to those you're meant to meet. My role here is done… and as I fade, another takes my place. He walks the road you now stand before. Connect with him — your timing is no accident.";
const SMOKE_EFFECT_DURATION_MS = 2000; // 3 seconds for smoke effect

export default function DisplayFortuneScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [fortune, setFortune] = useState('');
  const [isLoadingFortune, setIsLoadingFortune] = useState(true);
  const [audioPlaybackAllowed, setAudioPlaybackAllowed] = useState(false);

  const [openingLineToNarrate, setOpeningLineToNarrate] = useState('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [narrationError, setNarrationError] = useState(null);

  const [narrationStage, setNarrationStage] = useState('idle');

  const audioContextRef = useRef(null);
  const howlNarrationRef = useRef(null);
  const revealChimeRef = useRef(null);
  const ceoAudioRef = useRef(null); // Added for CEO audio

  const [hasPreRevealed, setHasPreRevealed] = useState(false);

  const [isTransitioningToCeo, setIsTransitioningToCeo] = useState(false);
  const [showCeoImage, setShowCeoImage] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!audioContextRef.current) {
        try {
          console.log('[DisplayFortuneScreen] Attempting to create AudioContext.');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          console.log('[DisplayFortuneScreen] AudioContext created. State:', audioContextRef.current.state, 'SampleRate:', audioContextRef.current.sampleRate);
        } catch (e) {
          console.error('[DisplayFortuneScreen] Error creating AudioContext:', e);
          return null;
        }
      }
      return audioContextRef.current;
    }
    console.log('[DisplayFortuneScreen] Window undefined, cannot create AudioContext.');
    return null;
  }, []);

  useEffect(() => {
    if (!init) return;

    setIsLoadingFortune(true);
    setOpeningLineToNarrate('');
    setNarrationError(null);
    setHasPreRevealed(false);
    setNarrationStage('idle');
    setIsTransitioningToCeo(false);
    setShowCeoImage(false);

    const storedFortuneData = localStorage.getItem('fortuneData');
    let htmlString = '';
    let localOpeningLine = "A mysterious silence...";

    if (storedFortuneData) {
      try {
        const parsedData = JSON.parse(storedFortuneData);
        localStorage.setItem('fortuneApp_structuredFortune', JSON.stringify(parsedData));
        
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
        console.error("Error parsing fortune data:", error);
        htmlString = '<p class="text-mw-white/70 text-center">There was a slight distortion in the cosmic message. Please try again.</p>';
      }
    } else {
      htmlString = '<p class="text-mw-white/70 text-center">The stars are not aligned for a fortune at this moment. Please start your journey anew.</p>';
    }

    setFortune(htmlString);
    setOpeningLineToNarrate(localOpeningLine);
    
    localStorage.setItem('fortuneApp_fortuneText', htmlString);

    if (htmlString) {
        setIsLoadingFortune(false);
        setHasPreRevealed(true);
        console.log('[DisplayFortuneScreen] Fortune data loaded, setting hasPreRevealed to true.');
    } else {
        setIsLoadingFortune(false);
    }

  }, [init]);

  useEffect(() => {
    if (!init || !audioPlaybackAllowed || !openingLineToNarrate || !hasPreRevealed) {
      if (openingLineToNarrate && !audioPlaybackAllowed && hasPreRevealed && narrationStage === 'idle') {
        console.log('[DisplayFortuneScreen] Opening line is ready, but waiting for user to enable sound for narration.');
      }
      return;
    }

    if (narrationStage === 'idle' && openingLineToNarrate && hasPreRevealed && audioPlaybackAllowed) {
      console.log('[DisplayFortuneScreen] Conditions met to start opening line narration.');
      setNarrationStage('openingLine');
      return;
    }

    const playNarrationSegment = async (textToNarrate, onEndedCallback) => {
      console.log(`[DisplayFortuneScreen Howler] Attempting to generate narration for: "${textToNarrate}"`);
      
      if (isNarrating && howlNarrationRef.current && howlNarrationRef.current.playing()) {
        console.log('[DisplayFortuneScreen Howler] Already narrating this segment, bailing.');
        return;
      }

      if (howlNarrationRef.current) {
        console.log('[DisplayFortuneScreen Howler] Unloading previous Howl narration instance.');
        howlNarrationRef.current.unload();
        howlNarrationRef.current = null;
      }

      const encodedTextInput = encodeURIComponent(textToNarrate);
      const voice = 'ballad';
      const streamUrl = `/api/generate-narration?voice=${voice}&textInput=${encodedTextInput}`;

      console.log('[DisplayFortuneScreen Howler] Using stream URL:', streamUrl);

      const sound = new Howl({
        src: [streamUrl],
        format: ['mp3'],
        html5: true,
        onload: () => {
          console.log('[DisplayFortuneScreen Howler] Howler metadata loaded for stream.');
        },
        onplay: () => {
          console.log('[DisplayFortuneScreen Howler] Howler playback started for stream.');
          setIsNarrating(true);
          setNarrationError(null);
        },
        onend: () => {
          console.log('[DisplayFortuneScreen Howler] Howler playback ended for stream:', textToNarrate);
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
        onloaderror: (id, error) => {
          console.error('[DisplayFortuneScreen Howler] Howler onloaderror for stream:', id, error);
          setNarrationError(`The Oracle's voice stream couldn't be loaded: ${error}. Code: ${id}`);
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
        onplayerror: (id, error) => {
          console.error('[DisplayFortuneScreen Howler] Howler onplayerror for stream:', id, error);
          let errorMessage = `The Oracle's voice stream couldn't play: ${error}. Code: ${id}`;
          if (String(error).includes("play() failed because the user didn't interact with the document first")) {
            errorMessage += " Please click 'Enable Sound' or interact with the page.";
          }
          setNarrationError(errorMessage);
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
      });

      howlNarrationRef.current = sound;
      console.log('[DisplayFortuneScreen Howler] Initiating playback for stream.');
      sound.play();
    };

    if (narrationStage === 'openingLine' && !isNarrating) {
      playNarrationSegment(openingLineToNarrate, () => {
        console.log('[DisplayFortuneScreen] Opening line narration finished. Moving to CEO narration.');
        setNarrationStage('ceoNarration');
      });
    } else if (narrationStage === 'ceoNarration' && !isNarrating) {
      // Play pre-recorded CEO audio
      if (ceoAudioRef.current && audioPlaybackAllowed) {
        console.log('[DisplayFortuneScreen] Attempting to play CEO audio mp3.');
        setIsNarrating(true);
        setNarrationError(null);
        const audioEl = ceoAudioRef.current;

        const handleCeoAudioEnd = () => {
          console.log('[DisplayFortuneScreen] CEO audio mp3 playback ended.');
          setIsNarrating(false);
          setNarrationStage('transitioning');
          audioEl.removeEventListener('ended', handleCeoAudioEnd);
          audioEl.removeEventListener('error', handleCeoAudioError);
        };

        const handleCeoAudioError = (e) => {
          console.error('[DisplayFortuneScreen] Error playing CEO audio mp3:', e);
          setNarrationError("The Oracle's message seems to be incomplete. Please try again later.");
          setIsNarrating(false);
          setNarrationStage('done'); 
          audioEl.removeEventListener('ended', handleCeoAudioEnd);
          audioEl.removeEventListener('error', handleCeoAudioError);
        };

        audioEl.addEventListener('ended', handleCeoAudioEnd);
        audioEl.addEventListener('error', handleCeoAudioError);
        
        // Ensure AudioContext is resumed if suspended, for browsers that require interaction
        const audioContext = getAudioContext();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('[DisplayFortuneScreen] AudioContext resumed for CEO mp3 playback.');
                audioEl.play().catch(e => handleCeoAudioError(e));
            }).catch(e => {
                console.error('[DisplayFortuneScreen] Error resuming AudioContext for CEO mp3:', e);
                handleCeoAudioError(e);
            });
        } else if (audioContext) {
             audioEl.play().catch(e => handleCeoAudioError(e));
        } else {
            // Fallback if audio context couldn't be initialized/resumed (should ideally not happen if playback was allowed)
            console.warn('[DisplayFortuneScreen] AudioContext not available for CEO mp3, attempting direct play.');
            audioEl.play().catch(e => handleCeoAudioError(e));
        }

      } else {
        if (!audioPlaybackAllowed) {
            console.warn('[DisplayFortuneScreen] CEO audio narration skipped: Audio playback not allowed.');
        } else {
            console.error('[DisplayFortuneScreen] ceoAudioRef.current is null. Cannot play CEO audio.');
        }
        setNarrationStage('transitioning');
      }
    }

    return () => {
      if (howlNarrationRef.current) {
        console.log('[DisplayFortuneScreen Howler] Cleaning up: Unloading Howl narration instance.');
        howlNarrationRef.current.unload();
        howlNarrationRef.current = null;
      }
      if (revealChimeRef.current) {
        revealChimeRef.current.pause();
        revealChimeRef.current.currentTime = 0;
      }
    };
  }, [init, openingLineToNarrate, getAudioContext, audioPlaybackAllowed, hasPreRevealed, narrationStage]);

  useEffect(() => {
    if (narrationStage === 'transitioning') {
      console.log('[DisplayFortuneScreen] Starting CEO transition sequence. Attempting to play chime.');
      setIsTransitioningToCeo(true);
      if (revealChimeRef.current) {
        console.log('[DisplayFortuneScreen] revealChimeRef.current exists. Calling play().');
        revealChimeRef.current.play()
          .then(() => {
            console.log('[DisplayFortuneScreen] Reveal chime played successfully during CEO transition.');
          })
          .catch(e => {
            console.error("[DisplayFortuneScreen] Error playing reveal chime during CEO transition:", e);
          });
      } else {
        console.warn('[DisplayFortuneScreen] revealChimeRef.current is null during CEO transition. Cannot play chime.');
      }

      const timer = setTimeout(() => {
        console.log('[DisplayFortuneScreen] Smoke effect finished. Showing CEO image.');
        setShowCeoImage(true);
        setIsTransitioningToCeo(false);
        setNarrationStage('done');
      }, SMOKE_EFFECT_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [narrationStage]);

  const particlesLoaded = useCallback(async (container) => {
  }, []);

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
    console.log("Save & Share clicked. Fortune:", fortune);
    router.push('/scenario-answers');
  };

  const handleEnableAudio = () => {
    setAudioPlaybackAllowed(true);
    const audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('[DisplayFortuneScreen] AudioContext resumed by user interaction (Enable Sound button).');
      }).catch(e => console.error('[DisplayFortuneScreen] Error resuming AudioContext via Enable Sound:', e));
    }
    if (revealChimeRef.current) {
        revealChimeRef.current.play().then(() => revealChimeRef.current.pause()).catch(() => {});
    }
    if (ceoAudioRef.current) {
        ceoAudioRef.current.play().then(() => ceoAudioRef.current.pause()).catch(() => {});
    }
  };

  if (!init || isLoadingFortune) {
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
      <Particles
        id="tsparticles-display-fortune"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />
      <audio ref={revealChimeRef} src="/audio/reveal_chime.mp3" preload="auto" />
      <audio ref={ceoAudioRef} src="/audio/reach_out_to_mw.mp3" preload="auto" />
      
      {!audioPlaybackAllowed && hasPreRevealed && (
        <div className="absolute top-6 right-6 z-20">
          <Button
            onClick={handleEnableAudio}
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
                        src="/MW-logo-web.svg"
                        alt="Moving Walls Logo"
                        width={822}
                        height={822}
                        layout="responsive"
                        className="rounded-lg"
                      />
                    </motion.div>
                  )}
                  {!isTransitioningToCeo && (
                    <p className="text-center text-mw-white mt-3 font-semibold">
                      {showCeoImage ? "Moving Walls" : "Fortune Teller"}
                    </p>
                  )}
                  {isNarrating && (
                    <p className="text-mw-light-blue text-sm mt-2 text-center animate-pulse">
                      <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                      The oracle is speaking...
                    </p>
                  )}
                  {narrationError && !isNarrating && (
                    <p className="text-red-400 text-xs mt-2 text-center px-2">{narrationError}</p>
                  )}
                </div>

                <div className="w-full md:flex-1 order-2 md:order-none">
                  <div className="bg-mw-dark-navy p-4 sm:p-6 rounded-md border border-mw-light-blue/30 min-h-[200px] flex flex-col justify-center h-full">
                    {fortune ? (
                      <div
                        className="text-mw-white text-sm sm:text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: fortune }}
                      />
                    ) : (
                      <p className="text-mw-white/70 text-center">Your fortune is being summoned...</p>
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