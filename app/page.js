'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import BrandFooter from '@/components/ui/BrandFooter';
import WalliAvatar from '@/components/twin-reveal/WalliAvatar';

export default function WelcomeScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);

  // this should be run only once per application lifetime
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine); // Use the slim bundle
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles container loaded", container);
  }, []);

  const particleOptions = useMemo(() => ({
    particles: {
      number: {
        value: 40,
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        // Antique gold + parchment + electric blue — embers/stardust over deep navy
        value: ["#D4AF37", "#F5EAD3", "#1E88E5"]
      },
      shape: {
        type: "circle"
      },
      opacity: {
        value: 0.3,
        random: true,
        anim: {
          enable: true,
          speed: 0.6,
          opacity_min: 0.1,
          sync: false
        }
      },
      size: {
        value: { min: 1, max: 3 },
        random: true,
      },
      move: {
        enable: true,
        speed: 0.6,
        direction: "none",
        random: true,
        straight: false,
        outModes: {
          default: "out"
        },
        bounce: false,
        attract: {
          enable: false,
          rotateX: 600,
          rotateY: 1200
        }
      }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: {
          enable: false,
          mode: "repulse"
        },
        onclick: {
          enable: false,
          mode: "push"
        },
        resize: true
      },
      modes: {
        repulse: {
          distance: 100,
          duration: 0.4
        },
        push: {
          quantity: 4
        },
      }
    },
    detectRetina: true,
  }), []);

  const handleStart = () => {
    router.push('/select-name');
  };

  if (!init) {
    return null; // Or a very minimal loading state if preferred
  }

  return (
    <div className="relative overflow-hidden flex flex-col min-h-screen bg-gradient-to-br from-mw-navy-void via-mw-navy-deep to-mw-navy-gunmetal text-mw-white isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-mw-blue-electric/15 blur-3xl"
      />
      <Particles
        id="tsparticles"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />

      <main className="flex-grow flex flex-col items-center justify-center text-center space-y-8 p-4 relative">
        <p className="text-sm uppercase tracking-[0.2em] text-mw-light-blue">WOO London</p>

        {/* Agent WALLi greeting */}
        <WalliAvatar pose="greeting" size={224} />

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold text-mw-white tracking-wide">
          Meet Agent WALLi
        </h1>

        {/* Sub-headline — WALLi voice */}
        <p className="text-lg sm:text-xl text-mw-white/80 max-w-2xl">
          Your AI Concierge Wizard. Tell me who you are and I&apos;ll reveal the
          three people you should meet at WOO London.
        </p>

        {/* CTA Button — antique-gold (booth-flow look) */}
        <Button
          onClick={handleStart}
          size="lg"
          className="px-10 py-7 text-xl font-bold
                     bg-gradient-to-r from-mw-gold-antique to-mw-gold-antique-deep
                     text-mw-dark-navy
                     hover:opacity-90
                     rounded-lg shadow-lg transform transition-all duration-150
                     hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
        >
          Find my matches
        </Button>
      </main>
      <BrandFooter />
    </div>
  );
}
