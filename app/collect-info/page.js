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
import { Mic, MicOff, Loader2 } from 'lucide-react';

export default function CollectInfoScreen() {
  const router = useRouter();
  const [init, setInit] = useState(false);

  const [fullName, setFullName] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // New state for optional fields
  const [geographicFocus, setGeographicFocus] = useState('');
  const [businessObjective, setBusinessObjective] = useState('');

  // --- Voice Input State and Logic ---
  const [mediaRecorder, setMediaRecorder] = useState(null);
  // audioChunks state is kept for potential logging or UI feedback if needed during recording.
  const [audioChunks, setAudioChunks] = useState([]); 
  // collectedChunksRef is used to reliably collect audio data across MediaRecorder events,
  // bypassing potential React state update latencies within event handlers.
  const collectedChunksRef = useRef([]); 
  const [recordingTargetField, setRecordingTargetField] = useState(null); 
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState('');

  // --- Debug Mode State ---
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

  const particlesLoaded = useCallback(async (container) => {
    // console.log("Particles container loaded", container);
  }, []);

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

  // Handles the initiation of audio recording for a specific input field.
  const startRecording = async (fieldName) => {
    setTranscriptionError('');
    if (isRecording || isTranscribing) return; // Prevent multiple recordings or recording during transcription.

    // Clear previously collected audio data.
    collectedChunksRef.current = [];
    setAudioChunks([]); 

    try {
      // Request microphone access from the user.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setRecordingTargetField(fieldName);
      setIsRecording(true);

      // Event handler for when audio data becomes available.
      recorder.ondataavailable = (event) => {
        console.log('Audio chunk received, size:', event.data.size);
        if (event.data.size > 0) {
          collectedChunksRef.current.push(event.data); // Store chunk in ref.
          setAudioChunks(prev => [...prev, event.data]); // Update state for logging.
        }
      };

      // Event handler for when recording stops.
      recorder.onstop = async () => {
        console.log('Recording stopped (onstop). State chunks collected:', audioChunks.length, 'Ref chunks collected:', collectedChunksRef.current.length);
        console.log('Total size from ref being sent:', collectedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0));
        
        setIsRecording(false);
        setIsTranscribing(true);
        // Create a Blob from the collected audio chunks (from ref for reliability).
        const audioBlob = new Blob(collectedChunksRef.current, { type: 'audio/webm' }); 
        
        const formData = new FormData();
        formData.append('audio', audioBlob, `${fieldName}_recording.webm`);

        try {
          // Send audio data to the backend for transcription.
          const response = await fetch('/api/transcribe-audio', {
            method: 'POST',
            body: formData,
          });
          const result = await response.json();

          if (response.ok && result.transcript !== undefined) {
            const transcribedText = result.transcript;
            // Update the corresponding input field with the transcribed text.
            switch (fieldName) {
              case 'geographicFocus': setGeographicFocus(transcribedText); break;
              case 'businessObjective': setBusinessObjective(transcribedText); break;
              default: break;
            }
          } else {
            console.error("Transcription API error:", result.error, result.details);
            setTranscriptionError(result.error || 'Failed to transcribe. Please try again.');
          }
        } catch (err) {
          console.error("Transcription fetch error:", err);
          setTranscriptionError('Network error during transcription. Please try again.');
        } finally {
          setIsTranscribing(false);
          setRecordingTargetField(null);
          // Important: Stop all tracks on the media stream to release the microphone.
          stream.getTracks().forEach(track => track.stop());
        }
      };
      recorder.start(); // Start the recording process.
    } catch (err) {
      console.error("Error starting recording:", err);
      setTranscriptionError('Microphone access denied or an error occurred.');
      setIsRecording(false);
      setRecordingTargetField(null);
    }
  };

  // Stops the current audio recording if one is active.
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
  };

  // Toggles recording on/off for a given field or stops if already recording for that field.
  const handleVoiceInput = (fieldName) => {
    if (isRecording && recordingTargetField === fieldName) {
      stopRecording();
    } else if (!isRecording && !isTranscribing) {
      // Only start a new recording if not currently recording or transcribing.
      startRecording(fieldName);
    }
  };

  const handleProceed = async () => {
    if (!fullName || !industryType || !companyName) {
      alert("Please fill in all required fields: Full Name, Industry Type, and Company Name.");
      return;
    }
    setIsGenerating(true); // Disable button

    try {
      console.log("Collected Info for localStorage:", { fullName, industryType, companyName, geographicFocus, businessObjective });
      const userInfo = {
        fullName,
        industryType,
        companyName,
        geographicFocus,
        businessObjective,
        // Ensure debugProvider is null if not in debug mode or not set, to avoid sending undefined
        debugProvider: (isDebugMode && debugForceProvider) ? debugForceProvider : null
      };
      localStorage.setItem('userInfoForFortune', JSON.stringify(userInfo));

      // These are still useful for other pages like contact-details
      localStorage.setItem('fortuneApp_fullName', fullName);
      localStorage.setItem('fortuneApp_industry', industryType);
      localStorage.setItem('fortuneApp_companyName', companyName);
      if (geographicFocus) {
        localStorage.setItem('fortuneApp_geographicFocus', geographicFocus);
      } else {
        localStorage.removeItem('fortuneApp_geographicFocus'); // Clean up if empty
      }
      if (businessObjective) {
        localStorage.setItem('fortuneApp_businessObjective', businessObjective);
      } else {
        localStorage.removeItem('fortuneApp_businessObjective'); // Clean up if empty
      }

      router.push('/generating-fortune');
      // setIsGenerating will be reset if the user navigates back.
      // No need to set to false here as we are navigating away.

    } catch (error) {
      console.error("Error preparing for fortune generation:", error);
      alert('An error occurred while preparing your data. Please try again.');
      setIsGenerating(false); // Re-enable button on error to allow retry
    }
  };

  if (!init) {
    return null; 
  }

  // Renders the microphone button with appropriate icon based on recording/transcribing state.
  const renderMicButton = (fieldName) => (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="ml-2 border-mw-light-blue text-mw-light-blue hover:bg-mw-light-blue/10 disabled:opacity-50"
      onClick={() => handleVoiceInput(fieldName)}
      // Disable button if: actively recording for another field, transcribing for another field, or main form is generating.
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mw-dark-navy text-mw-white p-4 relative isolate">
      <Particles
        id="tsparticles-collect-info" 
        particlesLoaded={particlesLoaded}
        options={particleOptions}
        className="absolute top-0 left-0 w-full h-full z-[-1]"
      />
      
      {/* Moving Walls Logo - Bottom Left */}
      <div className="absolute bottom-6 left-6 flex items-center text-sm text-mw-white/70">
        <img src="/MW-logo-web.svg" alt="Moving Walls Logo" className="h-6 w-auto mr-2" />
        <span className="font-semibold">Moving Walls</span>
      </div>

      <Card className="bg-card rounded-lg shadow-lg w-full max-w-lg"> {/* Adjusted max-w for potentially more content */}
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
            <div className="flex items-center">
              <Input 
                id="fullName" 
                type="text" 
                placeholder="e.g., Alex Chan" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring flex-grow"
                disabled={isTranscribing && recordingTargetField === 'fullName'} // Retained disabled state for safety, though mic is removed.
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="industryType" className="text-mw-white/90">Industry Type *</Label>
            <Select value={industryType} onValueChange={setIndustryType} disabled={isRecording || isTranscribing || isGenerating}>
              <SelectTrigger id="industryType" className="bg-input text-mw-white border-border focus:ring-ring">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border"> {/* Ensure popover also uses themed background */}
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
            <div className="flex items-center">
              <Input 
                id="companyName" 
                type="text" 
                placeholder="e.g., Innovate Solutions Ltd." 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="bg-input text-mw-white placeholder:text-mw-white/50 border-border focus:ring-ring flex-grow"
                disabled={isTranscribing && recordingTargetField === 'companyName'} // Retained disabled state for safety, though mic is removed.
              />
            </div>
          </div>

          {/* Optional Fields Section */}
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
            <Label htmlFor="businessObjective" className="text-mw-white/90">What's your main business goal right now? (Optional)</Label>
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
      </Card>
    </div>
  );
} 