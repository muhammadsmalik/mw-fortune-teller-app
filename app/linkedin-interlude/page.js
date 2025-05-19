'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Mic } from 'lucide-react';
import { Button } from "@/components/ui/button"; 

const FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'fetchedLinkedInData';
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

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
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);

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

  // Function to construct narration text
  const getNarrationText = useCallback(() => {
    if (!profileInfo.companyName && !profileInfo.jobTitle) return null;

    let text = "Ah, seeker...\nI've peered into your LinkedIn profile…\n";
    if (profileInfo.fullName) {
      text += `They call you ${profileInfo.fullName}.\n`;
    }
    text += `You work at ${profileInfo.companyName || 'a noteworthy venture'} as ${profileInfo.jobTitle || 'an individual of significance'}.\n`;
    if (profileInfo.previousCompanies) {
      text += `${profileInfo.previousCompanies}\n`;
    }
    text += "You seek clarity. And destiny has sent you here.";
    return text;
  }, [profileInfo]);

  // Effect to fetch and play narration
  useEffect(() => {
    const playNarration = async () => {
      const narrationText = getNarrationText();
      const audioContext = getAudioContext();

      if (!audioContext) {
        console.error('[TTS Frontend] playNarration: AudioContext not available.');
        setNarrationError("Audio system not ready. Please click 'Hear Oracle's Greeting' to enable audio.");
        setIsNarrating(false);
        setUserManuallyInitiatedNarration(false);
        return;
      }

      console.log('[TTS Frontend] playNarration called. Conditions - narrationText:', !!narrationText, 'isNarrating:', isNarrating, 'isLoadingPage:', isLoadingPage, 'userManuallyInitiatedNarration:', userManuallyInitiatedNarration, 'audioContextState:', audioContext?.state);

      if (!narrationText || isNarrating || isLoadingPage || !userManuallyInitiatedNarration) {
        // Logging for why playNarration might bail out
        if(!narrationText) console.log('[TTS Frontend] playNarration: Bailing - No narration text.');
        if(isNarrating) console.log('[TTS Frontend] playNarration: Bailing - Already narrating.');
        if(isLoadingPage) console.log('[TTS Frontend] playNarration: Bailing - Page is still loading.');
        if(!userManuallyInitiatedNarration) console.log('[TTS Frontend] playNarration: Bailing - User has not manually initiated narration.');
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
            // User has heard the greeting, keep userManuallyInitiatedNarration as true.
            audioSourceRef.current = null;
        };

      } catch (error) {
        console.error("[TTS Frontend] Error in playNarration catch block:", error);
        setNarrationError(`The spirits are quiet: ${error.message}. Please try the greeting again.`);
        setIsNarrating(false);
        setUserManuallyInitiatedNarration(false);
      }
    };

    console.log('[TTS Frontend] useEffect for narration triggered. Deps - isLoadingPage:', isLoadingPage, 'profileInfo.companyName:', profileInfo.companyName, 'userManuallyInitiatedNarration:', userManuallyInitiatedNarration);
    if (!isLoadingPage && profileInfo.companyName && userManuallyInitiatedNarration) {
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
    };
  }, [isLoadingPage, profileInfo, getNarrationText, userManuallyInitiatedNarration]); // Ensure userManuallyInitiatedNarration is a dependency

  useEffect(() => {
    console.log('[TTS Frontend] useEffect for profile data loading triggered.');
    const storedLinkedInDataString = localStorage.getItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
    const storedFortuneRequestBodyString = localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);

    if (!storedLinkedInDataString || !storedFortuneRequestBodyString) {
      console.error('[TTS Frontend] Essential data missing from localStorage. Redirecting.');
      setApiError("Essential information not found. Please start over.");
      setIsLoadingPage(false);
      setTimeout(() => router.push('/collect-info'), 4000);
      return;
    }

    try {
      const linkedInData = JSON.parse(storedLinkedInDataString);
      const parsedFortuneRequestBody = JSON.parse(storedFortuneRequestBodyString);
      setFortuneRequestBody(parsedFortuneRequestBody);

      const { profileData, latestCompanyData } = linkedInData;
      let companyName = 'your current venture';
      if (latestCompanyData?.name) {
        companyName = latestCompanyData.name;
      } else if (profileData?.experiences?.length > 0 && profileData.experiences[0]?.company) {
        companyName = profileData.experiences[0].company;
      }
      
      let jobTitle = 'your esteemed role';
      if (profileData?.occupation) {
        jobTitle = profileData.occupation;
      } else if (profileData?.experiences?.length > 0 && profileData.experiences[0]?.title) {
        jobTitle = profileData.experiences[0].title;
      }

      let previousCompaniesString = '';
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
      
      const fullName = parsedFortuneRequestBody.fullName || 'Valued User';
      const industryType = parsedFortuneRequestBody.industryType || 'Diverse Fields';

      setProfileInfo({
        companyName,
        jobTitle,
        previousCompanies: previousCompaniesString,
        fullName,
        industryType
      });
      console.log('[TTS Frontend] Profile info set:', { companyName, jobTitle, fullName, industryType });
      setIsLoadingPage(false);
      console.log('[TTS Frontend] isLoadingPage set to false.');

    } catch (error) {
      console.error("[TTS Frontend] Error processing LinkedIn data for interlude:", error);
      setApiError("There was an issue understanding your profile. Please try again.");
      setIsLoadingPage(false);
      console.log('[TTS Frontend] isLoadingPage set to false due to error in profile data processing.');
      setTimeout(() => router.push('/collect-info'), 4000);
    }
  }, [router]);

  const handleInitiateNarration = async () => {
    console.log('[TTS Frontend] handleInitiateNarration button clicked.');
    setNarrationError(null); // Clear previous errors on new attempt
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
        return;
      }
    }
    // If context is already running or resumed successfully, set state to trigger narration effect
    setUserManuallyInitiatedNarration(true);
  };

  const handleRevealDestiny = async () => {
    console.log('[TTS Frontend] handleRevealDestiny called.');
    if (audioSourceRef.current) {
        console.log('[TTS Frontend] Stopping active narration before revealing destiny.');
        audioSourceRef.current.stop();
        setIsNarrating(false);
    }

    if (!fortuneRequestBody) {
      console.error('[TTS Frontend] handleRevealDestiny: Cannot proceed, vital information missing.');
      setApiError("Cannot proceed, vital information missing. Please restart.");
      setTimeout(() => router.push('/collect-info'), 4000);
      return;
    }

    setIsGeneratingFortune(true);
    setApiError(null);

    try {
      // Simulate API call delay for testing UI
      // await new Promise(resolve => setTimeout(resolve, 2000));
      const fortuneResponse = await fetch('/api/generate-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fortuneRequestBody),
      });

      if (!fortuneResponse.ok) {
        const errorData = await fortuneResponse.json();
        throw new Error(errorData.error || errorData.details || `Failed to generate fortune (${fortuneResponse.status})`);
      }

      const fortuneData = await fortuneResponse.json();
      localStorage.setItem('fortuneData', JSON.stringify(fortuneData));
      localStorage.setItem('fortuneApp_fullName', profileInfo.fullName || fortuneRequestBody.fullName);
      localStorage.setItem('fortuneApp_industry', profileInfo.industryType || fortuneRequestBody.industryType);
      localStorage.setItem('fortuneApp_companyName', profileInfo.companyName || fortuneRequestBody.companyName);
      localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);
      router.push('/display-fortune');

    } catch (error) {
      console.error("Error generating fortune from interlude:", error);
      setApiError(`A cosmic disturbance interrupted fortune generation: ${error.message}. Redirecting...`);
      setIsGeneratingFortune(false);
      setTimeout(() => router.push('/collect-info'), 5000);
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-8 relative isolate space-y-6 text-center">
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
            className="mb-6 object-contain"
            priority={true}
          />
          
          <h1 className="text-3xl font-semibold text-mw-light-blue">Ah, {profileInfo.fullName || 'seeker'}...</h1>
          <p className="text-xl mt-4">I've peered into your LinkedIn profile…</p>
          <p className="text-xl">You work at <strong className="text-mw-gold">{profileInfo.companyName || 'an intriguing place'}</strong> as <strong className="text-mw-gold">{profileInfo.jobTitle || 'a person of mystery'}</strong>…</p>
          {profileInfo.previousCompanies && (
            <p className="text-md mt-2 text-mw-white/80">{profileInfo.previousCompanies}</p>
          )}
          <p className="text-xl mt-4 italic">You seek clarity. And destiny has sent you here.</p>
          
          {/* Narration Control UI Block */}
          <div className="mt-8 mb-4 space-y-3 text-center w-full max-w-md mx-auto">
            {/* Show button if not yet clicked, not narrating, and data is loaded */}
            {!isLoadingPage && !userManuallyInitiatedNarration && !isNarrating && (
              <Button
                onClick={handleInitiateNarration}
                size="lg"
                className="w-full px-6 py-3 text-md font-semibold \
                           bg-mw-light-blue text-mw-dark-navy hover:bg-mw-light-blue/80 \
                           rounded-lg shadow-md transform transition-all duration-150 \
                           hover:shadow-lg active:scale-95 disabled:opacity-70"
                disabled={isGeneratingFortune} // Only disable if actively generating fortune
              >
                <Mic className="mr-2 h-5 w-5" /> Hear Oracle's Greeting
              </Button>
            )}

            {/* Show status if narration has been attempted or is active, and no overriding error */}
            {(userManuallyInitiatedNarration || isNarrating) && !narrationError && (
                 <p className="text-mw-gold text-lg animate-pulse min-h-[28px]">
                    {isNarrating ? "The Oracle speaks..." : profileInfo.companyName ? "Oracle is ready to speak..." : "Preparing Oracle's greeting..."}
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
            disabled={isGeneratingFortune || (isNarrating && !narrationError) || isLoadingPage}
          >
            {isGeneratingFortune ? 
                <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Consulting Oracles...</> :
                "Reveal My Destiny"
            }
          </Button>
        </>
      )}

      {/* Full page loader specifically for when isGeneratingFortune is true */}
      {isGeneratingFortune && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-mw-dark-navy/80 backdrop-blur-sm z-50">
          <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
          <p className="text-lg text-mw-white/90 mt-4">Consulting the oracles for your fortune...</p>
          {isNarrating && <p className="text-sm text-mw-gold">The oracle is still speaking...</p>}
          <p className="text-sm text-mw-white/70">This may take a moment as we chart your stars.</p>
        </div>
      )}
    </div>
  );
} 