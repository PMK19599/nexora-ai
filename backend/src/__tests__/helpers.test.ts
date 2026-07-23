/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';
import { calculateLevel, generateXP } from '../utils/helpers';

describe('calculateLevel', () => {
  it('returns 1 for 0 XP', () => expect(calculateLevel(0)).toBe(1));
  it('returns 1 for 499 XP', () => expect(calculateLevel(499)).toBe(1));
  it('returns 2 for 500 XP', () => expect(calculateLevel(500)).toBe(2));
  it('returns 3 for 1000 XP', () => expect(calculateLevel(1000)).toBe(3));
  it('returns 11 for 5000 XP', () => expect(calculateLevel(5000)).toBe(11));
});

describe('generateXP', () => {
  it('returns 10 for review_complete', () => expect(generateXP('review_complete')).toBe(10));
  it('returns 15 for review_correct', () => expect(generateXP('review_correct')).toBe(15));
  it('returns 50 for tutor_session', () => expect(generateXP('tutor_session')).toBe(50));
  it('returns 30 for group_meeting', () => expect(generateXP('group_meeting')).toBe(30));
  it('returns 20 for career_roadmap', () => expect(generateXP('career_roadmap')).toBe(20));
  it('returns 5 for daily_login', () => expect(generateXP('daily_login')).toBe(5));
  it('returns 5 for unknown action', () => expect(generateXP('unknown_action')).toBe(5));
});
