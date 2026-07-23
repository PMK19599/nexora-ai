/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';
import { calculateMatchScore } from '../services/tutorService';

describe('calculateMatchScore', () => {
  it('gives 40 points when tutor has matching subject', () => {
    const tutor = { subjects: ['Math', 'Physics'], rating: 0, userId: { timezone: '', communicationStyle: '' } };
    const student = { timezone: '', communicationStyle: '' };
    const score = calculateMatchScore(tutor, student, 'math');
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it('gives only 10 points when subject does not match', () => {
    const tutor = { subjects: ['Chemistry'], rating: 0, userId: { timezone: 'US/Pacific', communicationStyle: 'verbal' } };
    const student = { timezone: 'EU/London', communicationStyle: 'visual' };
    const score = calculateMatchScore(tutor, student, 'math');
    // 10 (no subject) + 0 (rating 0) + 5 (different tz) + 5 (different style) = 20
    expect(score).toBe(20);
  });

  it('adds rating-based score (max 30)', () => {
    const tutor = { subjects: ['Math'], rating: 5, userId: { timezone: 'US/Pacific', communicationStyle: 'verbal' } };
    const student = { timezone: 'EU/London', communicationStyle: 'visual' };
    const score = calculateMatchScore(tutor, student, 'math');
    // 40 (subject) + 30 (5/5 * 30) + 5 (different tz) + 5 (different style) = 80
    expect(score).toBe(80);
  });

  it('gives 15 points for matching timezone', () => {
    const tutor = { subjects: [], rating: 0, userId: { timezone: 'US/Eastern', communicationStyle: '' } };
    const student = { timezone: 'US/Eastern', communicationStyle: '' };
    const scoreMatch = calculateMatchScore(tutor, student, 'art');
    const tutor2 = { subjects: [], rating: 0, userId: { timezone: 'Asia/Tokyo', communicationStyle: '' } };
    const scoreDiff = calculateMatchScore(tutor2, student, 'art');
    expect(scoreMatch - scoreDiff).toBe(10); // 15 - 5
  });

  it('gives 15 points for matching communication style', () => {
    const tutor = { subjects: [], rating: 0, userId: { timezone: '', communicationStyle: 'visual' } };
    const student = { timezone: '', communicationStyle: 'visual' };
    const scoreMatch = calculateMatchScore(tutor, student, 'x');
    const tutor2 = { subjects: [], rating: 0, userId: { timezone: '', communicationStyle: 'verbal' } };
    const scoreDiff = calculateMatchScore(tutor2, student, 'x');
    expect(scoreMatch - scoreDiff).toBe(10); // 15 - 5
  });

  it('gives 10 for mixed communication style (partial match)', () => {
    const tutor = { subjects: [], rating: 0, userId: { timezone: 'US/Pacific', communicationStyle: 'mixed' } };
    const student = { timezone: 'EU/London', communicationStyle: 'visual' };
    const score = calculateMatchScore(tutor, student, 'x');
    // 10 (no subject) + 0 (rating) + 5 (different tz) + 10 (mixed style) = 25
    expect(score).toBe(25);
  });

  it('returns a rounded integer', () => {
    const tutor = { subjects: ['Math'], rating: 3.7, userId: { timezone: 'X', communicationStyle: 'Y' } };
    const student = { timezone: 'X', communicationStyle: 'Z' };
    const score = calculateMatchScore(tutor, student, 'Math');
    expect(Number.isInteger(score)).toBe(true);
  });
});
