'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BrandFooter from '@/components/ui/BrandFooter';
import attendees from '@/lib/rsvp_attendees.json';

const STORAGE_KEYS = [
  'selectedAttendeeSlug',
  'selectedAttendeeName',
  'selectedAttendeeLinkedInUrl',
  'selectedAttendeeEmail',
  'selectedAttendeeCompany',
  'selectedAttendeeRole',
];

export default function SelectNamePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  // Wipe any prior selection so the back-out / reset path is clean.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attendees;
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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-[#2554A2] to-[#1B1E2B] text-mw-white">
      <main className="flex-grow flex flex-col items-center px-4 pt-12 pb-8">
        <div className="w-full max-w-xl">
          <p className="text-sm uppercase tracking-[0.2em] text-mw-light-blue text-center mb-3">WOO London</p>

          {!selected ? (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">Find your name</h1>
              <p className="text-base text-mw-white/70 text-center mb-8">
                Agent WALLi, our AI concierge wizard, will pick the three people you should meet.
              </p>

              <Input
                type="text"
                placeholder="Search by name or company…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 text-base"
                autoFocus
              />

              <div className="mt-6 max-h-[60vh] overflow-y-auto rounded-lg bg-white/5 border border-white/10 divide-y divide-white/10">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-white/60 text-sm">
                    No attendees match &quot;{query}&quot;.
                  </div>
                ) : filtered.map((a) => (
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
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">That&apos;s you?</h1>
              <p className="text-base text-mw-white/70 text-center mb-8">
                Confirm so WALLi can pull the right LinkedIn before the reveal.
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
                             bg-gradient-to-r from-[#FEDA24] to-[#FAAE25]
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
