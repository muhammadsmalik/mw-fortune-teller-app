'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CheckSquare, Square, Loader2 } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import scenariosData from '@/lib/predefined_scenarios.json'; // Importing the JSON directly

const MAX_SELECTIONS = 2;

export default function ScenarioSelectionScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [allScenarios, setAllScenarios] = useState([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState([]);
  const [error, setError] = useState(null);

  // Initialize Particles
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // Load scenarios from imported JSON
  useEffect(() => {
    if (scenariosData && Array.isArray(scenariosData)) {
      setAllScenarios(scenariosData.map(s => ({ id: s.id, displayText: s.displayText })));
    } else {
      console.error("Failed to load scenarios data or data is not in expected format.");
      setError("Could not load scenarios. Please try refreshing the page.");
    }
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

  const handleScenarioToggle = (scenarioId) => {
    setSelectedScenarioIds(prevSelected => {
      if (prevSelected.includes(scenarioId)) {
        return prevSelected.filter(id => id !== scenarioId);
      }
      if (prevSelected.length < MAX_SELECTIONS) {
        return [...prevSelected, scenarioId];
      }
      // Optional: Notify user they can only select MAX_SELECTIONS (e.g., using a toast notification)
      console.warn(`Cannot select more than ${MAX_SELECTIONS} scenarios.`);
      return prevSelected; // Keep current selection if limit reached and trying to add
    });
  };

  const handleProceed = () => {
    if (selectedScenarioIds.length !== MAX_SELECTIONS) {
      setError(`Please select exactly ${MAX_SELECTIONS} scenarios to proceed.`);
      return;
    }
    setError(null);
    localStorage.setItem('selectedScenarioIDs', JSON.stringify(selectedScenarioIds));
    
    // Phase 2: Always navigate to /generating-fortune
    // In Phase 3, this will become conditional:
    // const isLinkedInFlow = !!localStorage.getItem('PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY');
    // if (isLinkedInFlow) {
    //   router.push('/display-fortune');
    // } else {
    //   router.push('/generating-fortune');
    // }
    router.push('/generating-fortune'); 
  };

  if (!init || allScenarios.length === 0 && !error) { // Wait for particles and scenarios to load
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p>Loading Scenarios...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate">
      {init && Particles && (
        <Particles
          id="tsparticles-scenario-selection"
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

      <main className="w-full max-w-3xl z-10 my-12">
        <Card className="bg-card/80 backdrop-blur-sm rounded-lg shadow-xl w-full">
          <CardHeader className="text-center pt-6 sm:pt-8">
            <CardTitle className="text-mw-light-blue font-bold tracking-wide text-2xl sm:text-3xl">
              Choose Two Scenarios to Explore
            </CardTitle>
            <p className="text-mw-white/70 text-sm mt-2">
              Select exactly {MAX_SELECTIONS} scenarios that resonate most with your current business focus.
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
            {error && (
                <div className="mb-4 p-3 text-center text-red-400 bg-red-900/30 border border-red-700 rounded-md">
                    {error}
                </div>
            )}
            {allScenarios.length > 0 ? (
              <div className="space-y-4">
                {allScenarios.map((scenario) => {
                  const isSelected = selectedScenarioIds.includes(scenario.id);
                  return (
                    <div
                      key={scenario.id}
                      onClick={() => handleScenarioToggle(scenario.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ease-in-out 
                                  flex items-center space-x-3 
                                  ${isSelected 
                                    ? 'bg-mw-light-blue/20 border-mw-light-blue shadow-lg' 
                                    : 'bg-mw-dark-blue/30 border-mw-light-blue/30 hover:bg-mw-light-blue/10'}
                                `}
                    >
                      {isSelected ? 
                        <CheckSquare className="h-6 w-6 text-mw-gold flex-shrink-0" /> : 
                        <Square className="h-6 w-6 text-mw-white/50 flex-shrink-0" />
                      }
                      <span className={`text-base ${isSelected ? 'text-mw-white font-semibold' : 'text-mw-white/80'}`}>
                        {scenario.displayText}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              !error && <p className="text-center text-mw-white/70">Loading scenarios...</p>
            )}
          </CardContent>
          {allScenarios.length > 0 && (
            <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
              <Button
                onClick={handleProceed}
                size="lg"
                className="px-8 py-3 text-lg font-semibold \
                           bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] \
                           text-mw-dark-navy \
                           hover:opacity-90 \
                           rounded-lg shadow-md transform transition-all duration-150 \
                           hover:shadow-xl active:scale-95"
                disabled={selectedScenarioIds.length !== MAX_SELECTIONS}
              >
                Proceed with {selectedScenarioIds.length}/{MAX_SELECTIONS} Selected
              </Button>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
} 