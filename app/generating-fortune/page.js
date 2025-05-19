'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Loader2 } from 'lucide-react'; // Assuming you have this for loading state
// Assuming your public folder is at the project root, adjust if necessary
import animationData from '../../public/animations/fortune-cookie-animation.json'; 
// import Particles, { initParticlesEngine } from "@tsparticles/react"; // Comment out or remove direct import
// import { loadSlim } from "@tsparticles/slim"; // Comment out or remove direct import

// Dynamically import Lottie
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Dynamically import Particles and related functions
const Particles = dynamic(() => import('@tsparticles/react').then(mod => mod.Particles), { ssr: false });
// Removed top-level dynamic imports for initParticlesEngine and loadSlim

const loadingPhrases = [
  "Stirring the digital tea leaves...",
  "Dusting off the crystal ball...",
  "Decoding the whispers of the web...",
  "Warming up the fortune-telling algorithms...",
  "Polishing our predictive pearls..."
];

const FETCHED_DATA_LOCAL_STORAGE_KEY = 'fetchedLinkedInData';
const FORCE_REFRESH_LOCAL_STORAGE_KEY = 'forceRefreshLinkedInData';

export default function GeneratingFortuneScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [apiError, setApiError] = useState(null); // Added for API error handling
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Particles engine initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initializeParticles = async () => {
        try {
          // Dynamically import functions here
          const { initParticlesEngine } = await import('@tsparticles/react');
          const { loadSlim } = await import('@tsparticles/slim');
          
          await initParticlesEngine(async (engine) => {
            await loadSlim(engine);
          });
          setInit(true);
        } catch (e) {
          console.error("Failed to initialize particles engine:", e);
          // Handle error, maybe setInit(true) anyway or set an error state for particles
          setInit(true); // Proceed without particles if they fail, or handle error differently
        }
      };
      initializeParticles();
    }
  }, []); // Empty dependency array, runs once on mount client-side

  // Automatic navigation after a delay
  useEffect(() => {
    if (!init) return; // Wait for particles

    const loadAndProcessData = async () => {
      const userLinkedInProfile = localStorage.getItem('userLinkedInProfile');
      const forceRefresh = localStorage.getItem(FORCE_REFRESH_LOCAL_STORAGE_KEY) === 'true';

      if (!userLinkedInProfile) {
        setError('Oops! We need your LinkedIn profile URL to peek into your future. Let\'s go back and grab it!');
        setIsLoading(false);
        return;
      }

      if (forceRefresh) {
        localStorage.removeItem(FORCE_REFRESH_LOCAL_STORAGE_KEY); // Clear the flag immediately
      }

      try {
        setIsLoading(true);
        let fetchedData;

        if (!forceRefresh) {
          const storedData = localStorage.getItem(FETCHED_DATA_LOCAL_STORAGE_KEY);
          if (storedData) {
            try {
              fetchedData = JSON.parse(storedData);
              // Optional: Add a check here if the stored data is for the current userLinkedInProfile
              // if (fetchedData && fetchedData.profileData && fetchedData.profileData.public_identifier === userLinkedInProfile.split('/').pop()) {
              //    setData(fetchedData);
              //   setIsLoading(false);
              //   return; // Data from localStorage is valid and used
              // } else {
              //   console.log('Stored data is for a different profile or invalid, forcing refresh.');
              //   fetchedData = null; // Invalidate mismatched stored data
              // }
            } catch (e) {
              console.error('Error parsing stored LinkedIn data:', e);
              localStorage.removeItem(FETCHED_DATA_LOCAL_STORAGE_KEY); // Clear corrupted data
            }
          }
        }
        
        // If forceRefresh is true, or if no valid data was found in localStorage
        if (forceRefresh || !fetchedData) {
          console.log(forceRefresh ? 'Forcing API refresh...' : 'No valid stored data, fetching from API...');
          const response = await fetch('/api/get-linkedin-company-details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ linkedinUrl: userLinkedInProfile }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || `API request failed with status ${response.status}`);
          }
          fetchedData = result;
          localStorage.setItem(FETCHED_DATA_LOCAL_STORAGE_KEY, JSON.stringify(fetchedData));
          console.log('Data fetched from API and saved to localStorage.');
        } else {
          console.log('Using data from localStorage.');
        }
        
        setData(fetchedData);

      } catch (err) {
        console.error('Failed to fetch or process LinkedIn details:', err);
        setError(`Hmm, our crystal ball seems a bit foggy right now. ${err.message || 'An error occurred while processing details.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadAndProcessData();
  }, [init]); // Runs once on component mount

  // Effect for cycling through loading phrases
  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setCurrentPhraseIndex(prevIndex => (prevIndex + 1) % loadingPhrases.length);
    }, 1200); // Change phrase every 1.2 seconds

    return () => clearInterval(phraseInterval); // Cleanup the interval on component unmount
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles container loaded", container);
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

  if (!init && typeof window === 'undefined') {
    // Fallback for SSR: if particles are essential, this might need a placeholder.
    // If they are decorative, rendering null or a basic loader is fine.
    // Since we are now trying to make it SSR compatible by deferring particles,
    // we might still want to show something.
    // However, the main issue is `document` not defined, so client-side components are key.
    // For now, let's keep the original logic of returning null if !init
    // but be mindful that on the server, init might not become true if it depends on client-side particle init.
    // The dynamic imports with ssr:false should prevent the components from rendering on server.
  }

  if (!init && typeof window !== 'undefined') { // Keep null return if not initialized on client
    return null; // Or a very minimal loading state while particles initialize
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4">
        {init && Particles && (
          <Particles
            id="tsparticles-loading-data"
            particlesLoaded={particlesLoaded}
            options={particleOptions}
            className="absolute top-0 left-0 w-full h-full z-[-1]"
          />
        )}
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue mb-4" />
        <p className="text-xl">Processing LinkedIn data...</p>
        <p className="text-sm text-mw-white/70">{loadingPhrases[currentPhraseIndex]}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 text-center">
        {init && Particles && (
          <Particles
            id="tsparticles-error"
            particlesLoaded={particlesLoaded}
            options={particleOptions}
            className="absolute top-0 left-0 w-full h-full z-[-1]"
          />
        )}
        <h1 className="text-2xl font-bold text-red-400 mb-4">A Slight Hiccup!</h1>
        <p className="mb-6">{error}</p>
        <button
          onClick={() => router.push('/collect-info')}
          className="px-6 py-2 bg-mw-light-blue text-mw-dark-navy font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Let's Go Back
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4">
        {init && Particles && (
          <Particles
            id="tsparticles-no-data"
            particlesLoaded={particlesLoaded}
            options={particleOptions}
            className="absolute top-0 left-0 w-full h-full z-[-1]"
          />
        )}
        It seems the future is shy today! No data was found. Let\'s give it another whirl from the start.
        <button
          onClick={() => router.push('/collect-info')}
          className="mt-4 px-6 py-2 bg-mw-light-blue text-mw-dark-navy font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Try Anew
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate space-y-8">
      {init && Particles && ( 
        <Particles
          id="tsparticles-generating-main" 
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
      )}
      
      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <div className="bg-card p-8 rounded-lg shadow-xl max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-mw-gold mb-6 text-center">Your Cosmic Profile</h1>
        
        {data.profileData && (
          <div className="mb-6 pb-6 border-b border-mw-white/20">
            <h2 className="text-2xl font-semibold text-mw-light-blue mb-3">Profile: {data.profileData.full_name || 'N/A'}</h2>
            <p><span className="font-semibold">Headline:</span> {data.profileData.headline || 'N/A'}</p>
            <p><span className="font-semibold">Location:</span> {(data.profileData.city || 'N/A') + ', ' + (data.profileData.country_full_name || 'N/A')}</p>
            <p><span className="font-semibold">Summary:</span> {data.profileData.summary ? data.profileData.summary.substring(0,150)+'...' : 'N/A'}</p>
          </div>
        )}

        {data.latestCompanyData ? (
          <div>
            <h2 className="text-2xl font-semibold text-mw-light-blue mb-3">Latest Company: {data.latestCompanyData.name || 'N/A'}</h2>
            <p><span className="font-semibold">Industry:</span> {data.latestCompanyData.industry || 'N/A'}</p>
            <p><span className="font-semibold">Website:</span> <a href={data.latestCompanyData.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.latestCompanyData.website || 'N/A'}</a></p>
            <p><span className="font-semibold">Tagline:</span> {data.latestCompanyData.tagline || 'N/A'}</p>
            <p><span className="font-semibold">Description:</span> {data.latestCompanyData.description ? data.latestCompanyData.description.substring(0,200)+'...' : 'N/A'}</p>
          </div>
        ) : (
          <p className="text-mw-white/70">{data.message || 'Latest company data not available or could not be fetched.'}</p>
        )}

        <div className="mt-8 text-center">
            <p className="text-mw-gold text-lg">Ready to see what the future holds? Let\'s weave this data into your fortune!</p>
        </div>

      </div>
    </div>
  );
} 