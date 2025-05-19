'use client';

import { useState, useEffect, useRef } from 'react';

const AudioPlayer = ({ audioFiles, delayBetweenTracks = 3000, isPlaying }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef(null);

  // Prepend /audio/ to each filename
  const audioSources = audioFiles.map(file => `/audio/${file}`);

  useEffect(() => {
    if (audioRef.current && audioSources.length > 0) {
      audioRef.current.src = audioSources[currentTrackIndex];
      audioRef.current.load(); // Load the new source
      if (isPlaying) { // Only play if isPlaying is true
        audioRef.current.play().catch(error => {
          console.error("Audio play failed (browser restriction or file issue):", error);
          // Consider providing a UI element to manually start playback
        });
      }
    }
  }, [currentTrackIndex, audioSources, isPlaying]); // Added isPlaying to dependency array

  // Effect to handle play/pause when isPlaying prop changes externally
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error("Audio play failed on isPlaying change:", error);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleAudioEnded = () => {
    // Wait for the specified delay, then play the next track
    setTimeout(() => {
      setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % audioSources.length);
    }, delayBetweenTracks);
  };

  if (!audioSources || audioSources.length === 0) {
    // Optionally render nothing or a placeholder if no audio files
    return null; 
  }

  return (
    <audio
      ref={audioRef}
      onEnded={handleAudioEnded}
      // controls // Uncomment to show browser default controls for debugging
      style={{ display: 'none' }} // Hidden by default
      preload="auto" // Helps ensure the audio is ready to play
    />
  );
};

export default AudioPlayer; 