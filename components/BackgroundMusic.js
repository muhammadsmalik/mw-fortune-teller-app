'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

const BackgroundMusic = () => {
  const { isMuted, toggleMute } = useAudio();
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.3;

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
  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
        audio.muted = isMuted;
        if (isMuted) {
            audio.pause();
            setIsPlaying(false);
        } else {
            if (hasInteracted) {
                audio.play().then(() => setIsPlaying(true)).catch(e => console.error("Failed to play audio on unmute", e));
            }
        }
    }
  }, [isMuted, hasInteracted]);


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

  return (
    <>
      <audio
        ref={audioRef}
        src="/audio/bg-music.mp3"
        preload="auto"
        style={{ display: 'none' }}
      />
      
      <button
        onClick={toggleMute}
        className="fixed top-4 right-4 z-50 bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors duration-200 rounded-full p-3 border border-white/10"
        aria-label={isMuted ? "Unmute all audio" : "Mute all audio"}
        title={isMuted ? "Unmute all audio" : "Mute all audio"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>
      
      {!hasInteracted && (
        <div className="fixed bottom-4 left-4 z-50 bg-black/20 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-white text-sm">
          Click anywhere to enable background music
        </div>
      )}
    </>
  );
};

export default BackgroundMusic; 