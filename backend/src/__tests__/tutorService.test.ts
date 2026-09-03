/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { calculateMatchScore } from '../services/tutorService';
import { PeerTutor, User } from '../models';
import { ensureSampleTutors, getTutors } from '../controllers/tutorController';

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

describe('Peer Tutors production auto-seeding guard', () => {
  let mongoServer: MongoMemoryServer;
  const originalEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalEnv;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await PeerTutor.deleteMany({});
    await User.deleteMany({});
  });

  it('production mode does NOT auto-seed sample tutors', async () => {
    process.env.NODE_ENV = 'production';
    const testUserId = new mongoose.Types.ObjectId().toString();

    await ensureSampleTutors(testUserId);

    const tutorCount = await PeerTutor.countDocuments();
    const userCount = await User.countDocuments();
    expect(tutorCount).toBe(0);
    expect(userCount).toBe(0);
  });

  it('production GET /api/tutors returns empty array and creates 0 fabricated records when empty', async () => {
    process.env.NODE_ENV = 'production';
    const currentUserId = new mongoose.Types.ObjectId();

    const req: any = {
      user: { _id: currentUserId },
      query: {}
    };
    let responseData: any = null;
    const res: any = {
      json: (data: any) => { responseData = data; }
    };
    const next = () => {};

    await getTutors(req, res, next);

    expect(responseData).toEqual({ success: true, data: [] });
    const count = await PeerTutor.countDocuments();
    expect(count).toBe(0);
  });

  it('development/test mode can still seed sample tutors when count is zero', async () => {
    process.env.NODE_ENV = 'test';
    const testUserId = new mongoose.Types.ObjectId().toString();

    await ensureSampleTutors(testUserId);

    const tutorCount = await PeerTutor.countDocuments();
    expect(tutorCount).toBe(5);
  });
});

