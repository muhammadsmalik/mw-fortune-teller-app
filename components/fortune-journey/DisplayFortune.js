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
import { Loader2, ArrowLeft, Lightbulb, BarChart, Users, Compass, Sparkles } from 'lucide-react';
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

export default function DisplayFortune({ 
  fortuneData, 
  onGoBack, 
  onProceedToNextStep,
  audioPlaybackAllowed: initialAudioAllowed = false
}) {
  const [init, setInit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [audioPlaybackAllowed, setAudioPlaybackAllowed] = useState(initialAudioAllowed);

  const [narrationStage, setNarrationStage] = useState('idle');
  const [isNarrating, setIsNarrating] = useState(false);
  const [narrationError, setNarrationError] = useState(null);
  const [currentCeoCaption, setCurrentCeoCaption] = useState('');
  const [openingLineToNarrate, setOpeningLineToNarrate] = useState('');

  const [hasPreRevealed, setHasPreRevealed] = useState(false);
  const [isTransitioningToCeo, setIsTransitioningToCeo] = useState(false);
  const [showCeoImage, setShowCeoImage] = useState(false);

  const audioContextRef = useRef(null);
  const howlNarrationRef = useRef(null);
  const revealChimeRef = useRef(null);
  const ceoAudioRef = useRef(null);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!audioContextRef.current) {
        try {
          console.log('[DisplayFortune] Attempting to create AudioContext.');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          console.log('[DisplayFortune] AudioContext created. State:', audioContextRef.current.state, 'SampleRate:', audioContextRef.current.sampleRate);
        } catch (e) {
          console.error('[DisplayFortune] Error creating AudioContext:', e);
          return null;
        }
      }
      return audioContextRef.current;
    }
    console.log('[DisplayFortune] Window undefined, cannot create AudioContext.');
    return null;
  }, []);

  // Memoized handler for CEO audio time updates
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
    if (fortuneData) {
      console.log('[DisplayFortune] Fortune data received:', fortuneData);
      if (fortuneData.error) {
        setError(fortuneData.error);
      } else {
        setError(null);
        // Save structured data for next steps
        localStorage.setItem('fortuneData', JSON.stringify(fortuneData));
        // Extract opening statement for narration
        const openingText = fortuneData.openingStatement || '';
        console.log('[DisplayFortune] Setting opening line for narration:', openingText);
        setOpeningLineToNarrate(openingText);
        setHasPreRevealed(true);
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setError(null);
    }
  }, [fortuneData]);

  // Audio Narration useEffect
  useEffect(() => {
    console.log('[DisplayFortune] Audio narration effect - conditions:', {
      init,
      audioPlaybackAllowed,
      openingLineToNarrate: !!openingLineToNarrate,
      openingText: openingLineToNarrate,
      hasPreRevealed,
      narrationStage
    });

    if (!init || !audioPlaybackAllowed || !openingLineToNarrate || !hasPreRevealed) {
      if (openingLineToNarrate && !audioPlaybackAllowed && hasPreRevealed && narrationStage === 'idle') {
        console.log('[DisplayFortune] Opening line is ready, but waiting for user to enable sound for narration.');
      }
      return;
    }

    if (narrationStage === 'idle' && openingLineToNarrate && hasPreRevealed && audioPlaybackAllowed) {
      console.log('[DisplayFortune] Conditions met to start opening line narration.');
      setNarrationStage('openingLine');
      return;
    }

    const playNarrationSegment = async (textToNarrate, onEndedCallback) => {
      console.log(`[DisplayFortune Howler] Attempting to generate narration for: "${textToNarrate}"`);
      
      if (isNarrating && howlNarrationRef.current && howlNarrationRef.current.playing() && narrationStage === 'openingLine') {
        console.log('[DisplayFortune Howler] Already narrating this segment (opening line), bailing.');
        return;
      }

      if (howlNarrationRef.current) {
        console.log('[DisplayFortune Howler] Unloading previous Howl narration instance.');
        howlNarrationRef.current.unload();
        howlNarrationRef.current = null;
      }

      const encodedTextInput = encodeURIComponent(textToNarrate);
      const voice = 'ballad';
      const streamUrl = `/api/generate-narration?voice=${voice}&textInput=${encodedTextInput}`;

      console.log('[DisplayFortune Howler] Using stream URL:', streamUrl);

      const sound = new Howl({
        src: [streamUrl],
        format: ['mp3'],
        html5: true,
        onload: () => {
          console.log('[DisplayFortune Howler] Howler metadata loaded for stream.');
        },
        onplay: () => {
          console.log('[DisplayFortune Howler] Howler playback started for stream.');
          setIsNarrating(true);
          setNarrationError(null);
        },
        onend: () => {
          console.log('[DisplayFortune Howler] Howler playback ended for stream:', textToNarrate);
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
        onloaderror: (id, error) => {
          console.error('[DisplayFortune Howler] Howler onloaderror for stream:', id, error);
          setNarrationError(`The Oracle's voice stream couldn't be loaded: ${error}. Code: ${id}`);
          setIsNarrating(false);
          howlNarrationRef.current = null;
          if (onEndedCallback) onEndedCallback();
        },
        onplayerror: (id, error) => {
          console.error('[DisplayFortune Howler] Howler onplayerror for stream:', id, error);
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
      console.log('[DisplayFortune Howler] Initiating playback for stream.');
      sound.play();
    };

    if (narrationStage === 'openingLine' && !isNarrating && !howlNarrationRef.current) {
      playNarrationSegment(openingLineToNarrate, () => {
        console.log('[DisplayFortune] Opening line narration finished. Moving to CEO narration.');
        setNarrationStage('ceoNarration');
      });
    } else if (narrationStage === 'ceoNarration' && !isNarrating) {
      // Play pre-recorded CEO audio
      if (ceoAudioRef.current && audioPlaybackAllowed) {
        console.log('[DisplayFortune] Attempting to play CEO audio mp3.');
        console.log('[DisplayFortune] CEO audio ref exists:', !!ceoAudioRef.current);
        console.log('[DisplayFortune] CEO audio element:', ceoAudioRef.current);
        setCurrentCeoCaption(''); // Clear any old captions
        const audioEl = ceoAudioRef.current;

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

        audioEl.addEventListener('ended', handleCeoAudioEnd);
        audioEl.addEventListener('error', handleCeoAudioError);
        audioEl.addEventListener('timeupdate', handleCeoTimeUpdate);
        audioEl.addEventListener('play', handleCeoAudioPlay);
        
        // Ensure AudioContext is resumed if suspended, for browsers that require interaction
        const audioContext = getAudioContext();
        console.log('[DisplayFortune] AudioContext state before CEO playback:', audioContext?.state);
        
        if (audioContext && audioContext.state === 'suspended') {
            console.log('[DisplayFortune] AudioContext suspended, attempting to resume...');
            console.log('[DisplayFortune] CEO audio element readyState:', audioEl.readyState);
            console.log('[DisplayFortune] CEO audio element src:', audioEl.src);
            console.log('[DisplayFortune] CEO audio element duration:', audioEl.duration);
            
            // Set a timeout for AudioContext.resume() in case it hangs
            const resumeTimeout = setTimeout(() => {
                console.warn('[DisplayFortune] AudioContext.resume() timeout - trying direct play instead');
                const playPromise = audioEl.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('[DisplayFortune] CEO audio play() succeeded (direct play after timeout)');
                    }).catch(e => {
                        console.error('[DisplayFortune] CEO audio direct play() failed after timeout:', e);
                        handleCeoAudioError(e);
                    });
                }
            }, 2000); // 2 second timeout
            
            audioContext.resume().then(() => {
                clearTimeout(resumeTimeout);
                console.log('[DisplayFortune] AudioContext resumed successfully! New state:', audioContext.state);
                console.log('[DisplayFortune] Now attempting to play CEO audio...');
                
                const playPromise = audioEl.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('[DisplayFortune] CEO audio play() succeeded');
                    }).catch(e => {
                        console.error('[DisplayFortune] CEO audio play() failed:', e);
                        handleCeoAudioError(e);
                    });
                } else {
                    console.log('[DisplayFortune] CEO audio play() returned undefined (legacy browser)');
                }
            }).catch(e => {
                clearTimeout(resumeTimeout);
                console.error('[DisplayFortune] Error resuming AudioContext for CEO mp3:', e);
                console.error('[DisplayFortune] AudioContext resume error details:', e.name, e.message);
                
                // Try direct play as fallback
                console.log('[DisplayFortune] Attempting direct CEO audio play as fallback...');
                const playPromise = audioEl.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('[DisplayFortune] CEO audio play() succeeded (direct fallback)');
                    }).catch(e => {
                        console.error('[DisplayFortune] CEO audio direct play() fallback also failed:', e);
                        handleCeoAudioError(e);
                    });
                }
            });
        } else if (audioContext && audioContext.state === 'running') {
            console.log('[DisplayFortune] AudioContext already running, playing CEO audio directly.');
            audioEl.play().catch(e => handleCeoAudioError(e));
        } else if (audioContext) {
            console.log('[DisplayFortune] AudioContext in unknown state:', audioContext.state, 'attempting direct play.');
            audioEl.play().catch(e => handleCeoAudioError(e));
        } else {
            // Fallback if audio context couldn't be initialized/resumed (should ideally not happen if playback was allowed)
            console.warn('[DisplayFortune] AudioContext not available for CEO mp3, attempting direct play.');
            audioEl.play().catch(e => handleCeoAudioError(e));
        }

      } else {
        if (!audioPlaybackAllowed) {
            console.warn('[DisplayFortune] CEO audio narration skipped: Audio playback not allowed.');
        } else {
            console.error('[DisplayFortune] ceoAudioRef.current is null. Cannot play CEO audio.');
        }
        setNarrationStage('transitioning');
      }
    }

    return () => {
      if (howlNarrationRef.current) {
        console.log('[DisplayFortune Howler] Cleaning up: Unloading Howl narration instance.');
        howlNarrationRef.current.unload();
        howlNarrationRef.current = null;
      }
      if (revealChimeRef.current) {
        revealChimeRef.current.pause();
        revealChimeRef.current.currentTime = 0;
      }
      // Cleanup CEO audio listeners if component unmounts while it might be playing
      if (ceoAudioRef.current) {
        ceoAudioRef.current.removeEventListener('timeupdate', handleCeoTimeUpdate);
      }
    };
  }, [init, openingLineToNarrate, getAudioContext, audioPlaybackAllowed, hasPreRevealed, narrationStage, handleCeoTimeUpdate]);

  useEffect(() => {
    if (narrationStage === 'transitioning') {
      console.log('[DisplayFortune] Starting CEO transition sequence. Attempting to play chime.');
      setIsTransitioningToCeo(true);
      if (revealChimeRef.current) {
        console.log('[DisplayFortune] revealChimeRef.current exists. Calling play().');
        revealChimeRef.current.play()
          .then(() => {
            console.log('[DisplayFortune] Reveal chime played successfully during CEO transition.');
          })
          .catch(e => {
            console.error("[DisplayFortune] Error playing reveal chime during CEO transition:", e);
          });
      } else {
        console.warn('[DisplayFortune] revealChimeRef.current is null during CEO transition. Cannot play chime.');
      }

      const timer = setTimeout(() => {
        console.log('[DisplayFortune] Smoke effect finished. Showing CEO image.');
        setShowCeoImage(true);
        setIsTransitioningToCeo(false);
        setNarrationStage('done');
      }, SMOKE_EFFECT_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [narrationStage]);
    
  const particlesOptions = useMemo(() => ({
    background: { color: { value: '#0a0a2a' } },
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: { enable: true, mode: 'repulse' },
      },
      modes: {
        repulse: { distance: 100, duration: 0.4 },
      },
    },
    particles: {
      color: { value: '#ffffff' },
      links: {
        color: '#ffffff',
        distance: 150,
        enable: false,
        opacity: 0.1,
        width: 1,
      },
      move: {
        direction: 'none',
        enable: true,
        outModes: { default: 'out' },
        random: true,
        speed: 0.5,
        straight: false,
      },
      number: { density: { enable: true }, value: 100 },
      opacity: { value: { min: 0.1, max: 0.5 } },
      shape: { type: 'circle' },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  }), []);

  const handleEnableAudio = () => {
    setAudioPlaybackAllowed(true);
    const audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('[DisplayFortune] AudioContext resumed by user interaction (Enable Sound button).');
      }).catch(e => console.error('[DisplayFortune] Error resuming AudioContext via Enable Sound:', e));
    }
    if (revealChimeRef.current) {
        revealChimeRef.current.play().then(() => revealChimeRef.current.pause()).catch(() => {});
    }
    if (ceoAudioRef.current) {
        ceoAudioRef.current.play().then(() => ceoAudioRef.current.pause()).catch(() => {});
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-mw-gold" />
          <p className="mt-4 text-lg text-mw-white/80 font-caveat">The Oracle is gazing into the future...</p>
        </div>
      );
    }

    if (error) {
    return (
        <div className="text-center h-64 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-red-400">A Disturbance in the Ether</h2>
          <p className="mt-2 text-mw-white/70">{error}</p>
      </div>
    );
  }

    if (fortuneData) {
  return (
        <div className="flex flex-col lg:flex-row items-center lg:items-center gap-6 lg:gap-12">
          <div className="w-[150px] sm:w-[180px] lg:w-[220px] flex-shrink-0 order-1 lg:order-none flex flex-col items-center relative">
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
                {showCeoImage ? "Moving Walls" : narrationStage === 'ceoNarration' ? "Moving Walls" : "Fortune Teller"}
              </p>
            )}
            {/* Status/Caption Area */}
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

          <div className="w-full lg:flex-1 order-2 lg:order-none max-w-none">
            <div className="bg-gradient-to-br from-mw-dark-navy/90 via-purple-900/20 to-mw-dark-navy/90 p-6 sm:p-8 rounded-md border border-mw-light-blue/40 min-h-[200px] flex flex-col justify-center h-full backdrop-blur-sm relative overflow-hidden">
              {/* Inner glitter effect */}
              <div className="absolute inset-0 opacity-20">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${3 + Math.random() * 2}s`,
                    }}
                  >
                    <div className="w-0.5 h-0.5 bg-mw-gold rounded-full opacity-60" />
                  </div>
                ))}
              </div>
                              <div className="text-left space-y-6 relative z-10">
                  <p className="font-sans text-2xl sm:text-3xl font-bold bg-gradient-to-r from-mw-gold via-yellow-300 to-mw-gold bg-clip-text text-transparent text-center leading-tight">
                    "{fortuneData.openingStatement}"
                  </p>
                
                <div className="border-t border-mw-white/10 pt-6">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-mw-light-blue via-blue-300 to-mw-light-blue bg-clip-text text-transparent flex items-center mb-4">
                    <Lightbulb className="h-7 w-7 mr-3 text-mw-light-blue/80 animate-pulse" />
                    <span className="italic">"{fortuneData.insight1.challenge}"</span>
                  </h3>
                  <div className="text-mw-white/90 leading-relaxed text-xl pl-10">
                                          {fortuneData.insight1.insight.split('\n').map((line, index) => (
                        <div key={index} className="flex items-start mb-2">
                          <span className="bg-gradient-to-r from-mw-gold to-yellow-400 bg-clip-text text-transparent mr-3 text-xl animate-pulse">•</span>
                          <span>{line.trim()}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="border-t border-mw-white/10 pt-6">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-mw-light-blue via-blue-300 to-mw-light-blue bg-clip-text text-transparent flex items-center mb-4">
                    <BarChart className="h-7 w-7 mr-3 text-mw-light-blue/80 animate-pulse" />
                    <span className="italic">"{fortuneData.insight2.challenge}"</span>
                  </h3>
                  <div className="text-mw-white/90 leading-relaxed text-xl pl-10">
                                          {fortuneData.insight2.insight.split('\n').map((line, index) => (
                        <div key={index} className="flex items-start mb-2">
                          <span className="bg-gradient-to-r from-mw-gold to-yellow-400 bg-clip-text text-transparent mr-3 text-xl animate-pulse">•</span>
                          <span>{line.trim()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {init && <Particles id="tsparticles" options={particlesOptions} />}
      <div className="min-h-screen bg-gradient-to-br from-mw-dark-navy via-purple-900/20 to-mw-dark-navy flex flex-col items-center justify-center p-4 relative z-10 overflow-hidden">
        {/* Glitter Animation */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div className="w-1 h-1 bg-gradient-to-r from-mw-gold to-yellow-300 rounded-full animate-ping" />
            </div>
          ))}
        </div>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-6xl"
        >
                      <Card className="bg-gradient-to-br from-mw-dark-blue/60 via-purple-900/30 to-mw-dark-blue/60 backdrop-blur-sm border border-mw-light-blue/30 shadow-2xl shadow-mw-light-blue/20 relative overflow-hidden">
              {/* Card glitter overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-mw-gold/5 to-transparent animate-pulse" />
            <CardHeader>
                              <CardTitle className="text-center text-4xl font-morrison bg-gradient-to-r from-mw-gold via-yellow-300 to-mw-gold bg-clip-text text-transparent tracking-wider flex items-center justify-center gap-3 relative z-10">
                <Sparkles className="h-8 w-8 text-mw-gold animate-pulse" />
                Your Destiny Awakens
                <Sparkles className="h-8 w-8 text-mw-gold animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-8 sm:px-10">
              {renderContent()}
            </CardContent>
            <CardFooter className="flex justify-between p-6">
              <Button variant="outline" onClick={onGoBack} className="border-mw-light-blue/50 text-mw-light-blue hover:bg-mw-light-blue/10 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Choices
              </Button>
              <Button
                onClick={onProceedToNextStep}
                disabled={isLoading || !!error}
                className="bg-mw-gold text-mw-dark-navy font-bold hover:bg-mw-gold/90 transition-all duration-300 shadow-lg shadow-mw-gold/20"
              >
                Realize my Dream
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
    </div>
    </>
  );
} 