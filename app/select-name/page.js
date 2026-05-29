'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BrandFooter from '@/components/ui/BrandFooter';
import WalliAvatar from '@/components/twin-reveal/WalliAvatar';
// Lightweight directory (name/role/company/email/linkedinUrl), pre-sorted and
// built alongside twin_matches.json — keeps the heavy match graph out of this
// route's bundle. The reveal resolves each picked slug against twin_matches.json.
import attendees from '@/lib/twin_index.json';

const STORAGE_KEYS = [
  'selectedAttendeeSlug',
  'selectedAttendeeName',
  'selectedAttendeeLinkedInUrl',
  'selectedAttendeeEmail',
  'selectedAttendeeCompany',
  'selectedAttendeeRole',
  'selectedAttendeeHeadshotUrl',
  'liveMatches',
  'selectedMatches',
];

const MAX_RESULTS = 50; // keep the DOM light; broad queries get truncated with a hint

export default function SelectNamePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  // Walk-in path: attendees not in the precomputed directory match live via their LinkedIn.
  const [showWalkin, setShowWalkin] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [walkinError, setWalkinError] = useState('');

  // Wipe any prior selection so the back-out / reset path is clean.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));
  }, []);

  // Empty until the user types — the list is ~470 people, not a browse list.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return attendees.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.company || '').toLowerCase().includes(q)
    );
  }, [query]);

  const handlePick = (a) => setSelected(a);
  const handleBack = () => setSelected(null);

  const handleConfirm = () => {
    if (!selected) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedAttendeeSlug', selected.slug);
      window.localStorage.setItem('selectedAttendeeName', selected.name);
      window.localStorage.setItem('selectedAttendeeLinkedInUrl', selected.linkedinUrl || '');
      window.localStorage.setItem('selectedAttendeeEmail', selected.email || '');
      window.localStorage.setItem('selectedAttendeeCompany', selected.company || '');
      window.localStorage.setItem('selectedAttendeeRole', selected.role || '');
    }
    router.push('/reveal');
  };

  // Walk-in: hand the LinkedIn URL to the live matcher, stash the result, reveal.
  const handleWalkin = async (e) => {
    e.preventDefault();
    setWalkinError('');
    const url = linkedinUrl.trim();
    if (!/linkedin\.com\/in\//i.test(url)) {
      setWalkinError('Paste a LinkedIn profile URL (linkedin.com/in/…).');
      return;
    }
    setWalkinLoading(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Couldn\'t find matches. Try again.');
      const { source, matches } = data;
      const slug = (source.linkedinUrl || url).split('/in/')[1]?.replace(/\/+$/, '') || 'walkin';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('selectedAttendeeSlug', slug);
        window.localStorage.setItem('selectedAttendeeName', source.name || '');
        window.localStorage.setItem('selectedAttendeeLinkedInUrl', source.linkedinUrl || url);
        window.localStorage.setItem('selectedAttendeeEmail', ''); // none on file → concierge prompts for it
        window.localStorage.setItem('selectedAttendeeCompany', source.company || '');
        window.localStorage.setItem('selectedAttendeeRole', source.role || '');
        window.localStorage.setItem('selectedAttendeeHeadshotUrl', source.headshotUrl || '');
        window.localStorage.setItem('liveMatches', JSON.stringify(matches || []));
      }
      router.push('/reveal');
    } catch (err) {
      setWalkinError(err.message || 'Something went wrong. Try again.');
      setWalkinLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden flex flex-col min-h-screen bg-gradient-to-br from-mw-navy-void via-mw-navy-deep to-mw-navy-gunmetal text-mw-white">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-mw-blue-electric/15 blur-3xl" />
      <main className="relative flex-grow flex flex-col items-center px-4 pt-12 pb-8">
        <div className="w-full max-w-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-mw-light-blue text-center mb-3">WOO London</p>

          {!selected ? (
            <>
              <div className="flex justify-center mb-5">
                <WalliAvatar pose="greeting" size={96} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">Find your name</h1>
              <p className="text-base text-mw-white/70 text-center mb-8">
                Agent WALLi, our AI Concierge Wizard, will pick the three people you should meet.
              </p>

              <Input
                type="text"
                placeholder="Search by name or company…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-base"
                autoFocus
              />

              {query.trim() && (
                <div className="mt-6 max-h-[60vh] overflow-y-auto rounded-lg bg-white/5 border border-white/10 divide-y divide-white/10">
                  {filtered.length === 0 ? (
                    <div className="p-6 text-center text-white/60 text-sm">
                      No attendees match &quot;{query}&quot;.
                    </div>
                  ) : (
                    <>
                      {filtered.slice(0, MAX_RESULTS).map((a) => (
                        <button
                          key={a.slug}
                          onClick={() => handlePick(a)}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/15 transition"
                        >
                          <div className="font-medium text-white">{a.name}</div>
                          <div className="text-xs text-white/60 mt-0.5">
                            {[a.role, a.company].filter(Boolean).join(' — ')}
                          </div>
                        </button>
                      ))}
                      {filtered.length > MAX_RESULTS && (
                        <div className="p-3 text-center text-white/50 text-xs">
                          Showing {MAX_RESULTS} of {filtered.length} — keep typing to narrow it down.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Walk-in path — anyone not in the precomputed directory */}
              <div className="mt-8 text-center">
                {!showWalkin ? (
                  <button
                    onClick={() => setShowWalkin(true)}
                    className="text-sm text-mw-light-blue underline decoration-mw-light-blue/40 hover:decoration-mw-light-blue"
                  >
                    Not on the list? Match with your LinkedIn
                  </button>
                ) : (
                  <form onSubmit={handleWalkin} className="text-left">
                    <p className="mb-2 text-center text-sm text-mw-white/70">
                      Paste your LinkedIn and WALLi will find your matches live.
                    </p>
                    <Input
                      type="url"
                      inputMode="url"
                      placeholder="https://www.linkedin.com/in/your-name"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-base"
                      autoFocus
                    />
                    {walkinError && <p className="mt-2 text-sm text-red-300">{walkinError}</p>}
                    <Button
                      type="submit"
                      disabled={walkinLoading}
                      size="lg"
                      className="mt-4 w-full px-10 py-7 text-lg font-bold
                                 bg-gradient-to-r from-mw-gold-antique to-mw-gold-antique-deep
                                 text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg
                                 transition-all duration-150 hover:shadow-xl active:scale-95
                                 disabled:opacity-60"
                    >
                      {walkinLoading ? 'WALLi is reading your LinkedIn…' : 'Find my matches'}
                    </Button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">That&apos;s you?</h1>
              <p className="text-base text-mw-white/70 text-center mb-8">
                Confirm so WALLi reads the right LinkedIn before the reveal.
              </p>

              <div className="rounded-xl bg-white/10 border border-white/15 p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-mw-light-blue mb-1">Name</p>
                  <p className="text-xl font-semibold text-white">{selected.name}</p>
                  {(selected.role || selected.company) && (
                    <p className="text-sm text-white/70 mt-1">
                      {[selected.role, selected.company].filter(Boolean).join(' — ')}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs uppercase tracking-wider text-mw-light-blue mb-1">LinkedIn</p>
                  {selected.linkedinUrl ? (
                    <a
                      href={selected.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-white underline decoration-white/30 hover:decoration-white break-all"
                    >
                      {selected.linkedinUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-white/60 italic">
                      No LinkedIn URL on file — we&apos;ll proceed without it.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button
                  onClick={handleConfirm}
                  size="lg"
                  className="w-full px-10 py-7 text-lg font-bold
                             bg-gradient-to-r from-mw-gold-antique to-mw-gold-antique-deep
                             text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg
                             transition-all duration-150 hover:shadow-xl active:scale-95"
                >
                  Continue
                </Button>
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  className="w-full text-white/70 hover:text-white hover:bg-white/5"
                >
                  Not me — back to list
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
