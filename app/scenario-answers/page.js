'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, AlertTriangle } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ScenarioAnswersScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [scenarioAnswers, setScenarioAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Particles
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container) => {}, []);

  const particleOptions = useMemo(() => ({
    particles: {
      number: { value: 30, density: { enable: true, value_area: 800 } },
      color: { value: ["#FFFFFF", "#5BADDE"] },
      shape: { type: "circle" },
      opacity: { value: 0.2, random: true, anim: { enable: true, speed: 0.4, opacity_min: 0.1, sync: false } },
      size: { value: { min: 1, max: 2 }, random: true },
      move: { enable: true, speed: 0.5, direction: "none", random: true, straight: false, outModes: { default: "out" }, bounce: false },
    },
    interactivity: { detect_on: "canvas", events: { onhover: { enable: false }, onclick: { enable: false }, resize: true } },
    detectRetina: true,
  }), []);

  useEffect(() => {
    const fetchAnswers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Phase 1: Use hardcoded scenario IDs
        const mockSelectedScenarioIDs = ["scenario_1", "scenario_3"]; 
        // In Phase 2, this will come from localStorage:
        // const storedScenarioIds = localStorage.getItem('selectedScenarioIDs');
        // const selectedScenarioIDs = storedScenarioIds ? JSON.parse(storedScenarioIds) : mockSelectedScenarioIDs;

        const response = await fetch('/api/generate-scenario-answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedScenarios: mockSelectedScenarioIDs }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "API error response unreadable" }));
          throw new Error(errorData.error || `Failed to fetch scenario answers (${response.status})`);
        }

        const data = await response.json();
        if (data.scenarioAnswers) {
          setScenarioAnswers(data.scenarioAnswers);
        } else {
          throw new Error("Scenario answers not found in API response.");
        }
      } catch (err) {
        console.error("Error fetching scenario answers:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnswers();
  }, []);

  const handleNavigateToContacts = () => {
    router.push('/contact-details');
  };
  
  if (!init) { // Wait for particles to be ready if it's a core visual element
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate">
      {init && Particles && (
        <Particles
          id="tsparticles-scenario-answers"
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

      <main className="w-full max-w-4xl z-10 my-12">
        <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
          <CardHeader className="text-center pt-6 sm:pt-8">
            <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
              Insights for Your Chosen Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
            {isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-mw-white/80">
                <Loader2 className="h-10 w-10 animate-spin text-mw-light-blue mb-4" />
                <p className="text-lg">Unveiling strategic insights...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-red-400 bg-red-900/20 p-6 rounded-md">
                <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
                <p className="text-xl font-semibold">A Cosmic Glitch!</p>
                <p className="text-center mt-2">{error}</p>
                <Button onClick={() => router.push('/collect-info')} className="mt-6">Start Over</Button>
              </div>
            )}

            {!isLoading && !error && scenarioAnswers.length > 0 && (
              <div className="space-y-8">
                {scenarioAnswers.map((answer, index) => (
                  <div key={index} className="p-5 rounded-lg bg-mw-dark-blue/30 border border-mw-light-blue/20 shadow-md">
                    <h3 className="text-xl font-semibold text-mw-gold mb-3">{answer.scenario}</h3>
                    {answer.insight && (
                      <>
                        <p className="text-mw-white/80 italic mb-4">{answer.insight.subQuestion}</p>
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-mw-light-blue mb-2">How MW Helps:</h4>
                          <ul className="space-y-2 list-inside">
                            {answer.insight.howMWHelps?.map((point, pIndex) => (
                              <li key={pIndex} className="flex items-start">
                                <span className="text-xl mr-2">{point.icon}</span>
                                <span className="text-mw-white/90">{point.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-md font-semibold text-mw-light-blue mb-2">Business Impact:</h4>
                          <p className="text-mw-white/90">{answer.insight.businessImpact}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
             {!isLoading && !error && scenarioAnswers.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-mw-white/70">
                    <p className="text-lg">No scenario insights available at the moment.</p>
                </div>
             )}
          </CardContent>
          {!isLoading && !error && (
            <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
              <Button
                onClick={handleNavigateToContacts}
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
          )}
        </Card>
      </main>
    </div>
  );
} 