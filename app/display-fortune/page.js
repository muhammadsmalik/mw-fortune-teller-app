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
import { motion } from 'framer-motion';

const TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie's voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

**Cadence & Rhythm:**
The speech has a *deliberate elegance*, often flowing like ancient poetry or song, with rhythmic pauses that make each word feel significant—*measured, but not slow*. It can shift instantly, becoming quick and unpredictable, like a spark leaping from fire when the genie is amused, annoyed, or impatient.

**Accents & Inflections:**
There might be traces of archaic or exotic accents, difficult to place—part Middle Eastern, part celestial, part something entirely unearthly. The vowels stretch luxuriously, and the consonants often land with a whispered crispness, like dry leaves brushing against stone. When casting spel`;

export default function DisplayFortuneScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [fortune, setFortune] = useState('');
  const [isLoadingFortune, setIsLoadingFortune] = useState(true);
  const [audioPlaybackAllowed, setAudioPlaybackAllowed] = useState(false);

  const [openingLineToNarrate, setOpeningLineToNarrate] = useState('');
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [narrationError, setNarrationError] = useState(null);

  const [hasPlayedOpeningLine, setHasPlayedOpeningLine] = useState(false);

  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const revealChimeRef = useRef(null);

  // States for the new reveal sequence
  const [isPreRevealing, setIsPreRevealing] = useState(false);
  const [hasPreRevealed, setHasPreRevealed] = useState(false);

  // const fortuneAudioFiles = useMemo(() => ['reach_out_1.mp3', 'reach_out_2.mp3', 'reach_out_3.mp3'], []); // Removed

  // Particles engine initialization
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
    // NOTE: This effect should ideally only run once for particle init.
    // The fortune loading logic will be in a separate useEffect that depends on `init`.
  }, []);

  // Function to initialize AudioContext safely on client
  const getAudioContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (!audioContextRef.current) {
        try {
          console.log('[DisplayFortuneScreen] Attempting to create AudioContext with 24kHz sample rate.');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 }); // OpenAI TTS uses 24kHz
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

  // Effect for loading and setting fortune data
  useEffect(() => {
    if (!init) return; // Don't run if particles aren't initialized yet

    setIsLoadingFortune(true); // Explicitly set loading true when we start fetching/processing
    setOpeningLineToNarrate(''); // Reset previous opening line
    setNarrationError(null); // Reset previous narration error
    setHasPlayedOpeningLine(false); // Reset for new fortune line
    setIsPreRevealing(false); // Reset pre-reveal state
    setHasPreRevealed(false); // Reset pre-reveal state

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
        // The AI advice should contain the CTA. If a generic CTA is still desired: 
        // htmlString += `<p class="mt-6 text-mw-white/80 italic text-center text-sm">To discover how Moving Walls can make this a reality, <a href="#" class='font-semibold text-mw-light-blue hover:underline'>reach out to us</a>!</p>`;

      } catch (error) {
        console.error("Error parsing fortune data:", error);
        htmlString = '<p class="text-mw-white/70 text-center">There was a slight distortion in the cosmic message. Please try again.</p>';
      }
    } else {
      htmlString = '<p class="text-mw-white/70 text-center">The stars are not aligned for a fortune at this moment. Please start your journey anew.</p>';
    }

    setFortune(htmlString);
    setOpeningLineToNarrate(localOpeningLine); // Set opening line to trigger narration
    
    // Store the generated fortune text for the contact page
    localStorage.setItem('fortuneApp_fortuneText', htmlString);

    // Start pre-reveal after initial data processing is done
    if (htmlString) { // Only start pre-reveal if there's a fortune to show
        setIsPreRevealing(true);
    } else {
        setIsLoadingFortune(false); // If no fortune, just stop loading
    }

    // Optional: Clear the stored fortune after displaying it if it's a one-time view
    // localStorage.removeItem('fortuneData');

  }, [init]); // Rerun when init changes (i.e., after particles are ready)

  // Effect for managing the pre-reveal sequence (mist animation + chime)
  useEffect(() => {
    if (isPreRevealing) {
      setIsLoadingFortune(false); // Stop main loading spinner
      console.log('[DisplayFortuneScreen] Starting pre-reveal sequence.');
      if (revealChimeRef.current) {
        revealChimeRef.current.play().catch(e => console.error("Error playing reveal chime:", e));
      }
      // Duration of the pre-reveal (e.g., mist animation and chime)
      const preRevealDuration = 2500; // 2.5 seconds
      const timer = setTimeout(() => {
        console.log('[DisplayFortuneScreen] Pre-reveal finished.');
        setIsPreRevealing(false);
        setHasPreRevealed(true);
      }, preRevealDuration);
      return () => clearTimeout(timer);
    }
  }, [isPreRevealing]);

  // Effect for generating narration for the opening line
  useEffect(() => {
    // Only proceed if init, playback allowed, there's a line, not generating, not already played, AND pre-reveal is done.
    if (!init || !audioPlaybackAllowed || !openingLineToNarrate || isGeneratingNarration || hasPlayedOpeningLine || !hasPreRevealed) {
      if (openingLineToNarrate && !audioPlaybackAllowed && !hasPlayedOpeningLine && hasPreRevealed) {
        console.log('[DisplayFortuneScreen] Opening line is ready, but waiting for user to enable sound for narration.');
      } else if (openingLineToNarrate && audioPlaybackAllowed && !isGeneratingNarration && hasPlayedOpeningLine && hasPreRevealed) {
        console.log('[DisplayFortuneScreen] Opening line narration has already played for the current line.');
      }
      return;
    }

    const generateAndPlayNarration = async () => {
      console.log('[DisplayFortuneScreen] Attempting to generate narration for:', openingLineToNarrate);
      setIsGeneratingNarration(true);
      setNarrationError(null);

      const audioContext = getAudioContext();
      if (!audioContext) {
        // Error is set by getAudioContext or if it returns null before this point
        setIsGeneratingNarration(false);
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
            textInput: openingLineToNarrate,
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
          if (val >= 0x8000) val |= ~0xFFFF; // Sign-extend 16-bit to 32-bit
          float32Data[i] = val / 0x8000; // Normalize to [-1, 1]
        }
        
        const audioBuffer = audioContext.createBuffer(1, float32Data.length, audioContext.sampleRate);
        audioBuffer.getChannelData(0).set(float32Data);

        if (audioSourceRef.current) {
          audioSourceRef.current.stop();
          audioSourceRef.current.disconnect();
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        audioSourceRef.current = source;
        setHasPlayedOpeningLine(true); // Mark as played to prevent looping for this line
        
        console.log('[DisplayFortuneScreen] Narration audio is now playing via Web Audio API.');

        source.onended = () => {
          console.log('[DisplayFortuneScreen] Narration audio playback ended.');
          audioSourceRef.current = null;
          setIsGeneratingNarration(false); // Ensure loading state is cleared
        };

      } catch (error) {
        console.error('[DisplayFortuneScreen] Error generating or playing narration:', error);
        setNarrationError(`The Oracle's voice seems to be lost in the ether. ${error.message}`);
        setIsGeneratingNarration(false);
      }
    };

    generateAndPlayNarration();

    // Cleanup function for this effect
    return () => {
      if (audioSourceRef.current) {
        console.log('[DisplayFortuneScreen] Cleaning up: Stopping narration audio source.');
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      // Also ensure the chime stops if the component unmounts during pre-reveal
      if (revealChimeRef.current) {
        revealChimeRef.current.pause();
        revealChimeRef.current.currentTime = 0;
      }
    };
  }, [init, openingLineToNarrate, getAudioContext, isGeneratingNarration, audioPlaybackAllowed, hasPlayedOpeningLine, hasPreRevealed]); // Added hasPreRevealed

  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles container loaded", container);
    // setAudioPlaybackAllowed(true); // REMOVED: Audio should be enabled by user click
  }, []);

  const particleOptions = useMemo(() => ({
    particles: {
      number: { value: 40, density: { enable: true, value_area: 800 } },
      color: { value: ["#FFFFFF", "#5BADDE"] }, // mw-white, mw-light-blue
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
    // Navigate to the contact details page as per PLAN.MD
    router.push('/contact-details');
  };

  const handleEnableAudio = () => {
    setAudioPlaybackAllowed(true);
    // Attempt to resume AudioContext if it exists and is suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('[DisplayFortuneScreen] AudioContext resumed by user interaction.');
      }).catch(e => console.error('[DisplayFortuneScreen] Error resuming AudioContext:', e));
    }
  };

  if (!init || isLoadingFortune) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        {/* You can add a more sophisticated loader here if desired */}
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
          options={particleOptions} // You might want slightly different particles here, e.g., more intense
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
         {/* Audio element for the reveal chime - make sure reveal_chime.mp3 is in public/audio/ */}
        <audio ref={revealChimeRef} src="/audio/reveal_chime.mp3" preload="auto" />
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
      {/* <AudioPlayer audioFiles={fortuneAudioFiles} delayBetweenTracks={5000} isPlaying={audioPlaybackAllowed} /> */}
      
      {!audioPlaybackAllowed && hasPreRevealed && ( // Only show if pre-reveal is done
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

      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      {hasPreRevealed && ( // Only render the card once pre-reveal is complete
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-3xl z-10 mx-4" // Apply width constraints to motion.div
        >
          <Card className="bg-card rounded-lg shadow-lg w-full"> {/* Removed max-w from here as it's on motion.div */}
            <CardHeader className="text-center pt-6 sm:pt-8">
              <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
                Your Fortune Reveals...
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-8">
                {/* Column 1: Fortune Teller Image */}
                <div className="w-[150px] sm:w-[180px] md:w-[200px] flex-shrink-0 order-1 md:order-none flex flex-col items-center">
                  <div className="w-full rounded-lg shadow-md overflow-hidden">
                    <Image
                      src="/avatar/fortune-reveal.png" 
                      alt="The Fortune Teller Oracle"
                      width={822} 
                      height={1012} 
                      layout="responsive" 
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-center text-mw-white mt-3 font-semibold">Fortune Teller</p>
                  {isGeneratingNarration && (
                    <p className="text-mw-light-blue text-sm mt-2 text-center animate-pulse">
                      <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                    The oracle is speaking your fortune...
                    </p>
                  )}
                  {narrationError && !isGeneratingNarration && (
                    <p className="text-red-400 text-xs mt-2 text-center px-2">{narrationError}</p>
                  )}
                </div>

                {/* Column 2: Fortune Text */}
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