/**
 * DisplayLegacyFortune Component (V2 - Hybrid Architecture)
 *
 * Displays the 6-field legacy fortune format from /api/generate-fortune endpoint.
 * Part of the new hybrid fortune-journey-v2 flow.
 *
 * Fortune Format:
 * - openingLine: Mystical opening statement
 * - locationInsight: 📍 Location/business context
 * - audienceOpportunity: 👀 Audience reach potential
 * - engagementForecast: 💥 Engagement predictions
 * - transactionsPrediction: 💸 Revenue/growth forecast
 * - aiAdvice: 🔮 Strategic guidance + Moving Walls CTA
 *
 * Features:
 * - Particle effects background
 * - Responsive layout
 * - Optional audio narration
 * - Smooth animations
 *
 * Created: 2025-10-01 (Phase 2 of hybrid migration)
 * Replaces: DisplayFortune-v1-deprecated (which used openingStatement + insights format)
 * See: .cursor/DOCUMENTATION/HYBRID_ARCHITECTURE.md
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Props:
 * @param {Object} fortuneData - The 6-field legacy fortune object
 * @param {Function} onGoBack - Callback for back navigation
 * @param {Function} onProceedToNextStep - Callback to proceed to next stage
 * @param {Boolean} audioPlaybackAllowed - Whether audio narration is allowed
 * @param {Array} userChallenges - Optional: User's selected challenges for context display
 */
export default function DisplayLegacyFortune({
  fortuneData,
  onGoBack,
  onProceedToNextStep,
  audioPlaybackAllowed = false,
  userChallenges = []
}) {
  const [init, setInit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize particles engine
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  // Once fortune data is available, hide loading
  useEffect(() => {
    if (fortuneData) {
      setIsLoading(false);
    }
  }, [fortuneData]);

  const particlesLoaded = useCallback(async (container) => {
    // Particle system loaded
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

  if (!init || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p className="text-lg">Unveiling your destiny...</p>
      </div>
    );
  }

  if (!fortuneData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <p className="text-lg">The stars are not aligned. No fortune data found.</p>
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline">
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      {init && Particles && (
        <Particles
          id="tsparticles-legacy-fortune"
          particlesLoaded={particlesLoaded}
          options={particleOptions}
          className="absolute top-0 left-0 w-full h-full z-[-1]"
        />
      )}

      {onGoBack && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
          onClick={onGoBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="w-full max-w-3xl z-10 mx-4"
      >
        <Card className="bg-card rounded-lg shadow-lg w-full">
          <CardHeader className="text-center pt-6 sm:pt-8">
            <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
              Your Fortune Reveals...
            </CardTitle>
          </CardHeader>

          <CardContent className="px-4 sm:px-6 pt-4 pb-6 sm:pb-8">
            {/* Opening Line */}
            <div className="mb-6 text-center">
              <p className="font-caveat text-2xl sm:text-3xl text-mw-gold italic">
                {fortuneData.openingLine}
              </p>
            </div>

            {/* Fortune Fields */}
            <div className="space-y-4 text-mw-white/95">
              {/* Location Insight */}
              {fortuneData.locationInsight && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-3 p-3 rounded-md bg-mw-dark-navy/30 border border-mw-light-blue/20"
                >
                  <span className="text-2xl flex-shrink-0">📍</span>
                  <div>
                    <p className="text-sm font-semibold text-mw-light-blue/90 mb-1">Location Insight</p>
                    <p className="text-sm sm:text-base">{fortuneData.locationInsight}</p>
                  </div>
                </motion.div>
              )}

              {/* Audience Opportunity */}
              {fortuneData.audienceOpportunity && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-3 p-3 rounded-md bg-mw-dark-navy/30 border border-mw-light-blue/20"
                >
                  <span className="text-2xl flex-shrink-0">👀</span>
                  <div>
                    <p className="text-sm font-semibold text-mw-light-blue/90 mb-1">Audience Opportunity</p>
                    <p className="text-sm sm:text-base">{fortuneData.audienceOpportunity}</p>
                  </div>
                </motion.div>
              )}

              {/* Engagement Forecast */}
              {fortuneData.engagementForecast && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-start gap-3 p-3 rounded-md bg-mw-dark-navy/30 border border-mw-light-blue/20"
                >
                  <span className="text-2xl flex-shrink-0">💥</span>
                  <div>
                    <p className="text-sm font-semibold text-mw-light-blue/90 mb-1">Engagement Forecast</p>
                    <p className="text-sm sm:text-base">{fortuneData.engagementForecast}</p>
                  </div>
                </motion.div>
              )}

              {/* Transactions Prediction */}
              {fortuneData.transactionsPrediction && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-start gap-3 p-3 rounded-md bg-mw-dark-navy/30 border border-mw-light-blue/20"
                >
                  <span className="text-2xl flex-shrink-0">💸</span>
                  <div>
                    <p className="text-sm font-semibold text-mw-light-blue/90 mb-1">Transactions Prediction</p>
                    <p className="text-sm sm:text-base">{fortuneData.transactionsPrediction}</p>
                  </div>
                </motion.div>
              )}

              {/* AI Oracle's Guidance */}
              {fortuneData.aiAdvice && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-start gap-3 p-3 rounded-md bg-gradient-to-r from-mw-dark-navy/50 to-mw-dark-navy/30 border border-mw-gold/30"
                >
                  <span className="text-2xl flex-shrink-0">🔮</span>
                  <div>
                    <p className="text-sm font-semibold text-mw-gold/90 mb-1">AI Oracle&apos;s Guidance</p>
                    <p className="text-sm sm:text-base">{fortuneData.aiAdvice}</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Optional: Challenge Insights Section */}
            {userChallenges && userChallenges.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-6 pt-6 border-t border-mw-light-blue/20"
              >
                <h3 className="text-lg font-semibold text-mw-light-blue mb-3">
                  ✨ Addressing Your Challenges
                </h3>
                <p className="text-sm text-mw-white/80 mb-2">
                  This fortune was crafted specifically to address your concerns about:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-mw-white/70">
                  {userChallenges.map((challenge, idx) => (
                    <li key={idx}>{challenge}</li>
                  ))}
                </ul>
              </motion.div>
            )}
          </CardContent>

          <CardFooter className="pt-2 pb-6 sm:pb-8 flex justify-center">
            {onProceedToNextStep && (
              <Button
                onClick={onProceedToNextStep}
                size="lg"
                className="px-8 py-3 text-lg font-semibold
                           bg-gradient-to-r from-[#FEDA24] to-[#FAAE25]
                           text-mw-dark-navy
                           hover:opacity-90
                           rounded-lg shadow-md transform transition-all duration-150
                           hover:shadow-xl active:scale-95"
              >
                Unlock Your Tactical Playbook
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
