'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const BackgroundMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.3; // Set a comfortable background volume
    
    // Try to play when component mounts, but handle autoplay restrictions
    const tryToPlay = async () => {
      if (hasInteracted && !isMuted) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          console.log("Autoplay prevented by browser:", error);
          setIsPlaying(false);
        }
      }
    };

    tryToPlay();
  }, [hasInteracted, isMuted]);

  // Handle user interaction to enable audio
  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const toggleMute = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      // Unmute and play
      setIsMuted(false);
      if (hasInteracted) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("Failed to play audio:", error);
        }
      }
    } else {
      // Mute and pause
      setIsMuted(true);
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/audio/bg-music.mp3"
        preload="auto"
        style={{ display: 'none' }}
      />
      
      {/* Music Control Button */}
      <button
        onClick={toggleMute}
        className="fixed top-4 right-4 z-50 bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors duration-200 rounded-full p-3 border border-white/10"
        aria-label={isMuted ? "Unmute background music" : "Mute background music"}
        title={isMuted ? "Unmute background music" : "Mute background music"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
      
      {/* Initial interaction hint - only show if audio hasn't started yet */}
      {!hasInteracted && (
        <div className="fixed bottom-4 left-4 z-50 bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-white text-sm">
          Click anywhere to enable background music
        </div>
      )}
    </>
  );
};

export default BackgroundMusic; 