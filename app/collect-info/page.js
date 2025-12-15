'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Loader2, Mic, MicOff, ArrowLeft, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import QrScanner from 'qr-scanner';
import Image from 'next/image';

export default function CollectInfoScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Flow control state: 'linkedin' or 'manual'
  const [currentFlow, setCurrentFlow] = useState('linkedin'); // Default to LinkedIn flow

  // --- LinkedIn Flow State ---
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const fileInputRef = useRef(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // --- Manual Input Flow State ---
  const [fullName, setFullName] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [geographicFocus, setGeographicFocus] = useState('');
  const [businessObjective, setBusinessObjective] = useState('');

  // --- Voice Input State and Logic (for Manual Flow) ---
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const collectedChunksRef = useRef([]);
  const [audioChunks, setAudioChunks] = useState([]); // Kept for potential logging
  const [recordingTargetField, setRecordingTargetField] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState('');

  // --- Debug Mode State (for Manual Flow) ---
  const [debugForceProvider, setDebugForceProvider] = useState(null);
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === "true";

  // Particles engine initialization
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container) => {}, []);
  const particleOptions = useMemo(() => ({
    particles: {
      number: { value: 40, density: { enable: true, value_area: 800 } },
      color: { value: ["#FFFFFF", "#5BADDE"] },
      shape: { type: "circle" },
      opacity: { value: 0.3, random: true, anim: { enable: true, speed: 0.6, opacity_min: 0.1, sync: false } },
      size: { value: { min: 1, max: 3 }, random: true },
      move: { enable: true, speed: 0.6, direction: "none", random: true, straight: false, outModes: { default: "out" }, bounce: false },
    },
    interactivity: {
      detect_on: "canvas",
      events: { onhover: { enable: false }, onclick: { enable: false }, resize: true },
    },
    detectRetina: true,
  }), []);

  // --- LinkedIn Flow Helpers ---
  function normalizeLinkedInUrl(url) {
    try {
      const parsed = new URL(url.trim());
      if (parsed.hostname !== 'www.linkedin.com') return null;
      const match = parsed.pathname.match(/^\/in\/([A-Za-z0-9\-_%]+)\/?$/);
      if (!match) return null;
      const username = match[1];
      return `https://www.linkedin.com/in/${username}`;
    } catch {
      return null;
    }
  }

  const isValidLinkedIn = (url) => {
    return !!normalizeLinkedInUrl(url);
  };

  // New function to handle LinkedIn flow initiation and redirection
  const initiateLinkedInFlowAndRedirect = async (urlToProcess) => {
    if (isGenerating) return; // Prevent re-entry if already processing
    setIsGenerating(true);
    setQrError(''); // Clear any previous QR errors as we are proceeding

    if (!isValidLinkedIn(urlToProcess)) {
      // This alert might be aggressive if called from auto-scan. Consider setQrError.
      setQrError('Yikes! That URL isn\'t passing the vibe check. Make sure it\'s a real LinkedIn profile.');
      setIsGenerating(false);
      return;
    }

    try {
      localStorage.setItem('userLinkedInProfile', urlToProcess.trim());
      localStorage.setItem('forceRefreshLinkedInData', 'true'); // Signal a fresh fetch
      // Clear manual form data if proceeding with LinkedIn
      localStorage.removeItem('userInfoForFortune');
      localStorage.removeItem('fortuneApp_fullName');
      localStorage.removeItem('fortuneApp_industry');
      localStorage.removeItem('fortuneApp_companyName');
      localStorage.removeItem('fortuneApp_geographicFocus');
      localStorage.removeItem('fortuneApp_businessObjective');

      router.push('/generating-fortune');
    } catch (error) {
      console.error("Error during LinkedIn flow initiation:", error);
      setQrError('A mystical mishap occurred! Please try again, or use the button below.');
      setIsGenerating(false); // Reset on error
    }
  };

  const handleScan = (result) => {
    if (isGenerating) return; // Prevent re-entry if already processing scan/proceed

    console.log('QR Scanner raw result:', result);
    if (result && Array.isArray(result) && result.length > 0) {
      const value = result[0]?.rawValue || result[0]?.value || result[0];
      const normalized = typeof value === 'string' ? normalizeLinkedInUrl(value) : null;
      if (normalized) {
        setLinkedinUrl(normalized); // Update UI input for visibility
        // setQrError(''); // Moved to initiateLinkedInFlowAndRedirect
        initiateLinkedInFlowAndRedirect(normalized); // Auto-proceed
      } else {
        setQrError('That QR code\'s having an identity crisis. Got a LinkedIn one?');
      }
    }
  };

  // --- QR Image Upload Handler ---
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    setQrError('');

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const normalized = normalizeLinkedInUrl(result.data);

      if (normalized) {
        setLinkedinUrl(normalized);
        initiateLinkedInFlowAndRedirect(normalized);
      } else {
        setQrError('That QR code\'s having an identity crisis. Got a LinkedIn one?');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      setQrError('Couldn\'t read that QR code. Try a clearer image or paste your LinkedIn URL below.');
    } finally {
      setIsProcessingUpload(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --- Manual Flow Voice Input Helpers ---
  const startRecording = async (fieldName) => {
    setTranscriptionError('');
    if (isRecording || isTranscribing) return;

    collectedChunksRef.current = [];
    setAudioChunks([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setRecordingTargetField(fieldName);
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          collectedChunksRef.current.push(event.data);
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);
        const audioBlob = new Blob(collectedChunksRef.current, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('audio', audioBlob, `${fieldName}_recording.webm`);

        try {
          const response = await fetch('/api/transcribe-audio', {
            method: 'POST',
            body: formData,
          });
          const result = await response.json();

          if (response.ok && result.transcript !== undefined) {
            const transcribedText = result.transcript;
            switch (fieldName) {
              case 'geographicFocus': setGeographicFocus(transcribedText); break;
              case 'businessObjective': setBusinessObjective(transcribedText); break;
              default: break;
            }
          } else {
            setTranscriptionError(result.error || 'Failed to transcribe. Please try again.');
          }
        } catch (err) {
          setTranscriptionError('Network error during transcription. Please try again.');
        } finally {
          setIsTranscribing(false);
          setRecordingTargetField(null);
          stream.getTracks().forEach(track => track.stop());
        }
      };
      recorder.start();
    } catch (err) {
      setTranscriptionError('Microphone access denied or an error occurred.');
      setIsRecording(false);
      setRecordingTargetField(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  };

  const handleVoiceInput = (fieldName) => {
    if (isRecording && recordingTargetField === fieldName) {
      stopRecording();
    } else if (!isRecording && !isTranscribing) {
      startRecording(fieldName);
    }
  };

  const renderMicButton = (fieldName) => (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="ml-2 border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10 disabled:opacity-50"
      onClick={() => handleVoiceInput(fieldName)}
      disabled={(isRecording && recordingTargetField !== fieldName) || (isTranscribing && recordingTargetField !== fieldName) || isGenerating}
    >
      {isTranscribing && recordingTargetField === fieldName ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isRecording && recordingTargetField === fieldName ? (
        <MicOff className="h-5 w-5 text-red-500" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );

  // --- Combined Proceed Handler ---
  const handleProceed = async () => {
    // For LinkedIn flow, this button is now a fallback or for manual URL entry
    if (currentFlow === 'linkedin') {
      // We call the same refactored function
      await initiateLinkedInFlowAndRedirect(linkedinUrl);
    } else if (currentFlow === 'manual') {
      // Manual flow logic remains here as it doesn't auto-trigger
      setIsGenerating(true);
      if (!fullName || !industryType || !companyName) {
        alert("Please fill in all required fields: Full Name, Industry Type, and Company Name.");
        setIsGenerating(false);
        return;
      }
      const userInfo = {
        fullName,
        industryType,
        companyName,
        geographicFocus,
        businessObjective,
        debugProvider: debugForceProvider,
      };
      localStorage.setItem('userInfoForFortune', JSON.stringify(userInfo));
      // Clear LinkedIn specific data if manual flow is chosen
      localStorage.removeItem('userLinkedInProfile');
      localStorage.removeItem('fetchedLinkedInData');
      localStorage.removeItem('forceRefreshLinkedInData');
      localStorage.removeItem('pendingFortuneRequestBody');
      // Also clear any residual data from a previous LinkedIn or manual flow run
      localStorage.removeItem('fortuneApp_fullName');
      localStorage.removeItem('fortuneApp_industry');
      localStorage.removeItem('fortuneApp_companyName');
      localStorage.removeItem('fortuneApp_geographicFocus');
      localStorage.removeItem('fortuneApp_businessObjective');
      localStorage.removeItem('fortuneData');

      router.push('/fortune-journey');
    }
  };

  if (!init) return null;

  const renderLinkedInFlow = () => (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
          Your Digital Destiny Awaits!
        </CardTitle>
        <CardDescription className="text-mw-white/80 text-sm sm:text-base pt-2">
          Scan your LinkedIn QR code to spark your future.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6 flex flex-col items-center">
        <div className="w-full max-w-xs sm:max-w-sm rounded-lg overflow-hidden">
          <Scanner
            onScan={handleScan}
            onError={() => setQrError('Looks like the camera\'s on a coffee break! Grant camera access or upload your QR manually to continue the magic.')}
            styles={{ container: { width: '100%' }, video: { width: '100%', transform: "scaleX(-1)" } }}
            options={{ delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 500 }}
          />
        </div>

        {/* Upload QR Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingUpload || isGenerating}
          className="mt-2 border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10"
        >
          {isProcessingUpload ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
          ) : (
            <><Upload className="mr-2 h-4 w-4" /> Upload QR Image</>
          )}
        </Button>

        {qrError && <div className="text-red-400 text-xs mt-2 text-center">{qrError}</div>}

        <div className="w-full max-w-xs sm:max-w-sm mt-4">
          <p className="text-mw-white/70 text-sm text-center mb-2">Or paste your LinkedIn profile URL:</p>
          <Input
            type="url"
            placeholder="https://www.linkedin.com/in/yourprofile"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring"
          />
        </div>

        <div className="text-xs text-mw-white/70 mt-4 text-center px-2">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="font-semibold text-sm text-mw-light-blue hover:text-mw-gold flex items-center justify-center mx-auto gap-1 transition-colors"
          >
            Can&apos;t find your LinkedIn QR? Here&apos;s your treasure map
            {showInstructions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showInstructions && (
            <ol className="list-decimal list-inside text-left mx-auto inline-block text-mw-white/80 mt-2">
              <li>Open the LinkedIn app on your phone.</li>
              <li>Tap the search bar at the top.</li>
              <li>Tap the QR icon on the right.</li>
              <li>Choose &quot;My Code&quot; to display your QR.</li>
            </ol>
          )}
        </div>
        <div className="mt-4 text-center">
          <p className="text-mw-white/70 text-sm">Don&apos;t have access to LinkedIn? No worries.</p>
          <Button variant="link" onClick={() => setCurrentFlow('manual')} className="text-mw-light-blue">
            Tap Here to Enter details manually.
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center pt-6">
        <Button
          onClick={handleProceed}
          disabled={isGenerating || !isValidLinkedIn(linkedinUrl)}
          size="lg"
          className="w-full px-10 py-7 text-xl font-bold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg transform transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Tuning into your destiny…</>
          ) : (
            'Let the Magic Begin!'
          )}
        </Button>
      </CardFooter>
    </>
  );

  const renderManualFlow = () => (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-mw-white font-bold tracking-wide text-2xl sm:text-3xl">
          A Glimpse Into Your World...
        </CardTitle>
        <CardDescription className="text-mw-white/80 text-sm sm:text-base pt-2">
          To tailor your fortune, please share a few details. You can type or use the microphone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {transcriptionError && (
          <div className="p-3 bg-red-900/30 text-red-400 border border-red-500/50 rounded-md text-sm">
            <p className="font-semibold">Voice Input Error:</p>
            <p>{transcriptionError}</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-mw-white/90">Full Name *</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="e.g., Alex Chan"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring flex-grow"
            disabled={isTranscribing && recordingTargetField === 'fullName'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industryType" className="text-mw-white/90">Industry Type *</Label>
          <Select value={industryType} onValueChange={setIndustryType} disabled={isRecording || isTranscribing || isGenerating}>
            <SelectTrigger id="industryType" className="bg-input text-mw-white border-border focus:ring-ring">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="technology" className="text-mw-white hover:bg-mw-light-blue/20">Technology</SelectItem>
              <SelectItem value="finance" className="text-mw-white hover:bg-mw-light-blue/20">Finance</SelectItem>
              <SelectItem value="healthcare" className="text-mw-white hover:bg-mw-light-blue/20">Healthcare</SelectItem>
              <SelectItem value="retail" className="text-mw-white hover:bg-mw-light-blue/20">Retail</SelectItem>
              <SelectItem value="e-commerce" className="text-mw-white hover:bg-mw-light-blue/20">E-commerce</SelectItem>
              <SelectItem value="manufacturing" className="text-mw-white hover:bg-mw-light-blue/20">Manufacturing</SelectItem>
              <SelectItem value="consulting" className="text-mw-white hover:bg-mw-light-blue/20">Consulting</SelectItem>
              <SelectItem value="media" className="text-mw-white hover:bg-mw-light-blue/20">Media & Entertainment</SelectItem>
              <SelectItem value="real_estate" className="text-mw-white hover:bg-mw-light-blue/20">Real Estate</SelectItem>
              <SelectItem value="other" className="text-mw-white hover:bg-mw-light-blue/20">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-mw-white/90">Company Name *</Label>
          <Input
            id="companyName"
            type="text"
            placeholder="e.g., Innovate Solutions Ltd."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring flex-grow"
            disabled={isTranscribing && recordingTargetField === 'companyName'}
          />
        </div>
        <div className="pt-4 space-y-2">
          <p className="text-sm text-mw-white/70 italic text-center">
            Optional: Sharing more details below will make your fortune even more personalized!
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="geographicFocus" className="text-mw-white/90">Where does your business primarily operate or focus its efforts? (Optional)</Label>
          <div className="flex items-center">
            <Input
              id="geographicFocus"
              type="text"
              placeholder="e.g., New York City, Southeast Asia"
              value={geographicFocus}
              onChange={(e) => setGeographicFocus(e.target.value)}
              className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring flex-grow"
              disabled={isTranscribing && recordingTargetField === 'geographicFocus'}
            />
            {renderMicButton('geographicFocus')}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessObjective" className="text-mw-white/90">What&apos;s your main business goal right now? (Optional)</Label>
          <div className="flex items-center">
            <Textarea
              id="businessObjective"
              placeholder="e.g., Increase brand awareness, Launch new product"
              value={businessObjective}
              onChange={(e) => setBusinessObjective(e.target.value)}
              className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring flex-grow min-h-[60px] resize-none"
              rows={2}
              disabled={isTranscribing && recordingTargetField === 'businessObjective'}
            />
            {renderMicButton('businessObjective')}
          </div>
        </div>
        <Button variant="link" onClick={() => setCurrentFlow('linkedin')} className="text-mw-light-blue mt-4 text-center w-full">
          Have a LinkedIn QR? Scan it instead.
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col items-center pt-6">
        {isDebugMode && (
          <div className="mb-4 p-3 border border-yellow-500/50 bg-yellow-900/30 rounded-md w-full">
            <p className="text-center text-yellow-400 text-sm font-semibold mb-2">DEBUG MODE ACTIVE</p>
            <div className="flex justify-center space-x-2">
              <Button
                variant={debugForceProvider === 'GEMINI' ? "default" : "outline"}
                size="sm"
                onClick={() => setDebugForceProvider(prev => prev === 'GEMINI' ? null : 'GEMINI')}
                className={debugForceProvider === 'GEMINI' ? "bg-green-500 hover:bg-green-600 text-white" : "border-green-500 text-green-400 hover:bg-green-900/50"}
                disabled={isGenerating}
              >
                Force Gemini
              </Button>
              <Button
                variant={debugForceProvider === 'OPENAI' ? "default" : "outline"}
                size="sm"
                onClick={() => setDebugForceProvider(prev => prev === 'OPENAI' ? null : 'OPENAI')}
                className={debugForceProvider === 'OPENAI' ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-blue-500 text-blue-400 hover:bg-blue-900/50"}
                disabled={isGenerating}
              >
                Force OpenAI
              </Button>
            </div>
            {debugForceProvider && <p className="text-center text-yellow-300 mt-2 text-xs">Forcing: {debugForceProvider}</p>}
          </div>
        )}
        <Button
          onClick={handleProceed}
          disabled={isGenerating || isRecording || isTranscribing || !fullName || !industryType || !companyName}
          size="lg"
          className="w-full px-10 py-7 text-xl font-bold bg-gradient-to-r from-[#FEDA24] to-[#FAAE25] text-mw-dark-navy hover:opacity-90 rounded-lg shadow-lg transform transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Crafting Your Destiny...</>
          ) : (
            'Generate My Fortune!'
          )}
        </Button>
      </CardFooter>
    </>
  );


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      <Particles
        id="tsparticles-collect-info"
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />
      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-20 bg-mw-dark-navy/50 text-mw-white hover:bg-mw-dark-navy/80 border-mw-light-blue/50"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <Image src="/MW-logo-web.svg" alt="Moving Walls Logo" width={24} height={24} className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>
      <Card className="bg-card rounded-lg shadow-lg w-full max-w-lg">
        {currentFlow === 'linkedin' ? renderLinkedInFlow() : renderManualFlow()}
      </Card>
    </div>
  );
} 