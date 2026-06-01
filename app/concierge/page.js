'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BrandFooter from '@/components/ui/BrandFooter';
import WalliAvatar from '@/components/twin-reveal/WalliAvatar';
import twinMatches from '@/lib/twin_matches.json';
import { LEAD_SAVED_KEY } from '@/lib/concierge-storage';

// Concierge requests are handled by a marketing DRI (not general sales).
// Falls back to the legacy sales-rep var, then a hard default.
const DRI_EMAIL =
  process.env.NEXT_PUBLIC_CONCIERGE_DRI_EMAIL ||
  process.env.NEXT_PUBLIC_SALES_REP_EMAIL ||
  'atlas1000x@gmail.com';

// POST JSON and treat any non-2xx as a failure. The previous code never checked
// res.ok, so an HTTP 500 from the sheet/email routes still resolved and the flow
// navigated to /confirmation as if it had succeeded.
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.message || '';
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${url} failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  return res;
}

export default function ConciergePage() {
  const router = useRouter();
  const [ctx, setCtx] = useState(null);
  const [email, setEmail] = useState('');
  const [chosen, setChosen] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Per-step guards so a retry only re-sends the email(s) that previously failed.
  // These live in a ref (not localStorage), so they reset on refresh — a duplicate
  // email is harmless. The sheet row is the opposite: a duplicate matters, so it's
  // guarded by a localStorage marker (LEAD_SAVED_KEY) that survives a refresh.
  const sent = useRef({ attendee: false, dri: false, matches: new Set() });

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
      // 1. Append to Google Sheet (re-uses existing lead pipe). Skip if a prior
      //    attempt already wrote this attendee's row, so retrying after a failed
      //    email doesn't append a duplicate lead.
      const leadAlreadySaved =
        typeof window !== 'undefined' &&
        window.localStorage.getItem(LEAD_SAVED_KEY) === ctx.slug;
      if (!leadAlreadySaved) {
        await postJson('/api/submit-lead', {
          fullName: ctx.name,
          email,
          companyName: ctx.company,
          industry: ctx.role,
          flowSource: 'twin-reveal',
          linkedinProfileUrl: ctx.linkedinUrl,
          persona: 'media_owner',
          sessionId: ctx.slug,
        });
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LEAD_SAVED_KEY, ctx.slug);
        }
      }

      // 2. Fire both emails in parallel — building only the ones still pending so a
      //    retry re-sends just the one(s) that previously failed.
      const emailTasks = [];
      if (!sent.current.attendee) {
        emailTasks.push(
          postJson('/api/send-email', {
            template: 'twinConfirmation',
            emailTo: email,
            testRerouteTo: email, // test mode: all of this submit's emails land in the tester's own inbox (no-op in prod)
            subject: 'Your WOO London matches — Moving Walls',
            fullName: ctx.name,
            matches,
          }).then(() => {
            sent.current.attendee = true;
          })
        );
      }
      if (!sent.current.dri) {
        emailTasks.push(
          postJson('/api/send-email', {
            template: 'salesRepNotification',
            emailTo: DRI_EMAIL,
            testRerouteTo: email, // test mode: reroute to the tester instead of the DRI inbox
            subject: `[WOO Concierge] ${ctx.name} — ${ctx.company || ''}`.trim(),
            fullName: ctx.name,
            email,
            emailOnFile, // false = attendee had no email on file, entered it at the booth
            company: ctx.company,
            role: ctx.role,
            linkedinUrl: ctx.linkedinUrl,
            attendeeSlug: ctx.slug,
            matches,
          }).then(() => {
            sent.current.dri = true;
          })
        );
      }

      // 3. Invite each selected match that has an email on file. Matches without
      //    an email are skipped here and flagged in the DRI notification for a
      //    manual intro. Reply-to is the attendee so the match can respond directly.
      matches.forEach((m) => {
        const key = m.slug || m.email;
        if (!m.email || sent.current.matches.has(key)) return;
        emailTasks.push(
          postJson('/api/send-email', {
            template: 'matchIntro',
            emailTo: m.email,
            testRerouteTo: email, // test mode: reroute to the tester instead of the match's inbox
            replyTo: email,
            subject: `${ctx.name} would like to meet you at WOO London`,
            matchName: m.name,
            attendeeName: ctx.name,
            attendeeRole: ctx.role,
            attendeeCompany: ctx.company,
            matchReason: m.matchReason,
            talkingPoints: m.talkingPoints,
          }).then(() => {
            sent.current.matches.add(key);
          })
        );
      });

      await Promise.all(emailTasks);

      // NOTE: the "business insight" market-read research is no longer fired here.
      // It is now an explicit opt-in on the /confirmation screen (the attendee taps
      // to request it), so we never run ~2 min of grounded research for people who
      // didn't ask for it. See app/confirmation/page.js.

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('selectedAttendeeEmail', email);
      }
      router.push('/confirmation');
    } catch (err) {
      console.error('[concierge] submit failed', err);
      setError('Something went wrong — please tap the button again to retry.');
      setSubmitting(false);
    }
  };

  if (!ctx) return null;

  return (
    <div className="relative overflow-hidden flex flex-col min-h-screen bg-gradient-to-br from-mw-navy-void via-mw-navy-deep to-mw-navy-gunmetal text-mw-white">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-mw-blue-electric/15 blur-3xl" />
      <main className="relative flex-grow flex flex-col items-center px-4 pt-12 pb-8">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => router.push('/reveal')}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex justify-center mb-4">
            <WalliAvatar pose="presenting" size={72} />
          </div>
          <p className="text-sm uppercase tracking-[0.2em] text-mw-light-blue text-center mb-3">Agent WALLi</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Where should I send it?</h1>
          <p className="text-base text-mw-white/70 text-center mb-6">
            I&apos;ll email you your {chosen.length === 1 ? 'match' : `${chosen.length} matches`} and brief my team at the booth to make the intro.
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
                  We don&apos;t have your email yet — add it so I can send your intros.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full px-10 py-7 text-lg font-bold
                         bg-gradient-to-r from-mw-gold-antique to-mw-gold-antique-deep
                         text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg
                         transition-all duration-150 hover:shadow-xl active:scale-95
                         disabled:opacity-60"
            >
              {submitting
                ? 'WALLi is working…'
                : chosen.length === 1
                  ? 'Send me the intro'
                  : 'Send me the intros'}
            </Button>
          </form>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
