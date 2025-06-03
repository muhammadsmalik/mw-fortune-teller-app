'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Howl } from 'howler';
import crystalBallAnimation from '@/public/animations/crystal-ball.json';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react'; // For loading states

// Dynamically import Lottie and Particles
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
const Particles = dynamic(() => import('@tsparticles/react').then(mod => mod.Particles), { ssr: false });

// Helper function to calculate duration (simplified)
function calculateDuration(startsAt, endsAt) {
  if (!startsAt) return 'N/A';
  const startDate = new Date(startsAt.year, startsAt.month - 1, startsAt.day);
  const endDate = endsAt ? new Date(endsAt.year, endsAt.month - 1, endsAt.day) : new Date();

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }
  
  let durationString = '';
  if (years > 0) {
    durationString += `${years} year${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    if (durationString.length > 0) durationString += ', ';
    durationString += `${months} month${months > 1 ? 's' : ''}`;
  }
  if (!durationString) durationString = 'Less than a month';

  const startStr = `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()}`;
  const endStr = endsAt ? `${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}` : 'Present';

  return `${startStr} - ${endStr} (${durationString})`;
}

// Helper to summarize LinkedIn data
function summarizeLinkedInData(linkedInData) {
  if (!linkedInData || typeof linkedInData !== 'object') return null;

  const profile = linkedInData.profileData || {};

  const experiences = (profile.experiences || []).map(exp => ({
    title: exp.title || 'N/A',
    company: exp.company || 'N/A',
    description: exp.description || 'N/A',
    duration: calculateDuration(exp.starts_at, exp.ends_at)
  }));

  const education = (profile.education || []).map(edu => ({
    degree: edu.degree_name || 'N/A',
    fieldOfStudy: edu.field_of_study || 'N/A',
    school: edu.school || 'N/A'
  }));

  let skills = [];
  if (profile.skills && Array.isArray(profile.skills)) {
    skills = profile.skills.map(skill => typeof skill === 'string' ? skill : skill.name).filter(Boolean);
  } else if (typeof profile.skills === 'string') { // some proxycurl versions might return string CSV
    skills = profile.skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  

  const keyAccomplishments = [];
  (profile.accomplishment_honors_awards || []).forEach(a => a.title && keyAccomplishments.push(`Award: ${a.title}`));
  (profile.accomplishment_publications || []).forEach(p => p.title && keyAccomplishments.push(`Publication: ${p.title}`));
  (profile.accomplishment_projects || []).forEach(pr => pr.title && keyAccomplishments.push(`Project: ${pr.title}`));
  (profile.articles || []).forEach(art => art.title && keyAccomplishments.push(`Article: ${art.title}`));

  return {
    fullName: profile.full_name || 'N/A',
    headline: profile.headline || 'N/A',
    summary: profile.summary || 'N/A',
    occupation: profile.occupation || 'N/A',
    industry: profile.industry || (linkedInData.latestCompanyData ? linkedInData.latestCompanyData.industry : 'N/A'),
    experiences,
    education,
    skills,
    keyAccomplishments
  };
}

export default function ArchetypeDiscoveryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [archetypeInsightData, setArchetypeInsightData] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [userName, setUserName] = useState('');
  const [generatedAvatar, setGeneratedAvatar] = useState(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const fetchInitiatedRef = useRef(false);
  const [initParticles, setInitParticles] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [isNarrating, setIsNarrating] = useState(false);
  const [narrationPlayed, setNarrationPlayed] = useState(false);
  const [narrationError, setNarrationError] = useState(null);
  const howlInstanceRef = useRef(null);
  const [pageLoadSoundPlayed, setPageLoadSoundPlayed] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []); // Ensures this runs only once on mount

  useEffect(() => {
    if (hasMounted) {
      const initializeParticlesEngineAndSound = async () => {
        try {
          // Dynamically import particle engine and slim preset
          const { initParticlesEngine } = await import('@tsparticles/react');
          const { loadSlim } = await import('@tsparticles/slim');
          await initParticlesEngine(async (engine) => {
            await loadSlim(engine);
          });
          setInitParticles(true);
        } catch (e) {
          console.error("[ArchetypeDiscoveryPage] Failed to initialize particles engine:", e);
          setInitParticles(true); // Proceed with caution or set an error state for particles
        }

        // Play page load sound once mounted and if not already played
        if (!pageLoadSoundPlayed) {
          const sound = new Howl({
            src: ['/audio/page-load-chime.mp3'], // Placeholder path
            volume: 0.5, // Adjust volume as needed
            onplayerror: (id, error) => {
              console.error('[ArchetypeDiscoveryPage] Howler onplayerror for page load chime:', id, error);
            },
            onloaderror: (id, error) => {
              console.error('[ArchetypeDiscoveryPage] Howler onloaderror for page load chime:', id, error);
            }
          });
          sound.play();
          setPageLoadSoundPlayed(true);
        }
      };
      initializeParticlesEngineAndSound();
    }
  }, [hasMounted, pageLoadSoundPlayed]); // Dependencies for particle/sound effect

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

  const generateAvatar = useCallback(async (profileImageUrl, archetypeName) => {
    if (!profileImageUrl) return;
    
    setIsGeneratingAvatar(true);
    setAvatarError(null);
    
    try {
      const response = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileImageUrl,
          archetypeName
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate avatar');
      }

      setGeneratedAvatar(data.avatarImage);
    } catch (error) {
      console.error('Avatar generation failed:', error);
      setAvatarError(error.message);
    } finally {
      setIsGeneratingAvatar(false);
    }
  }, []);

  const fetchArchetypeData = useCallback(async (storedLinkedInData, storedManualData, storedFullNameFromStorage) => {
    setIsLoading(true);
    setApiError(null);
    console.log("fetchArchetypeData called with data from storage");

    // userName is now set in the calling useEffect
    // setUserName(storedFullNameFromStorage); // No longer set here

    let userDataPayload = {};
    let profileImageUrl = null;

    if (storedLinkedInData) {
      try {
        const parsedLinkedInData = JSON.parse(storedLinkedInData);
        // Extract profile image URL for avatar generation
        if (parsedLinkedInData.profileData?.profile_pic_url) {
          profileImageUrl = parsedLinkedInData.profileData.profile_pic_url;
        }
        
        const summarizedData = summarizeLinkedInData(parsedLinkedInData);
        if (summarizedData) {
            userDataPayload.linkedInProfileSummary = summarizedData;
        } else {
            console.warn("LinkedIn data was present but could not be summarized. Checking for manual data.");
            if (storedManualData) {
                 userDataPayload.manualData = JSON.parse(storedManualData);
            } else {
                // Keep this error or adjust if fetchArchetypeData should not throw directly
                // For now, let it proceed and potentially fail at API call if no data
                console.error("No valid user data available for archetype matching after failing to summarize LinkedIn data and no manual data provided to function.");
                // To maintain similar behavior to original:
                // throw new Error("No valid user data available for archetype matching after failing to summarize LinkedIn data.");
            }
        }
      } catch (e) {
        console.error("Error parsing stored LinkedIn data:", e);
        // Potentially fall back to manual data if LinkedIn parse fails
        if (storedManualData) {
          try {
            userDataPayload.manualData = JSON.parse(storedManualData);
          } catch (parseError) {
            console.error("Error parsing stored manual data after LinkedIn parse fail:", parseError);
          }
        } else {
           console.error("No manual data to fall back to after LinkedIn parse error.");
        }
      }
    } else if (storedManualData) {
      try {
        userDataPayload.manualData = JSON.parse(storedManualData);
      } catch (e) {
        console.error("Error parsing stored manual data:", e);
        // throw new Error("No user data found in local storage for archetype matching."); // Or handle differently
      }
    } else {
      // This case means neither storedLinkedInData nor storedManualData was passed
      // This situation should ideally be caught before calling the API
      console.error("No user data (LinkedIn or manual) provided to fetchArchetypeData.");
      // To maintain original behavior of throwing an error:
      // throw new Error("No user data found in local storage for archetype matching.");
      // For now, let it attempt API call, which might fail gracefully or as intended by API design.
    }
    
    // Ensure storedFullNameFromStorage is used for userDataPayload if manualData needs it
    // And ensure manualData exists before trying to set fullName on it
    if (userDataPayload.manualData && !userDataPayload.manualData.fullName && storedFullNameFromStorage && storedFullNameFromStorage !== 'Guest') {
      userDataPayload.manualData.fullName = storedFullNameFromStorage;
    }


    // If after all checks, userDataPayload is empty, it might indicate an issue.
    if (Object.keys(userDataPayload).length === 0) {
        setApiError("Could not prepare user data for archetype matching. Please try again.");
        setIsLoading(false);
        return; // Prevent API call if no data could be prepared
    }
    
    try {
      const response = await fetch('/api/match-archetype', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            userData: userDataPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      setArchetypeInsightData(data);
      console.log("Archetype data fetched and set", data);
      
      // Generate avatar if we have a profile image and archetype
      if (profileImageUrl && data.userMatchedArchetype?.name) {
        generateAvatar(profileImageUrl, data.userMatchedArchetype.name);
      }
      
    } catch (error) {
      console.error("Failed to fetch archetype data:", error);
      setApiError(error.message);
    } finally { // Ensure isLoading is set to false in all paths
        setIsLoading(false);
    }
  }, [generateAvatar]); // Removed setIsLoading, setApiError, setUserName, summarizeLinkedInData from deps for stability
                         // generateAvatar is the main external dependency. summarizeLinkedInData is a pure helper.

  useEffect(() => {
    if (hasMounted && !fetchInitiatedRef.current) {
      const storedLinkedInData = localStorage.getItem('fetchedLinkedInData');
      const storedManualData = localStorage.getItem('userInfoForFortune');

      // If it's a manual flow (manual data exists, LinkedIn data does NOT), redirect.
      if (storedManualData && !storedLinkedInData) {
        console.log("[ArchetypeDiscoveryPage] Manual flow detected. Redirecting to home.");
        router.push('/');
        return; // Stop further execution in this effect
      }

      // Proceed with existing logic if it's LI flow or if flow cannot be determined
      // (e.g. LI data present, or neither present - though latter is an edge case for this page)
      console.log("[ArchetypeDiscoveryPage] Initiating fetch as component has mounted (not a redirected manual flow).");
      const storedFullNameFromStorage = localStorage.getItem('fortuneApp_fullName') || 'Guest';
      setUserName(storedFullNameFromStorage); // Set userName state here

      fetchArchetypeData(storedLinkedInData, storedManualData, storedFullNameFromStorage);
      fetchInitiatedRef.current = true;
    } else if (!hasMounted) {
      // console.log("Component not yet mounted, skipping fetch.");
    } else {
      // console.log("Fetch already initiated, skipping.");
    }
  }, [hasMounted, fetchArchetypeData, router]); // Added router to dependency array

  // Effect to play narration once archetype data is loaded
  useEffect(() => {
    const currentArchetype = archetypeInsightData?.userMatchedArchetype;

    if (hasMounted && archetypeInsightData && userName && currentArchetype?.name && !narrationPlayed && !isLoading) {
      // Play archetype reveal sound first
      const revealSound = new Howl({
        src: ['/audio/archetype-reveal-flourish.mp3'], // Placeholder path
        volume: 0.6, // Adjust volume
        onplayerror: (id, error) => console.error('[ArchetypeDiscoveryPage] Howler onplayerror for reveal flourish:', id, error),
        onloaderror: (id, error) => console.error('[ArchetypeDiscoveryPage] Howler onloaderror for reveal flourish:', id, error),
        onend: () => { // Start narration after reveal sound finishes or with a slight delay
          // Proceed with narration
          const narrationText = `Ah, ${userName}, the mists clear! Your essence aligns with... The ${currentArchetype.name}!`;
          
          if (howlInstanceRef.current) {
            howlInstanceRef.current.unload();
          }

          setIsNarrating(true);
          setNarrationError(null);

          const encodedTextInput = encodeURIComponent(narrationText);
          const voice = 'ballad'; 
          const streamUrl = `/api/generate-narration?voice=${voice}&textInput=${encodedTextInput}`;

          const narrationSound = new Howl({
            src: [streamUrl],
            format: ['mp3'],
            html5: true, 
            onplay: () => {
              console.log('[ArchetypeDiscoveryPage] Narration playback started.');
              setIsNarrating(true);
            },
            onend: () => {
              console.log('[ArchetypeDiscoveryPage] Narration playback ended.');
              setIsNarrating(false);
              setNarrationPlayed(true);
              howlInstanceRef.current = null;
            },
            onloaderror: (id, error) => {
              console.error('[ArchetypeDiscoveryPage] Howler onloaderror for narration:', id, error);
              setNarrationError(`Oracle's voice stream couldn't be loaded. Code: ${id}`);
              setIsNarrating(false);
              setNarrationPlayed(false);
              howlInstanceRef.current = null;
            },
            onplayerror: (id, error) => {
              console.error('[ArchetypeDiscoveryPage] Howler onplayerror for narration:', id, error);
              setNarrationError(`Oracle's voice stream couldn't play. Code: ${id}`);
              setIsNarrating(false);
              setNarrationPlayed(false);
              howlInstanceRef.current = null;
            },
          });

          howlInstanceRef.current = narrationSound;
          console.log('[ArchetypeDiscoveryPage] Initiating narration playback after reveal sound.');
          narrationSound.play();
        } // End of revealSound onend
      });
      revealSound.play();

    } // End of main if condition

    // Cleanup function for narration Howl instance
    return () => {
      if (howlInstanceRef.current) {
        console.log('[ArchetypeDiscoveryPage] Unloading narration Howl instance during cleanup.');
        howlInstanceRef.current.stop(); // Stop playback
        howlInstanceRef.current.unload(); // Release resources
        howlInstanceRef.current = null;
      }
    };
  }, [hasMounted, archetypeInsightData, userName, narrationPlayed, isLoading]);

  const showAvatarSection = isGeneratingAvatar || generatedAvatar || avatarError;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4 relative isolate">
        {hasMounted && initParticles && Particles && (
          <Particles
            id="tsparticles-archetype-loading"
            particlesLoaded={particlesLoaded}
            options={particleOptions}
            className="absolute inset-0 z-[-1]"
          />
        )}
        <div className="w-48 h-48 md:w-64 md:h-64">
          <Lottie animationData={crystalBallAnimation} loop={true} />
        </div>
        <p className="text-lg mt-4">Aligning the stars to reveal your archetype...</p>
        {!initParticles && hasMounted && <p className="text-sm text-mw-white/70">Initializing cosmic dust...</p>}
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4 relative isolate text-center">
        {hasMounted && initParticles && Particles && (
          <Particles
            id="tsparticles-archetype-error"
            particlesLoaded={particlesLoaded}
            options={particleOptions}
            className="absolute inset-0 z-[-1]"
          />
        )}
        <h2 className="text-2xl font-semibold text-red-400">A Cosmic Disturbance!</h2>
        <p className="text-mw-white/80">{apiError}</p>
        <Button 
          onClick={() => router.push('/')}
          className="mt-6 bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker text-mw-dark-navy font-semibold rounded-lg shadow-md hover:opacity-90"
        >
          Start New Fortune
        </Button>
      </div>
    );
  }

  if (!archetypeInsightData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4 relative isolate text-center">
         {hasMounted && initParticles && Particles && (
          <Particles
            id="tsparticles-archetype-nodata"
            particlesLoaded={particlesLoaded}
            options={particleOptions}
            className="absolute inset-0 z-[-1]"
          />
        )}
        <p className="text-mw-white/80">Could not retrieve your archetype data. The stars are unusually quiet.</p>
        <Button 
          onClick={() => router.push('/')}
          className="mt-6 bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker text-mw-dark-navy font-semibold rounded-lg shadow-md hover:opacity-90"
        >
          Start New Fortune
        </Button>
      </div>
    );
  }

  const { userMatchedArchetype, mwEmpowerment, suggestedConferenceConnection, overallNarrative } = archetypeInsightData;

  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center bg-mw-dark-navy text-mw-white p-4 sm:p-8 relative isolate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
    >
      {hasMounted && initParticles && Particles && (
        <Particles
          id="tsparticles-archetype-discovery"
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute inset-0 z-[-1]"
        />
      )}
      <div className="w-full max-w-3xl space-y-8 mt-12 mb-12 text-center">
        {!initParticles && hasMounted && !isLoading && (
             <div className="fixed inset-0 flex flex-col items-center justify-center bg-mw-dark-navy/50 backdrop-blur-sm z-50">
                <Loader2 className="h-10 w-10 animate-spin text-mw-light-blue" />
                <p className="mt-3 text-mw-white/80">Initializing cosmic dust...</p>
            </div>
        )}

        {/* Oracle Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }} // Delay slightly after page title
          className="mb-6 md:mb-8"
        >
          <Image 
            src="/avatar/twin.png"
            alt="Oracle of Insight holding a crystal ball"
            width={240} 
            height={360} 
            className="mx-auto drop-shadow-[0_0_20px_rgba(250,174,37,0.4)]"
            priority 
          />
        </motion.div>

        <h1 className="text-4xl font-bold text-mw-light-blue tracking-wide">
          {overallNarrative || "Discover Your Conference Archetype!"}
        </h1>
        <p className="text-xl text-mw-white/90">Hello, {userName}!</p>

        {/* Narration Status Display */}
        <div className="min-h-[2em] text-center">
          {isNarrating && (
            <p className="text-mw-gold text-lg animate-pulse">The Oracle speaks...</p>
          )}
          {narrationError && (
            <div className="text-red-400 text-sm p-2 bg-red-900/30 border border-red-500/50 rounded-md max-w-md mx-auto">
              <p className="font-semibold">Oracle&apos;s Voice Disrupted:</p>
              <p>{narrationError}</p>
              {/* Future: Add a button here to retry narration if needed */}
            </div>
          )}
        </div>

        {userMatchedArchetype && (
          <Card className="bg-card/80 backdrop-blur-sm border-mw-light-blue/30 shadow-xl w-full">
            <CardHeader className="pb-2 pt-4 md:pt-6">
              <CardTitle className="text-xl md:text-2xl font-semibold text-mw-light-blue text-center">
                Your Revealed Archetype
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-start md:space-x-6 py-2">
                {/* Avatar Column */}
                {showAvatarSection && (
                  <div className="w-full md:w-1/3 flex flex-col items-center justify-start mb-4 md:mb-0 py-2 min-h-[180px] md:min-h-[200px]">
                    {isGeneratingAvatar && (
                      <div className="p-3 text-center flex flex-col items-center justify-center h-full">
                        <div className="relative w-16 h-16 mx-auto mb-2">
                          <div className="absolute inset-0 border-4 border-mw-light-blue/30 rounded-full"></div>
                          <div
                            className="absolute inset-0 border-t-4 border-mw-light-blue rounded-full animate-spin"
                            style={{ animationName: 'spin' }}
                          ></div>
                        </div>
                        <p className="text-mw-white/80 text-sm mt-1">Generating your avatar...</p>
                        <p className="text-mw-white/70 text-xs italic mt-1">This may take a moment.</p>
                      </div>
                    )}
                    {generatedAvatar && !isGeneratingAvatar && (
                      <div className="mt-2 flex flex-col items-center">
                         <p className="text-mw-white/80 text-sm mb-2 font-medium">Your Personalized Avatar</p>
                        <Image
                          src={generatedAvatar}
                          alt="Generated Personalized Avatar"
                          width={150} 
                          height={150}
                          className="rounded-lg border-2 border-mw-gold/70 shadow-md mx-auto object-cover aspect-square"
                        />
                      </div>
                    )}
                    {avatarError && !isGeneratingAvatar && (
                      <div className="text-orange-400 bg-orange-900/30 p-2 rounded-md border border-orange-500/50 text-sm text-center h-full flex flex-col justify-center">
                        <p className="font-semibold">Avatar Creation Failed</p>
                        <p className="text-xs">{avatarError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Archetype Info Column */}
                <div className={`w-full ${showAvatarSection ? 'md:w-2/3' : 'md:w-full'} text-center md:text-left md:pt-2`}>
                  <h3 className="text-2xl lg:text-3xl font-bold text-mw-gold mb-3">
                    {userMatchedArchetype.name}
                  </h3>
                  <p className="text-mw-white/90 text-base md:text-lg leading-relaxed">{userMatchedArchetype.explanation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mwEmpowerment && (
          <Card className="bg-card/80 backdrop-blur-sm border-mw-light-blue/30 shadow-xl text-left">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-mw-light-blue">{mwEmpowerment.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-mw-white/90 text-lg">{mwEmpowerment.advice}</p>
            </CardContent>
          </Card>
        )}

        {suggestedConferenceConnection && (
          <Card className="bg-card/80 backdrop-blur-sm border-mw-light-blue/30 shadow-xl w-full">
            <CardHeader className="pb-2 pt-4 md:pt-6">
              <CardTitle className="text-xl md:text-2xl font-semibold text-mw-light-blue text-center">
                Connect & Collaborate
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 md:gap-6">
                {suggestedConferenceConnection.profileImageURL && (
                  <div className="flex-shrink-0">
                    <Image 
                      src={suggestedConferenceConnection.profileImageURL}
                      alt={`Profile picture of ${suggestedConferenceConnection.attendeeName}`}
                      width={100} 
                      height={100} 
                      className="rounded-full object-cover border-2 border-mw-light-blue/50 shadow-md"
                    />
                  </div>
                )}
                <div className="flex-grow">
                  <p className="text-mw-white/90 text-lg mb-1">
                    The stars suggest a meeting with: <strong className="text-mw-gold">{suggestedConferenceConnection.attendeeName}</strong>.
                  </p>
                  <p className="text-mw-white/80 text-base mb-2">
                    Their Archetype: <span className="font-medium">{suggestedConferenceConnection.attendeeArchetype}</span>
                  </p>
                  <p className="text-mw-white/90 text-base leading-relaxed">
                    <span className="font-semibold text-mw-light-blue/90">Reason for connection:</span> {suggestedConferenceConnection.connectionReason}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          onClick={() => router.push('/')}
          size="lg"
          className="mt-10 bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy font-semibold rounded-lg shadow-lg hover:opacity-90 transform transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
        >
          Start New Fortune
        </Button>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
} 