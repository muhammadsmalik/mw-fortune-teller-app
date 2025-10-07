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
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

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

  const [blueprintHtml, setBlueprintHtml] = useState('');
  const [isLinkedInFlow, setIsLinkedInFlow] = useState(false);
  const [linkedInEmail, setLinkedInEmail] = useState('');
  const [autoProcessAttempted, setAutoProcessAttempted] = useState(false);

  const [isEverythingDone, setIsEverythingDone] = useState(false);

  // Extra metadata to persist to Google Sheets
  const [selectedPersona, setSelectedPersona] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [selectedQuestionTexts, setSelectedQuestionTexts] = useState([]);
  const [selectedTarotCards, setSelectedTarotCards] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [linkedinExtras, setLinkedinExtras] = useState({
    profileUrl: '',
    headline: '',
    city: '',
    country: '',
  });

  // Helper to avoid dumping huge payloads in logs
  const summarizeLeadPayload = (p) => ({
    fullName: p.fullName,
    email: p.email,
    industry: p.industry,
    companyName: p.companyName,
    fortuneTextLen: p.fortuneText ? String(p.fortuneText).length : 0,
    flowSource: p.flowSource,
    linkedinProfileUrl: p.linkedinProfileUrl,
    persona: p.persona,
    selectedQuestionIdsCount: Array.isArray(p.selectedQuestionIds) ? p.selectedQuestionIds.length : undefined,
    selectedTarotCardsCount: Array.isArray(p.selectedTarotCards) ? p.selectedTarotCards.length : undefined,
    sessionId: p.sessionId,
  });

  useEffect(() => {
    let initialFullName = localStorage.getItem('fortuneApp_fullName');
    let initialIndustry = localStorage.getItem('fortuneApp_industry');
    let initialCompanyName = localStorage.getItem('fortuneApp_companyName');
    const storedFortuneText = localStorage.getItem('fortuneApp_fortuneText') || 'Your future is bright!';
    const storedBlueprintHtml = localStorage.getItem('blueprintHtml');

    if (storedBlueprintHtml) {
      setBlueprintHtml(storedBlueprintHtml);
    }

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

          // Prepare LinkedIn extras for Sheets
          const publicId = profile.public_identifier;
          const reconstructedUrl = publicId ? `https://www.linkedin.com/in/${publicId}` : '';
          setLinkedinExtras({
            profileUrl: reconstructedUrl,
            headline: profile.occupation || profile.headline || '',
            city: profile.city || '',
            country: profile.country_full_name || '',
          });
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

    // Load selections and session metadata
    try {
      const persona = localStorage.getItem('selectedPersona') || '';
      const qIds = JSON.parse(localStorage.getItem('selectedQuestionIds') || '[]');
      const qTexts = JSON.parse(localStorage.getItem('selectedQuestionTexts') || '[]');
      const tarot = JSON.parse(localStorage.getItem('selectedTarotCards') || '[]');
      setSelectedPersona(persona);
      setSelectedQuestionIds(Array.isArray(qIds) ? qIds : []);
      setSelectedQuestionTexts(Array.isArray(qTexts) ? qTexts : []);
      setSelectedTarotCards(Array.isArray(tarot) ? tarot : []);

      let sid = localStorage.getItem('fortuneSessionId');
      if (!sid) {
        sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('fortuneSessionId', sid);
      }
      setSessionId(sid);
    } catch (e) {
      console.warn('Failed loading selection/session metadata:', e);
    }
  }, []);

  useEffect(() => {
    const fortuneDataString = localStorage.getItem('fortuneData');
    let textToShare = "Your fortune is being prepared for sharing...";
    const movingWallsLink = "Book an appointment here: https://www.movingwalls.com/contact-us/";

    if (fortuneDataString) {
      try {
        const fortune = JSON.parse(fortuneDataString);
        const parts = [];

        // Legacy fortune format
        if (fortune.openingLine) {
          parts.push(fortune.openingLine);
        }

        if (fortune.locationInsight) {
          parts.push(`📍 ${fortune.locationInsight}`);
        }

        if (fortune.audienceOpportunity) {
          parts.push(`👀 ${fortune.audienceOpportunity}`);
        }

        if (fortune.engagementForecast) {
          parts.push(`💥 ${fortune.engagementForecast}`);
        }

        if (fortune.transactionsPrediction) {
          parts.push(`💸 ${fortune.transactionsPrediction}`);
        }

        if (fortune.aiAdvice) {
          parts.push(`🔮 ${fortune.aiAdvice}`);
        }

        if (parts.length > 0) {
          textToShare = parts.join('\n\n');
          textToShare += `\n\n${movingWallsLink}`;
        } else {
          throw new Error("Parsed fortune object was empty or invalid.");
        }

      } catch (e) {
        console.error("Failed to parse fortuneData for sharing:", e);
        textToShare = `Could not retrieve fortune for sharing. Visit us at ${movingWallsLink}`;
      }
    } else {
        textToShare = `Fortune details not available for sharing. Visit us at ${movingWallsLink}`;
    }
    setShareableFortuneText(textToShare);
  }, []);

  useEffect(() => {
    // This effect syncs the clean, shareable text back into the leadData object
    // once it has been processed. This ensures the correct text is sent to the Google Sheet.
    if (shareableFortuneText && !shareableFortuneText.startsWith("Your fortune is being prepared")) {
      setLeadData(prevData => ({
        ...prevData,
        fortuneText: shareableFortuneText
      }));
    }
  }, [shareableFortuneText]);

  const sendFortuneEmail = useCallback(async (emailToSendTo, userFullName, fortuneContentForEmail, blueprintContentForEmail) => {
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
          blueprintHtml: blueprintContentForEmail,
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
          const payload = {
            fullName: leadData.fullName,
            email: linkedInEmail,
            industry: leadData.industry,
            companyName: leadData.companyName,
            fortuneText: leadData.fortuneText,
            flowSource: 'linkedin',
            linkedinProfileUrl: linkedinExtras.profileUrl,
            linkedinHeadline: linkedinExtras.headline,
            linkedinCity: linkedinExtras.city,
            linkedinCountry: linkedinExtras.country,
            persona: selectedPersona || '',
            selectedQuestionIds: selectedQuestionIds,
            selectedQuestionTexts: selectedQuestionTexts,
            selectedTarotCards: selectedTarotCards,
            sessionId,
          };
          console.log('[contact-details] Auto attempt payload', summarizeLeadPayload(payload));
          const response = await fetch('/api/submit-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          console.log('[contact-details] Auto attempt response', response.status, result);
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
          const emailActuallySent = await sendFortuneEmail(linkedInEmail, leadData.fullName, shareableFortuneText, blueprintHtml);
          if (emailActuallySent) {
            setSuccessMessage('');
          } else {
          }
        }
        setIsProcessing(false);
      }
    };
    attemptAutoProcess();
  }, [isLinkedInFlow, linkedInEmail, leadData, shareableFortuneText, isLeadSaved, isEmailSent, isProcessing, autoProcessAttempted, sendFortuneEmail, blueprintHtml]);

  useEffect(() => {
    if (isLinkedInFlow && linkedInEmail && !autoProcessAttempted && leadData.fullName && leadData.industry && leadData.companyName && shareableFortuneText) {
      console.log("Attempting auto-processing for LinkedIn flow...");
      setAutoProcessAttempted(true); // Mark that we've tried
      
      const autoSubmitAndEmail = async () => {
        setIsProcessing(true);
        let leadSubmissionOk = false;
        try {
          const payload2 = {
            ...leadData,
            email: linkedInEmail,
            flowSource: 'linkedin',
            linkedinProfileUrl: linkedinExtras.profileUrl,
            linkedinHeadline: linkedinExtras.headline,
            linkedinCity: linkedinExtras.city,
            linkedinCountry: linkedinExtras.country,
            persona: selectedPersona || '',
            selectedQuestionIds: selectedQuestionIds,
            selectedQuestionTexts: selectedQuestionTexts,
            selectedTarotCards: selectedTarotCards,
            sessionId,
          };
          console.log('[contact-details] Auto submit payload', summarizeLeadPayload(payload2));
          const leadResponse = await fetch('/api/submit-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload2),
          });
          const leadResult = await leadResponse.json().catch(() => ({}));
          console.log('[contact-details] Auto submit response', leadResponse.status, leadResult);
          if (leadResponse.ok) {
            setIsLeadSaved(true);
            leadSubmissionOk = true;
            console.log("Auto lead submission successful.");
          } else {
            const errorData = await leadResponse.json();
            console.error("Auto lead submission failed:", errorData.message);
            // Don't set global error, allow manual attempt
          }
        } catch (e) {
          console.error("Auto lead submission fetch error:", e.message);
          // Don't set global error
        }

        if (leadSubmissionOk) {
          try {
            await sendFortuneEmail(linkedInEmail, leadData.fullName || 'Valued Individual', shareableFortuneText, blueprintHtml);
            console.log("Auto email sending successful.");
            // isEmailSent is set by sendFortuneEmail
          } catch (e) {
            // isEmailSent and emailSendStatus are handled by sendFortuneEmail
            console.error("Auto email sending failed after lead submission.");
          }
        }
        setIsProcessing(false);
      };
      autoSubmitAndEmail();
    }
  }, [isLinkedInFlow, linkedInEmail, autoProcessAttempted, leadData, shareableFortuneText, sendFortuneEmail, blueprintHtml]);

  useEffect(() => {
    if (isLeadSaved && isEmailSent) {
      setIsEverythingDone(true);
    }
  }, [isLeadSaved, isEmailSent]);

  // Removed archetype discovery redirect - user stays on success page

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
      // Extras
      flowSource: isLinkedInFlow ? 'linkedin' : 'manual',
      linkedinProfileUrl: linkedinExtras.profileUrl,
      linkedinHeadline: linkedinExtras.headline,
      linkedinCity: linkedinExtras.city,
      linkedinCountry: linkedinExtras.country,
      persona: selectedPersona || '',
      selectedQuestionIds: selectedQuestionIds,
      selectedQuestionTexts: selectedQuestionTexts,
      selectedTarotCards: selectedTarotCards,
      sessionId,
    };
    console.log('[contact-details] Manual submit payload', summarizeLeadPayload(payload));

    let leadSuccessfullySubmitted = false;
    try {
      const response = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      console.log('[contact-details] Manual submit response', response.status, result);

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
      const emailActuallySent = await sendFortuneEmail(email, leadData.fullName, shareableFortuneText, blueprintHtml);
      if (emailActuallySent) {
        setSuccessMessage('');
      } else {
      }
    }
    setIsProcessing(false);
  };

  const showForm = !isLinkedInFlow || !linkedInEmail;

  if (isEverythingDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-mw-dark-navy to-mw-purple text-white p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-2xl text-center max-w-lg"
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">All Set!</h2>
          <p className="text-lg mb-6">Your fortune has been shared and your details recorded.</p>
          <p className="text-md text-mw-gold mb-8">Thank you for using the MW Fortune Teller!</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 font-semibold px-6 py-3"
          >
            Start New Journey
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mw-dark-navy flex flex-col items-center justify-center p-4 font-roboto">
      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
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
