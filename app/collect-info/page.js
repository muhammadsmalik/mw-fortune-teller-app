'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function CollectInfoScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);

  const [fullName, setFullName] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleProceed = async () => {
    // Basic validation (optional, can be enhanced)
    if (!fullName || !industryType || !companyName) {
      alert("Please fill in all fields.");
      return;
    }
    console.log("Collected Info:", { fullName, industryType, companyName });
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-fortune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName, industryType, companyName }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('fortuneData', JSON.stringify(data));

        // Store user inputs for contact page
        localStorage.setItem('fortuneApp_fullName', fullName);
        localStorage.setItem('fortuneApp_industry', industryType);
        localStorage.setItem('fortuneApp_companyName', companyName);

        router.push('/generating-fortune');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to generate fortune. Please try again.');
      }
    } catch (error) {
      alert('An unexpected error occurred. Please check your connection or try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!init) {
    return null; // Or a minimal loading state
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      <Particles
        id="tsparticles-collect-info" // Unique ID for this instance
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />
      
      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <img src="/MW-logo-web.svg" alt="Moving Walls Logo" className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <Card className="bg-card rounded-lg shadow-lg w-full max-w-lg"> {/* Adjusted max-w for potentially more content */}
        <CardHeader className="text-center">
          <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
            A Glimpse Into Your World...
          </CardTitle>
          <CardDescription className="text-mw-white/80 text-sm sm:text-base pt-2">
            To tailor your fortune, please share a few details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-mw-white/90">Full Name</Label>
            <Input 
              id="fullName" 
              type="text" 
              placeholder="e.g., Alex Chan" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="industryType" className="text-mw-white/90">Industry Type</Label>
            <Select value={industryType} onValueChange={setIndustryType}>
              <SelectTrigger id="industryType" className="bg-input text-mw-white border-border focus:ring-ring">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border"> {/* Ensure popover also uses themed background */}
                <SelectItem value="technology" className="text-mw-white hover:bg-mw-light-blue/20">Technology</SelectItem>
                <SelectItem value="finance" className="text-mw-white hover:bg-mw-light-blue/20">Finance</SelectItem>
                <SelectItem value="healthcare" className="text-mw-white hover:bg-mw-light-blue/20">Healthcare</SelectItem>
                <SelectItem value="retail" className="text-mw-white hover:bg-mw-light-blue/20">Retail</SelectItem>
                <SelectItem value="e-commerce" className="text-mw-white hover:bg-mw-light-blue/20">E-commerce</SelectItem>
                <SelectItem value="manufacturing" className="text-mw-white hover:bg-mw-light-blue/20">Manufacturing</SelectItem>
                <SelectItem value="consulting" className="text-mw-white hover:bg-mw-light-blue/20">Consulting</SelectItem>
                <SelectItem value="media" className="text-mw-white hover:bg-mw-light-blue/20">Media & Entertainment</SelectItem>
                <SelectItem value="real_estate" className="text-mw-white hover:bg-mw-light-blue/20">Real Estate</SelectItem>
                <SelectItem value="other" className="text-mw-white hover:bg-mw-light-blue/20">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-mw-white/90">Company Name</Label>
            <Input 
              id="companyName" 
              type="text" 
              placeholder="e.g., Innovate Solutions Ltd." 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring"
            />
          </div>
        </CardContent>
        <CardFooter className="pt-8 flex justify-center"> {/* Increased top padding for footer */}
          <Button
            onClick={handleProceed}
            size="lg" // Using a slightly larger button for this main action
            className="px-10 py-3 text-lg font-semibold \
                       bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker \
                       text-mw-dark-navy \
                       hover:from-mw-light-blue/90 hover:to-mw-gradient-blue-darker/90 \
                       rounded-lg shadow-md transform transition-all duration-150 \
                       hover:shadow-xl active:scale-95"
            disabled={isGenerating}
          >
            {isGenerating ? 'Consulting...' : 'Consult the Oracle'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 