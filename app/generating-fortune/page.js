'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import animationData from '../../public/animations/fortune-cookie-animation.json';

// Dynamically import Lottie to ensure it only runs on the client-side.
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Dynamically import Particles and related functions for client-side execution.
const Particles = dynamic(() => import('@tsparticles/react').then(mod => mod.Particles), { ssr: false });

/**
 * @constant {string[]} loadingPhrases - Array of phrases displayed during loading states.
 */
const loadingPhrases = [
  "Consulting the data streams...",
  "Aligning the digital stars...",
  "Forecasting your success...",
  "Peering into the business cosmos...",
  "Unveiling market insights...",
  "Stirring the digital tea leaves...",
  "Dusting off the crystal ball...",
  "Decoding the whispers of the web...",
  "Warming up the fortune-telling algorithms...",
  "Polishing our predictive pearls..."
];

/**
 * @constant {string} FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY - LocalStorage key for cached LinkedIn data.
 */
const FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'fetchedLinkedInData';
/**
 * @constant {string} FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY - LocalStorage key to signal a forced refresh of LinkedIn data.
 */
const FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'forceRefreshLinkedInData';
/**
 * @constant {string} PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY - LocalStorage key for the request body for the next step.
 */
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

/**
 * GeneratingFortuneScreen component.
 * This page handles the process of fetching user data (either from LinkedIn or manual input),
 * sending it to the backend to generate a fortune, and then navigating to the display page.
 * It shows loading animations and messages during this process.
 */
export default function GeneratingFortuneScreen() {
  const router = useRouter();
  /** @state {boolean} init - Tracks if the particles engine has been initialized. */
  const [init, setInit] = useState(false);
  /** @state {number} currentPhraseIndex - Index for cycling through loadingPhrases. */
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  /** @state {string|null} apiError - Stores API error messages to display to the user. */
  const [apiError, setApiError] = useState(null);
  /** @state {boolean} isLoading - Controls the display of loading indicators. */
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  /** @state {string} currentStepMessage - Displays specific messages about the current processing step. */
  const [currentStepMessage, setCurrentStepMessage] = useState('Initializing cosmic connection...');

  /**
   * useEffect hook for initializing the particles engine on component mount.
   * Dynamically imports particle dependencies to ensure client-side execution.
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initializeParticles = async () => {
        try {
          const { initParticlesEngine } = await import('@tsparticles/react');
          const { loadSlim } = await import('@tsparticles/slim');
          await initParticlesEngine(async (engine) => {
            await loadSlim(engine);
          });
          setInit(true);
        } catch (e) {
          console.error("Failed to initialize particles engine:", e);
          setInit(true); // Proceed without particles if they fail, or set an error state for particles.
        }
      };
      initializeParticles();
    }
  }, []);

  /**
   * useEffect hook for orchestrating the fortune generation process.
   * This effect runs once the particles engine is initialized (`init` is true).
   * It determines whether to use LinkedIn data or manually entered data from localStorage,
   * fetches necessary details, calls the fortune generation API, and handles navigation or errors.
   * @dependencies init, router
   */
  useEffect(() => {
    if (!init) return; // Wait for particles engine to be ready.

    const processFortuneGeneration = async () => {
      setIsLoading(true);
      setCurrentStepMessage('Initializing cosmic connection...'); // Initial message
      const userLinkedInProfile = localStorage.getItem('userLinkedInProfile');
      const storedManualUserInfo = localStorage.getItem('userInfoForFortune');
      let fortuneRequestBody = null;
      // debugProvider is part of the manual flow's userInfoForFortune, not directly used by LinkedIn flow here.

      try {
        // LinkedIn Flow: If a LinkedIn profile URL is available.
        if (userLinkedInProfile) {
          setCurrentStepMessage('Summoning insights from your LinkedIn profile...');
          const forceRefresh = localStorage.getItem(FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY) === 'true';
          let linkedInData;

          if (forceRefresh) {
            localStorage.removeItem(FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY); // Clear the refresh flag.
          }

          // Attempt to use cached LinkedIn data if not forcing a refresh.
          if (!forceRefresh) {
            const storedData = localStorage.getItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
            if (storedData) {
              try {
                linkedInData = JSON.parse(storedData);
                const profileIdentifier = userLinkedInProfile.split('/').pop();
                if (!linkedInData.profileData || !linkedInData.profileData.public_identifier || !linkedInData.profileData.public_identifier.includes(profileIdentifier)) {
                  console.log('Stored LinkedIn data mismatch with current profile, will refresh.');
                  linkedInData = null; 
                }
              } catch (e) {
                console.error('Error parsing stored LinkedIn data:', e);
                localStorage.removeItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY); 
              }
            }
          }

          if (!linkedInData) {
            console.log(forceRefresh ? 'Forcing LinkedIn API refresh...' : 'No valid stored LinkedIn data, fetching from API...');
            setCurrentStepMessage('Peering into your LinkedIn profile...');
            const response = await fetch('/api/get-linkedin-company-details', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linkedinUrl: userLinkedInProfile }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `LinkedIn API request failed (${response.status})`);
            linkedInData = result;
            localStorage.setItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY, JSON.stringify(linkedInData));
            console.log('LinkedIn data fetched from API and saved to localStorage.');
          } else {
            console.log('Using stored LinkedIn data from localStorage.');
          }

          if (!linkedInData.profileData) {
            throw new Error('Could not retrieve essential LinkedIn profile details for fortune generation.');
          }

          const { profileData, latestCompanyData } = linkedInData;
          fortuneRequestBody = {
            fullName: profileData.full_name || 'Mystic Seeker',
            industryType: latestCompanyData?.industry || profileData.occupation || 'Diverse Ventures',
            companyName: latestCompanyData?.name || 'Their Own Enterprise',
            geographicFocus: `${profileData.city || 'Global Reach'}, ${profileData.country_full_name || 'Cosmic Planes'}`,
            businessObjective: '', 
            // debugProvider will be picked up by /api/generate-fortune if set in userInfoForFortune in manual flow
          };
          
          // Store the constructed request body for the interlude screen's narration
          localStorage.setItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY, JSON.stringify(fortuneRequestBody));
          
          // Clear manual form data from localStorage to prevent conflicts.
          localStorage.removeItem('userInfoForFortune');

          // Initiate fortune generation in the background for LinkedIn flow
          console.log('[GeneratingFortuneScreen] Initiating background fortune generation for LinkedIn flow...');
          // Create a clone of fortuneRequestBody for the async operation to avoid potential mutation issues if needed, though not strictly necessary here with JSON.stringify.
          const backgroundFortuneRequestBody = JSON.parse(JSON.stringify(fortuneRequestBody));
          
          fetch('/api/generate-fortune', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backgroundFortuneRequestBody),
          })
          .then(async response => {
            if (!response.ok) {
              const errorData = await response.json().catch(() => response.text());
              // Use a more specific error key for background errors
              localStorage.setItem('fortuneGenerationError', errorData.error || errorData.details || errorData || `Background fortune generation failed (${response.status})`);
              console.error('[GeneratingFortuneScreen] Background fortune generation API error:', errorData);
              // No throw here, let interlude screen pick up the error from localStorage
              return null; // Indicate failure to the next .then()
            }
            return response.json();
          })
          .then(fortuneData => {
            if (fortuneData) {
              localStorage.setItem('fortuneData', JSON.stringify(fortuneData));
              localStorage.setItem('fortuneApp_fullName', backgroundFortuneRequestBody.fullName);
              localStorage.setItem('fortuneApp_industry', backgroundFortuneRequestBody.industryType);
              localStorage.setItem('fortuneApp_companyName', backgroundFortuneRequestBody.companyName);
              // Clear any previous error flag if successful
              localStorage.removeItem('fortuneGenerationError');
              console.log('[GeneratingFortuneScreen] Background fortune generation successful and saved.');
            }
            // If fortuneData is null (due to previous error), do nothing here, error is already in localStorage.
          })
          .catch(error => {
            // Catch network errors or issues in the fetch promise chain itself
            console.error("[GeneratingFortuneScreen] Network or other error in background fortune generation:", error);
            localStorage.setItem('fortuneGenerationError', error.message || "A network error occurred during background fortune generation.");
          });

          // Navigate to the interlude screen immediately after initiating background fetch.
          router.push('/linkedin-interlude');
          // setIsLoading(false) // Loading state is now managed by the interlude screen or this page's finally block if error occurs before redirect.
          return; 

        // Manual Flow: If manual user info is available (and LinkedIn profile was not).
        } else if (storedManualUserInfo) {
          setCurrentStepMessage('Consulting the ancient scrolls (your provided details)...');
          const parsedManualInfo = JSON.parse(storedManualUserInfo);
          fortuneRequestBody = {
            fullName: parsedManualInfo.fullName,
            industryType: parsedManualInfo.industryType,
            companyName: parsedManualInfo.companyName,
            geographicFocus: parsedManualInfo.geographicFocus || '',
            businessObjective: parsedManualInfo.businessObjective || '',
            debugProvider: parsedManualInfo.debugProvider || null,
          };
          localStorage.removeItem('userLinkedInProfile');
          localStorage.removeItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
          localStorage.removeItem(FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
          localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY); // Also clear this if manual flow is hit
          // For manual flow, proceed to generate fortune directly
        } else {
          setApiError('No user information found. Please go back and provide your details.');
          setIsLoading(false);
          setTimeout(() => router.push('/collect-info'), 4000); 
          return;
        }

        // THIS PART IS NOW ONLY FOR MANUAL FLOW 
        // If fortuneRequestBody is null here, it means LinkedIn flow should have redirected.
        // This check is more of a safeguard for the manual path.
        if (!fortuneRequestBody) {
            setApiError('Critical error: Fortune request details not prepared for manual flow.');
            setIsLoading(false);
            setTimeout(() => router.push('/collect-info'), 4000);
            return;
        }

        setCurrentStepMessage('Weaving your destiny... This might take a moment.');
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
        localStorage.setItem('fortuneApp_fullName', fortuneRequestBody.fullName);
        localStorage.setItem('fortuneApp_industry', fortuneRequestBody.industryType);
        localStorage.setItem('fortuneApp_companyName', fortuneRequestBody.companyName);
        localStorage.removeItem('fortuneGenerationError'); // Clear error if successful

        router.push('/fortune-journey'); // UPDATED REDIRECT for manual flow

      } catch (error) {
        console.error("Error in fortune generation process:", error);
        setApiError(`${error.message}. Taking you back to try again...`);
        // setIsLoading(false); // Set in finally
        setTimeout(() => router.push('/collect-info'), 5000); 
      } finally {
        // Only set isLoading(false) if not redirecting or if an error didn't already cause a redirect.
        // If userLinkedInProfile was processed, a redirect to /linkedin-interlude should have happened.
        // If it's manual flow, or an error occurred before LinkedIn redirect, then we might still be on this page.
        if (typeof window !== 'undefined' && window.location.pathname === '/generating-fortune') {
             setIsLoading(false);
        }
      }
    };

    processFortuneGeneration();
  }, [init, router]); // Dependencies: init and router.

  /**
   * useEffect hook for cycling through loading phrases displayed to the user.
   * Cleans up the interval on component unmount.
   */
  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setCurrentPhraseIndex(prevIndex => (prevIndex + 1) % loadingPhrases.length);
    }, 1200); // Change phrase every 1.2 seconds.
    return () => clearInterval(phraseInterval); // Cleanup interval.
  }, []);

  /**
   * useCallback hook for the `particlesLoaded` prop of the Particles component.
   * Can be used for actions once particles are loaded, currently a no-op.
   */
  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles container loaded", container); // Example log
  }, []);

  /**
   * useMemo hook for memoizing particle options to prevent unnecessary re-renders.
   * @returns {object} Particle configuration options.
   */
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

  // Conditional rendering for server-side or before client-side hydration/initialization.
  if (!init && typeof window === 'undefined') {
    // Minimal server-side render or placeholder, as particles and Lottie are client-side.
    return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4"><Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" /></div>;
  }
  // Conditional rendering if particles are not yet initialized on the client.
  if (!init && typeof window !== 'undefined') { 
    return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4"><Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" /></div>; 
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate space-y-8">
      {init && Particles && (
        <Particles
          id="tsparticles-generating" // Unique ID for this Particles instance.
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]" // Ensure particles are in the background.
        />
      )}
      
      {/* Moving Walls Logo */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      {/* Main content area: displays loading/error states or Lottie animation. */}
      {isLoading || apiError ? (
        <div className={`p-6 rounded-lg shadow-lg text-center max-w-md ${apiError ? 'bg-red-900/50 text-red-300' : 'bg-transparent'}`}>
          {apiError ? (
            <>
              <h2 className="text-xl font-semibold mb-2">A Hiccup in the Cosmos!</h2>
              <p>{apiError}</p>
            </>
          ) : (
            // Display Lottie animation and current step/loading phrase when loading and no error.
            <>
              <Lottie 
                animationData={animationData} 
                loop={true} 
                autoplay={true} 
                style={{ width: 200, height: 200, margin: '0 auto' }} 
              />
              <p className="text-mw-white/90 text-lg sm:text-xl mt-4 min-h-[48px]">
                {currentStepMessage || loadingPhrases[currentPhraseIndex]}
              </p>
            </>
          )}
        </div>
      ) : (
        // Fallback content if not loading and no error, though ideally navigation would have occurred.
        // This state should generally not be reached if logic routes correctly on success/error.
        <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue mb-4" />
            <p className="text-mw-white/80 text-lg">Finalizing your cosmic message...</p>
        </div>
      )}
    </div>
  );
} 