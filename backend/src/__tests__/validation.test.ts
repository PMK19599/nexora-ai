/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';
import { Request, Response } from 'express';
import { validate, registerSchema, loginSchema, reviewLogSchema } from '../middleware/validation';

function mockReqRes(body: any = {}, query: any = {}, params: any = {}) {
  const req = { body, query, params } as Request;
  const res = {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(data: any) { this.body = data; return this; },
  } as any as Response & { statusCode: number; body: any };
  const next = jest.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  describe('registerSchema', () => {
    it('passes valid registration data', () => {
      const { req, res, next } = mockReqRes({ name: 'Test', email: 'test@example.com', password: 'password123' });
      validate(registerSchema)(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects missing name', () => {
      const { req, res, next } = mockReqRes({ email: 'test@example.com', password: 'password123' });
      validate(registerSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const { req, res, next } = mockReqRes({ name: 'Test', email: 'not-email', password: 'password123' });
      validate(registerSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('valid email');
    });

    it('rejects short password', () => {
      const { req, res, next } = mockReqRes({ name: 'Test', email: 'test@example.com', password: '12345' });
      validate(registerSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('6 characters');
    });

    it('allows extra fields with passthrough', () => {
      const { req, res, next } = mockReqRes({ name: 'Test', email: 'test@example.com', password: 'password123', role: 'admin' });
      validate(registerSchema)(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('loginSchema', () => {
    it('passes valid login data', () => {
      const { req, res, next } = mockReqRes({ email: 'test@example.com', password: 'pass' });
      validate(loginSchema)(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects missing password', () => {
      const { req, res, next } = mockReqRes({ email: 'test@example.com' });
      validate(loginSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('rejects invalid email format', () => {
      const { req, res, next } = mockReqRes({ email: 'bad', password: 'pass' });
      validate(loginSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('reviewLogSchema', () => {
    it('passes valid review data', () => {
      const { req, res, next } = mockReqRes({ topicId: 'abc123', quality: 4, responseTime: 1200, correct: true });
      validate(reviewLogSchema)(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects quality > 5', () => {
      const { req, res, next } = mockReqRes({ topicId: 'abc', quality: 6, responseTime: 100, correct: true });
      validate(reviewLogSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('rejects negative responseTime', () => {
      const { req, res, next } = mockReqRes({ topicId: 'abc', quality: 3, responseTime: -1, correct: true });
      validate(reviewLogSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
    });

    it('rejects non-boolean correct', () => {
      const { req, res, next } = mockReqRes({ topicId: 'abc', quality: 3, responseTime: 100, correct: 'yes' });
      validate(reviewLogSchema)(req, res, next);
      expect(res.statusCode).toBe(400);
    });
  });
});
