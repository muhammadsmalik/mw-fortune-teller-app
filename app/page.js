'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Cookie } from 'lucide-react'; // Keeping Cookie icon for thematic consistency with app purpose
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; // or loadFull, loadBasic, etc. based on needs

export default function WelcomeScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);

  // this should be run only once per application lifetime
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      // you can initiate the tsParticles instance (engine) here, adding custom shapes or presets
      // this loads the tsparticles package bundle, it's the easiest method for getting everything ready
      // starting from v2 you can add only the features you need reducing the bundle size
      await loadSlim(engine); // Use the slim bundle
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles container loaded", container);
  }, []);

  const particleOptions = useMemo(() => ({
    // No background color here, as we want it to be transparent over the existing CSS background
    // fullScreen: { enable: true, zIndex: -1 } // This was part of old options, handled by component className now
    particles: {
      number: {
        value: 40, // Slightly increased for better visibility if very subtle
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        value: ["#FFFFFF", "#5BADDE"] // mw-white, mw-light-blue
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
        value: { min: 1, max: 3 }, // Using min/max for a bit more variety
        random: true, // already true if value is an object with min/max
        // anim is not needed if size is random min/max
      },
      move: {
        enable: true,
        speed: 0.6, // Kept it slow
        direction: "none",
        random: true,
        straight: false,
        outModes: { // Changed from out_mode to outModes
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
        resize: true // Important to make it responsive
      },
      modes: {
        repulse: {
          distance: 100,
          duration: 0.4
        },
        push: {
          quantity: 4 // Renamed from particles_nb
        },
        // Other modes like grab, bubble, remove can be configured if needed
      }
    },
    detectRetina: true,
    // fpsLimit: 60 // Optional: can be set if performance is an issue
  }), []);

  const handleStart = () => {
    console.log("Navigating to next screen with Moving Walls theme...");
    // alert("Button clicked! Navigation to be implemented.");
    router.push('/collect-info');
  };

  if (!init) {
    return null; // Or a very minimal loading state if preferred
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      <Particles
        id="tsparticles"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]" // Ensure it covers the background and is behind content
      />
      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <img src="/MW-logo-web.svg" alt="Moving Walls Logo" className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <main className="flex flex-col items-center justify-center text-center space-y-8">
        {/* Main Graphic: Fortune Cookie Icon - Styled with Moving Walls Accent */}
        <Cookie
          className="text-mw-light-blue" // Accent color for the icon
          size={128} // Slightly smaller: w-32 h-32 (128px)
          strokeWidth={1.5}
        />

        {/* Headline (H1) - Moving Walls Typography */}
        <h1 className="text-4xl sm:text-5xl font-bold text-mw-white tracking-wide">
          Unlock Your Business Destiny!
        </h1>

        {/* Sub-headline (Paragraph) */}
        <p className="text-lg sm:text-xl text-mw-white/80 max-w-md">
          Curious about what the future holds for your company? Let our Digital Fortune Teller provide a glimpse.
        </p>

        {/* CTA Button - Moving Walls Styling */}
        <Button
          onClick={handleStart}
          size="lg" // ShadCN predefined large size
          className="px-10 py-7 text-xl font-bold \
                     bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker \
                     text-mw-dark-navy  /* Dark text on light blue gradient */\
                     hover:from-mw-light-blue/90 hover:to-mw-gradient-blue-darker/90 /* Subtle hover */\
                     rounded-lg shadow-lg transform transition-all duration-150 \
                     hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
        >
          Reveal My Fortune!
        </Button>
      </main>
    </div>
  );
}