/// <reference types="jest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';
jest.setTimeout(30000);
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User, CareerPath } from '../models';

let mongoServer: MongoMemoryServer | undefined;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await CareerPath.deleteMany({});
});

describe('Privacy API (GDPR compliance)', () => {
  const credentials = { name: 'GDPR Test User', email: 'privacy@example.invalid', password: crypto.randomBytes(18).toString('base64url') + 'Aa1!' };

  it('exports all user data in JSON format', async () => {
    // Register user
    const regRes = await request(app).post('/api/auth/register').send(credentials);
    const csrf = regRes.body.csrfToken;
    const cookie = regRes.headers['set-cookie'];

    // Create a mock career path for the user to verify export contains related data
    await CareerPath.create({
      userId: regRes.body.user._id,
      dreamJob: 'Data Engineer',
      company: 'Google',
      requiredSkills: ['SQL', 'Python'],
      industryExpectations: [],
      interviewTopics: [],
      techStack: [],
    });

    // Call export-data
    const exportRes = await request(app)
      .get('/api/privacy/export-data')
      .set('Cookie', cookie);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.success).toBe(true);
    expect(exportRes.body.data.profile.email).toBe(credentials.email);
    expect(exportRes.body.data.careerPaths.length).toBe(1);
    expect(exportRes.body.data.careerPaths[0].dreamJob).toBe('Data Engineer');
  });

  it('permanently deletes all user data and records', async () => {
    // Register user
    const regRes = await request(app).post('/api/auth/register').send(credentials);
    const csrf = regRes.body.csrfToken;
    const cookie = regRes.headers['set-cookie'];
    const userId = regRes.body.user._id;

    // Create mock career path for the user
    await CareerPath.create({
      userId,
      dreamJob: 'AI Researcher',
      company: 'OpenAI',
      requiredSkills: ['Deep Learning', 'PyTorch'],
      industryExpectations: [],
      interviewTopics: [],
      techStack: [],
    });

    // Verify record exists before purge
    const countBefore = await CareerPath.countDocuments({ userId });
    expect(countBefore).toBe(1);

    // Call purge-account
    const purgeRes = await request(app)
      .delete('/api/privacy/purge-account')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrf);

    expect(purgeRes.status).toBe(200);
    expect(purgeRes.body.success).toBe(true);

    // Verify user and data are deleted
    const userAfter = await User.findById(userId);
    expect(userAfter).toBeNull();

    const pathsAfter = await CareerPath.find({ userId });
    expect(pathsAfter.length).toBe(0);
  });
});
