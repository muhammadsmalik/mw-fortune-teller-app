'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BrandFooter from '@/components/ui/BrandFooter';
import twinMatches from '@/lib/twin_matches.json';

// Concierge requests are handled by a marketing DRI (not general sales).
// Falls back to the legacy sales-rep var, then a hard default.
const DRI_EMAIL =
  process.env.NEXT_PUBLIC_CONCIERGE_DRI_EMAIL ||
  process.env.NEXT_PUBLIC_SALES_REP_EMAIL ||
  'atlas1000x@gmail.com';

export default function ConciergePage() {
  const router = useRouter();
  const [ctx, setCtx] = useState(null);
  const [email, setEmail] = useState('');
  const [chosen, setChosen] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const slug = window.localStorage.getItem('selectedAttendeeSlug') || '';
    if (!slug) {
      router.replace('/select-name');
      return;
    }
    const onFileEmail = window.localStorage.getItem('selectedAttendeeEmail') || '';
    setCtx({
      slug,
      name: window.localStorage.getItem('selectedAttendeeName') || '',
      email: onFileEmail,
      company: window.localStorage.getItem('selectedAttendeeCompany') || '',
      role: window.localStorage.getItem('selectedAttendeeRole') || '',
      linkedinUrl: window.localStorage.getItem('selectedAttendeeLinkedInUrl') || '',
    });
    setEmail(onFileEmail);

    // Matches the user picked on /reveal; fall back to all of their matches.
    let picked = [];
    try {
      picked = JSON.parse(window.localStorage.getItem('selectedMatches') || '[]');
    } catch {
      picked = [];
    }
    if (!Array.isArray(picked) || picked.length === 0) {
      picked = (twinMatches[slug] && twinMatches[slug].matches) || [];
    }
    setChosen(picked.slice(0, 3));
  }, [router]);

  // Missing-email fallback: if we have no email on file, prompt for it.
  const emailOnFile = Boolean(ctx?.email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ctx) return;
    setError('');
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (chosen.length === 0) {
      setError('Please go back and pick at least one person to connect with.');
      return;
    }
    setSubmitting(true);

    const matches = chosen;

    try {
      // 1. Append to Google Sheet (re-uses existing lead pipe)
      await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: ctx.name,
          email,
          companyName: ctx.company,
          industry: ctx.role,
          flowSource: 'twin-reveal',
          linkedinProfileUrl: ctx.linkedinUrl,
          persona: 'media_owner',
          sessionId: ctx.slug,
        }),
      });

      // 2. Fire both emails in parallel
      await Promise.all([
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'twinConfirmation',
            emailTo: email,
            subject: 'Your WOO London matches — Moving Walls',
            fullName: ctx.name,
            matches,
          }),
        }),
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'salesRepNotification',
            emailTo: DRI_EMAIL,
            subject: `[WOO Concierge] ${ctx.name} — ${ctx.company || ''}`.trim(),
            fullName: ctx.name,
            email,
            emailOnFile, // false = attendee had no email on file, entered it at the booth
            company: ctx.company,
            role: ctx.role,
            linkedinUrl: ctx.linkedinUrl,
            attendeeSlug: ctx.slug,
            matches,
          }),
        }),
      ]);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('selectedAttendeeEmail', email);
      }
      router.push('/confirmation');
    } catch (err) {
      console.error('[concierge] submit failed', err);
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (!ctx) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-[#2554A2] to-[#1B1E2B] text-mw-white">
      <main className="flex-grow flex flex-col items-center px-4 pt-12 pb-8">
        <div className="w-full max-w-md">
          <p className="text-sm uppercase tracking-[0.2em] text-mw-light-blue text-center mb-3">Agent WALLi</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Where should WALLi send it?</h1>
          <p className="text-base text-mw-white/70 text-center mb-6">
            WALLi will email you your {chosen.length === 1 ? 'match' : `${chosen.length} matches`} and brief our concierge to make the intro at the booth.
          </p>

          {chosen.length > 0 && (
            <div className="mb-6 rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-mw-light-blue mb-2">
                Requesting an intro to
              </p>
              <ul className="space-y-1.5">
                {chosen.map((m, i) => {
                  const meta = [m.role, m.company].filter(Boolean).join(', ');
                  return (
                    <li key={m.slug || i} className="text-sm text-white/85">
                      <span className="font-semibold text-white">{m.name}</span>
                      {meta && <span className="text-white/60"> — {meta}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white/80 text-sm">Name</Label>
              <Input
                id="name"
                type="text"
                value={ctx.name}
                readOnly
                className="bg-white/5 border-white/20 text-white/80 h-12 mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-white/80 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 mt-1.5"
              />
              {!emailOnFile && (
                <p className="mt-1.5 text-xs text-mw-light-blue">
                  We don&apos;t have your email yet — add it so WALLi can send your intros.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full px-10 py-7 text-lg font-bold
                         bg-gradient-to-r from-[#FEDA24] to-[#FAAE25]
                         text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg
                         transition-all duration-150 hover:shadow-xl active:scale-95
                         disabled:opacity-60"
            >
              {submitting ? 'WALLi is working…' : 'Send me the intro'}
            </Button>
          </form>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
