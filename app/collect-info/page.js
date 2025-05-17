'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function CollectInfoScreen() {
  const router = useRouter();
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
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
      // Path should be /in/username or /in/username/
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
        setShowQr(false);
        setQrError('');
      } else {
        setQrError('QR does not contain a valid LinkedIn profile URL.');
      }
    }
  };

  // Normalize input on change
  const handleInputChange = (e) => {
    const raw = e.target.value;
    const normalized = normalizeLinkedInUrl(raw);
    setLinkedinUrl(normalized || raw); // Show normalized if valid, else raw
  };

  // Proceed handler
  const handleProceed = async () => {
    if (!isValidLinkedIn(linkedinUrl)) {
      alert('Please enter a valid LinkedIn profile URL.');
      return;
    }
    setIsGenerating(true);
    try {
      localStorage.setItem('userLinkedInProfile', linkedinUrl.trim());
      router.push('/generating-fortune');
    } catch (error) {
      alert('An error occurred. Please try again.');
      setIsGenerating(false);
    }
  };

  if (!init) return null;

  // Inline Modal for QR scanner
  const QrModal = ({ open, onClose, children }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-mw-dark-navy rounded-lg shadow-lg p-6 relative w-full max-w-md">
          <button onClick={onClose} className="absolute top-2 right-2 text-mw-white/70 hover:text-mw-white text-2xl">&times;</button>
          {children}
        </div>
      </div>
    );
  };

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
        <img src="/MW-logo-web.svg" alt="Moving Walls Logo" className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>
      <Card className="bg-card rounded-lg shadow-lg w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
            Share Your LinkedIn Profile
          </CardTitle>
          <CardDescription className="text-mw-white/80 text-sm sm:text-base pt-2">
            Paste your LinkedIn profile URL or scan a QR code containing it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl" className="text-mw-white/90">LinkedIn Profile URL</Label>
            <div className="flex items-center">
              <Input
                id="linkedinUrl"
                type="text"
                placeholder="e.g., https://www.linkedin.com/in/yourname/"
                value={linkedinUrl}
                onChange={handleInputChange}
                className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring flex-grow"
                disabled={isGenerating}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="ml-2 border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10 disabled:opacity-50"
                onClick={() => { setShowQr(true); setQrError(''); }}
                disabled={isGenerating}
                aria-label="Scan QR code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5v2.25A2.25 2.25 0 006 9h2.25M20.25 4.5v2.25A2.25 2.25 0 0118 9h-2.25M3.75 19.5v-2.25A2.25 2.25 0 016 15h2.25M20.25 19.5v-2.25A2.25 2.25 0 0018 15h-2.25" />
                </svg>
              </Button>
            </div>
            <p className="text-xs text-mw-white/60 mt-1">We only need your public LinkedIn profile link.</p>
            {qrError && <div className="text-red-400 text-xs mt-2">{qrError}</div>}
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
              <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Processing...</>
            ) : (
              'Proceed'
            )}
          </Button>
        </CardFooter>
      </Card>
      <QrModal open={showQr} onClose={() => setShowQr(false)}>
        <div className="mb-4 text-center text-mw-white font-semibold">Scan LinkedIn QR Code</div>
        <Scanner
          onScan={handleScan}
          onError={err => setQrError('Camera error: ' + (err?.message || 'Unknown error'))}
          styles={{ container: { width: '100%' }, video: { width: '100%' } }}
        />
        <div className="text-xs text-mw-white/60 mt-2">Point your camera at a QR code containing your LinkedIn profile URL.</div>
        {qrError && <div className="text-red-400 text-xs mt-2">{qrError}</div>}
      </QrModal>
    </div>
  );
} 