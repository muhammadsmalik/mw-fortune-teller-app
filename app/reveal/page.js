'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, Building2, MessageSquareText, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MatchCard from '@/components/twin-reveal/MatchCard';
import Avatar from '@/components/twin-reveal/Avatar';
import WalliAvatar from '@/components/twin-reveal/WalliAvatar';
import BrandFooter from '@/components/ui/BrandFooter';
import twinMatches from '@/lib/twin_matches.json';

export default function RevealPage() {
  const router = useRouter();
  const [source, setSource] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const slug = window.localStorage.getItem('selectedAttendeeSlug') || '';
    if (!slug) {
      router.replace('/select-name');
      return;
    }
    const entry = twinMatches[slug];
    // Walk-ins aren't in twin_matches.json — their matches were computed live on
    // /select-name and stashed in localStorage. Prefer those when present.
    let live = null;
    try {
      live = JSON.parse(window.localStorage.getItem('liveMatches') || 'null');
    } catch {
      live = null;
    }
    const storedHeadshot = window.localStorage.getItem('selectedAttendeeHeadshotUrl') || '';
    setSource({
      name: window.localStorage.getItem('selectedAttendeeName') || '',
      company: window.localStorage.getItem('selectedAttendeeCompany') || '',
      role: window.localStorage.getItem('selectedAttendeeRole') || '',
      linkedinUrl: window.localStorage.getItem('selectedAttendeeLinkedInUrl') || '',
      headshotUrl: storedHeadshot || entry?.source?.headshotUrl || '',
    });
    const ms = (Array.isArray(live) && live.length)
      ? live.slice(0, 3)
      : (Array.isArray(entry?.matches) ? entry.matches.slice(0, 3) : []);
    setMatches(ms);
    setSelected(ms.map((_, i) => i)); // all pre-selected; user can narrow to 1–3
    setReady(true);
  }, [router]);

  if (!ready) return null;

  const firstName = source?.name ? source.name.split(' ')[0] : 'there';

  const toggle = (i) =>
    setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const requestIntro = () => {
    const chosen = matches.filter((_, i) => selected.includes(i));
    if (chosen.length === 0) return;
    window.localStorage.setItem('selectedMatches', JSON.stringify(chosen));
    router.push('/concierge');
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-mw-navy-void via-mw-navy-deep to-mw-navy-gunmetal text-mw-white">
      <div aria-hidden className="pointer-events-none absolute left-1/3 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-mw-blue-electric/12 blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.35fr]">
          {/* ---------- Source profile ---------- */}
          <div className="flex flex-col rounded-lg border border-white/10 bg-[#151E43]/72 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="flex items-center gap-4">
              <Avatar
                name={source?.name}
                headshotUrl={source?.headshotUrl}
                initialsCount={2}
                className="h-16 w-16 shrink-0 rounded-full border-2 border-mw-gold-antique/70"
                fallbackClassName="bg-mw-light-blue/15 text-xl text-[#AFDFF6]"
              />
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-mw-gold-antique/30 bg-mw-gold-antique/15 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-mw-parchment">
                  <Sparkles className="h-3.5 w-3.5" />
                  Agent WALLi
                </div>
                <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                  {source?.name || 'Your reveal'}
                </h1>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-white/82">
              {(source?.role || source?.company) && (
                <div className="flex gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-mw-light-blue" />
                  <p>
                    {source.role}
                    {source.role && source.company ? ' at ' : ''}
                    {source.company && <span className="font-semibold text-white">{source.company}</span>}
                  </p>
                </div>
              )}
              {source?.linkedinUrl && (
                <Link
                  href={source.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-mw-light-blue hover:text-mw-gold-antique"
                >
                  View LinkedIn <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="mt-6 flex items-start gap-3">
              <WalliAvatar pose="presenting" size={44} className="mt-0.5" />
              <p className="text-sm leading-relaxed text-white/70">
                I peered into your LinkedIn and picked the people you should meet at WOO London.
              </p>
            </div>
          </div>

          {/* ---------- Matches ---------- */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-normal text-[#AFDFF6]">
                  {source?.name ? `Hi ${firstName}` : 'People you should meet'}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  The people you should meet
                </h2>
              </div>
              {matches.length > 0 && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs text-white/78">
                  <Users className="h-4 w-4 text-mw-light-blue" />
                  Tap ✓ to choose up to 3
                </div>
              )}
            </div>

            {matches.length > 0 ? (
              <div className="grid gap-3">
                {matches.map((m, i) => (
                  <MatchCard
                    key={m.slug || i}
                    match={m}
                    selectable
                    selected={selected.includes(i)}
                    onToggleSelect={() => toggle(i)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6 text-center text-white/75">
                WALLi is still preparing your matches — please check with the booth team.
              </div>
            )}

            <Button
              onClick={requestIntro}
              disabled={selected.length === 0}
              size="lg"
              className="mt-2 w-full px-10 py-7 text-lg font-bold
                         bg-gradient-to-r from-mw-gold-antique to-mw-gold-antique-deep
                         text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg
                         transition-all duration-150 hover:shadow-xl active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selected.length > 0
                ? `Ask WALLi for an intro (${selected.length})`
                : 'Select at least one person'}
            </Button>
          </div>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
