import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models';

let mongoServer: MongoMemoryServer;
beforeAll(async () => { mongoServer = await MongoMemoryServer.create(); await mongoose.connect(mongoServer.getUri()); });
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });
beforeEach(async () => { await User.deleteMany({}); });

describe('Auth API', () => {
  const user = { name: 'Test', email: 'test@example.invalid', password: crypto.randomBytes(18).toString('base64url') + 'Aa1!' };

  it('registers a user', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(400);
  });

  it('logs in', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('gets profile with token', async () => {
    const reg = await request(app).post('/api/auth/register').send(user);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  it('rejects without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
