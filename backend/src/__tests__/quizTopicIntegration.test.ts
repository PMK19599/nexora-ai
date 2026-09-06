/// <reference types="jest" />
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      text: 'Extracted sample study notes text from document with sufficient character length for automated quiz question generation pipeline.'
    })
  );
});

import app from '../app';
import { User, Topic, StudentProgress } from '../models';
import { Game, GameSession } from '../models/Game';
import { resolveUserTopicForQuiz } from '../controllers/gameController';

jest.setTimeout(30000);

let mongo: MongoMemoryServer | undefined;
let password = '';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Topic.deleteMany({}),
    Game.deleteMany({}),
    GameSession.deleteMany({}),
    StudentProgress.deleteMany({}),
  ]);
  password = crypto.randomBytes(18).toString('base64url') + 'Aa1!';
});

async function createSession(name = 'Test User', emailPrefix = 'user') {
  const user = await User.create({
    name,
    email: `${emailPrefix}_${crypto.randomBytes(4).toString('hex')}@example.invalid`,
    password,
    isEmailVerified: true,
  });
  const agent = request.agent(app);
  const login = await agent.post('/api/auth/login').send({ email: user.email, password });
  return { user, agent, csrf: login.body.csrfToken };
}

describe('Quiz to Spaced-Review Topic Resolution', () => {
  describe('resolveUserTopicForQuiz Helper Unit Tests', () => {
    it('creates a user-scoped Topic with fallback title when no title is provided', async () => {
      const userId = new Types.ObjectId();
      const topicId = await resolveUserTopicForQuiz(userId, '');
      expect(topicId).toBeDefined();

      const topic = await Topic.findById(topicId);
      expect(topic).not.toBeNull();
      expect(topic?.title).toBe('Study Notes');
      expect(topic?.domain).toBe('Notes');
      expect(topic?.tags).toContain(`user:${userId.toString()}`);
    });

    it('falls back to Study Notes when title is Quick Quiz', async () => {
      const userId = new Types.ObjectId();
      const topicId = await resolveUserTopicForQuiz(userId, 'Quick Quiz');
      const topic = await Topic.findById(topicId);
      expect(topic?.title).toBe('Study Notes');
    });

    it('cleans title prefixes and creates a custom Topic', async () => {
      const userId = new Types.ObjectId();
      const topicId = await resolveUserTopicForQuiz(userId, 'Quiz: Molecular Genetics');
      const topic = await Topic.findById(topicId);
      expect(topic?.title).toBe('Molecular Genetics');
      expect(topic?.tags).toContain(`user:${userId.toString()}`);
    });

    it('reuses existing matching user-owned Topic rather than duplicating', async () => {
      const userId = new Types.ObjectId();
      const id1 = await resolveUserTopicForQuiz(userId, 'Organic Chemistry');
      const id2 = await resolveUserTopicForQuiz(userId, 'Quiz: Organic Chemistry');

      expect(id1.toString()).toBe(id2.toString());
      const count = await Topic.countDocuments({ tags: `user:${userId.toString()}` });
      expect(count).toBe(1);
    });

    it('preserves explicitly supplied topicId unchanged', async () => {
      const userId = new Types.ObjectId();
      const explicitId = new Types.ObjectId();
      const resolved = await resolveUserTopicForQuiz(userId, 'Some Title', explicitId);
      expect(resolved.toString()).toBe(explicitId.toString());

      const count = await Topic.countDocuments({});
      expect(count).toBe(0);
    });

    it('strictly isolates topics between different users', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();

      const idA = await resolveUserTopicForQuiz(userA, 'Thermodynamics');
      const idB = await resolveUserTopicForQuiz(userB, 'Thermodynamics');

      expect(idA.toString()).not.toBe(idB.toString());

      const topicA = await Topic.findById(idA);
      const topicB = await Topic.findById(idB);

      expect(topicA?.tags).toContain(`user:${userA.toString()}`);
      expect(topicA?.tags).not.toContain(`user:${userB.toString()}`);

      expect(topicB?.tags).toContain(`user:${userB.toString()}`);
      expect(topicB?.tags).not.toContain(`user:${userA.toString()}`);
    });
  });

  describe('API Flow: Quiz Creation and Topic Linking', () => {
    it('Notes/Text quiz without topic → Topic created and linked to Game', async () => {
      const { user, agent, csrf } = await createSession('Alice', 'alice');

      const text = 'Photosynthesis is the process by which green plants convert light energy into chemical energy stored in glucose molecules.';
      const res = await agent
        .post('/api/games/from-text')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Plant Biology Notes',
          content: text,
          questionCount: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.topicId).toBeDefined();

      const topic = await Topic.findById(res.body.data.topicId);
      expect(topic).not.toBeNull();
      expect(topic?.title).toBe('Plant Biology Notes');
      expect(topic?.tags).toContain(`user:${user._id.toString()}`);

      const gameInDb = await Game.findById(res.body.data._id);
      expect(gameInDb?.topicId?.toString()).toBe(topic?._id.toString());
    });

    it('PDF quiz without topic → Topic created and linked to Game', async () => {
      const { user, agent, csrf } = await createSession('Bob', 'bob');

      const res = await agent
        .post('/api/games/from-pdf')
        .set('X-CSRF-Token', csrf)
        .field('title', 'Quantum Computing Fundamentals')
        .field('questionCount', '5')
        .attach('pdf', Buffer.from('%PDF-1.4 sample pdf content'), 'quantum.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.topicId).toBeDefined();

      const topic = await Topic.findById(res.body.data.topicId);
      expect(topic).not.toBeNull();
      expect(topic?.title).toBe('Quantum Computing Fundamentals');
      expect(topic?.tags).toContain(`user:${user._id.toString()}`);

      const gameInDb = await Game.findById(res.body.data._id);
      expect(gameInDb?.topicId?.toString()).toBe(topic?._id.toString());
    });

    it('Existing supplied topicId → preserved unchanged during quiz creation', async () => {
      const { agent, csrf } = await createSession('Charlie', 'charlie');

      const existingTopic = await Topic.create({
        title: 'Curriculum Algorithms',
        description: 'Standard curriculum computer science topic',
        domain: 'Computer Science',
        difficulty: 'intermediate',
      });

      const res = await agent
        .post('/api/games/from-text')
        .set('X-CSRF-Token', csrf)
        .send({
          title: 'Algorithms Revision',
          content: 'Sorting algorithms like quicksort and mergesort have average time complexity of O(n log n).',
          topicId: existingTopic._id.toString(),
          questionCount: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.topicId).toBe(existingTopic._id.toString());

      // Confirm no duplicate topic was created
      const count = await Topic.countDocuments({ title: 'Curriculum Algorithms' });
      expect(count).toBe(1);
    });

    it('User isolation — User A and User B create same title, get distinct topics', async () => {
      const sessionA = await createSession('User A', 'usera');
      const sessionB = await createSession('User B', 'userb');

      const sharedTitle = 'World War II History';
      const content = 'World War II was a global conflict that lasted from 1939 to 1945, involving the vast majority of the world countries.';

      const resA = await sessionA.agent
        .post('/api/games/from-text')
        .set('X-CSRF-Token', sessionA.csrf)
        .send({ title: sharedTitle, content, questionCount: 5 });

      const resB = await sessionB.agent
        .post('/api/games/from-text')
        .set('X-CSRF-Token', sessionB.csrf)
        .send({ title: sharedTitle, content, questionCount: 5 });

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);

      const topicIdA = resA.body.data.topicId;
      const topicIdB = resB.body.data.topicId;

      expect(topicIdA).toBeDefined();
      expect(topicIdB).toBeDefined();
      expect(topicIdA).not.toBe(topicIdB);

      const topicA = await Topic.findById(topicIdA);
      const topicB = await Topic.findById(topicIdB);

      expect(topicA?.tags).toContain(`user:${sessionA.user._id.toString()}`);
      expect(topicA?.tags).not.toContain(`user:${sessionB.user._id.toString()}`);

      expect(topicB?.tags).toContain(`user:${sessionB.user._id.toString()}`);
      expect(topicB?.tags).not.toContain(`user:${sessionA.user._id.toString()}`);
    });
  });

  describe('API Flow: Quiz Submission and Review Progress Creation', () => {
    it('Quiz submission with generated topic → logReviewAttempt is reached and StudentProgress is created', async () => {
      const { user, agent, csrf } = await createSession('Dan', 'dan');

      // 1. Create text quiz
      const content = 'Mitochondria are the powerhouse of the cell, producing adenosine triphosphate (ATP) through cellular respiration.';
      const createRes = await agent
        .post('/api/games/from-text')
        .set('X-CSRF-Token', csrf)
        .send({ title: 'Cellular Respiration', content, questionCount: 2 });

      const gameId = createRes.body.data._id;
      const topicId = createRes.body.data.topicId;
      expect(topicId).toBeDefined();

      // Ensure no progress exists yet
      let initialProgress = await StudentProgress.findOne({ userId: user._id, topicId });
      expect(initialProgress).toBeNull();

      // 2. Submit completed quiz session
      const submitRes = await agent
        .post('/api/games/submit')
        .set('X-CSRF-Token', csrf)
        .send({
          gameId,
          answers: [
            { questionIndex: 0, selectedAnswer: createRes.body.data.questions[0].correctAnswer, timeTaken: 5 },
            { questionIndex: 1, selectedAnswer: createRes.body.data.questions[1].correctAnswer, timeTaken: 6 },
          ],
          timeTaken: 11,
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.success).toBe(true);

      // 3. Verify StudentProgress was created
      const progress = await StudentProgress.findOne({ userId: user._id, topicId });
      expect(progress).not.toBeNull();
      expect(progress?.totalAttempts).toBe(1);
      expect(progress?.correctAttempts).toBe(1);
      expect(progress?.retentionRate).toBe(100);

      // 4. Verify SM-2 placement in Upcoming (not immediately due)
      const now = new Date();
      expect(progress?.nextReviewDate).toBeDefined();
      expect(new Date(progress!.nextReviewDate!).getTime()).toBeGreaterThan(now.getTime());
    });

    it('Legacy quiz without topicId resolves and creates topic and StudentProgress on submit', async () => {
      const { user, agent, csrf } = await createSession('Eve', 'eve');

      // Create a legacy game with null/undefined topicId
      const legacyGame = await Game.create({
        userId: user._id,
        title: 'Vintage Chemistry Quiz',
        description: 'Legacy quiz without topicId',
        sourceType: 'text',
        sourceContent: 'Acids and bases react to form water and salt in neutralization reactions.',
        questions: [
          { question: 'What do acids and bases form?', options: ['Water and salt', 'Nothing'], correctAnswer: 0, explanation: 'Neutralization', difficulty: 'easy', points: 10 }
        ],
        totalQuestions: 1,
        timeLimit: 30,
      });

      expect(legacyGame.topicId).toBeUndefined();

      // Submit the legacy quiz
      const submitRes = await agent
        .post('/api/games/submit')
        .set('X-CSRF-Token', csrf)
        .send({
          gameId: legacyGame._id.toString(),
          answers: [{ questionIndex: 0, selectedAnswer: 0, timeTaken: 4 }],
          timeTaken: 4,
        });

      expect(submitRes.status).toBe(201);

      // Verify the game now has a persisted topicId
      const updatedGame = await Game.findById(legacyGame._id);
      expect(updatedGame?.topicId).toBeDefined();

      // Verify StudentProgress was created
      const progress = await StudentProgress.findOne({ userId: user._id, topicId: updatedGame?.topicId });
      expect(progress).not.toBeNull();
      expect(progress?.totalAttempts).toBe(1);
    });
  });
});
