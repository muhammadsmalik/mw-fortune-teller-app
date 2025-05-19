'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button"; 

const FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY = 'fetchedLinkedInData';
const PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY = 'pendingFortuneRequestBody';

export default function LinkedInInterludeScreen() {
  const router = useRouter();
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isGeneratingFortune, setIsGeneratingFortune] = useState(false);
  const [profileInfo, setProfileInfo] = useState({
    companyName: '',
    jobTitle: '',
    previousCompanies: '',
    fullName: '', 
    industryType: '', 
  });
  const [apiError, setApiError] = useState(null);
  const [fortuneRequestBody, setFortuneRequestBody] = useState(null);

  useEffect(() => {
    const storedLinkedInDataString = localStorage.getItem(FETCHED_LINKEDIN_DATA_LOCAL_STORAGE_KEY);
    const storedFortuneRequestBodyString = localStorage.getItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY);

    if (!storedLinkedInDataString || !storedFortuneRequestBodyString) {
      setApiError("Essential information not found. Please start over.");
      setIsLoadingPage(false);
      setTimeout(() => router.push('/collect-info'), 4000);
      return;
    }

    try {
      const linkedInData = JSON.parse(storedLinkedInDataString);
      const parsedFortuneRequestBody = JSON.parse(storedFortuneRequestBodyString);
      setFortuneRequestBody(parsedFortuneRequestBody);

      const { profileData, latestCompanyData } = linkedInData;
      let companyName = 'your current venture';
      if (latestCompanyData?.name) {
        companyName = latestCompanyData.name;
      } else if (profileData?.experiences?.length > 0 && profileData.experiences[0]?.company) {
        companyName = profileData.experiences[0].company;
      }
      
      let jobTitle = 'your esteemed role';
      if (profileData?.occupation) {
        // Prefer occupation if available as it's often a summary
        jobTitle = profileData.occupation;
      } else if (profileData?.experiences?.length > 0 && profileData.experiences[0]?.title) {
        jobTitle = profileData.experiences[0].title;
      }

      let previousCompaniesString = '';
      if (profileData?.experiences && profileData.experiences.length > 1) {
        const currentCompNameLower = companyName.toLowerCase();
        const uniquePrevCompanies = Array.from(
          new Set(
            profileData.experiences
              .slice(1) 
              .map(exp => exp.company)
              .filter(name => name && name.toLowerCase() !== currentCompNameLower)
          )
        ).slice(0, 2); 

        if (uniquePrevCompanies.length > 0) {
          if (uniquePrevCompanies.length === 1) {
            previousCompaniesString = `Your path also shows experience with ${uniquePrevCompanies[0]}.`;
          } else {
            previousCompaniesString = `Your journey also includes chapters at ${uniquePrevCompanies.join(' and ')}.`;
          }
        }
      }
      
      const fullName = parsedFortuneRequestBody.fullName || 'Valued User';
      const industryType = parsedFortuneRequestBody.industryType || 'Diverse Fields';

      setProfileInfo({
        companyName,
        jobTitle,
        previousCompanies: previousCompaniesString,
        fullName,
        industryType
      });
      setIsLoadingPage(false);

    } catch (error) {
      console.error("Error processing LinkedIn data for interlude:", error);
      setApiError("There was an issue understanding your profile. Please try again.");
      setIsLoadingPage(false);
      setTimeout(() => router.push('/collect-info'), 4000);
    }
  }, [router]);

  const handleRevealDestiny = async () => {
    if (!fortuneRequestBody) {
      setApiError("Cannot proceed, vital information missing. Please restart.");
      setTimeout(() => router.push('/collect-info'), 4000);
      return;
    }

    setIsGeneratingFortune(true);
    setApiError(null);

    try {
      const fortuneResponse = await fetch('/api/generate-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fortuneRequestBody),
      });

      if (!fortuneResponse.ok) {
        const errorData = await fortuneResponse.json();
        throw new Error(errorData.error || errorData.details || `Failed to generate fortune (${fortuneResponse.status})`);
      }

      const fortuneData = await fortuneResponse.json();
      localStorage.setItem('fortuneData', JSON.stringify(fortuneData));
      
      localStorage.setItem('fortuneApp_fullName', profileInfo.fullName || fortuneRequestBody.fullName);
      localStorage.setItem('fortuneApp_industry', profileInfo.industryType || fortuneRequestBody.industryType);
      localStorage.setItem('fortuneApp_companyName', profileInfo.companyName || fortuneRequestBody.companyName);

      localStorage.removeItem(PENDING_FORTUNE_REQUEST_BODY_LOCAL_STORAGE_KEY); 
      
      router.push('/display-fortune');

    } catch (error) {
      console.error("Error generating fortune from interlude:", error);
      setApiError(`A cosmic disturbance interrupted fortune generation: ${error.message}. Redirecting...`);
      setIsGeneratingFortune(false);
      setTimeout(() => router.push('/collect-info'), 5000);
    }
  };

  if (isLoadingPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
        <p className="text-lg">Verifying your presence in the digital ether...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-8 relative isolate space-y-6 text-center">
       <div className="absolute top-6 right-6 flex items-center text-sm text-mw-white/70">
         <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
         <span className="font-semibold">Moving Walls</span>
       </div>
       <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
         <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
         <span className="font-semibold">Moving Walls</span>
       </div>

      {!isGeneratingFortune && !apiError && (
        <>
          <Image 
            src="/avatar/curious-look.png" 
            alt="Mystic Fortune Teller with a knowing look" 
            width={180} 
            height={270} 
            className="mb-6 object-contain"
            priority={true} // Consider adding priority if this is LCP
          />
          
          <h1 className="text-3xl font-semibold text-mw-light-blue">Ah, seeker...</h1>
          <p className="text-xl mt-4">I've peered into your LinkedIn profile…</p>
          <p className="text-xl">You work at <strong className="text-mw-gold">{profileInfo.companyName}</strong> as <strong className="text-mw-gold">{profileInfo.jobTitle}</strong>…</p>
          {profileInfo.previousCompanies && (
            <p className="text-md mt-2 text-mw-white/80">{profileInfo.previousCompanies}</p>
          )}
          <p className="text-xl mt-4 italic">You seek clarity. And destiny has sent you here.</p>
          
          <div className="mt-5 mb-3 text-mw-white/70 text-sm">
            <p>(Soon, I'll share this revelation with my own voice...)</p>
          </div>
          
          <Button
            onClick={handleRevealDestiny}
            size="lg"
            className="mt-3 px-8 py-3 text-lg font-semibold \
                       bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] \
                       text-mw-dark-navy \
                       hover:opacity-90 \
                       rounded-lg shadow-md transform transition-all duration-150 \
                       hover:shadow-xl active:scale-95"
          >
            Reveal My Destiny
          </Button>
        </>
      )}

      {isGeneratingFortune && (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-mw-light-blue" />
          <p className="text-lg text-mw-white/90">Consulting the oracles for your fortune...</p>
          <p className="text-sm text-mw-white/70">This may take a moment as we chart your stars.</p>
        </div>
      )}

      {apiError && !isGeneratingFortune && (
         <div className="p-6 rounded-lg shadow-lg text-center max-w-md bg-red-900/50 text-red-300">
            <h2 className="text-xl font-semibold mb-2">A Disturbance in the Stars!</h2>
            <p>{apiError}</p>
        </div>
      )}
    </div>
  );
} 