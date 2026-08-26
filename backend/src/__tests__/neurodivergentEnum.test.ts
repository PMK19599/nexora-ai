import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';

// We export a test helper from authController for getDefaults, but if not exported, we can just test User model
// Let's test the User model directly for the enums

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Neurodivergent Enum Backward Compatibility & Profile Save', () => {
  it('allows saving new functional enum values', async () => {
    const user1 = new User({ name: 'T1', email: 't1@x.com', password: 'password123', neurodivergentType: 'focus' });
    const user2 = new User({ name: 'T2', email: 't2@x.com', password: 'password123', neurodivergentType: 'predictable' });
    const user3 = new User({ name: 'T3', email: 't3@x.com', password: 'password123', neurodivergentType: 'reading' });
    const user4 = new User({ name: 'T4', email: 't4@x.com', password: 'password123', neurodivergentType: 'none' });
    
    await expect(user1.save()).resolves.toBeTruthy();
    await expect(user2.save()).resolves.toBeTruthy();
    await expect(user3.save()).resolves.toBeTruthy();
    await expect(user4.save()).resolves.toBeTruthy();
  });

  it('allows reading and saving legacy enum values (backward compatibility)', async () => {
    // Legacy values should still pass mongoose validation
    const userAdhd = new User({ name: 'T5', email: 't5@x.com', password: 'password123', neurodivergentType: 'adhd' });
    const userAutism = new User({ name: 'T6', email: 't6@x.com', password: 'password123', neurodivergentType: 'autism' });
    const userDyslexia = new User({ name: 'T7', email: 't7@x.com', password: 'password123', neurodivergentType: 'dyslexia' });

    await expect(userAdhd.save()).resolves.toBeTruthy();
    await expect(userAutism.save()).resolves.toBeTruthy();
    await expect(userDyslexia.save()).resolves.toBeTruthy();

    const fetched = await User.findOne({ email: 't5@x.com' });
    expect(fetched?.neurodivergentType).toBe('adhd');
  });

  it('rejects invalid random enum values', async () => {
    const invalidUser = new User({ name: 'T8', email: 't8@x.com', password: 'password123', neurodivergentType: 'random' });
    await expect(invalidUser.save()).rejects.toThrow();
  });
});
