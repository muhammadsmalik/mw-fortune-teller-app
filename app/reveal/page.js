'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import MatchCard from '@/components/twin-reveal/MatchCard';
import twinMatches from '@/lib/twin_matches.json';

export default function RevealPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [matches, setMatches] = useState([]);
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const slug = window.localStorage.getItem('selectedAttendeeSlug') || '';
    const n = window.localStorage.getItem('selectedAttendeeName') || '';
    if (!slug) {
      router.replace('/select-name');
      return;
    }
    setName(n);
    const entry = twinMatches[slug];
    setMatches(Array.isArray(entry?.matches) ? entry.matches : []);
    setReady(true);
  }, [router]);

  if (!ready) return null;

  const firstName = name ? name.split(' ')[0] : 'seeker';

  return (
    <div className="relative min-h-screen overflow-hidden bg-mw-dark-navy text-mw-white">
      {/* Door background — always present, dims when opened */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ scale: opened ? 1.05 : 1, filter: opened ? 'brightness(0.4)' : 'brightness(1)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <Image
          src="/assets/door-reveal.jpg"
          alt="Mystical door"
          fill
          priority
          className="object-cover"
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {!opened ? (
          // ---------- Door state ----------
          <motion.button
            key="door"
            type="button"
            onClick={() => setOpened(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-10 flex flex-col items-end justify-end pb-16 px-6 cursor-pointer group"
            aria-label="Tap on the door to reveal your matches"
          >
            <div className="w-full max-w-xl mx-auto text-center bg-gradient-to-t from-black/70 via-black/30 to-transparent p-8 rounded-lg">
              <p className="text-base sm:text-lg italic text-mw-white/90 drop-shadow-lg mb-2">
                {firstName === 'seeker'
                  ? 'Agent WALLi has picked the three people you should meet…'
                  : `${firstName}, Agent WALLi has picked the three people you should meet…`}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-mw-gold group-hover:scale-105 transition-transform drop-shadow-lg">
                Tap on the door to reveal
              </p>
            </div>
          </motion.button>
        ) : (
          // ---------- Reveal state ----------
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute inset-0 z-10 overflow-y-auto"
          >
            <div className="min-h-screen flex flex-col items-center px-4 pt-10 pb-8">
              <div className="w-full max-w-xl">
                <p className="text-sm uppercase tracking-[0.2em] text-mw-light-blue text-center mb-3 drop-shadow">
                  {name ? `Hi ${firstName}` : 'Your reveal'}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 drop-shadow-lg">
                  WALLi has peered into your LinkedIn
                </h1>
                <p className="text-base text-mw-white/80 text-center mb-8 drop-shadow">
                  Here are the three people you should meet.
                </p>

                {matches.length > 0 && (
                  <div className="space-y-3">
                    {matches.slice(0, 3).map((m, i) => (
                      <motion.div
                        key={m.slug || i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.15, duration: 0.4 }}
                      >
                        <MatchCard match={m} />
                      </motion.div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => router.push('/concierge')}
                  size="lg"
                  className="mt-8 w-full px-10 py-7 text-lg font-bold
                             bg-gradient-to-r from-[#FEDA24] to-[#FAAE25]
                             text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg
                             transition-all duration-150 hover:shadow-xl active:scale-95"
                >
                  Ask WALLi for an intro
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
