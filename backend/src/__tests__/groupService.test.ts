/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';
import { calculateCompatibility } from '../services/groupService';

describe('calculateCompatibility', () => {
  it('returns 0 for users with no matching attributes', () => {
    const u1 = { interests: [], skills: [], timezone: 'US/Pacific', learningTrack: 'standard', neurodivergentType: 'none' };
    const u2 = { interests: [], skills: [], timezone: 'EU/London', learningTrack: 'neurodivergent', neurodivergentType: 'adhd' };
    const score = calculateCompatibility(u1, u2);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives points for shared interests (max 30)', () => {
    const u1 = { interests: ['math', 'science', 'coding', 'art'], skills: [], timezone: 'X', learningTrack: 'a', neurodivergentType: 'b' };
    const u2 = { interests: ['math', 'science', 'coding', 'art'], skills: [], timezone: 'Y', learningTrack: 'c', neurodivergentType: 'd' };
    const score = calculateCompatibility(u1, u2);
    // 4 shared interests * 10 = 40, capped at 30
    expect(score).toBeGreaterThanOrEqual(30);
  });

  it('gives points for complementary skills', () => {
    const u1 = { interests: [], skills: ['python', 'java'], timezone: 'X', learningTrack: 'a', neurodivergentType: 'b' };
    const u2 = { interests: [], skills: ['react', 'node'], timezone: 'Y', learningTrack: 'c', neurodivergentType: 'd' };
    const scoreCompl = calculateCompatibility(u1, u2);
    const u3 = { interests: [], skills: ['python', 'java'], timezone: 'X', learningTrack: 'a', neurodivergentType: 'b' };
    const u4 = { interests: [], skills: ['python', 'java'], timezone: 'Y', learningTrack: 'c', neurodivergentType: 'd' };
    const scoreIdent = calculateCompatibility(u3, u4);
    expect(scoreCompl).toBeGreaterThan(scoreIdent);
  });

  it('gives 20 points for same timezone', () => {
    const base = { interests: [], skills: [], learningTrack: 'a', neurodivergentType: 'b' };
    const u1 = { ...base, timezone: 'US/Eastern' };
    const u2same = { ...base, timezone: 'US/Eastern' };
    const u2diff = { ...base, timezone: 'Asia/Tokyo' };
    const scoreSame = calculateCompatibility(u1, u2same);
    const scoreDiff = calculateCompatibility(u1, u2diff);
    expect(scoreSame - scoreDiff).toBe(15); // 20 - 5 = 15
  });

  it('gives 10 points for same learningTrack', () => {
    const base = { interests: [], skills: [], timezone: 'X', neurodivergentType: 'b' };
    const u1 = { ...base, learningTrack: 'neurodivergent' };
    const u2same = { ...base, learningTrack: 'neurodivergent' };
    const u2diff = { ...base, learningTrack: 'standard' };
    const scoreSame = calculateCompatibility(u1, u2same);
    const scoreDiff = calculateCompatibility(u1, u2diff);
    expect(scoreSame - scoreDiff).toBe(10);
  });

  it('gives 10 points for same neurodivergentType', () => {
    const base = { interests: [], skills: [], timezone: 'X', learningTrack: 'a' };
    const u1 = { ...base, neurodivergentType: 'adhd' };
    const u2same = { ...base, neurodivergentType: 'adhd' };
    const u2diff = { ...base, neurodivergentType: 'autism' };
    const scoreSame = calculateCompatibility(u1, u2same);
    const scoreDiff = calculateCompatibility(u1, u2diff);
    expect(scoreSame - scoreDiff).toBe(10);
  });

  it('caps score at 100', () => {
    const u1 = { interests: ['a','b','c','d'], skills: ['x','y','z'], timezone: 'same', learningTrack: 'same', neurodivergentType: 'same' };
    const u2 = { interests: ['a','b','c','d'], skills: ['p','q','r'], timezone: 'same', learningTrack: 'same', neurodivergentType: 'same' };
    expect(calculateCompatibility(u1, u2)).toBeLessThanOrEqual(100);
  });

  it('handles undefined interests and skills gracefully', () => {
    const u1 = { timezone: 'X', learningTrack: 'a', neurodivergentType: 'b' };
    const u2 = { timezone: 'Y', learningTrack: 'c', neurodivergentType: 'd' };
    expect(() => calculateCompatibility(u1, u2)).not.toThrow();
  });
});
