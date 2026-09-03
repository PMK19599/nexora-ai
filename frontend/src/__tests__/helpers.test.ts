import { describe, it, expect } from 'vitest';
import { formatDate, getInitials, getMasteryColor, getPreferenceLabel } from '../utils/helpers';

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2023-12-25'));
    expect(result).toContain('Dec');
    expect(result).toContain('25');
    expect(result).toContain('2023');
  });
});

describe('getInitials', () => {
  it('returns initials for two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns single initial for single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('limits to 2 characters', () => {
    expect(getInitials('First Middle Last')).toBe('FM');
  });

  it('returns uppercase', () => {
    expect(getInitials('alice bob')).toBe('AB');
  });
});

describe('getMasteryColor', () => {
  it('returns green for mastery >= 80', () => {
    expect(getMasteryColor(80)).toBe('text-green-600');
    expect(getMasteryColor(100)).toBe('text-green-600');
  });

  it('returns yellow for mastery >= 50 and < 80', () => {
    expect(getMasteryColor(50)).toBe('text-yellow-600');
    expect(getMasteryColor(79)).toBe('text-yellow-600');
  });

  it('returns red for mastery < 50', () => {
    expect(getMasteryColor(0)).toBe('text-red-600');
    expect(getMasteryColor(49)).toBe('text-red-600');
  });
});

describe('getPreferenceLabel', () => {
  it('maps focus and adhd to Focus-Friendly', () => {
    expect(getPreferenceLabel('focus')).toBe('Focus-Friendly');
    expect(getPreferenceLabel('adhd')).toBe('Focus-Friendly');
    expect(getPreferenceLabel('ADHD')).toBe('Focus-Friendly');
  });

  it('maps predictable and autism to Predictable Layout', () => {
    expect(getPreferenceLabel('predictable')).toBe('Predictable Layout');
    expect(getPreferenceLabel('autism')).toBe('Predictable Layout');
    expect(getPreferenceLabel('AUTISM')).toBe('Predictable Layout');
  });

  it('maps reading and dyslexia to Reading-Friendly', () => {
    expect(getPreferenceLabel('reading')).toBe('Reading-Friendly');
    expect(getPreferenceLabel('dyslexia')).toBe('Reading-Friendly');
    expect(getPreferenceLabel('DYSLEXIA')).toBe('Reading-Friendly');
  });

  it('returns null for none, empty, or unknown values to avoid exposing diagnostic info', () => {
    expect(getPreferenceLabel('none')).toBeNull();
    expect(getPreferenceLabel('')).toBeNull();
    expect(getPreferenceLabel(undefined)).toBeNull();
    expect(getPreferenceLabel('unknown_condition')).toBeNull();
  });
});

