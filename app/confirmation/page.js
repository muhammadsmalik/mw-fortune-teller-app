'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BrandFooter from '@/components/ui/BrandFooter';
import WalliAvatar from '@/components/twin-reveal/WalliAvatar';

export default function ConfirmationPage() {
  const router = useRouter();

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      ['selectedAttendeeSlug', 'selectedAttendeeName', 'selectedAttendeeLinkedInUrl',
        'selectedAttendeeEmail', 'selectedAttendeeCompany', 'selectedAttendeeRole',
        'selectedMatches']
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
