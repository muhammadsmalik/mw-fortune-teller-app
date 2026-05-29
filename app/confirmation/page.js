'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import BrandFooter from '@/components/ui/BrandFooter';

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
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-[#2554A2] to-[#1B1E2B] text-mw-white">
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-12 pb-8 text-center">
        <div className="w-full max-w-md">
          <div className="text-5xl mb-6">✨</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">WALLi&apos;s on it.</h1>
          <p className="text-base text-mw-white/80 leading-relaxed">
            Your intro request is on its way to your inbox.
            <br />
            Drop by the Moving Walls booth and Agent WALLi&apos;s team will make the intro in person.
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
