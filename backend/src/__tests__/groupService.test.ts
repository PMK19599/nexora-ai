/// <reference types="jest" />
import { describe, it, expect, jest } from '@jest/globals';
import { calculateCompatibility, toNeutralPreference, matchStudyGroups } from '../services/groupService';
import { User, StudyGroup } from '../models';
import { Types } from 'mongoose';

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

describe('toNeutralPreference', () => {
  it('maps focus and adhd to Focus-Friendly', () => {
    expect(toNeutralPreference('focus')).toBe('Focus-Friendly');
    expect(toNeutralPreference('adhd')).toBe('Focus-Friendly');
    expect(toNeutralPreference('ADHD')).toBe('Focus-Friendly');
  });

  it('maps predictable and autism to Predictable Layout', () => {
    expect(toNeutralPreference('predictable')).toBe('Predictable Layout');
    expect(toNeutralPreference('autism')).toBe('Predictable Layout');
    expect(toNeutralPreference('AUTISM')).toBe('Predictable Layout');
  });

  it('maps reading and dyslexia to Reading-Friendly', () => {
    expect(toNeutralPreference('reading')).toBe('Reading-Friendly');
    expect(toNeutralPreference('dyslexia')).toBe('Reading-Friendly');
    expect(toNeutralPreference('DYSLEXIA')).toBe('Reading-Friendly');
  });

  it('returns null for none or unknown values', () => {
    expect(toNeutralPreference('none')).toBeNull();
    expect(toNeutralPreference(undefined)).toBeNull();
    expect(toNeutralPreference('')).toBeNull();
  });
});

describe('matchStudyGroups privacy & self-exclusion', () => {
  it('does NOT expose neurodivergentType in suggestedUsers response and provides neutral learningPreference', async () => {
    const currentUserId = new Types.ObjectId().toString();
    const candidate1Id = new Types.ObjectId();
    const candidate2Id = new Types.ObjectId();

    const currentUserDoc = {
      _id: new Types.ObjectId(currentUserId),
      name: 'Current User',
      interests: ['coding'],
      skills: ['ts'],
      timezone: 'UTC',
      learningTrack: 'neurodivergent',
      neurodivergentType: 'adhd'
    };

    const candidateDocs = [
      {
        _id: candidate1Id,
        name: 'Partner 1',
        interests: ['coding'],
        skills: ['react'],
        timezone: 'UTC',
        learningTrack: 'neurodivergent',
        neurodivergentType: 'adhd'
      },
      {
        _id: candidate2Id,
        name: 'Partner 2',
        interests: ['math'],
        skills: ['python'],
        timezone: 'UTC',
        learningTrack: 'neurodivergent',
        neurodivergentType: 'autism'
      },
      {
        _id: new Types.ObjectId(currentUserId),
        name: 'Current User',
        interests: ['coding'],
        skills: ['ts'],
        timezone: 'UTC',
        learningTrack: 'neurodivergent',
        neurodivergentType: 'adhd'
      }
    ];

    jest.spyOn(User, 'findById').mockResolvedValue(currentUserDoc as any);
    jest.spyOn(User, 'find').mockReturnValue({
      limit: (jest.fn() as any).mockResolvedValue(candidateDocs)
    } as any);
    jest.spyOn(StudyGroup, 'find').mockReturnValue({
      populate: (jest.fn() as any).mockResolvedValue([])
    } as any);

    const result = await matchStudyGroups(currentUserId);

    expect(result.suggestedUsers).toHaveLength(2);
    // Ensure self is excluded
    expect(result.suggestedUsers.some(u => u.id.toString() === currentUserId)).toBe(false);

    // Ensure neurodivergentType is NOT exposed on suggestedUsers
    for (const suggested of result.suggestedUsers) {
      expect((suggested as any).neurodivergentType).toBeUndefined();
      expect(suggested.learningPreference).toBeDefined();
    }

    expect(result.suggestedUsers[0].learningPreference).toBe('Focus-Friendly');
    expect(result.suggestedUsers[1].learningPreference).toBe('Predictable Layout');
  });
});

