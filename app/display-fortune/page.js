'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import AudioPlayer from '@/components/AudioPlayer';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie's voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

**Cadence & Rhythm:**
The speech has a *deliberate elegance*, often flowing like ancient poetry or song, with rhythmic pauses that make each word feel significant—*measured, but not slow*. It can shift instantly, becoming quick and unpredictable, like a spark leaping from fire when the genie is amused, annoyed, or impatient.

**Accents & Inflections:**
There might be traces of archaic or exotic accents, difficult to place—part Middle Eastern, part celestial, part something entirely unearthly. The vowels stretch luxuriously, and the consonants often land with a whispered crispness, like dry leaves brushing against stone. When casting spel`;

const CEO_NARRATION_TEXT = "But fate does not speak idly. It brings you to those you're meant to meet. My role here is done… and as I fade, another takes my place. He walks the road you now stand before. Connect with him — your timing is no accident.";
const SMOKE_EFFECT_DURATION_MS = 3000; // 3 seconds for smoke effect

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
  const narrationAudioSourceRef = useRef(null);
  const revealChimeRef = useRef(null);

  const [isPreRevealing, setIsPreRevealing] = useState(false);
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
          console.log('[DisplayFortuneScreen] Attempting to create AudioContext with 24kHz sample rate.');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          console.log('[DisplayFortuneScreen] AudioContext created. State:', audioContextRef.current.state, 'SampleRate:', audioContextRef.current.sampleRate);
        } catch (e) {
          console.error('[DisplayFortuneScreen] Error creating AudioContext:', e);
          setNarrationError("Failed to initialize audio system for narration. " + e.message);
          return null;
        }
      }
      return audioContextRef.current;
    }
    console.log('[DisplayFortuneScreen] Window undefined, cannot create AudioContext for narration.');
    return null;
  }, []);

  useEffect(() => {
    if (!init) return;

    setIsLoadingFortune(true);
    setOpeningLineToNarrate('');
    setNarrationError(null);
    setIsPreRevealing(false);
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
        setIsPreRevealing(true);
    } else {
        setIsLoadingFortune(false);
    }

  }, [init]);

  useEffect(() => {
    if (isPreRevealing) {
      setIsLoadingFortune(false);
      console.log('[DisplayFortuneScreen] Starting pre-reveal sequence.');
      if (revealChimeRef.current) {
        revealChimeRef.current.play().catch(e => console.error("Error playing reveal chime:", e));
      }
      const preRevealDuration = 2500;
      const timer = setTimeout(() => {
        console.log('[DisplayFortuneScreen] Pre-reveal finished.');
        setIsPreRevealing(false);
        setHasPreRevealed(true);
      }, preRevealDuration);
      return () => clearTimeout(timer);
    }
  }, [isPreRevealing]);

  useEffect(() => {
    if (!init || !audioPlaybackAllowed || !openingLineToNarrate || isNarrating || !hasPreRevealed) {
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
      console.log(`[DisplayFortuneScreen] Attempting to generate narration for: "${textToNarrate}"`);
      setIsNarrating(true);
      setNarrationError(null);

      const audioContext = getAudioContext();
      if (!audioContext) {
        setIsNarrating(false);
        return;
      }

      try {
        if (audioContext.state === 'suspended') {
          console.log('[DisplayFortuneScreen] AudioContext is suspended, attempting to resume for narration.');
          await audioContext.resume();
          console.log('[DisplayFortuneScreen] AudioContext resumed for narration. New state:', audioContext.state);
        }

        const response = await fetch('/api/generate-narration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textInput: textToNarrate,
            instructions: TTS_INSTRUCTIONS,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ 
            error: "Failed to parse error from narration API", 
            details: `Status: ${response.status} ${response.statusText}` 
          }));
          console.error('[DisplayFortuneScreen] Narration API request failed:', errorData);
          throw new Error(errorData.error || errorData.details || `Narration API request failed (${response.status})`);
        }

        const reader = response.body.getReader();
        let audioBufferChunks = [];
        let totalLength = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          audioBufferChunks.push(value);
          totalLength += value.length;
        }

        if (totalLength === 0) {
          console.error('[DisplayFortuneScreen] Narration API returned empty audio stream.');
          throw new Error("Received empty audio stream from Oracle.");
        }

        const pcmData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioBufferChunks) {
          pcmData.set(chunk, offset);
          offset += chunk.length;
        }

        const float32Data = new Float32Array(pcmData.length / 2);
        for (let i = 0; i < float32Data.length; i++) {
          let val = pcmData[i * 2] + (pcmData[i * 2 + 1] << 8);
          if (val >= 0x8000) val |= ~0xFFFF;
          float32Data[i] = val / 0x8000;
        }
        
        const audioBuffer = audioContext.createBuffer(1, float32Data.length, audioContext.sampleRate);
        audioBuffer.getChannelData(0).set(float32Data);

        if (narrationAudioSourceRef.current) {
          narrationAudioSourceRef.current.stop();
          narrationAudioSourceRef.current.disconnect();
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        narrationAudioSourceRef.current = source;
        
        console.log('[DisplayFortuneScreen] Narration audio is now playing via Web Audio API.');

        source.onended = () => {
          console.log('[DisplayFortuneScreen] Narration audio playback ended for:', textToNarrate);
          narrationAudioSourceRef.current = null;
          setIsNarrating(false);
          if (onEndedCallback) onEndedCallback();
        };

      } catch (error) {
        console.error('[DisplayFortuneScreen] Error generating or playing narration:', error);
        setNarrationError(`The Oracle's voice seems to be lost in the ether. ${error.message}`);
        setIsNarrating(false);
        setNarrationStage('done');
      }
    };

    if (narrationStage === 'openingLine' && !isNarrating) {
      playNarrationSegment(openingLineToNarrate, () => {
        console.log('[DisplayFortuneScreen] Opening line narration finished. Moving to CEO narration.');
        setNarrationStage('ceoNarration');
      });
    } else if (narrationStage === 'ceoNarration' && !isNarrating) {
      playNarrationSegment(CEO_NARRATION_TEXT, () => {
        console.log('[DisplayFortuneScreen] CEO narration finished. Moving to transition stage.');
        setNarrationStage('transitioning');
      });
    }

    return () => {
      if (narrationAudioSourceRef.current) {
        console.log('[DisplayFortuneScreen] Cleaning up: Stopping narration audio source.');
        narrationAudioSourceRef.current.stop();
        narrationAudioSourceRef.current.disconnect();
        narrationAudioSourceRef.current = null;
      }
      if (revealChimeRef.current) {
        revealChimeRef.current.pause();
        revealChimeRef.current.currentTime = 0;
      }
    };
  }, [init, openingLineToNarrate, getAudioContext, isNarrating, audioPlaybackAllowed, hasPreRevealed, narrationStage]);

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
    router.push('/contact-details');
  };

  const handleEnableAudio = () => {
    setAudioPlaybackAllowed(true);
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('[DisplayFortuneScreen] AudioContext resumed by user interaction.');
      }).catch(e => console.error('[DisplayFortuneScreen] Error resuming AudioContext:', e));
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

  if (isPreRevealing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
        <Particles
          id="tsparticles-prereveal"
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className="flex flex-col items-center"
        >
          <Image src="/avatar/fortune-teller-eyes-glow.png" alt="Mystical Eyes" width={300} height={225} className="mb-6" />
          <p className="text-3xl font-caveat text-mw-light-blue animate-pulse">The mists of fate are swirling...</p>
        </motion.div>
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
                      {/* Smoke effect divs and "Transforming..." text removed */}
                    </div>
                  )}
                  <AnimatePresence>
                    {!showCeoImage && !isTransitioningToCeo && (
                      <motion.div
                        key="fortune-teller"
                        initial={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: SMOKE_EFFECT_DURATION_MS / 2000 } }} // Half of total duration for fade out
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
                      animate={{ opacity: 1, scale: 1, transition: { duration: SMOKE_EFFECT_DURATION_MS / 2000, delay: SMOKE_EFFECT_DURATION_MS / 2000 } }} // Delay and fade in for the other half
                      className="w-full rounded-lg shadow-md overflow-hidden"
                    >
                      <Image
                        src="/srikanth-reduced.png"
                        alt="Srikanth Ramachandran, Founder and CEO of Moving Walls"
                        width={822}
                        height={1012}
                        layout="responsive"
                        className="rounded-lg"
                      />
                    </motion.div>
                  )}
                  {!isTransitioningToCeo && (
                    <p className="text-center text-mw-white mt-3 font-semibold">
                      {showCeoImage ? "Srikanth Ramachandran, Founder and CEO of Moving Walls" : "Fortune Teller"}
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
                Save & Share This Wisdom
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
} 