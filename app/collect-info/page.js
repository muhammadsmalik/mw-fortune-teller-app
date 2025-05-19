'use client';

import { useEffect, useState, useMemo, useCallback }
from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Loader2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Image from 'next/image';

export default function CollectInfoScreen() {
  const router = useRouter();
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrError, setQrError] = useState('');

  // Particles engine initialization
  const [init, setInit] = useState(false);
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

  // Helper to normalize LinkedIn profile URLs to canonical form
  function normalizeLinkedInUrl(url) {
    try {
      const parsed = new URL(url.trim());
      if (parsed.hostname !== 'www.linkedin.com') return null;
      const match = parsed.pathname.match(/^\/in\/([A-Za-z0-9\-_%]+)\/?$/);
      if (!match) return null;
      const username = match[1];
      return `https://www.linkedin.com/in/${username}`;
    } catch {
      return null;
    }
  }

  // LinkedIn URL validation (now uses normalization)
  const isValidLinkedIn = (url) => {
    return !!normalizeLinkedInUrl(url);
  };

  // QR scan handler for @yudiel/react-qr-scanner
  const handleScan = (result) => {
    console.log('QR Scanner raw result:', result);
    if (result && Array.isArray(result) && result.length > 0) {
      const value = result[0]?.rawValue || result[0]?.value || result[0];
      const normalized = typeof value === 'string' ? normalizeLinkedInUrl(value) : null;
      if (normalized) {
        setLinkedinUrl(normalized);
        setQrError('');
      } else {
        setQrError('That QR code\'s having an identity crisis. Got a LinkedIn one?');
      }
    }
  };

  // Proceed handler
  const handleProceed = async () => {
    if (!isValidLinkedIn(linkedinUrl)) {
      alert('Yikes! That URL\'s not passing the vibe check. Make sure it\'s a real LinkedIn profile.');
      return;
    }
    setIsGenerating(true);
    try {
      localStorage.setItem('userLinkedInProfile', linkedinUrl.trim());
      localStorage.setItem('forceRefreshLinkedInData', 'true'); // Signal a fresh fetch
      router.push('/generating-fortune');
    } catch (error) {
      alert('A mystical mishap occurred! Please try sharing your link again.');
      setIsGenerating(false);
    }
  };

  if (!init) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      <Particles
        id="tsparticles-collect-info"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />
      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>
      <Card className="bg-card rounded-lg shadow-lg w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
            Your Digital Destiny Awaits.
          </CardTitle>
          <CardDescription className="text-mw-white/80 text-sm sm:text-base pt-2">
            Just one scan to spark your future.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 flex flex-col items-center">
          <div className="w-full max-w-xs sm:max-w-sm rounded-lg overflow-hidden">
            <Scanner
              onScan={handleScan}
              onError={err => setQrError(`Looks like the camera\'s on a coffee break. ${err?.message || 'Unknown error'}`)}
              styles={{ container: { width: '100%' }, video: { width: '100%', transform: "scaleX(-1)" } }}
              options={{ delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 500 }}
            />
          </div>
          {qrError && <div className="text-red-400 text-xs mt-2 text-center">{qrError}</div>}
          
          <div className="text-xs text-mw-white/70 mt-4 space-y-2 text-center px-2">
            <p className="font-semibold text-sm">QR Code? Here's your treasure map!</p>
            <p>Ready to uncover it? Follow these steps:</p>
            <ol className="list-decimal list-inside text-left mx-auto inline-block text-mw-white/80">
              <li>Open the LinkedIn mobile app.</li>
              <li>Tap the search bar at the top.</li>
              <li>Look for the QR code icon on the right side.</li>
              <li>Tap it, then select "My Code" to display your QR.</li>
            </ol>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-6">
          <Button
            onClick={handleProceed}
            disabled={isGenerating || !isValidLinkedIn(linkedinUrl)}
            size="lg"
            className="w-full px-10 py-7 text-xl font-bold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg transform transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Tuning into your destiny…</>
            ) : (
              'Let the Magic Begin!'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 