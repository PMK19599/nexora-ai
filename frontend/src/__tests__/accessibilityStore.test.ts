import { describe, it, expect, beforeEach } from 'vitest';
import { useAccessibilityStore } from '../stores/accessibilityStore';

describe('accessibilityStore', () => {
  beforeEach(() => {
    useAccessibilityStore.getState().resetSettings();
  });

  describe('default settings', () => {
    it('has correct defaults', () => {
      const state = useAccessibilityStore.getState();
      expect(state.fontSize).toBe('normal');
      expect(state.colorContrast).toBe('normal');
      expect(state.animations).toBe(true);
      expect(state.readingMode).toBe(false);
      expect(state.focusMode).toBe(false);
      expect(state.fontFamily).toBe('default');
      expect(state.lineSpacing).toBe('normal');
      expect(state.pomodoroEnabled).toBe(false);
      expect(state.pomodoroWork).toBe(25);
      expect(state.pomodoroBreak).toBe(5);
      expect(state.ttsEnabled).toBe(false);
      expect(state.ttsSpeed).toBe(1);
      expect(state.reducedMotion).toBe(false);
      expect(state.highContrast).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('updates individual settings', () => {
      useAccessibilityStore.getState().updateSettings({ fontSize: 'large' });
      expect(useAccessibilityStore.getState().fontSize).toBe('large');
    });

    it('syncs reducedMotion when animations is changed', () => {
      useAccessibilityStore.getState().updateSettings({ animations: false });
      expect(useAccessibilityStore.getState().reducedMotion).toBe(true);
    });

    it('syncs animations when reducedMotion is changed', () => {
      useAccessibilityStore.getState().updateSettings({ reducedMotion: true });
      expect(useAccessibilityStore.getState().animations).toBe(false);
    });

    it('syncs highContrast when colorContrast is high', () => {
      useAccessibilityStore.getState().updateSettings({ colorContrast: 'high' });
      expect(useAccessibilityStore.getState().highContrast).toBe(true);
    });

    it('syncs colorContrast when highContrast set to true', () => {
      useAccessibilityStore.getState().updateSettings({ highContrast: true });
      expect(useAccessibilityStore.getState().colorContrast).toBe('high');
    });

    it('syncs colorContrast to normal when highContrast is false', () => {
      useAccessibilityStore.getState().updateSettings({ highContrast: true });
      useAccessibilityStore.getState().updateSettings({ highContrast: false });
      expect(useAccessibilityStore.getState().colorContrast).toBe('normal');
    });
  });

  describe('resetSettings', () => {
    it('restores all settings to defaults', () => {
      useAccessibilityStore.getState().updateSettings({ fontSize: 'xlarge', focusMode: true });
      useAccessibilityStore.getState().resetSettings();
      const state = useAccessibilityStore.getState();
      expect(state.fontSize).toBe('normal');
      expect(state.focusMode).toBe(false);
    });
  });

  describe('applyPreset', () => {
    it('applies ADHD preset correctly', () => {
      useAccessibilityStore.getState().applyPreset('adhd');
      const state = useAccessibilityStore.getState();
      expect(state.focusMode).toBe(true);
      expect(state.reducedMotion).toBe(true);
      expect(state.animations).toBe(false);
      expect(state.pomodoroEnabled).toBe(true);
      expect(state.pomodoroWork).toBe(15);
      expect(state.reducedDistractions).toBe(true);
    });

    it('applies Autism preset correctly', () => {
      useAccessibilityStore.getState().applyPreset('autism');
      const state = useAccessibilityStore.getState();
      expect(state.reducedMotion).toBe(true);
      expect(state.animations).toBe(false);
      expect(state.highContrast).toBe(true);
      expect(state.colorContrast).toBe('high');
      expect(state.predictableNavigation).toBe(true);
      expect(state.reducedDistractions).toBe(true);
    });

    it('applies Dyslexia preset correctly', () => {
      useAccessibilityStore.getState().applyPreset('dyslexia');
      const state = useAccessibilityStore.getState();
      expect(state.fontFamily).toBe('opendyslexic');
      expect(state.lineSpacing).toBe('extra');
      expect(state.fontSize).toBe('large');
      expect(state.ttsEnabled).toBe(true);
      expect(state.highContrast).toBe(true);
      expect(state.colorContrast).toBe('high');
    });

    it('applies clear preset (resets to clean state)', () => {
      useAccessibilityStore.getState().applyPreset('adhd');
      useAccessibilityStore.getState().applyPreset('clear');
      const state = useAccessibilityStore.getState();
      expect(state.focusMode).toBe(false);
      expect(state.reducedMotion).toBe(false);
      expect(state.animations).toBe(true);
    });

    it('applies none preset (resets to clean state)', () => {
      useAccessibilityStore.getState().applyPreset('adhd');
      useAccessibilityStore.getState().applyPreset('none');
      const state = useAccessibilityStore.getState();
      expect(state.focusMode).toBe(false);
      expect(state.pomodoroEnabled).toBe(false);
    });
  });
});
