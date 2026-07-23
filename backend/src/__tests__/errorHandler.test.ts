/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from '../middleware/errorHandler';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(data: any) { this.body = data; return this; },
  } as any as Response & { statusCode: number; body: any };
  return res;
}

const req = {} as Request;
const next = (() => {}) as NextFunction;

describe('AppError', () => {
  it('creates error with message and status code', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('errorHandler middleware', () => {
  it('handles AppError with correct status', () => {
    const res = mockRes();
    errorHandler(new AppError('Bad request', 400), req, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Bad request');
  });

  it('defaults to 500 for errors without statusCode', () => {
    const res = mockRes();
    errorHandler(new Error('Unknown error'), req, res, next);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Unknown error');
  });

  it('handles MongoDB connection errors as 503', () => {
    const res = mockRes();
    const err: any = new Error('connect ECONNREFUSED 127.0.0.1:27017');
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(503);
    expect(res.body.message).toContain('Cannot connect to database');
  });

  it('handles duplicate key errors as 400', () => {
    const res = mockRes();
    const err: any = new Error('Duplicate key');
    err.code = 11000;
    err.keyValue = { email: 'test@example.com' };
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('already registered');
  });

  it('handles duplicate key for non-email fields', () => {
    const res = mockRes();
    const err: any = new Error('Duplicate key');
    err.code = 11000;
    err.keyValue = { username: 'user1' };
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('username');
  });

  it('handles Mongoose ValidationError as 400', () => {
    const res = mockRes();
    const err: any = new Error('Validation failed');
    err.name = 'ValidationError';
    err.errors = { name: { message: 'Name is required' }, email: { message: 'Email is invalid' } };
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Name is required');
    expect(res.body.message).toContain('Email is invalid');
  });

  it('handles CastError as 404', () => {
    const res = mockRes();
    const err: any = new Error('Cast failed');
    err.name = 'CastError';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Resource not found.');
  });

  it('handles JsonWebTokenError as 401', () => {
    const res = mockRes();
    const err: any = new Error('jwt malformed');
    err.name = 'JsonWebTokenError';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toContain('Invalid session');
  });

  it('handles TokenExpiredError as 401', () => {
    const res = mockRes();
    const err: any = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toContain('Session expired');
  });

  it('replaces generic 500 "Internal Server Error" with friendly message', () => {
    const res = mockRes();
    const err: any = new Error('Internal Server Error');
    err.statusCode = 500;
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Something went wrong on our end. Please try again in a moment.');
  });
});
