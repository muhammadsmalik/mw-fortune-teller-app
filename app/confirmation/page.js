'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BrandFooter from '@/components/ui/BrandFooter';
import WalliAvatar from '@/components/twin-reveal/WalliAvatar';
import { LEAD_SAVED_KEY } from '@/lib/concierge-storage';
import { MEETING_SLOTS } from '@/lib/meeting-slots';

export default function ConfirmationPage() {
  const router = useRouter();
  // Profile for the opt-in market read, read from the data persisted at select-name
  // (and the email refreshed at concierge submit). 'idle' until the attendee opts in.
  const [profile, setProfile] = useState(null);
  const [insightState, setInsightState] = useState('idle'); // idle | sending | sent | error
  useEffect(() => {
    setProfile({
      name: localStorage.getItem('selectedAttendeeName') || '',
      company: localStorage.getItem('selectedAttendeeCompany') || '',
      role: localStorage.getItem('selectedAttendeeRole') || '',
      linkedinUrl: localStorage.getItem('selectedAttendeeLinkedInUrl') || '',
      email: localStorage.getItem('selectedAttendeeEmail') || '',
    });
  }, []);
  const company = profile?.company || '';

  // Opt-in: fire the grounded research only when the attendee taps. The route returns
  // 202 instantly and finishes the ~2 min research server-side via after(), then emails
  // the report — so once this request lands the attendee can leave; no need to wait.
  const requestMarketRead = async () => {
    if (insightState === 'sending' || insightState === 'sent' || !profile?.email) return;
    setInsightState('sending');
    try {
      const res = await fetch('/api/business-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setInsightState('sent');
    } catch (err) {
      console.error('[confirmation] market-read request failed', err);
      setInsightState('error');
    }
  };

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      ['selectedAttendeeSlug', 'selectedAttendeeName', 'selectedAttendeeLinkedInUrl',
        'selectedAttendeeEmail', 'selectedAttendeeCompany', 'selectedAttendeeRole',
        'selectedMatches', LEAD_SAVED_KEY]
        .forEach((k) => window.localStorage.removeItem(k));
    }
    router.push('/select-name');
  };

  return (
    <div className="relative overflow-hidden flex flex-col min-h-screen bg-gradient-to-br from-mw-navy-void via-mw-navy-deep to-mw-navy-gunmetal text-mw-white">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-mw-blue-electric/15 blur-3xl" />
      <main className="relative flex-grow flex flex-col items-center justify-center px-4 pt-12 pb-8 text-center">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <WalliAvatar pose="celebrating" size={104} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">WALLi&apos;s on it.</h1>
          <p className="text-base text-mw-white/80 leading-relaxed">
            Your intro request is on its way to your inbox.
            <br />
            Drop by the Moving Walls booth and Agent WALLi&apos;s team will make the intro in person.
          </p>
          {profile?.email && (
            <div className="mt-6 rounded-lg border border-mw-blue-electric/30 bg-mw-blue-electric/5 p-4 text-left">
              <p className="text-xs uppercase tracking-wider text-mw-light-blue mb-2">
                One more thing
              </p>
              <p className="text-sm text-mw-white/85 leading-relaxed mb-3">
                {company
                  ? `Want to see what else I found? I can analyse ${company}'s market presence across five dimensions and email you the full breakdown.`
                  : `Want to see what else I found? I can analyse your business across five dimensions and email you the full breakdown.`}
              </p>
              {insightState === 'sent' ? (
                <p className="text-sm font-medium text-mw-light-blue">
                  On its way to your inbox ✓
                </p>
              ) : (
                <>
                  <Button
                    onClick={requestMarketRead}
                    disabled={insightState === 'sending'}
                    className="w-full bg-mw-blue-electric text-white hover:bg-mw-blue-electric/90"
                  >
                    {insightState === 'sending' ? 'Sending…' : 'Yes, email me the market read'}
                  </Button>
                  {insightState === 'error' && (
                    <p className="mt-2 text-xs text-red-300">
                      Something went wrong — tap to try again.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-8 rounded-lg border border-white/15 bg-white/5 p-4 text-left">
            <p className="text-xs uppercase tracking-wider text-mw-light-blue mb-2">
              Find us at the booth during any networking break
            </p>
            <ul className="space-y-1.5">
              {MEETING_SLOTS.map((s) => (
                <li key={s} className="text-sm text-white/85">{s}</li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-mw-gold-antique">
            Discover. Connect. Transform.
          </p>

          <Button
            onClick={handleReset}
            variant="outline"
            className="mt-10 border-white/30 text-white hover:bg-white/10 bg-transparent"
          >
            Start over
          </Button>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
