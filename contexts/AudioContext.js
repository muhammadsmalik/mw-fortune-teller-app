'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Howler } from 'howler';

/**
 * @name AudioContext
 * @description
 * Provides a centralized audio management system for the entire application.
 * This context creates and manages a single, global Web Audio API AudioContext
 * and a master GainNode (volume control) to ensure all audio sources can be
 * controlled from one place, particularly for a reliable global mute feature.
 */
const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  // useRef is used to hold the AudioContext and GainNode.
  // This prevents re-creation on re-renders and allows direct access.
  const audioSystemRef = useRef({ audioContext: null, masterGain: null });
  // This state is a key part of the solution to ensure components get the
  // initialized AudioContext. It triggers a re-render in consuming components
  // once the audio system is ready.
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * @function initializeAudio
   * @description
   * Creates the global AudioContext and master GainNode.
   * This function is designed to be called upon the first user interaction (e.g., a click)
   * to comply with browser autoplay policies that require a user gesture to start audio.
   * It also handles resuming the AudioContext if it was suspended by the browser.
   */
  const initializeAudio = useCallback(() => {
    if (typeof window !== 'undefined' && !audioSystemRef.current.audioContext) {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const gainNode = context.createGain();
        gainNode.connect(context.destination);
        audioSystemRef.current = { audioContext: context, masterGain: gainNode };
        setIsInitialized(true);
        
        if (context.state === 'suspended') {
            context.resume();
        }
        return audioSystemRef.current;
      } catch (e) {
        console.error("Failed to create global AudioContext", e);
        return null;
      }
    }
    if (audioSystemRef.current.audioContext && audioSystemRef.current.audioContext.state === 'suspended') {
        audioSystemRef.current.audioContext.resume();
    }
    return audioSystemRef.current;
  }, []);

  // This effect synchronizes the global mute state with all audio systems.
  useEffect(() => {
    // Howler.js has its own volume control, which we manage here.
    Howler.volume(isMuted ? 0 : 1);
    
    // The master GainNode for the Web Audio API is controlled here.
    // Setting its gain to 0 effectively mutes any audio routed through it.
    if (audioSystemRef.current.masterGain) {
      const { masterGain, audioContext } = audioSystemRef.current;
      masterGain.gain.setValueAtTime(isMuted ? 0 : 1, audioContext.currentTime);
    }
  }, [isMuted, isInitialized]);

  const toggleMute = () => {
    // When the user clicks the mute button, we ensure the audio system is initialized
    // before toggling the mute state. This is a fallback for the race condition.
    initializeAudio();
    setIsMuted(prevMuted => !prevMuted);
  };

  // The value provided to consuming components.
  const value = {
    isMuted,
    toggleMute,
    audioContext: audioSystemRef.current.audioContext,
    masterGain: audioSystemRef.current.masterGain,
    initializeAudio,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

/**
 * @hook useAudio
 * @description
 * A custom hook to easily access the global audio context from any component.
 * Provides access to the mute state, toggle function, and the core
 * AudioContext and master GainNode instances.
 */
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}; 