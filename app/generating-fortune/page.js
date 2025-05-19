'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import animationData from '../../public/animations/fortune-cookie-animation.json';

// Dynamically import Lottie
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Dynamically import Particles and related functions
const Particles = dynamic(() => import('@tsparticles/react').then(mod => mod.Particles), { ssr: false });

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

const FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'fetchedLinkedInData';
const FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'forceRefreshLinkedInData';

export default function GeneratingFortuneScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [currentStepMessage, setCurrentStepMessage] = useState('Initializing cosmic connection...');

  // Particles engine initialization
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
          setInit(true); // Proceed without particles if they fail
        }
      };
      initializeParticles();
    }
  }, []);

  // Main data fetching and fortune generation logic
  useEffect(() => {
    if (!init) return;

    const processFortuneGeneration = async () => {
      setIsLoading(true);
      const userLinkedInProfile = localStorage.getItem('userLinkedInProfile');
      const storedManualUserInfo = localStorage.getItem('userInfoForFortune');
      let fortuneRequestBody = null;
      let debugProvider = null;

      try {
        if (userLinkedInProfile) {
          setCurrentStepMessage('Summoning insights from your LinkedIn profile...');
          const forceRefresh = localStorage.getItem(FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY) === 'true';
          let linkedInData;

          if (forceRefresh) {
            localStorage.removeItem(FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
          }

          if (!forceRefresh) {
            const storedData = localStorage.getItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
            if (storedData) {
              try {
                linkedInData = JSON.parse(storedData);
                // Basic check: does stored data seem to correspond to the current user profile?
                // This is a loose check, could be more robust.
                const profileIdentifier = userLinkedInProfile.split('/').pop();
                if (!linkedInData.profileData || !linkedInData.profileData.public_identifier || !linkedInData.profileData.public_identifier.includes(profileIdentifier)) {
                  console.log('Stored LinkedIn data mismatch, will refresh.');
                  linkedInData = null; // Invalidate if it doesn't seem to match
                }
              } catch (e) {
                console.error('Error parsing stored LinkedIn data:', e);
                localStorage.removeItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
              }
            }
          }

          if (!linkedInData) {
            console.log(forceRefresh ? 'Forcing LinkedIn API refresh...' : 'No valid stored LinkedIn data, fetching from API...');
            const response = await fetch('/api/get-linkedin-company-details', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linkedinUrl: userLinkedInProfile }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `LinkedIn API request failed (${response.status})`);
            linkedInData = result;
            localStorage.setItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY, JSON.stringify(linkedInData));
            console.log('LinkedIn data fetched from API and saved.');
          } else {
            console.log('Using stored LinkedIn data.');
          }

          if (!linkedInData.profileData) {
            throw new Error('Could not retrieve LinkedIn profile details needed for fortune.');
          }

          const { profileData, latestCompanyData } = linkedInData;
          fortuneRequestBody = {
            fullName: profileData.full_name || 'Mystic Seeker',
            industryType: latestCompanyData?.industry || profileData.occupation || 'Diverse Ventures',
            companyName: latestCompanyData?.name || 'Their Own Enterprise',
            geographicFocus: `${profileData.city || 'Global Reach'}, ${profileData.country_full_name || 'Cosmic Planes'}`,
            businessObjective: '', // LinkedIn flow doesn't provide this, can be added if collected elsewhere
            // debugProvider will be null unless specific logic for LinkedIn flow debug is added
          };
          // Clear manual form data to avoid confusion if user switches flows
          localStorage.removeItem('userInfoForFortune');

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
           // Clear LinkedIn data if proceeding with manual to avoid confusion
          localStorage.removeItem('userLinkedInProfile');
          localStorage.removeItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
          localStorage.removeItem(FORCE_REFRESH_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
        } else {
          setApiError('No user information found. Please go back and provide your details.');
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
        // Store some primary details for the contact page
        localStorage.setItem('fortuneApp_fullName', fortuneRequestBody.fullName);
        localStorage.setItem('fortuneApp_industry', fortuneRequestBody.industryType);
        localStorage.setItem('fortuneApp_companyName', fortuneRequestBody.companyName);
        
        router.push('/display-fortune');

      } catch (error) {
        console.error("Error in fortune generation process:", error);
        setApiError(`${error.message}. Taking you back to try again...`);
        setTimeout(() => router.push('/collect-info'), 5000);
      } finally {
        setIsLoading(false); // Ensure loading is set to false in all cases
      }
    };

    processFortuneGeneration();
  }, [init, router]);

  // Effect for cycling through loading phrases
  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setCurrentPhraseIndex(prevIndex => (prevIndex + 1) % loadingPhrases.length);
    }, 1200);
    return () => clearInterval(phraseInterval);
  }, []);

  const particlesLoaded = useCallback(async (container) => {}, []);

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

  if (!init && typeof window === 'undefined') {
    // Minimal server-side render or nothing, as particles and Lottie are client-side
    return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4"><Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" /></div>;
  }
  if (!init && typeof window !== 'undefined') { 
    return <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4"><Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" /></div>; 
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate space-y-8">
      {init && Particles && (
        <Particles
          id="tsparticles-generating"
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
      )}
      
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      {isLoading || apiError ? (
        <div className={`p-6 rounded-lg shadow-lg text-center max-w-md ${apiError ? 'bg-red-900/50 text-red-300' : 'bg-transparent'}`}>
          {apiError ? (
            <>
              <h2 className="text-xl font-semibold mb-2">A Hiccup in the Cosmos!</h2>
              <p>{apiError}</p>
            </>
          ) : (
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
        // This state should ideally not be reached if isLoading transitions correctly
        // and navigation occurs on success/error.
        // Adding a fallback message or loader just in case.
        <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue mb-4" />
            <p className="text-mw-white/80 text-lg">Finalizing your cosmic message...</p>
        </div>
      )}
    </div>
  );
} 