import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AccessibilityStore {
  fontSize: 'small' | 'medium' | 'normal' | 'large' | 'xlarge';
  colorContrast: 'normal' | 'high' | 'dark' | 'light' | 'cyberpunk' | 'cosmic';
  animations: boolean;
  readingMode: boolean;
  audioMode: boolean;
  focusMode: boolean;
  fontFamily: 'default' | 'opendyslexic' | 'arial' | 'verdana' | 'vazirmatn';
  lineSpacing: 'normal' | 'wide' | 'wider' | 'extra';
  pomodoroEnabled: boolean;
  pomodoroWork: number;
  pomodoroBreak: number;
  reducedDistractions: boolean;
  predictableNavigation: boolean;
  ttsEnabled: boolean;
  ttsSpeed: number;
  reducedMotion: boolean;
  highContrast: boolean;

  updateSettings: (u: Partial<any>) => void;
  resetSettings: () => void;
  applyPreset: (preset: 'focus' | 'predictable' | 'reading' | 'clear' | 'none') => void;
  settings: any;
}

const defaults = {
  fontSize: 'normal' as const,
  colorContrast: 'normal' as const,
  animations: true,
  readingMode: false,
  audioMode: false,
  focusMode: false,
  fontFamily: 'default' as const,
  lineSpacing: 'normal' as const,
  pomodoroEnabled: false,
  pomodoroWork: 25,
  pomodoroBreak: 5,
  reducedDistractions: false,
  predictableNavigation: false,
  ttsEnabled: false,
  ttsSpeed: 1,
  reducedMotion: false,
  highContrast: false,
};

export const useAccessibilityStore = create<AccessibilityStore>()(
  persist(
    (set, get) => ({
      ...defaults,

      updateSettings: (u) =>
        set((state) => {
          const updated: any = { ...state, ...u };
          // Keep reducedMotion and animations in sync
          if ('animations' in u) updated.reducedMotion = !u.animations;
          if ('reducedMotion' in u) updated.animations = !u.reducedMotion;
          // Keep highContrast and colorContrast in sync
          if ('colorContrast' in u) updated.highContrast = u.colorContrast === 'high';
          if ('highContrast' in u) updated.colorContrast = u.highContrast ? 'high' : 'normal';
          return updated;
        }),

      resetSettings: () => set(defaults),

      applyPreset: (preset) =>
        set((state) => {
          const cleanState = {
            ...defaults,
            fontSize: 'normal' as const,
            fontFamily: 'default' as const,
            lineSpacing: 'normal' as const,
            focusMode: false,
            reducedMotion: false,
            highContrast: false,
          };

          switch (preset) {
            case 'focus':
              return {
                ...cleanState,
                focusMode: true,
                reducedMotion: true,
                animations: false,
                pomodoroEnabled: true,
                pomodoroWork: 15,
              };
            case 'predictable':
              return {
                ...cleanState,
                reducedMotion: true,
                animations: false,
                predictableNavigation: true,
                reducedDistractions: true,
              };
            case 'reading':
              return {
                ...cleanState,
                fontFamily: 'opendyslexic' as const,
                lineSpacing: 'extra' as const,
                fontSize: 'large' as const,
                ttsEnabled: true,
                highContrast: true,
                colorContrast: 'high' as const,
              };
            default:
              return cleanState;
          }
        }),

      get settings() {
        const state = get();
        return {
          fontSize: state.fontSize,
          colorContrast: state.colorContrast,
          animations: state.animations,
          readingMode: state.readingMode,
          audioMode: state.audioMode,
          focusMode: state.focusMode,
          fontFamily: state.fontFamily,
          lineSpacing: state.lineSpacing,
          pomodoroEnabled: state.pomodoroEnabled,
          pomodoroWork: state.pomodoroWork,
          pomodoroBreak: state.pomodoroBreak,
          reducedDistractions: state.reducedDistractions,
          predictableNavigation: state.predictableNavigation,
          ttsEnabled: state.ttsEnabled,
          ttsSpeed: state.ttsSpeed,
          reducedMotion: state.reducedMotion,
          highContrast: state.highContrast,
        };
      },
    }),
    {
      name: 'nexora-accessibility-cache',
      partialize: (state) => {
        // Exclude the getter from serialization to prevent any JSON parsing/stringifying issues
        const { settings, ...rest } = state;
        return rest;
      },
    }
  )
);
