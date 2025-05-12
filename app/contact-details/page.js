'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, MessageCircleMore, Loader2, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';

export default function ContactDetailsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shareableFortuneText, setShareableFortuneText] = useState('Your fortune is being prepared for sharing...');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');

  // State for data that would typically come from previous steps/global state
  const [leadData, setLeadData] = useState({
    fullName: '',
    industry: '',
    companyName: '',
    fortuneText: '',
  });

  useEffect(() => {
    // Simulate retrieving data from localStorage (replace with actual state management)
    const storedFullName = localStorage.getItem('fortuneApp_fullName') || 'Test User';
    const storedIndustry = localStorage.getItem('fortuneApp_industry') || 'Tech';
    const storedCompanyName = localStorage.getItem('fortuneApp_companyName') || 'TestCo';
    const storedFortuneText = localStorage.getItem('fortuneApp_fortuneText') || 'Your future is bright!';
    
    setLeadData({
      fullName: storedFullName,
      industry: storedIndustry,
      companyName: storedCompanyName,
      fortuneText: storedFortuneText,
    });
  }, []);

  useEffect(() => {
    const structuredFortuneString = localStorage.getItem('fortuneApp_structuredFortune');
    let textToShare = "Your fortune is being prepared for sharing...";

    if (structuredFortuneString) {
      try {
        const structuredFortune = JSON.parse(structuredFortuneString);
        let parts = [];
        if (structuredFortune.openingLine) parts.push(structuredFortune.openingLine);
        
        // Remove emojis from shareable text for better cross-platform compatibility
        if (structuredFortune.locationInsight) parts.push(structuredFortune.locationInsight.replace('📍', '').trim());
        if (structuredFortune.audienceOpportunity) parts.push(structuredFortune.audienceOpportunity.replace('👀', '').trim());
        if (structuredFortune.engagementForecast) parts.push(structuredFortune.engagementForecast.replace('💥', '').trim());
        if (structuredFortune.transactionsPrediction) parts.push(structuredFortune.transactionsPrediction.replace('💸', '').trim());
        if (structuredFortune.aiAdvice) parts.push(structuredFortune.aiAdvice.replace('🔮', '').trim());
        
        textToShare = parts.join('\n\n');
        textToShare += "\n\nI'd love to book a meeting to learn more...";

      } catch (e) {
        console.error("Failed to parse structured fortune for sharing:", e);
        const htmlFortune = localStorage.getItem('fortuneApp_fortuneText');
        if (htmlFortune) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlFortune;
          textToShare = (tempDiv.textContent || tempDiv.innerText || "").replace(/\n\s*\n/g, '\n\n').trim() + "\n\nI'd love to book a meeting to learn more...";
        } else {
          textToShare = "Could not retrieve fortune for sharing.";
        }
      }
    } else {
      const htmlFortune = localStorage.getItem('fortuneApp_fortuneText');
      if (htmlFortune) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlFortune;
        textToShare = (tempDiv.textContent || tempDiv.innerText || "").replace(/\n\s*\n/g, '\n\n').trim() + "\n\nI'd love to book a meeting to learn more...";
      } else {
        textToShare = "Fortune details not available for sharing.";
      }
    }
    setShareableFortuneText(textToShare);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Email address is mandatory.');
      return;
    }

    setIsLoading(true);

    const payload = {
      ...leadData,
      email,
      phoneNumber,
    };

    try {
      const response = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'Submission failed. Please try again.');
        console.error('Submission error details:', result.details);
      } else {
        setSuccessMessage(result.message || 'Your details have been saved!');
        // Clear form or redirect
        setEmail('');
        setPhoneNumber('');
        // Optional: store contact method for thank you page
        localStorage.setItem('fortuneApp_contactMethod', email);
        router.push('/thank-you'); // Navigate to thank you page on success
      }
    } catch (err) {
      console.error('Network or other error:', err);
      setError('An unexpected error occurred. Please check your connection and try again.');
    }
    setIsLoading(false);
  };

  const handleShareWhatsApp = () => {
    if (!shareableFortuneText || shareableFortuneText.startsWith("Could not") || shareableFortuneText.startsWith("Fortune details not") || shareableFortuneText.startsWith("Your fortune is being prepared")) {
      alert("Fortune text is not available to share yet. Please wait a moment.");
      return;
    }
    console.log("Original shareableFortuneText for WhatsApp:", shareableFortuneText);
    const message = encodeURIComponent(shareableFortuneText);
    const phoneNumber = "601131412766";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    console.log("Generated WhatsApp URL:", whatsappUrl);
    window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = () => {
    if (!shareableFortuneText || shareableFortuneText.startsWith("Could not") || shareableFortuneText.startsWith("Fortune details not") || shareableFortuneText.startsWith("Your fortune is being prepared")) {
      alert("Fortune text is not available to share yet. Please wait a moment.");
      return;
    }
    const subject = encodeURIComponent("My Business Fortune from Moving Walls!");
    const body = encodeURIComponent(shareableFortuneText);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleShareViaQrCode = () => {
    if (!shareableFortuneText || shareableFortuneText.startsWith("Could not") || shareableFortuneText.startsWith("Fortune details not") || shareableFortuneText.startsWith("Your fortune is being prepared")) {
      alert("Fortune text is not available to share yet. Please wait a moment.");
      return;
    }
    const phoneNumber = "601131412766"; // Same number as direct WhatsApp share
    const message = encodeURIComponent(shareableFortuneText);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    setQrCodeValue(whatsappUrl);
    setIsQrModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-mw-dark-navy flex flex-col items-center justify-center p-4 font-roboto">
      <Card className="w-full max-w-lg bg-card text-mw-white shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-wide text-center">Keep Your Fortune & Connect!</CardTitle>
          <CardDescription className="text-mw-white/80 text-center pt-2">
            Enter your details to receive your fortune and learn how Moving Walls can help you achieve it. (Email is mandatory)
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-mw-white/90">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1 555 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-slate-800 border-slate-700 text-mw-white focus:ring-mw-light-blue"
              />
            </div>

            {error && (
              <div className="flex items-center p-3 text-sm text-red-400 bg-red-900/30 rounded-md border border-red-400/50">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className='flex-grow'>{error}</span>
              </div>
            )}
            {successMessage && !error && (
              <div className="flex items-center p-3 text-sm text-green-400 bg-green-900/30 rounded-md border border-green-400/50">
                <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className='flex-grow'>{successMessage} - Redirecting...</span>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-mw-light-blue to-mw-gradient-blue-darker text-mw-dark-navy font-semibold rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
              ) : (
                'Send My Fortune'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-6">
          <p className="text-mw-white/70 text-sm mb-3">Share Your Insight:</p>
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              className="border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10 hover:text-mw-light-blue"
              onClick={handleShareEmail}
              disabled={!shareableFortuneText || shareableFortuneText.startsWith("Could not") || shareableFortuneText.startsWith("Fortune details not") || shareableFortuneText.startsWith("Your fortune is being prepared")}
            >
              <Mail className="mr-2 h-5 w-5" /> Email
            </Button>
            <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10 hover:text-mw-light-blue"
                  onClick={handleShareViaQrCode}
                  disabled={!shareableFortuneText || shareableFortuneText.startsWith("Could not") || shareableFortuneText.startsWith("Fortune details not") || shareableFortuneText.startsWith("Your fortune is being prepared")}
                >
                  <QrCode className="mr-2 h-5 w-5" /> WhatsApp QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-mw-white">
                <DialogHeader>
                  <DialogTitle className="text-mw-light-blue">Share via WhatsApp QR</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                  {qrCodeValue ? (
                    <QRCodeSVG value={qrCodeValue} size={256} bgColor="#1e293b" fgColor="#FFFFFF" level="H" className="rounded-lg" />
                  ) : (
                    <p>Generating QR code...</p>
                  )}
                  <p className="mt-4 text-sm text-mw-white/80 text-center">
                    Scan this QR code with your phone to share the fortune on WhatsApp.
                  </p>
                </div>
                <DialogFooter className="sm:justify-center">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" className="bg-mw-light-blue text-mw-dark-navy hover:bg-mw-light-blue/90">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      </Card>
      <p className="text-mw-white/70 text-xs mt-8">Moving Walls Logo</p>
    </div>
  );
}

// Helper: To use this page effectively, ensure that you store the following
// items in localStorage on the previous pages/steps:
// localStorage.setItem('fortuneApp_fullName', 'John Doe');
// localStorage.setItem('fortuneApp_industry', 'Technology');
// localStorage.setItem('fortuneApp_companyName', 'Innovate Corp');
// localStorage.setItem('fortuneApp_fortuneText', 'A great opportunity will arise soon.'); 