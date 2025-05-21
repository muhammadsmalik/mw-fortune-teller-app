'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Mic } from 'lucide-react';
import { Button } from "@/components/ui/button"; 
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, AnimatePresence } from 'framer-motion';

const FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'fetchedLinkedInData';
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

// Define audio file paths
const TRANSITION_VOICE_PATH = '/audio/transition_audio.mp3';
const TRANSITION_SHIMMER_PATH = '/audio/shimmer-glass.mp3';

// Define the voice instructions (as provided by the user)
const TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie's voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

**Cadence & Rhythm:**
The speech has a *deliberate elegance*, often flowing like ancient poetry or song, with rhythmic pauses that make each word feel significant—*measured, but not slow*. It can shift instantly, becoming quick and unpredictable, like a spark leaping from fire when the genie is amused, annoyed, or impatient.

**Accents & Inflections:**
There might be traces of archaic or exotic accents, difficult to place—part Middle Eastern, part celestial, part something entirely unearthly. The vowels stretch luxuriously, and the consonants often land with a whispered crispness, like dry leaves brushing against stone. When casting spel`;

export default function LinkedInInterludeScreen() {
  const router = useRouter();
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isGeneratingFortune, setIsGeneratingFortune] = useState(false);
  const [profileInfo, setProfileInfo] = useState({
    companyName: '',
    jobTitle: '',
    previousCompanies: '',
    fullName: '', 
    industryType: '', 
  });
  const [apiError, setApiError] = useState(null);
  const [fortuneRequestBody, setFortuneRequestBody] = useState(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [narrationError, setNarrationError] = useState(null);
  const [userManuallyInitiatedNarration, setUserManuallyInitiatedNarration] = useState(false);
  const [greetingHeardOnce, setGreetingHeardOnce] = useState(false);
  const [isTransitionAudioPlaying, setIsTransitionAudioPlaying] = useState(false);
  const [transitionAudioError, setTransitionAudioError] = useState(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const transitionAudioSourceRef = useRef(null); // For transition sounds
  const [init, setInit] = useState(false); // For particle effects

  // Particles engine initialization
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles container loaded", container);
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

  // Function to check for fortune data and proceed
  const checkForFortuneAndProceed = useCallback(() => {
    // Ensure this isn't called if we are already trying to navigate or in a terminal error state for this screen
    // if (router.pathname !== '/linkedin-interlude') return; // May not be needed with proper state management

    const storedFortuneDataString = localStorage.getItem('fortuneData');
    const storedFortuneError = localStorage.getItem('fortuneGenerationError');

    if (storedFortuneError) {
      console.error("[LinkedInInterlude] Error from background fortune generation picked up:", storedFortuneError);
      setApiError(`A cosmic disturbance during fortune generation: ${storedFortuneError}. Redirecting...`);
      setIsGeneratingFortune(false); // Turn off loading indicator
      localStorage.removeItem('fortuneGenerationError'); // Clear the error flag
      localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY); // Clear pending request
      // Potentially clear 'fortuneData' too if it was a partial write, though unlikely with current setup
      // localStorage.removeItem('fortuneData'); 
      setTimeout(() => router.push('/collect-info'), 5000);
      return;
    }

    if (storedFortuneDataString) {
      console.log('[LinkedInInterlude] Fortune data found in localStorage. Proceeding to scenario selection.');
      // Data for 'fortuneApp_fullName', etc., should have been set by generating-fortune page's background fetch.
      // We just ensure PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY is cleaned up.
      // Note: PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY might still be needed by scenario-selection 
      // if it needs to determine the flow or pass user context later. Let's keep it for now.
      // localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY); 
      
      // Clear any potential stale error from this page if data is now fine.
      setApiError(null);
      setIsGeneratingFortune(false); // Turn off loading indicator
      router.push('/scenario-selection');
    } else {
      console.log('[LinkedInInterlude] Fortune data not yet found in localStorage. Will show loading/wait.');
      setIsGeneratingFortune(true); // Show loading indicator: "Consulting the oracles..."
      setApiError(null); // Clear previous API errors from this page
      // The StorageEvent listener will handle picking up the data when it arrives.
    }
  }, [router]); // Added router to useCallback dependencies

  // Effect for StorageEvent listener to react to background data changes
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'fortuneData' || event.key === 'fortuneGenerationError') {
        console.log('[LinkedInInterlude] Storage event detected for:', event.key);
        // Only proceed if we are in a state expecting this data (i.e., isGeneratingFortune is true or no apiError blocking)
        // or if monologue has finished (greetingHeardOnce can be a proxy, or a new state like isMonologueFinished)
        // For now, let's assume if isGeneratingFortune is true, we are waiting.
        // Also, ensure transition audio is not playing.
        if ((isGeneratingFortune || greetingHeardOnce) && !isTransitionAudioPlaying) { 
          checkForFortuneAndProceed();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // isGeneratingFortune and greetingHeardOnce are included to re-evaluate if listener logic should change based on these states.
    // checkForFortuneAndProceed is memoized with useCallback.
  }, [isGeneratingFortune, greetingHeardOnce, checkForFortuneAndProceed, isTransitionAudioPlaying]);

  // Function to initialize AudioContext safely on client
  const getAudioContext = () => {
    if (typeof window !== 'undefined') {
      if (!audioContextRef.current) {
        try {
          console.log('[TTS Frontend] Attempting to create AudioContext with 24kHz sample rate.');
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 }); // OpenAI TTS uses 24kHz
          console.log('[TTS Frontend] AudioContext created. State:', audioContextRef.current.state, 'SampleRate:', audioContextRef.current.sampleRate);
        } catch (e) {
          console.error('[TTS Frontend] Error creating AudioContext:', e);
          setNarrationError("Failed to initialize audio system. " + e.message);
          return null;
        }
      }
      return audioContextRef.current;
    }
    console.log('[TTS Frontend] Window undefined, cannot create AudioContext (SSR or non-browser).');
    return null;
  };

  const playAudioFile = useCallback(async (filePath, isLastInSequence = false) => {
    const audioContext = getAudioContext();
    if (!audioContext) {
      console.error('[TTS Frontend] playAudioFile: AudioContext not available.');
      setTransitionAudioError(`Audio system not ready for transition sound: ${filePath}`);
      setIsTransitionAudioPlaying(false);
      return Promise.reject(new Error("AudioContext not available"));
    }

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.error(`[TTS Frontend] Error resuming AudioContext for ${filePath}:`, e);
        setTransitionAudioError(`Could not start transition audio ${filePath}. Check browser permissions.`);
        setIsTransitionAudioPlaying(false);
        return Promise.reject(e);
      }
    }

    try {
      console.log(`[TTS Frontend] Fetching audio file: ${filePath}`);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file ${filePath} (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[TTS Frontend] Audio file ${filePath} fetched, decoding ${arrayBuffer.byteLength} bytes...`);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log(`[TTS Frontend] Audio file ${filePath} decoded.`);

      if (transitionAudioSourceRef.current) {
        transitionAudioSourceRef.current.stop();
        transitionAudioSourceRef.current.disconnect();
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      return new Promise((resolve, reject) => {
        source.onended = () => {
          console.log(`[TTS Frontend] Audio playback ended for: ${filePath}`);
          transitionAudioSourceRef.current = null;
          if (isLastInSequence) {
            setIsTransitionAudioPlaying(false);
            console.log('[TTS Frontend] Last transition audio ended, checking for fortune data.');
            checkForFortuneAndProceed();
          }
          resolve();
        };
        source.onerror = (err) => {
            console.error(`[TTS Frontend] Error playing audio file ${filePath}:`, err);
            setTransitionAudioError(`Error playing transition sound ${filePath}.`);
            setIsTransitionAudioPlaying(false);
            transitionAudioSourceRef.current = null;
            reject(err);
        };
        console.log(`[TTS Frontend] Starting audio playback for: ${filePath}.`);
        source.start();
        transitionAudioSourceRef.current = source;
      });

    } catch (error) {
      console.error(`[TTS Frontend] Error in playAudioFile for ${filePath}:`, error);
      setTransitionAudioError(`The spirits are quiet for ${filePath}: ${error.message}.`);
      setIsTransitionAudioPlaying(false);
      return Promise.reject(error);
    }
  }, [checkForFortuneAndProceed]); // getAudioContext is stable, checkForFortuneAndProceed is memoized

  const playTransitionSequence = useCallback(async () => {
    console.log('[TTS Frontend] Starting transition audio sequence.');
    setIsTransitionAudioPlaying(true);
    setTransitionAudioError(null); // Clear previous errors

    try {
      await playAudioFile(TRANSITION_VOICE_PATH, false); // Play voice, not last in sequence
      console.log('[TTS Frontend] Transition voice finished, playing shimmer.');
      await playAudioFile(TRANSITION_SHIMMER_PATH, true); // Play shimmer, this IS the last in sequence
      console.log('[TTS Frontend] Transition shimmer finished.');
      // checkForFortuneAndProceed is now called by playAudioFile when isLastInSequence is true
    } catch (error) {
      console.error('[TTS Frontend] Error during transition audio sequence:', error);
      // Error state is set by playAudioFile, setIsTransitionAudioPlaying(false) is also handled there.
      // If the sequence fails, we might want to allow user to proceed or retry.
      // For now, if sequence fails, it stops. User can click "Reveal Destiny" if enabled.
      // To be safe, ensure playing state is false if an error escapes playAudioFile logic directly here.
      setIsTransitionAudioPlaying(false); 
       // If transition fails, maybe proceed anyway? Or offer a retry?
       // For now, let's proceed to check for fortune as a fallback.
      console.warn('[TTS Frontend] Transition audio sequence failed. Attempting to proceed to fortune display anyway.');
      checkForFortuneAndProceed();
    }
  }, [playAudioFile, checkForFortuneAndProceed]);

  // Effect to fetch and play narration
  useEffect(() => {
    // Define getNarrationText INSIDE the useEffect
    const getNarrationText = () => { // Not using useCallback here as it's within useEffect scope
      if (!profileInfo.companyName && !profileInfo.jobTitle) {
        console.log('[TTS Frontend] getNarrationText: profileInfo not ready');
        return null;
      }
      let text = "Ah, seeker...\nI've peered into your past, present, and future…\n";
      if (profileInfo.fullName) {
        text += `They call you ${profileInfo.fullName}.\n`;
      }
      text += `You are from ${profileInfo.companyName || 'a noteworthy venture'} as ${profileInfo.jobTitle || 'an individual of significance'}.\n`;
      if (profileInfo.previousCompanies) {
        text += `${profileInfo.previousCompanies}\n`;
      }
      text += "You seek clarity. And destiny has sent you here.";
      console.log('[TTS Frontend] getNarrationText: Generated text - ', text.substring(0,30) + '...');
      return text;
    };

    const playNarration = async () => {
      const narrationText = getNarrationText();
      const audioContext = getAudioContext();

      if (!audioContext) {
        console.error('[TTS Frontend] playNarration: AudioContext not available.');
        setNarrationError("Audio system not ready. Please click 'Hear Oracle's Greeting' to enable audio.");
        setIsNarrating(false);
        setUserManuallyInitiatedNarration(false);
        setGreetingHeardOnce(false);
        return;
      }

      console.log('[TTS Frontend] playNarration called. Conditions - narrationText:', !!narrationText, 'isNarrating:', isNarrating, 'isLoadingPage:', isLoadingPage, 'userManuallyInitiatedNarration:', userManuallyInitiatedNarration, 'greetingHeardOnce:', greetingHeardOnce, 'audioContextState:', audioContext?.state);

      if (!narrationText || isNarrating || isLoadingPage || !userManuallyInitiatedNarration || greetingHeardOnce) {
        // Logging for why playNarration might bail out
        if(!narrationText) console.log('[TTS Frontend] playNarration: Bailing - No narration text.');
        if(isNarrating) console.log('[TTS Frontend] playNarration: Bailing - Already narrating.');
        if(isLoadingPage) console.log('[TTS Frontend] playNarration: Bailing - Page is still loading.');
        if(!userManuallyInitiatedNarration) console.log('[TTS Frontend] playNarration: Bailing - User has not manually initiated narration.');
        if(greetingHeardOnce) console.log('[TTS Frontend] playNarration: Bailing - Greeting has already been heard.');
        return;
      }

      console.log('[TTS Frontend] Starting narration process (post-interaction check).');
      setIsNarrating(true);
      setNarrationError(null); // Clear previous errors before new attempt
      
      console.log('[TTS Frontend] Current AudioContext state before possible resume in playNarration:', audioContext.state);
      if (audioContext.state === 'suspended') {
        console.log('[TTS Frontend] AudioContext is suspended in playNarration, attempting to resume.');
        try {
          await audioContext.resume();
          console.log('[TTS Frontend] AudioContext resumed successfully in playNarration. New state:', audioContext.state);
        } catch (e) {
          console.error('[TTS Frontend] Error resuming AudioContext in playNarration:', e);
          setNarrationError("Could not start audio. Please click 'Hear Oracle's Greeting' again or check browser permissions.");
          setIsNarrating(false);
          setUserManuallyInitiatedNarration(false);
          setGreetingHeardOnce(false);
          return;
        }
      }

      try {
        console.log('[TTS Frontend] Fetching narration from /api/generate-narration with text:', narrationText.substring(0, 50) + "...", 'and instructions:', TTS_INSTRUCTIONS.substring(0,50) + "...");
        const response = await fetch('/api/generate-narration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textInput: narrationText, instructions: TTS_INSTRUCTIONS }),
        });

        console.log('[TTS Frontend] API response status:', response.status, 'ok:', response.ok);
        if (!response.ok) {
          const errorData = await response.json().catch(() => response.text());
          console.error('[TTS Frontend] API error response data:', errorData);
          throw new Error(errorData.error || errorData.details || errorData || `Failed to fetch narration (${response.status})`);
        }

        const reader = response.body.getReader();
        let audioBufferChunks = [];
        let totalLength = 0;
        console.log('[TTS Frontend] Reading audio stream from API response...');

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[TTS Frontend] Audio stream finished.');
            break;
          }
          audioBufferChunks.push(value);
          totalLength += value.length;
          // console.log(`[TTS Frontend] Received audio chunk, size: ${value.length}. Total received: ${totalLength}`); // Can be too verbose
        }
        console.log('[TTS Frontend] Finished reading stream. Total bytes received:', totalLength);

        if (totalLength === 0) {
          console.error('[TTS Frontend] No audio data received from stream.');
          setNarrationError("No audio data was returned from the oracle.");
          setIsNarrating(false);
          setUserManuallyInitiatedNarration(false);
          setGreetingHeardOnce(false);
          return;
        }

        const pcmData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioBufferChunks) {
          pcmData.set(chunk, offset);
          offset += chunk.length;
        }
        console.log('[TTS Frontend] PCM data concatenated. Total length:', pcmData.length);

        const float32Data = new Float32Array(pcmData.length / 2);
        for (let i = 0; i < float32Data.length; i++) {
          let val = pcmData[i * 2] + (pcmData[i * 2 + 1] << 8);
          if (val >= 0x8000) val |= ~0xFFFF;
          float32Data[i] = val / 0x8000;
        }
        console.log('[TTS Frontend] PCM data converted to Float32Array. Float32Array length:', float32Data.length);

        console.log('[TTS Frontend] Creating AudioBuffer. Channels: 1, Length:', float32Data.length, 'SampleRate:', audioContext.sampleRate);
        const audioBuffer = audioContext.createBuffer(1, float32Data.length, audioContext.sampleRate);
        audioBuffer.getChannelData(0).set(float32Data);

        if (audioSourceRef.current) {
          console.log('[TTS Frontend] Stopping previous audio source.');
          audioSourceRef.current.stop();
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        console.log('[TTS Frontend] Starting audio playback.');
        source.start();
        audioSourceRef.current = source;
        source.onended = () => {
            console.log('[TTS Frontend] Audio playback ended.');
            setIsNarrating(false);
            setGreetingHeardOnce(true); 
            audioSourceRef.current = null;

            // If fortune generation wasn't already indicating an error from this page's perspective,
            // and there's no active narration error that might have cut it short.
            if (!apiError && !narrationError) { 
                console.log('[TTS Frontend] Narration ended naturally, starting transition audio sequence.');
                playTransitionSequence(); // Play transition audio instead of directly checking fortune
            } else {
                if(apiError) console.log('[TTS Frontend] Narration ended, but an API error occurred on this page. Not auto-checking fortune or playing transition.');
                if(narrationError) console.log('[TTS Frontend] Narration ended, but a narration error occurred. Not auto-checking fortune or playing transition.');
                 // Fallback: if narration had errors, or page has API error, still try to proceed without transition.
                checkForFortuneAndProceed();
            }
        };

      } catch (error) {
        console.error("[TTS Frontend] Error in playNarration catch block:", error);
        setNarrationError(`The spirits are quiet: ${error.message}. Please try the greeting again.`);
        setIsNarrating(false);
        setUserManuallyInitiatedNarration(false);
        setGreetingHeardOnce(false);
      }
    };

    console.log('[TTS Frontend] useEffect for narration triggered. Deps - isLoadingPage:', isLoadingPage, 'profileInfo.companyName:', profileInfo.companyName, 'userManuallyInitiatedNarration:', userManuallyInitiatedNarration, 'greetingHeardOnce:', greetingHeardOnce);
    if (!isLoadingPage && profileInfo.companyName && userManuallyInitiatedNarration && !greetingHeardOnce) {
        console.log('[TTS Frontend] Conditions met (data loaded + user interaction), calling playNarration directly.');
        playNarration();
    }

    return () => {
      console.log('[TTS Frontend] Cleanup from narration useEffect (or unmount).');
      if (audioSourceRef.current) {
        console.log('[TTS Frontend] Stopping and disconnecting active audio source during cleanup.');
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
      if (transitionAudioSourceRef.current) {
        console.log('[TTS Frontend] Stopping and disconnecting active transition audio source during cleanup.');
        transitionAudioSourceRef.current.stop();
        transitionAudioSourceRef.current.disconnect();
        transitionAudioSourceRef.current = null;
      }
    };
  }, [isLoadingPage, profileInfo, userManuallyInitiatedNarration, greetingHeardOnce, playTransitionSequence, apiError, narrationError, checkForFortuneAndProceed]); // Added dependencies

  // This useEffect loads the profile information to display and for narration text
  useEffect(() => {
    console.log('[TTS Frontend] useEffect for profile data loading triggered.');
    let storedFortuneRequestBodyString = localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
    const storedLinkedInDataString = localStorage.getItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
    // No longer setting fortuneRequestBody state here directly, will be derived from storedFortuneRequestBodyString

    if (!storedFortuneRequestBodyString) {
      console.log('[TTS Frontend] PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY missing. Trying to recover or redirect.');
      const userLinkedInProfileUrl = localStorage.getItem('userLinkedInProfile');

      if (userLinkedInProfileUrl && storedLinkedInDataString) {
        try {
          const linkedInData = JSON.parse(storedLinkedInDataString);
          const profileIdentifierFromUrl = userLinkedInProfileUrl.split('/').pop();

          if (linkedInData.profileData && linkedInData.profileData.public_identifier && linkedInData.profileData.public_identifier.includes(profileIdentifierFromUrl)) {
            console.log('[TTS Frontend] Reconstructing PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY from FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY.');
            const { profileData, latestCompanyData } = linkedInData;
            const reconstructedRequestBody = {
              fullName: profileData.full_name || 'Mystic Seeker',
              industryType: latestCompanyData?.industry || profileData.occupation || 'Diverse Ventures',
              companyName: latestCompanyData?.name || 'Their Own Enterprise',
              geographicFocus: `${profileData.city || 'Global Reach'}, ${profileData.country_full_name || 'Cosmic Planes'}`,
              businessObjective: '', // Consistent with generating-fortune page
            };
            localStorage.setItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY, JSON.stringify(reconstructedRequestBody));
            storedFortuneRequestBodyString = JSON.stringify(reconstructedRequestBody); // Update for subsequent logic

            if (!localStorage.getItem('fortuneData') && !localStorage.getItem('fortuneGenerationError')) {
              console.log('[TTS Frontend] Triggering background fortune generation from interlude page due to missing pending body recovery.');
              const backgroundFortuneRequestBodyCopy = JSON.parse(JSON.stringify(reconstructedRequestBody)); 
              fetch('/api/generate-fortune', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backgroundFortuneRequestBodyCopy),
              })
              .then(async response => {
                if (!response.ok) {
                  const errorData = await response.json().catch(() => response.text());
                  localStorage.setItem('fortuneGenerationError', errorData.error || errorData.details || errorData || `Background fortune generation (interlude-triggered) failed (${response.status})`);
                  return null; 
                }
                return response.json();
              })
              .then(data => { 
                if (data) {
                  localStorage.setItem('fortuneData', JSON.stringify(data));
                  localStorage.setItem('fortuneApp_fullName', backgroundFortuneRequestBodyCopy.fullName);
                  localStorage.setItem('fortuneApp_industry', backgroundFortuneRequestBodyCopy.industryType);
                  localStorage.setItem('fortuneApp_companyName', backgroundFortuneRequestBodyCopy.companyName);
                  localStorage.removeItem('fortuneGenerationError');
                  console.log('[TTS Frontend] Background fortune generation (interlude-triggered) successful.');
                }
              })
              .catch(error => {
                console.error("[TTS Frontend] Network or other error in background fortune generation (interlude-triggered):", error);
                localStorage.setItem('fortuneGenerationError', error.message || "A network error occurred (interlude-triggered).");
              });
            }
          } else {
            console.error('[TTS Frontend] Mismatch: FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY is for a different profile. Redirecting.');
            setApiError("Stale user data found. Please restart the process from the beginning.");
            setIsLoadingPage(false);
            setTimeout(() => router.push('/collect-info'), 4000);
            return; 
          }
        } catch (e) {
          console.error('[TTS Frontend] Error parsing FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY or reconstructing request body:', e);
          setApiError("There was an issue processing stored user data. Please restart the process.");
          setIsLoadingPage(false);
          setTimeout(() => router.push('/collect-info'), 4000);
          return; 
        }
      } else {
        console.error('[TTS Frontend] PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY is missing, and cannot reconstruct. Redirecting.');
        setApiError("Essential information for the oracle is missing. Please start over.");
        setIsLoadingPage(false);
        setTimeout(() => router.push('/collect-info'), 4000);
        return; 
      }
    }

    // Proceed if storedFortuneRequestBodyString is now available (either initially or after recovery)
    if (storedFortuneRequestBodyString) {
        try {
            const parsedFortuneRequestBody = JSON.parse(storedFortuneRequestBodyString);
            setFortuneRequestBody(parsedFortuneRequestBody); // Set the state for other parts of the component if needed

            let companyName = parsedFortuneRequestBody.companyName || 'your current venture';
            let jobTitle = 'your esteemed role'; 
            let fullName = parsedFortuneRequestBody.fullName || 'Valued User';
            let industryType = parsedFortuneRequestBody.industryType || 'Diverse Fields';
            let previousCompaniesString = '';

            if (storedLinkedInDataString) {
                const linkedInData = JSON.parse(storedLinkedInDataString);
                const { profileData, latestCompanyData } = linkedInData; 
                
                // Refine companyName if the one from parsedBody was a placeholder
                if ((companyName === 'your current venture' || companyName === 'Their Own Enterprise') && latestCompanyData?.name) {
                    companyName = latestCompanyData.name;
                } else if ((companyName === 'your current venture' || companyName === 'Their Own Enterprise') && profileData?.experiences?.length > 0 && profileData.experiences[0]?.company) {
                    companyName = profileData.experiences[0].company;
                }

                if (profileData?.occupation) {
                    const occupationFromProfile = profileData.occupation;
                    const titleFromExperience = profileData.experiences?.[0]?.title;
                    if (companyName && companyName !== 'your current venture' && occupationFromProfile.toLowerCase().includes(companyName.toLowerCase()) && occupationFromProfile.toLowerCase() !== companyName.toLowerCase() && titleFromExperience) {
                        jobTitle = titleFromExperience;
                    } else {
                        jobTitle = occupationFromProfile;
                    }
                } else if (profileData?.experiences?.[0]?.title) {
                    jobTitle = profileData.experiences[0].title;
                }

                if (profileData?.experiences && profileData.experiences.length > 1) {
                    const currentCompNameLower = companyName.toLowerCase();
                    const uniquePrevCompanies = Array.from(
                        new Set(
                            profileData.experiences
                                .slice(1)
                                .map(exp => exp.company)
                                .filter(name => name && name.toLowerCase() !== currentCompNameLower)
                        )
                    ).slice(0, 2);
                    if (uniquePrevCompanies.length > 0) {
                        if (uniquePrevCompanies.length === 1) {
                            previousCompaniesString = `Your path also shows experience with ${uniquePrevCompanies[0]}.`;
                        } else {
                            previousCompaniesString = `Your journey also includes chapters at ${uniquePrevCompanies.join(' and ')}.`;
                        }
                    }
                }
            } else {
                console.warn('[TTS Frontend] Full LinkedIn data (FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY) not available for profile enrichment on interlude page.');
            }
            
            setProfileInfo({
                companyName,
                jobTitle,
                previousCompanies: previousCompaniesString,
                fullName,
                industryType
            });
            console.log('[TTS Frontend] Profile info set for interlude display (after potential recovery):', { companyName, jobTitle, fullName, industryType });
            setIsLoadingPage(false);

        } catch (error) {
            console.error("[TTS Frontend] Error processing data for interlude display (main block):", error);
            setApiError("There was an issue interpreting your profile for the interlude. Please start over.");
            setIsLoadingPage(false);
            setTimeout(() => router.push('/collect-info'), 4000);
        }
    } // else: if storedFortuneRequestBodyString is still not available, a redirect should have been scheduled.
  }, [router]);

  const handleInitiateNarration = async () => {
    console.log('[TTS Frontend] handleInitiateNarration button clicked.');
    setNarrationError(null); // Clear previous errors on new attempt
    setTransitionAudioError(null); // Also clear transition errors
    setIsTransitionAudioPlaying(false); // Ensure transition audio is not considered playing
    setGreetingHeardOnce(false); // Added for Issue 2: Reset on new initiation
    const audioContext = getAudioContext();
    if (!audioContext) {
      setNarrationError("Audio playback system could not be initialized. Try refreshing the page.");
      console.error('[TTS Frontend] handleInitiateNarration: AudioContext creation failed or not available.');
      return;
    }

    console.log('[TTS Frontend] handleInitiateNarration: Current AudioContext state:', audioContext.state);
    if (audioContext.state === 'suspended') {
      try {
        console.log('[TTS Frontend] handleInitiateNarration: Attempting to resume AudioContext due to user interaction.');
        await audioContext.resume();
        console.log('[TTS Frontend] handleInitiateNarration: AudioContext resumed successfully. New state:', audioContext.state);
      } catch (e) {
        console.error('[TTS Frontend] handleInitiateNarration: Error resuming AudioContext:', e);
        setNarrationError("Could not activate audio. Please check browser permissions or try a different browser.");
        setUserManuallyInitiatedNarration(false); // Allow another try by resetting this
        setGreetingHeardOnce(false); // Added for Issue 2: Reset on new initiation
        return;
      }
    }
    // If context is already running or resumed successfully, set state to trigger narration effect
    setUserManuallyInitiatedNarration(true);
  };

  const handleRevealDestiny = async () => {
    console.log('[TTS Frontend] handleRevealDestiny (button) called.');
    if (audioSourceRef.current && audioSourceRef.current.playbackState !== 0 /* FINISHED_STATE */ && typeof audioSourceRef.current.stop === 'function') {
        console.log('[TTS Frontend] Stopping active narration due to manual reveal destiny click.');
        audioSourceRef.current.stop(); // onended will fire, which should then call playTransitionSequence
    } else if (transitionAudioSourceRef.current && transitionAudioSourceRef.current.playbackState !== 0 && typeof transitionAudioSourceRef.current.stop === 'function') {
        console.log('[TTS Frontend] Stopping active transition audio due to manual reveal destiny click.');
        transitionAudioSourceRef.current.stop(); // onended of this will fire, which calls checkForFortuneAndProceed if it's the last one
    } else {
      // If no audio is playing, or it has finished, directly check for fortune.
      console.log('[TTS Frontend] No active audio or audio finished, directly checking for fortune.');
      checkForFortuneAndProceed();
    }
  };

  if (isLoadingPage && !profileInfo.companyName) { // More specific loading condition
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p className="text-lg">Verifying your presence in the digital ether...</p>
      </div>
    );
  }

  if (!init && typeof window !== 'undefined') { 
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
      </div>
    ); 
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-8 relative isolate space-y-6 text-center">
      {init && Particles && (
        <Particles
          id="tsparticles-linkedin-interlude" 
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

      {/* Show API errors prominently if they occur */}
      {apiError && !isGeneratingFortune && (
         <div className="p-6 rounded-lg shadow-lg text-center max-w-md bg-red-900/50 text-red-300 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
            <h2 className="text-xl font-semibold mb-2">A Disturbance in the Stars!</h2>
            <p>{apiError}</p>
            <Button onClick={() => router.push('/collect-info')} className="mt-4">Start Over</Button>
        </div>
      )}

      {/* Main content: shown if no API error blocking the page and not in full page loading state */}
      {!apiError && (
        <>
          <Image 
            src="/avatar/curious-look.png" 
            alt="Mystic Fortune Teller with a knowing look" 
            width={180} 
            height={270} 
            className="mb-6 object-contain brightness-110 drop-shadow-[0_0_15px_rgba(91,173,222,0.7)]"
            priority={true}
          />
          
          <h1 className="text-3xl font-semibold text-mw-light-blue">Ah, {profileInfo.fullName || 'seeker'}...</h1>
          <p className="text-xl mt-4">I've peered into your past, present, and future…</p>
          <p className="text-xl">You are from <strong className="text-mw-gold">{profileInfo.companyName || 'an intriguing place'}</strong> as <strong className="text-mw-gold">{profileInfo.jobTitle || 'a person of mystery'}</strong>…</p>
          {profileInfo.previousCompanies && (
            <p className="text-md mt-2 text-mw-white/80">{profileInfo.previousCompanies}</p>
          )}
          <p className="text-xl mt-4 italic">You seek clarity. And destiny has sent you here.</p>
          
          {/* Narration Control UI Block */}
          <div className="mt-8 mb-4 space-y-3 text-center w-full max-w-md mx-auto">
            {/* Show OVERLAY if not yet clicked, not narrating, and data is loaded */}
            <AnimatePresence>
              {!isLoadingPage && !userManuallyInitiatedNarration && !isNarrating && (
                <motion.div
                  key="doorRevealOverlay"
                  onClick={() => !(isGeneratingFortune || isTransitionAudioPlaying) && handleInitiateNarration()}
                  className={`fixed inset-0 z-40 bg-mw-dark-navy/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out \
                              ${(isGeneratingFortune || isTransitionAudioPlaying) ? 'opacity-50 pointer-events-none' : 'opacity-100 cursor-pointer group'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  role="button"
                  aria-label="Tap on the door to reveal Oracle's Greeting"
                  tabIndex={(isGeneratingFortune || isTransitionAudioPlaying) ? -1 : 0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!(isGeneratingFortune || isTransitionAudioPlaying)) {
                        handleInitiateNarration();
                      }
                    }
                  }}
                >
                  <Image
                    src="/assets/door-reveal.jpg"
                    alt="Mystical Door - Tap on the door to reveal the oracle's greeting"
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:brightness-110 transition-all duration-300 ease-in-out"
                    priority
                  />
                  <div className="absolute inset-x-0 bottom-0 p-10 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 via-black/30 to-transparent">
                    <p className="text-2xl md:text-3xl font-semibold text-mw-light-blue group-hover:text-mw-gold transition-colors duration-150 drop-shadow-lg text-center">
                      Tap on the door to reveal
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Show status if narration has been attempted or is active, and no overriding error */}
            {((userManuallyInitiatedNarration && !greetingHeardOnce && !isTransitionAudioPlaying) || isNarrating) && !narrationError && (
                 <p className="text-mw-gold text-lg animate-pulse min-h-[28px]">
                    {isNarrating ? "The Oracle speaks..." : profileInfo.companyName ? "Oracle is ready to speak..." : "Preparing Oracle's greeting..."}
                 </p>
            )}

            {/* Show status for transition audio */}
            {isTransitionAudioPlaying && !transitionAudioError && (
              <p className="text-mw-light-blue text-lg animate-pulse min-h-[28px]">
                Shhh… the veil thins…
              </p>
            )}

            {/* Show narration errors specifically */}
            {narrationError && (
              <div className="text-red-400 text-sm p-3 bg-red-900/30 border border-red-500/50 rounded-md">
                <p className="font-semibold">Oracle's Voice Disrupted:</p>
                <p>{narrationError}</p>
                {/* Allow retry only if not currently in a narrating state (e.g. failed to start) */}
                {!isNarrating && (
                    <Button variant="link" onClick={handleInitiateNarration} className="text-mw-light-blue hover:text-mw-gold mt-1">
                        Try to Hear Greeting Again?
                    </Button>
                )}
              </div>
            )}

            {/* Show transition audio errors specifically */}
            {transitionAudioError && (
              <div className="text-orange-400 text-sm p-3 bg-orange-900/30 border border-orange-500/50 rounded-md mt-2">
                <p className="font-semibold">Transition Disrupted:</p>
                <p>{transitionAudioError}</p>
                {/* Optionally, provide a way to retry or skip transition */}
              </div>
            )}
          </div>
          
          <Button
            onClick={handleRevealDestiny}
            size="lg"
            className="mt-3 px-8 py-3 text-lg font-semibold \
                       bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] \
                       text-mw-dark-navy \
                       hover:opacity-90 \
                       rounded-lg shadow-md transform transition-all duration-150 \
                       hover:shadow-xl active:scale-95"
            // Disable if actively generating fortune OR if narrating successfully (don't cut off)
            // Also disable if transition audio is playing
            disabled={isGeneratingFortune || (isNarrating && !narrationError) || isLoadingPage || isTransitionAudioPlaying}
          >
            {isGeneratingFortune ? 
                <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Consulting Oracles...</> :
                "Reveal My Destiny"
            }
          </Button>
        </>
      )}

      {/* Full page loader specific conditions */}
      <AnimatePresence>
        {isGeneratingFortune && (
          <motion.div
            key="generatingFortuneLoader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-mw-dark-navy/80 backdrop-blur-sm z-50"
          >
            <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
            <p className="text-lg text-mw-white/90 mt-4">
              Consulting the oracles for your fortune...
            </p>
            <p className="text-sm text-mw-white/70">
              This may take a moment as we chart your stars.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isGeneratingFortune && isTransitionAudioPlaying && !transitionAudioError && (
          <motion.div
            key="transitionAudioVeil"
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