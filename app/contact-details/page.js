'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function ContactDetailsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shareableFortuneText, setShareableFortuneText] = useState('Your fortune is being prepared for sharing...');
  const [isLeadSaved, setIsLeadSaved] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [emailSendStatus, setEmailSendStatus] = useState({ message: '', type: '' });

  const [leadData, setLeadData] = useState({
    fullName: '',
    industry: '',
    companyName: '',
    fortuneText: '',
  });

  const [isLinkedInFlow, setIsLinkedInFlow] = useState(false);
  const [linkedInEmail, setLinkedInEmail] = useState('');
  const [autoProcessAttempted, setAutoProcessAttempted] = useState(false);

  const isEverythingDone = isLeadSaved && isEmailSent;

  useEffect(() => {
    let initialFullName = localStorage.getItem('fortuneApp_fullName');
    let initialIndustry = localStorage.getItem('fortuneApp_industry');
    let initialCompanyName = localStorage.getItem('fortuneApp_companyName');
    const storedFortuneText = localStorage.getItem('fortuneApp_fortuneText') || 'Your future is bright!';

    const linkedInDataString = localStorage.getItem('fetchedLinkedInData');
    if (linkedInDataString) {
      setIsLinkedInFlow(true);
      try {
        const linkedInData = JSON.parse(linkedInDataString);
        const profile = linkedInData.profileData;
        const companyData = linkedInData.latestCompanyData;

        if (profile) {
          initialFullName = profile.full_name || initialFullName || 'User from LinkedIn';
          initialCompanyName = (profile.experiences && profile.experiences.length > 0 ? profile.experiences[0].company : null) || initialCompanyName || 'Company (via LinkedIn)';
          initialIndustry = profile.occupation || (companyData ? companyData.industry : null) || initialIndustry || 'Industry (via LinkedIn)';

          if (profile.personal_emails && profile.personal_emails.length > 0 && profile.personal_emails[0]) {
            const extractedEmail = profile.personal_emails[0];
            setLinkedInEmail(extractedEmail);
            setEmail(extractedEmail);
          }
        }
      } catch (e) {
        console.error("Error parsing LinkedIn data:", e);
        setIsLinkedInFlow(false);
      }
    }

    setLeadData({
      fullName: initialFullName || 'Guest User',
      industry: initialIndustry || 'General',
      companyName: initialCompanyName || 'N/A',
      fortuneText: storedFortuneText,
    });
  }, []);

  useEffect(() => {
    const structuredFortuneString = localStorage.getItem('fortuneApp_structuredFortune');
    let textToShare = "Your fortune is being prepared for sharing...";
    const movingWallsLink = "Book an appointment here: https://www.movingwalls.com/contact-us/";

    if (structuredFortuneString) {
      try {
        const structuredFortune = JSON.parse(structuredFortuneString);
        let parts = [];
        if (structuredFortune.openingLine) parts.push(structuredFortune.openingLine);
        if (structuredFortune.locationInsight) parts.push(structuredFortune.locationInsight.replace('📍', '').trim());
        if (structuredFortune.audienceOpportunity) parts.push(structuredFortune.audienceOpportunity.replace('👀', '').trim());
        if (structuredFortune.engagementForecast) parts.push(structuredFortune.engagementForecast.replace('💥', '').trim());
        if (structuredFortune.transactionsPrediction) parts.push(structuredFortune.transactionsPrediction.replace('💸', '').trim());
        if (structuredFortune.aiAdvice) parts.push(structuredFortune.aiAdvice.replace('🔮', '').trim());
        
        textToShare = parts.join('\n\n');
        textToShare += `\n\n${movingWallsLink}`;

      } catch (e) {
        console.error("Failed to parse structured fortune for sharing:", e);
        const htmlFortune = localStorage.getItem('fortuneApp_fortuneText');
        if (htmlFortune) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlFortune;
          textToShare = (tempDiv.textContent || tempDiv.innerText || "").replace(/\n\s*\n/g, '\n\n').trim();
          textToShare += `\n\n${movingWallsLink}`;
        } else {
          textToShare = `Could not retrieve fortune for sharing. Visit us at ${movingWallsLink}`;
        }
      }
    } else {
      const htmlFortune = localStorage.getItem('fortuneApp_fortuneText');
      if (htmlFortune) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlFortune;
        textToShare = (tempDiv.textContent || tempDiv.innerText || "").replace(/\n\s*\n/g, '\n\n').trim();
        textToShare += `\n\n${movingWallsLink}`;
      } else {
        textToShare = `Fortune details not available for sharing. Visit us at ${movingWallsLink}`;
      }
    }
    setShareableFortuneText(textToShare);
  }, []);

  const sendFortuneEmail = useCallback(async (emailToSendTo, userFullName, fortuneContentForEmail) => {
    if (!fortuneContentForEmail || fortuneContentForEmail.startsWith("Could not") || fortuneContentForEmail.startsWith("Fortune details not") || fortuneContentForEmail.startsWith("Your fortune is being prepared")) {
      setEmailSendStatus({ message: "Fortune text is not ready for email.", type: 'error' });
      setIsEmailSent(false);
      return false;
    }
    setEmailSendStatus({ message: '', type: '' });
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailTo: emailToSendTo,
          subject: `Your Business Fortune from Moving Walls!`,
          fortuneText: fortuneContentForEmail,
          fullName: userFullName,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setEmailSendStatus({ message: result.message || 'Failed to send fortune email.', type: 'error' });
        setIsEmailSent(false);
        return false;
      } else {
        setEmailSendStatus({ message: result.message || 'Fortune email sent successfully! Check your inbox.', type: 'success' });
        setIsEmailSent(true);
        return true;
      }
    } catch (err) {
      console.error('Email sending error:', err);
      setEmailSendStatus({ message: `Error during email sending: ${err.message}`, type: 'error' });
      setIsEmailSent(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const attemptAutoProcess = async () => {
      if (isLinkedInFlow && linkedInEmail && !isLeadSaved && !isEmailSent && !isProcessing && !autoProcessAttempted &&
          leadData.fullName && leadData.companyName && leadData.industry && leadData.fortuneText &&
          shareableFortuneText && !shareableFortuneText.startsWith("Your fortune is being prepared")) {
        
        setAutoProcessAttempted(true);
        setIsProcessing(true);
        setError('');
        setSuccessMessage('');
        setEmailSendStatus({ message: '', type: '' });

        let leadSuccessfullySubmitted = false;
        try {
          const response = await fetch('/api/submit-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: leadData.fullName,
              email: linkedInEmail,
              industry: leadData.industry,
              companyName: leadData.companyName,
              fortuneText: leadData.fortuneText,
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            setError(`Lead auto-submission failed: ${result.message || 'Unknown error'}`);
          } else {
            setSuccessMessage('Details saved automatically. Sending email...');
            setIsLeadSaved(true);
            leadSuccessfullySubmitted = true;
          }
        } catch (err) {
          setError(`Error during lead auto-submission: ${err.message}`);
        }

        if (leadSuccessfullySubmitted) {
          const emailActuallySent = await sendFortuneEmail(linkedInEmail, leadData.fullName, shareableFortuneText);
          if (emailActuallySent) {
            setSuccessMessage('');
          } else {
          }
        }
        setIsProcessing(false);
      }
    };
    attemptAutoProcess();
  }, [isLinkedInFlow, linkedInEmail, leadData, shareableFortuneText, isLeadSaved, isEmailSent, isProcessing, autoProcessAttempted, sendFortuneEmail]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');
    setEmailSendStatus({ message: '', type: '' });

    if (!email) {
      setError('Email address is mandatory.');
      return;
    }
    setIsProcessing(true);

    const payload = {
      ...leadData,
      email,
    };

    let leadSuccessfullySubmitted = false;
    try {
      const response = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'Submission failed. Please try again.');
        setIsLeadSaved(false);
      } else {
        setSuccessMessage('Your details have been saved. Sending email...');
        setIsLeadSaved(true);
        leadSuccessfullySubmitted = true;
        localStorage.setItem('fortuneApp_contactMethod', email);
      }
    } catch (err) {
      setError('An unexpected error occurred while saving details. Please check your connection and try again.');
      setIsLeadSaved(false);
    }

    if (leadSuccessfullySubmitted) {
      const emailActuallySent = await sendFortuneEmail(email, leadData.fullName, shareableFortuneText);
      if (emailActuallySent) {
        setSuccessMessage('');
      } else {
      }
    }
    setIsProcessing(false);
  };

  const showForm = !isLinkedInFlow || !linkedInEmail;

  return (
    <div className="min-h-screen bg-mw-dark-navy flex flex-col items-center justify-center p-4 font-roboto">
      <Card className="w-full max-w-lg bg-card text-mw-white shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-wide text-center">Keep Your Fortune & Connect!</CardTitle>
          <CardDescription className="text-mw-white/80 text-center pt-2">
            {isEverythingDone ? "Your details are saved & fortune sent! You can close this window." :
             isProcessing ? "Processing your information..." :
             isLinkedInFlow && linkedInEmail && !autoProcessAttempted ? "We found your email. We'll save your details and send your fortune automatically." :
             "Enter your email to receive your personalized business fortune."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(showForm || (!isLinkedInFlow && !linkedInEmail)) && !isEverythingDone && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-mw-white/90">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-mw-white focus:ring-mw-light-blue"
                  disabled={isProcessing || isEverythingDone || (isLinkedInFlow && linkedInEmail)}
                />
              </div>
              <Button 
                type="submit"
                disabled={isProcessing || isEverythingDone || (isLinkedInFlow && linkedInEmail && !autoProcessAttempted)}
                className="w-full bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker text-mw-dark-navy font-semibold rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : isEverythingDone ? (
                  'Fortune Sent! ✨'
                ) : (
                  'Send My Fortune & Email'
                )}
              </Button>
            </form>
          )}

          {error && !isEverythingDone && (
            <div className="mt-4 flex items-center p-3 text-sm text-red-400 bg-red-900/30 rounded-md border border-red-400/50">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className='flex-grow' style={{ whiteSpace: 'pre-line' }}>{error}</span>
            </div>
          )}
          {successMessage && !isEverythingDone && (
            <div className="mt-4 flex items-center p-3 text-sm text-green-400 bg-green-900/30 rounded-md border border-green-400/50">
              <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className='flex-grow' style={{ whiteSpace: 'pre-line' }}>{successMessage}</span>
            </div>
          )}
          {emailSendStatus.message && !isEverythingDone && (
            <div className={`mt-4 flex items-center p-3 text-sm rounded-md border ${
              emailSendStatus.type === 'success' ? 'text-green-400 bg-green-900/30 border-green-400/50' : 
              emailSendStatus.type === 'error' ? 'text-red-400 bg-red-900/30 border-red-400/50' : ''
            }`}>
              {emailSendStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />}
              <span className='flex-grow'>{emailSendStatus.message}</span>
            </div>
          )}
          {(isLinkedInFlow && linkedInEmail && isProcessing && !isEverythingDone) && (
            <div className="mt-4 flex items-center justify-center p-3 text-sm text-mw-white/90">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span>Saving details and sending your fortune...</span>
            </div>
          )}
          {isEverythingDone && (
            <div className="mt-6 text-center">
              <p className="text-mw-white/80 mt-2">You may now close this window or start a new fortune.</p>
              <Button onClick={() => router.push('/')} className="mt-4 bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker text-mw-dark-navy font-semibold rounded-lg shadow-md hover:opacity-90">
                  Start New Fortune
              </Button>
            </div>
          )}
        </CardContent>
        {!isEverythingDone && (
            <CardFooter className="flex flex-col items-center pt-2 pb-6">
                 {(isLinkedInFlow && linkedInEmail && !autoProcessAttempted && !isProcessing) && (
                    <p className="text-mw-white/80 text-xs text-center">
                        We will automatically save your details and send your fortune.
                    </p>
                )}
            </CardFooter>
        )}
      </Card>
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>
    </div>
  );
}

// Helper: To use this page effectively, ensure that you store the following
// items in localStorage on the previous pages/steps:
// localStorage.setItem('fortuneApp_fullName', 'John Doe');
// localStorage.setItem('fortuneApp_industry', 'Technology');
// localStorage.setItem('fortuneApp_companyName', 'Innovate Corp');
// localStorage.setItem('fortuneApp_fortuneText', 'A great opportunity will arise soon.');
// localStorage.setItem('fortuneApp_structuredFortune', '{"openingLine":"Greetings, John Doe of Innovate Corp!","locationInsight":"📍 Your operations in Technology show strong potential in emerging markets.","audienceOpportunity":"👀 There is a growing audience segment interested in sustainable tech solutions.","engagementForecast":"💥 Expect a significant surge in engagement if you highlight your eco-friendly practices.","transactionsPrediction":"💸 Adopting a clearer value proposition for these solutions could increase transactions by 15-20%.","aiAdvice":"🔮 Leverage AI to personalize outreach to this eco-conscious segment for optimal conversion."}'); 