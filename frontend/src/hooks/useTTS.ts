import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

export function useTTS() {
  const settings = useAccessibilityStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = settings.ttsSpeed || 1;
    utter.pitch = 1;
    utter.volume = 1;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) 
      || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utter.voice = englishVoice;
    
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [settings.ttsSpeed]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback((text: string) => {
    if (isSpeaking) stop();
    else speak(text);
  }, [isSpeaking, speak, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  return { speak, stop, toggle, isSpeaking, ttsEnabled: settings.ttsEnabled };
}
