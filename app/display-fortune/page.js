'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function DisplayFortuneScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [fortune, setFortune] = useState(''); // Placeholder for fortune text
  const [isLoadingFortune, setIsLoadingFortune] = useState(true);

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

  // Effect for loading and setting fortune data
  useEffect(() => {
    if (!init) return; // Don't run if particles aren't initialized yet

    setIsLoadingFortune(true); // Explicitly set loading true when we start fetching/processing
    const storedFortuneData = localStorage.getItem('fortuneData');
    let htmlString = '';

    if (storedFortuneData) {
      try {
        const parsedData = JSON.parse(storedFortuneData);
        
        htmlString += `<p class="font-caveat text-2xl sm:text-3xl text-mw-white mb-6 text-center">${parsedData.openingLine || "A mysterious silence..."}</p>`;
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
    setIsLoadingFortune(false);
    
    // Store the generated fortune text for the contact page
    localStorage.setItem('fortuneApp_fortuneText', htmlString);

    // Optional: Clear the stored fortune after displaying it if it's a one-time view
    // localStorage.removeItem('fortuneData');

  }, [init]); // Rerun when init changes (i.e., after particles are ready)


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

  const handleSaveAndShare = () => {
    console.log("Save & Share clicked. Fortune:", fortune);
    // Navigate to the contact details page as per PLAN.MD
    router.push('/contact-details');
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      <Particles
        id="tsparticles-display-fortune"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />
      
      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70 z-10">
        <img src="/MW-logo-web.svg" alt="Moving Walls Logo" className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <Card className="bg-card rounded-lg shadow-lg w-full max-w-xl z-10 mx-4"> {/* Increased max-w slightly */}
        <CardHeader className="text-center pt-6 sm:pt-8">
          <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
            Your Fortune Reveals...
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
          <div className="bg-mw-dark-navy p-4 sm:p-6 rounded-md border border-mw-light-blue/30 my-4 min-h-[200px] flex flex-col justify-center">
            {fortune ? (
              <div
                className="text-mw-white text-sm sm:text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: fortune }}
              />
            ) : (
              <p className="text-mw-white/70 text-center">Your fortune is being summoned...</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
          <Button
            onClick={handleSaveAndShare}
            size="lg"
            className="px-8 py-3 text-lg font-semibold 
                       bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker 
                       text-mw-dark-navy 
                       hover:from-mw-light-blue/90 hover:to-mw-gradient-blue-darker/90 
                       rounded-lg shadow-md transform transition-all duration-150 
                       hover:shadow-xl active:scale-95"
          >
            Save & Share This Wisdom
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 