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

/**
 * Pre-recorded CEO audio transcript with timing for synchronized captions
 * Each object contains the text phrase and its start/end times in seconds
 */
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

/**
 * DisplayFortune Component
 * 
 * Displays the generated fortune with advanced audio narration system and mystical UI
 * Features:
 * - Multi-stage audio narration (TTS + pre-recorded CEO audio)
 * - Visual transitions between fortune teller and CEO imagery
 * - Gradient backgrounds and glitter animations for mystical atmosphere
 * - Autoplay restriction handling with user interaction gates
 * - Responsive layout with expanded content area for better text readability
 * 
 * @param {Object} fortuneData - The fortune data object with insights
 * @param {Function} onGoBack - Callback for navigation back
 * @param {Function} onProceedToNextStep - Callback for proceeding to next stage
 * @param {Boolean} audioPlaybackAllowed - Whether audio playback is permitted by user interaction
 */
export default function DisplayFortune({ 
  fortuneData, 
  onGoBack, 
  onProceedToNextStep,
  audioPlaybackAllowed: initialAudioAllowed = false
}) {
  // Particles engine initialization state
  const [init, setInit] = useState(false);
  
  // Loading and error states for the fortune content
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Audio playback permission state (starts with prop value, can be overridden by user)
  const [audioPlaybackAllowed, setAudioPlaybackAllowed] = useState(initialAudioAllowed);

  // Audio narration system states
  const [narrationStage, setNarrationStage] = useState('idle'); // idle -> openingLine -> ceoNarration -> transitioning -> done
  const [isNarrating, setIsNarrating] = useState(false);
  const [narrationError, setNarrationError] = useState(null);
  const [currentCeoCaption, setCurrentCeoCaption] = useState(''); // Current caption during CEO audio
  const [openingLineToNarrate, setOpeningLineToNarrate] = useState(''); // Text for TTS generation

  // Visual transition states for fortune teller -> CEO animation
  const [hasPreRevealed, setHasPreRevealed] = useState(false);
  const [isTransitioningToCeo, setIsTransitioningToCeo] = useState(false);
  const [showCeoImage, setShowCeoImage] = useState(false);

  // Audio system references
  const audioContextRef = useRef(null); // Web Audio API context for handling autoplay restrictions
  const howlNarrationRef = useRef(null); // Howler.js instance for TTS audio streaming
  const revealChimeRef = useRef(null); // HTML5 audio element for transition chime
  const ceoAudioRef = useRef(null); // HTML5 audio element for pre-recorded CEO message

  // Initialize particles engine on component mount
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  /**
   * Get or create AudioContext for handling browser autoplay restrictions
   * AudioContext must be created after user interaction to avoid suspended state
   */
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

  /**
   * Memoized handler for CEO audio time updates to sync captions
   * Finds the active phrase based on current playback time and updates caption state
   */
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

  /**
   * Process fortune data when received
   * Extracts opening statement for TTS narration and handles error states
   */
  useEffect(() => {
    if (fortuneData) {
      console.log('[DisplayFortune] Fortune data received:', fortuneData);
      if (fortuneData.error) {
        setError(fortuneData.error);
      } else {
        setError(null);
        // Save structured data for next steps in the journey
        localStorage.setItem('fortuneData', JSON.stringify(fortuneData));
        // Extract opening statement for TTS narration
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

  /**
   * Main Audio Narration System
   * 
   * Orchestrates the multi-stage audio experience:
   * 1. Opening Line Narration (Dynamic TTS from OpenAI)
   * 2. CEO Audio Narration (Pre-recorded MP3 with captions)
   * 3. Visual Transition (Chime sound + smoke effect)
   * 
   * Key Fixes Applied:
   * - Removed isNarrating from dependency array to prevent useEffect re-runs during playback
   * - Added timeout protection for hanging AudioContext.resume() calls
   * - Multiple fallback strategies for audio playback (resume -> timeout -> direct play)
   * - Comprehensive error handling and logging
   */
  useEffect(() => {
    console.log('[DisplayFortune] Audio narration effect - conditions:', {
      init,
      audioPlaybackAllowed,
      openingLineToNarrate: !!openingLineToNarrate,
      openingText: openingLineToNarrate,
      hasPreRevealed,
      narrationStage
    });

    // Wait for all prerequisites before starting audio
    if (!init || !audioPlaybackAllowed || !openingLineToNarrate || !hasPreRevealed) {
      if (openingLineToNarrate && !audioPlaybackAllowed && hasPreRevealed && narrationStage === 'idle') {
        console.log('[DisplayFortune] Opening line is ready, but waiting for user to enable sound for narration.');
      }
      return;
    }

    // Start opening line narration when conditions are met
    if (narrationStage === 'idle' && openingLineToNarrate && hasPreRevealed && audioPlaybackAllowed) {
      console.log('[DisplayFortune] Conditions met to start opening line narration.');
      setNarrationStage('openingLine');
      return;
    }

    /**
     * Play narration segment using Howler.js for streaming TTS audio
     * 
     * @param {string} textToNarrate - Text to convert to speech
     * @param {Function} onEndedCallback - Callback when audio finishes
     */
    const playNarrationSegment = async (textToNarrate, onEndedCallback) => {
      console.log(`[DisplayFortune Howler] Attempting to generate narration for: "${textToNarrate}"`);
      
      // Prevent multiple instances from playing simultaneously
      if (isNarrating && howlNarrationRef.current && howlNarrationRef.current.playing() && narrationStage === 'openingLine') {
        console.log('[DisplayFortune Howler] Already narrating this segment (opening line), bailing.');
        return;
      }

      // Clean up any existing Howl instance
      if (howlNarrationRef.current) {
        console.log('[DisplayFortune Howler] Unloading previous Howl narration instance.');
        howlNarrationRef.current.unload();
        howlNarrationRef.current = null;
      }

      // Build streaming URL for TTS API
      const encodedTextInput = encodeURIComponent(textToNarrate);
      const voice = 'ballad'; // Mystical genie voice
      const streamUrl = `/api/generate-narration?voice=${voice}&textInput=${encodedTextInput}`;

      console.log('[DisplayFortune Howler] Using stream URL:', streamUrl);

      // Create Howler instance for streaming audio playback
      const sound = new Howl({
        src: [streamUrl],
        format: ['mp3'],
        html5: true, // Enable HTML5 mode for streaming
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

    /**
     * Stage 1: Opening Line Narration (Dynamic TTS)
     * Prevents multiple audio instances with additional safety check (!howlNarrationRef.current)
     */
    if (narrationStage === 'openingLine' && !isNarrating && !howlNarrationRef.current) {
      playNarrationSegment(openingLineToNarrate, () => {
        console.log('[DisplayFortune] Opening line narration finished. Moving to CEO narration.');
        setNarrationStage('ceoNarration');
      });
    } 
    
    /**
     * Stage 2: CEO Audio Narration (Pre-recorded MP3 with captions)
     * Enhanced with timeout protection and multiple fallback strategies
     */
    else if (narrationStage === 'ceoNarration' && !isNarrating) {
      // Play pre-recorded CEO audio
      if (ceoAudioRef.current && audioPlaybackAllowed) {
        console.log('[DisplayFortune] Attempting to play CEO audio mp3.');
        console.log('[DisplayFortune] CEO audio ref exists:', !!ceoAudioRef.current);
        console.log('[DisplayFortune] CEO audio element:', ceoAudioRef.current);
        setCurrentCeoCaption(''); // Clear any old captions
        const audioEl = ceoAudioRef.current;

        // Event handlers for CEO audio playback
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
          // Clean up event listeners
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
          // Clean up event listeners
          audioEl.removeEventListener('ended', handleCeoAudioEnd);
          audioEl.removeEventListener('error', handleCeoAudioError);
          audioEl.removeEventListener('timeupdate', handleCeoTimeUpdate);
          audioEl.removeEventListener('play', handleCeoAudioPlay);
        };

        // Attach event listeners for CEO audio
        audioEl.addEventListener('ended', handleCeoAudioEnd);
        audioEl.addEventListener('error', handleCeoAudioError);
        audioEl.addEventListener('timeupdate', handleCeoTimeUpdate);
        audioEl.addEventListener('play', handleCeoAudioPlay);
        
        /**
         * Enhanced AudioContext Handling with Timeout Protection
         * 
         * Problem: AudioContext.resume() can hang indefinitely in some browsers
         * Solution: Multiple fallback strategies with timeout protection
         */
        const audioContext = getAudioContext();
        console.log('[DisplayFortune] AudioContext state before CEO playback:', audioContext?.state);
        
        if (audioContext && audioContext.state === 'suspended') {
            console.log('[DisplayFortune] AudioContext suspended, attempting to resume...');
            console.log('[DisplayFortune] CEO audio element readyState:', audioEl.readyState);
            console.log('[DisplayFortune] CEO audio element src:', audioEl.src);
            console.log('[DisplayFortune] CEO audio element duration:', audioEl.duration);
            
            // Timeout protection: if resume() hangs, try direct play after 2 seconds
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
            
            // Primary strategy: resume AudioContext then play
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
                
                // Fallback strategy: try direct play if resume fails
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
            // Fallback if audio context couldn't be initialized
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

    // Cleanup function for audio resources
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
      // Cleanup CEO audio listeners if component unmounts during playback
      if (ceoAudioRef.current) {
        ceoAudioRef.current.removeEventListener('timeupdate', handleCeoTimeUpdate);
      }
    };
  }, [init, openingLineToNarrate, getAudioContext, audioPlaybackAllowed, hasPreRevealed, narrationStage, handleCeoTimeUpdate]);

  /**
   * Stage 3: Visual Transition Effect
   * Manages the smoke effect transition from fortune teller to CEO image
   */
  useEffect(() => {
    if (narrationStage === 'transitioning') {
      console.log('[DisplayFortune] Starting CEO transition sequence. Attempting to play chime.');
      setIsTransitioningToCeo(true);
      
      // Play transition chime sound
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

      // Timer for visual transition completion
      const timer = setTimeout(() => {
        console.log('[DisplayFortune] Smoke effect finished. Showing CEO image.');
        setShowCeoImage(true);
        setIsTransitioningToCeo(false);
        setNarrationStage('done');
      }, SMOKE_EFFECT_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [narrationStage]);
    
  /**
   * Particles Configuration for Background Effect
   * Creates floating particles that complement the mystical theme
   */
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

  /**
   * Handle manual audio enablement by user
   * Resumes AudioContext and primes audio elements to avoid future autoplay issues
   */
  const handleEnableAudio = () => {
    setAudioPlaybackAllowed(true);
    const audioCtx = getAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('[DisplayFortune] AudioContext resumed by user interaction (Enable Sound button).');
      }).catch(e => console.error('[DisplayFortune] Error resuming AudioContext via Enable Sound:', e));
    }
    
    // Prime audio elements by briefly playing then pausing to unlock them for future use
    if (revealChimeRef.current) {
        revealChimeRef.current.play().then(() => revealChimeRef.current.pause()).catch(() => {});
    }
    if (ceoAudioRef.current) {
        ceoAudioRef.current.play().then(() => ceoAudioRef.current.pause()).catch(() => {});
    }
  };

  /**
   * Render main content based on current state
   * Handles loading, error, and success states with appropriate UI
   */
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
        // Enhanced Layout with Improved Spacing and Centering
        <div className="flex flex-col lg:flex-row items-center lg:items-center gap-6 lg:gap-12">
          {/* Avatar/Logo Section with Enhanced Sizing */}
          <div className="w-[150px] sm:w-[180px] lg:w-[220px] flex-shrink-0 order-1 lg:order-none flex flex-col items-center relative">
            {/* Transition overlay during CEO animation */}
            {isTransitioningToCeo && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-mw-dark-navy/50 backdrop-blur-sm">
              </div>
            )}
            
            {/* Fortune Teller Avatar */}
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
            
            {/* CEO/Company Logo */}
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
            
            {/* Character/Company Label */}
            {!isTransitioningToCeo && (
              <p className="text-center text-mw-white mt-3 font-semibold">
                {showCeoImage ? "Moving Walls" : narrationStage === 'ceoNarration' ? "Moving Walls" : "Fortune Teller"}
              </p>
            )}
            
            {/* Audio Status and Caption Display Area */}
            <div className="h-12 mt-2 flex flex-col items-center justify-center w-full px-1 min-w-[180px]">
              {/* Opening Line Narration Status */}
              {isNarrating && narrationStage === 'openingLine' && openingLineToNarrate && (
                <div className="bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium text-center shadow-lg max-w-full flex items-center">
                  <Loader2 className="inline-block mr-2 h-3 w-3 animate-spin flex-shrink-0" />
                  <span>{openingLineToNarrate}</span>
                </div>
              )}
              
              {/* CEO Audio Captions */}
              {isNarrating && narrationStage === 'ceoNarration' && currentCeoCaption && (
                <div className="bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium text-center shadow-lg max-w-full">
                  {currentCeoCaption}
                </div>
              )}
              
              {/* Narration Error Display */}
              {narrationError && !isNarrating && (
                <p className="text-red-400 text-xs mt-1 text-center px-2">{narrationError}</p>
              )}
            </div>
          </div>

          {/* Enhanced Content Area with Expanded Width and Gradient Backgrounds */}
          <div className="w-full lg:flex-1 order-2 lg:order-none max-w-none">
            <div className="bg-gradient-to-br from-mw-dark-navy/90 via-purple-900/20 to-mw-dark-navy/90 p-6 sm:p-8 rounded-md border border-mw-light-blue/40 min-h-[200px] flex flex-col justify-center h-full backdrop-blur-sm relative overflow-hidden">
              {/* Inner Glitter Animation Effect */}
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
              
              {/* Fortune Content with Enhanced Typography */}
              <div className="text-left space-y-6 relative z-10">
                {/* Opening Statement with Gradient Text */}
                <p className="font-sans text-2xl sm:text-3xl font-bold bg-gradient-to-r from-mw-gold via-yellow-300 to-mw-gold bg-clip-text text-transparent text-center leading-tight">
                  {fortuneData.openingStatement}
                </p>
                
                {/* First Insight Section */}
                <div className="border-t border-mw-white/10 pt-6">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-mw-light-blue via-blue-300 to-mw-light-blue bg-clip-text text-transparent flex items-center mb-4">
                    <Lightbulb className="h-7 w-7 mr-3 text-mw-light-blue/80 animate-pulse" />
                    <span className="italic">&ldquo;{fortuneData.insight1.challenge}&rdquo;</span>
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

                {/* Second Insight Section */}
                <div className="border-t border-mw-white/10 pt-6">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-mw-light-blue via-blue-300 to-mw-light-blue bg-clip-text text-transparent flex items-center mb-4">
                    <BarChart className="h-7 w-7 mr-3 text-mw-light-blue/80 animate-pulse" />
                    <span className="italic">&ldquo;{fortuneData.insight2.challenge}&rdquo;</span>
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
      {/* Background Particles Effect */}
      {init && <Particles id="tsparticles" options={particlesOptions} />}
      
      {/* Main Container with Gradient Background and Global Glitter Animation */}
      <div className="min-h-screen bg-gradient-to-br from-mw-dark-navy via-purple-900/20 to-mw-dark-navy flex flex-col items-center justify-center p-4 relative z-10 overflow-hidden">
        {/* Global Glitter Animation - 50 Floating Sparkles */}
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
        
        {/* Audio Elements for Pre-recorded Sounds */}
        <audio ref={revealChimeRef} src="/audio/reveal_chime.mp3" preload="auto" />
        <audio ref={ceoAudioRef} src="/audio/reach_out_to_mw.mp3" preload="auto" />
        
        {/* Manual Audio Enable Button (shown when audio is blocked) */}
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

        {/* Moving Walls Branding */}
        <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
          <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
          <span className="font-semibold">Moving Walls</span>
        </div>

        {/* Main Content Card with Enhanced Container Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-6xl"
        >
          {/* Enhanced Card with Gradient Background and Glitter Overlay */}
          <Card className="bg-gradient-to-br from-mw-dark-blue/60 via-purple-900/30 to-mw-dark-blue/60 backdrop-blur-sm border border-mw-light-blue/30 shadow-2xl shadow-mw-light-blue/20 relative overflow-hidden">
            {/* Card-level Glitter Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-mw-gold/5 to-transparent animate-pulse" />
            
            <CardHeader>
              {/* Enhanced Title with Gradient Text and Animated Sparkles */}
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
              {/* Navigation Buttons */}
              <Button variant="outline" onClick={onGoBack} className="border-mw-light-blue/50 text-mw-light-blue hover:bg-mw-light-blue/10 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Choices
              </Button>
              <Button
                onClick={onProceedToNextStep}
                disabled={isLoading || !!error}
                className="bg-mw-gold text-mw-dark-navy font-bold hover:bg-mw-gold/90 transition-all duration-300 shadow-lg shadow-mw-gold/20"
              >
                Realize Your Vision
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
    </div>
    </>
  );
} 