'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import Image from 'next/image';
// Assuming your public folder is at the project root, adjust if necessary
import animationData from '../../public/animations/fortune-cookie-animation.json'; 
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const loadingPhrases = [
  "Consulting the data streams...",
  "Aligning the digital stars...",
  "Forecasting your success...",
  "Peering into the business cosmos...",
  "Unveiling market insights..."
];

export default function GeneratingFortuneScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [apiError, setApiError] = useState(null); // Added for API error handling

  // Particles engine initialization
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Automatic navigation after a delay
  useEffect(() => {
    if (!init) return; // Wait for particles

    const fetchFortuneData = async () => {
      const storedUserInfo = localStorage.getItem('userInfoForFortune');
      if (!storedUserInfo) {
        setApiError("User information not found. Please go back and complete the previous step.");
        setTimeout(() => router.push('/collect-info'), 4000); // Redirect after showing error
        return;
      }

      try {
        const requestBody = JSON.parse(storedUserInfo);
        // Optional: Consider removing the item if it's truly one-time use for this step
        // localStorage.removeItem('userInfoForFortune'); 

        const response = await fetch('/api/generate-fortune', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('fortuneData', JSON.stringify(data));
          router.push('/display-fortune');
        } else {
          const errorData = await response.json();
          console.error("API Error generating fortune:", errorData);
          setApiError(errorData.error || 'Failed to generate fortune. Please try again.');
          // Redirect back to collect-info after a delay to show the error
          setTimeout(() => router.push('/collect-info'), 5000); 
        }
      } catch (error) {
        console.error("Network/fetch error generating fortune:", error);
        setApiError('An unexpected network error occurred. Please check your connection or try again later.');
        // Redirect back to collect-info after a delay
        setTimeout(() => router.push('/collect-info'), 5000);
      }
    };

    fetchFortuneData();

  }, [init, router]); // Dependencies: init and router

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

  if (!init) {
    return null; // Or a very minimal loading state while particles initialize
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate space-y-8">
      <Particles
        id="tsparticles-generating" // Unique ID for this instance
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />
      
      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      {apiError ? (
        <div className="text-red-400 bg-red-900/30 p-6 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Oops! Something Went Wrong</h2>
          <p>{apiError}</p>
          <p className="mt-3 text-sm text-mw-white/70">You will be redirected shortly...</p>
        </div>
      ) : (
        <>
          <Lottie 
            animationData={animationData} 
            loop={true} 
            autoplay={true} 
            style={{ width: 200, height: 200 }} // Adjust size as needed
          />
          <p className="text-mw-white/80 text-lg sm:text-xl text-center min-h-[48px]">
            {loadingPhrases[currentPhraseIndex]}
          </p>
        </>
      )}
    </div>
  );
} 