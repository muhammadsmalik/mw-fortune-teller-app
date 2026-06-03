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
import { LEAD_SAVED_KEY } from '@/lib/concierge-storage';

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
  LEAD_SAVED_KEY,
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
  // Set when a "pending" attendee (on the list but no precomputed matches) is picked,
  // so the walk-in screen can greet them by name instead of looking like a stranger flow.
  const [pendingName, setPendingName] = useState('');
  const [navigating, setNavigating] = useState(false);

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

  // Pending people (RSVPs with no precomputed matches) have no LinkedIn on file,
  // so send them straight into the walk-in flow to paste it — never a dead-end reveal.
  const handlePick = (a) => {
    if (a.pending) {
      setPendingName(a.name);
      setLinkedinUrl(a.linkedinUrl || ''); // WOO sources have a URL on file → one-tap re-match
      setShowWalkin(true);
    } else setSelected(a);
  };
  const handleBack = () => setSelected(null);

  // Back out of the walk-in path → return to the name search, clean.
  const handleWalkinBack = () => {
    setShowWalkin(false);
    setLinkedinUrl('');
    setWalkinError('');
    setPendingName('');
  };

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
    setNavigating(true);
    router.push('/reveal');
  };

  // Walk-in: hand the LinkedIn URL to the live matcher, stash the result, reveal.
  const handleWalkin = async (e) => {
    e.preventDefault();
    setWalkinError('');
    let url = linkedinUrl.trim();
    if (!/linkedin\.com\/in\//i.test(url)) {
      setWalkinError('Paste a LinkedIn profile URL (linkedin.com/in/…).');
      return;
    }
    // Accept a scheme-less paste (linkedin.com/in/… or www.linkedin.com/in/…) —
    // the API's new URL() and our own normalizer both need a scheme.
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
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

          {!selected && !showWalkin ? (
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

              {/* Entry to the walk-in path — anyone not in the precomputed directory */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowWalkin(true)}
                  className="text-sm text-mw-light-blue underline decoration-mw-light-blue/40 hover:decoration-mw-light-blue"
                >
                  Not on the list? Match with your LinkedIn
                </button>
              </div>
            </>
          ) : showWalkin ? (
            <>
              <div className="flex justify-center mb-5">
                <WalliAvatar pose="greeting" size={96} />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
                {pendingName && linkedinUrl ? 'Confirm your LinkedIn' : 'Paste your LinkedIn'}
              </h1>
              <p className="text-base text-mw-white/70 text-center mb-8">
                {pendingName && linkedinUrl
                  ? `We've got your LinkedIn ready — just tap "Find my matches" and WALLi will match you live.`
                  : pendingName
                    ? `Hi ${pendingName.split(' ')[0]} — we don't have your profile yet. Paste your LinkedIn and WALLi will find your matches live.`
                    : 'WALLi will read your profile and find your matches live.'}
              </p>

              <form onSubmit={handleWalkin}>
                <Input
                  type="text"
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

              <details className="group mt-4 text-center">
                <summary className="cursor-pointer list-none text-sm text-mw-light-blue underline decoration-mw-light-blue/40 hover:decoration-mw-light-blue marker:hidden">
                  How do I find my LinkedIn URL?
                </summary>
                <div className="mt-3 text-left text-sm text-mw-white/70 leading-relaxed rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="font-semibold text-white mb-2">
                    On the LinkedIn app (iPhone or Android — same steps):
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 mb-3">
                    <li>Tap your <span className="text-white">photo</span> (top-left).</li>
                    <li>Tap your <span className="text-white">name / photo again</span> to open your profile.</li>
                    <li>
                      Tap the <span className="text-white">⋯ menu</span> near your name → choose{' '}
                      <span className="text-white">Copy URL</span> (or{' '}
                      <span className="text-white">Share via…</span> then <span className="text-white">Copy</span>).
                    </li>
                    <li>Paste it in the box above.</li>
                  </ol>
                  <p>
                    <span className="font-semibold text-white">On desktop:</span> open your profile and
                    copy the address bar — it ends in{' '}
                    <span className="text-white">/in/your-name</span>.
                  </p>
                </div>
              </details>

              <div className="mt-4 text-center">
                <button
                  onClick={handleWalkinBack}
                  disabled={walkinLoading}
                  className="text-sm text-white/60 hover:text-white disabled:opacity-50"
                >
                  ← Back to name search
                </button>
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
                  disabled={navigating}
                  size="lg"
                  className="w-full px-10 py-7 text-lg font-bold
                             bg-gradient-to-r from-mw-gold-antique to-mw-gold-antique-deep
                             text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg
                             transition-all duration-150 hover:shadow-xl active:scale-95
                             disabled:opacity-70 disabled:cursor-wait"
                >
                  {navigating ? 'Revealing your matches…' : 'Continue'}
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
