'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Mic } from 'lucide-react';
import { Button } from "@/components/ui/button"; 
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';

const FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'fetchedLinkedInData';
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

// Define audio file paths
// const TRANSITION_VOICE_PATH = '/audio/transition_audio.mp3'; // Moved
// const TRANSITION_SHIMMER_PATH = '/audio/shimmer-glass.mp3'; // Moved

// Define the voice instructions (as provided by the user)
const TTS_INSTRUCTIONS = `**Tone & Timbre:**
A genie&apos;s voice carries an *otherworldly resonance*, like it reverberates from a place beyond the physical world. It has layers—deep and velvety in one breath, then sharp and crystalline the next. The lower tones might rumble like distant thunder, while higher notes shimmer with a metallic echo, like wind chimes in an empty temple.

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
  // const [isTransitionAudioPlaying, setIsTransitionAudioPlaying] = useState(false); // Moved
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  // const transitionAudioSourceRef = useRef(null); // Moved
  const [init, setInit] = useState(false); // For particle effects
  const howlInstanceRef = useRef(null); // For Howler instance
  // const objectURLRef = useRef(null); // Removed as it's not used in true streaming

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
      router.push('/fortune-journey');
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
        // Also, ensure transition audio is not playing (if that logic is re-added).
        if ((isGeneratingFortune || greetingHeardOnce)) { 
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
  }, [isGeneratingFortune, greetingHeardOnce, checkForFortuneAndProceed]);

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

  // const playAudioFile = useCallback(async (filePath, isLastInSequence = false) => { ... }); // Entire function moved

  // const playTransitionSequence = useCallback(async () => { ... }); // Entire function moved

  // Effect to fetch and play narration
  useEffect(() => {
    const getNarrationText = () => {
      if (!profileInfo.companyName && !profileInfo.jobTitle) {
        console.log('[TTS Frontend] getNarrationText: profileInfo not ready');
        return null;
      }
      let text = "Ah, seeker...\nI&apos;ve peered into your past, present, and future…\n";
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

      console.log('[TTS Frontend Howler] playNarration called. Conditions - narrationText:', !!narrationText, 'isNarrating:', isNarrating, 'isLoadingPage:', isLoadingPage, 'userManuallyInitiatedNarration:', userManuallyInitiatedNarration, 'greetingHeardOnce:', greetingHeardOnce);

      if (!narrationText || isNarrating || isLoadingPage || !userManuallyInitiatedNarration || greetingHeardOnce) {
        if(!narrationText) console.log('[TTS Frontend Howler] playNarration: Bailing - No narration text (profile info likely not ready).');
        if(isNarrating) console.log('[TTS Frontend Howler] playNarration: Bailing - Already narrating.');
        if(isLoadingPage) console.log('[TTS Frontend Howler] playNarration: Bailing - Page is still loading.');
        if(!userManuallyInitiatedNarration) console.log('[TTS Frontend Howler] playNarration: Bailing - User has not manually initiated narration.');
        if(greetingHeardOnce) console.log('[TTS Frontend Howler] playNarration: Bailing - Greeting has already been heard.');
        return;
      }

      console.log('[TTS Frontend Howler] Starting true streaming narration with Howler.');
      // setIsNarrating(true); // Set by onplay event now

      if (howlInstanceRef.current) {
        console.log('[TTS Frontend Howler] Unloading previous Howl instance.');
        howlInstanceRef.current.unload(); 
        howlInstanceRef.current = null;
      }
      // No objectURLRef cleanup needed here as it's removed

      const encodedTextInput = encodeURIComponent(narrationText);
      // Voice is hardcoded to ballad for now, as per TTS_INSTRUCTIONS. 
      // If other voices are used, this needs to be dynamic or passed.
      const voice = 'ballad'; 
      const streamUrl = `/api/generate-narration?voice=${voice}&textInput=${encodedTextInput}`;

      console.log('[TTS Frontend Howler] Using stream URL:', streamUrl);
      
      // Set narrating true here, before async operation, to prevent re-entry from rapid state changes if effect re-runs
      // This is a tradeoff: it might show "Oracle speaks" slightly before audio, but safer for preventing double calls.
      setIsNarrating(true);
      setNarrationError(null); // Clear previous errors

      const sound = new Howl({
        src: [streamUrl],
        format: ['mp3'],
        html5: true, 
        onload: () => {
          console.log('[TTS Frontend Howler] Howler metadata loaded for stream.');
        },
        onplay: () => {
          console.log('[TTS Frontend Howler] Howler playback started for stream.');
          // setIsNarrating(true); // Already set before new Howl
        },
        onend: () => {
          console.log('[TTS Frontend Howler] Howler playback ended for stream.');
          setIsNarrating(false);
          setGreetingHeardOnce(true);
          howlInstanceRef.current = null; 
          checkForFortuneAndProceed();
        },
        onloaderror: (id, error) => {
          console.error('[TTS Frontend Howler] Howler onloaderror for stream:', id, error);
          setNarrationError(`Oracle's voice stream couldn't be loaded: ${error}. Code: ${id}`);
          setIsNarrating(false);
          setUserManuallyInitiatedNarration(false);
          setGreetingHeardOnce(false);
          howlInstanceRef.current = null;
        },
        onplayerror: (id, error) => {
          console.error('[TTS Frontend Howler] Howler onplayerror for stream:', id, error);
          let errorMessage = `Oracle's voice stream couldn't play: ${error}. Code: ${id}`;
          if (String(error).includes("play() failed because the user didn't interact with the document first")) {
            errorMessage += " Please click the 'Hear Oracle Greetin' button again.";
          }
          setNarrationError(errorMessage);
          setIsNarrating(false);
          setUserManuallyInitiatedNarration(false); 
          setGreetingHeardOnce(false);
          howlInstanceRef.current = null;
        },
      });

      howlInstanceRef.current = sound;
      console.log('[TTS Frontend Howler] Initiating playback for stream.');
      sound.play(); 
    };

    console.log('[TTS Frontend Howler] useEffect for narration triggered. Deps - isLoadingPage:', isLoadingPage, 'profileInfo.companyName:', profileInfo.companyName, 'userManuallyInitiatedNarration:', userManuallyInitiatedNarration, 'greetingHeardOnce:', greetingHeardOnce, 'apiError:', apiError);
    if (!isLoadingPage && profileInfo.companyName && userManuallyInitiatedNarration && !greetingHeardOnce && !apiError && !narrationError) {
        console.log('[TTS Frontend Howler] Conditions met, calling playNarration with Howler.');
        playNarration();
    }

    return () => {
      console.log('[TTS Frontend Howler] Cleanup from narration useEffect (or unmount).');
      if (howlInstanceRef.current) {
        console.log('[TTS Frontend Howler] Unloading Howl instance during cleanup.');
        howlInstanceRef.current.unload();
        howlInstanceRef.current = null;
      }
    };
  }, [isLoadingPage, profileInfo, userManuallyInitiatedNarration, greetingHeardOnce, apiError, narrationError, checkForFortuneAndProceed]); // Removed isNarrating, added narrationError, apiError

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
    console.log('[TTS Frontend Howler] handleInitiateNarration button clicked.');
    setNarrationError(null); 
    setGreetingHeardOnce(false); 
    // Howler generally handles AudioContext internally, but user interaction is still key.
    // Forcing AudioContext resume if suspended can still be beneficial for overall browser audio readiness.
    const audioCtx = getAudioContext(); // This is the old AudioContext getter
    if (audioCtx && audioCtx.state === 'suspended') {
        try {
            console.log('[TTS Frontend Howler] Attempting to resume existing AudioContext before Howler initiation.');
            await audioCtx.resume();
            console.log('[TTS Frontend Howler] AudioContext resumed. State:', audioCtx.state);
        } catch (e) {
            console.error('[TTS Frontend Howler] Error resuming AudioContext:', e);
            setNarrationError("Could not activate audio system. Please check browser permissions.");
            return; // Don't proceed if audio context can't be resumed
        }
    }
    setUserManuallyInitiatedNarration(true);
  };

  const handleRevealDestiny = async () => {
    console.log('[TTS Frontend Howler] handleRevealDestiny (button) called.');
    if (howlInstanceRef.current && howlInstanceRef.current.playing()) {
        console.log('[TTS Frontend Howler] Stopping active Howler narration due to manual reveal destiny click.');
        howlInstanceRef.current.stop(); // This will trigger onend if playing, or just stop.
                                      // onend will then call checkForFortuneAndProceed
    } else {
      console.log('[TTS Frontend Howler] No active Howler audio or audio finished, directly checking for fortune.');
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
          <p className="text-xl mt-4">I&apos;ve peered into your past, present, and future…</p>
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
                  onClick={() => !(isGeneratingFortune) && handleInitiateNarration()}
                  className={`fixed inset-0 z-40 bg-mw-dark-navy/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out \
                              ${(isGeneratingFortune) ? 'opacity-50 pointer-events-none' : 'opacity-100 cursor-pointer group'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  role="button"
                  aria-label="Tap on the door to reveal Oracle&apos;s Greeting"
                  tabIndex={(isGeneratingFortune) ? -1 : 0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!(isGeneratingFortune)) {
                        handleInitiateNarration();
                      }
                    }
                  }}
                >
                  <Image
                    src="/assets/door-reveal.jpg"
                    alt="Mystical Door - Tap on the door to reveal the oracle&apos;s greeting"
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
            {((userManuallyInitiatedNarration && !greetingHeardOnce) || isNarrating) && !narrationError && (
                 <p className="text-mw-gold text-lg animate-pulse min-h-[28px]">
                    {isNarrating ? "The Oracle speaks..." : profileInfo.companyName ? "Oracle is ready to speak..." : "Preparing Oracle&apos;s greeting..."}
                 </p>
            )}

            {/* Show narration errors specifically */}
            {narrationError && (
              <div className="text-red-400 text-sm p-3 bg-red-900/30 border border-red-500/50 rounded-md">
                <p className="font-semibold">Oracle&apos;s Voice Disrupted:</p>
                <p>{narrationError}</p>
                {/* Allow retry only if not currently in a narrating state (e.g. failed to start) */}
                {!isNarrating && (
                    <Button variant="link" onClick={handleInitiateNarration} className="text-mw-light-blue hover:text-mw-gold mt-1">
                        Try to Hear Greeting Again?
                    </Button>
                )}
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
            disabled={isGeneratingFortune || (isNarrating && !narrationError) || isLoadingPage}
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
    </div>
  );
} 