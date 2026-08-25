import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AccessibilityLifecycleWrapper } from '../App';
import { useAccessibilityStore } from '../stores/accessibilityStore';
import React from 'react';

describe('AccessibilityLifecycleWrapper (DOM integration)', () => {
  beforeEach(() => {
    document.body.className = '';
    document.documentElement.className = '';
    useAccessibilityStore.getState().resetSettings();
  });

  afterEach(() => {
    document.body.className = '';
    document.documentElement.className = '';
  });

  it('Reading-Friendly preset applies the correct font and spacing classes to body', () => {
    const { unmount } = render(
      <AccessibilityLifecycleWrapper>
        <div>Test</div>
      </AccessibilityLifecycleWrapper>
    );

    act(() => {
      useAccessibilityStore.getState().applyPreset('reading');
    });

    expect(document.body.classList.contains('font-dyslexic')).toBe(true);
    expect(document.body.classList.contains('line-spacing-extra')).toBe(true);
    expect(document.body.classList.contains('font-size-large')).toBe(true);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    
    // Should NOT have focus mode or predictable layout
    expect(document.body.classList.contains('focus-mode')).toBe(false);
    expect(document.body.classList.contains('predictable-navigation')).toBe(false);

    unmount();
  });

  it('Focus-Friendly preset applies intended classes without conflicting distraction rules', () => {
    const { unmount } = render(
      <AccessibilityLifecycleWrapper>
        <div>Test</div>
      </AccessibilityLifecycleWrapper>
    );

    act(() => {
      useAccessibilityStore.getState().applyPreset('focus');
    });

    expect(document.body.classList.contains('focus-mode')).toBe(true);
    expect(document.body.classList.contains('no-animations')).toBe(true);
    
    // Crucially, reduced-distractions should NOT be applied for focus
    expect(document.body.classList.contains('reduced-distractions')).toBe(false);

    unmount();
  });

  it('Predictable Layout applies expected reduced-motion and stability classes', () => {
    const { unmount } = render(
      <AccessibilityLifecycleWrapper>
        <div>Test</div>
      </AccessibilityLifecycleWrapper>
    );

    act(() => {
      useAccessibilityStore.getState().applyPreset('predictable');
    });

    expect(document.body.classList.contains('predictable-navigation')).toBe(true);
    expect(document.body.classList.contains('no-animations')).toBe(true);
    expect(document.body.classList.contains('reduced-distractions')).toBe(true);

    unmount();
  });

  it('Switching presets removes classes from the previous preset', () => {
    const { unmount } = render(
      <AccessibilityLifecycleWrapper>
        <div>Test</div>
      </AccessibilityLifecycleWrapper>
    );

    // Apply reading-friendly
    act(() => {
      useAccessibilityStore.getState().applyPreset('reading');
    });
    expect(document.body.classList.contains('font-dyslexic')).toBe(true);
    
    // Switch to focus-friendly
    act(() => {
      useAccessibilityStore.getState().applyPreset('focus');
    });
    
    // Previous class should be removed
    expect(document.body.classList.contains('font-dyslexic')).toBe(false);
    
    // New class should be applied
    expect(document.body.classList.contains('focus-mode')).toBe(true);

    unmount();
  });
});
