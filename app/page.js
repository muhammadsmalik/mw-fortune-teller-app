'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
// import { Cookie } from 'lucide-react'; // Keeping Cookie icon for thematic consistency with app purpose -- REMOVED
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; // or loadFull, loadBasic, etc. based on needs
import BrandFooter from '@/components/ui/BrandFooter'; // Adjusted path if necessary

export default function WelcomeScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const videoRef = useRef(null);
  const [currentCaption, setCurrentCaption] = useState('');
  const [isVideoPaused, setIsVideoPaused] = useState(true);

  // Transcript data organized into natural phrases for better readability
  const transcript = [
    { text: "Welcome brand builder", start: 0, end: 1.92 },
    { text: "I'm the Moving Walls fortune teller", start: 2.16, end: 5.12 },
    { text: "Your next breakthrough", start: 5.28, end: 7.0 },
    { text: "...is one insight away", start: 7.0, end: 9.04 }
  ];

  // Handle video time updates for captions
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      
      // Find the phrase that should be displayed at current time
      const activePhrase = transcript.find(item => 
        currentTime >= item.start && currentTime <= item.end
      );
      
      if (activePhrase) {
        setCurrentCaption(activePhrase.text);
      } else {
        setCurrentCaption('');
      }
    }
  }, [transcript]);

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

  // Add event listeners for video captions
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', () => setCurrentCaption(''));
      video.addEventListener('pause', () => {
        setCurrentCaption('');
        setIsVideoPaused(true);
      });
      video.addEventListener('play', () => setIsVideoPaused(false));
      
      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', () => setCurrentCaption(''));
        video.removeEventListener('pause', () => {
          setCurrentCaption('');
          setIsVideoPaused(true);
        });
        video.removeEventListener('play', () => setIsVideoPaused(false));
      };
    }
  }, [handleTimeUpdate]);

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

  // Handler to play/pause the video on click
  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPaused(false);
      } else {
        videoRef.current.pause();
        setIsVideoPaused(true);
      }
    }
  };

  if (!init) {
    return null; // Or a very minimal loading state if preferred
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-[#2554A2] to-[#1B1E2B] text-mw-white isolate">
      <Particles
        id="tsparticles"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]" // Ensure it covers the background and is behind content
      />
      {/* The old absolute positioned logo is removed as the footer will cover this area or integrate it later */}

      <main className="flex-grow flex flex-col items-center justify-center text-center space-y-8 p-4 relative">
        {/* AI Avatar Video with Caption Overlay */}
        <div className="relative">
          <video
            ref={videoRef}
            src="/animations/ai_avatar.mp4"
            preload="auto"
            playsInline
            onClick={handleVideoClick}
            className="h-80 w-80 rounded-full shadow-lg object-cover object-top cursor-pointer bg-slate-800/50"
            style={{ aspectRatio: '1/1' }}
          >
            Your browser does not support the video tag.
          </video>

          {/* Caption Overlay */}
          {currentCaption && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1.5 rounded-lg text-sm font-medium max-w-[90%] text-center">
              {currentCaption}
            </div>
          )}
        </div>

        {/* Added Fortune Teller Text */}
        <p className="text-2xl font-medium text-mw-light-blue tracking-wide">
          Fortune Teller
        </p>

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
                     bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] \
                     text-mw-dark-navy  /* Dark text on yellow/orange gradient */\
                     hover:opacity-90 /* Adjusted hover for new gradient */\
                     rounded-lg shadow-lg transform transition-all duration-150 \
                     hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
        >
          Reveal My Fortune!
        </Button>
      </main>
      <BrandFooter />
    </div>
  );
}