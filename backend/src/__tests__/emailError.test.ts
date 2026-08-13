import { sendEmail } from '../services/emailService';
import { register, forgotPassword, resendVerification } from '../controllers/authController';
import User from '../models/User';
import Notification from '../models/Notification';
import { Request, Response } from 'express';

// Mock dependencies
jest.mock('../models/User');
jest.mock('../models/Notification');
global.fetch = jest.fn();

describe('Email Error Handling', () => {
  let mockConsoleError: jest.SpyInstance;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'test_key';
    process.env.EMAIL_FROM = 'test@example.com';
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    mockConsoleError.mockRestore();
  });

  describe('emailService.ts', () => {
    it('preserves Resend provider, status, code, and message on 4xx/5xx', async () => {
      const resendErrorBody = {
        name: 'validation_error',
        message: 'Invalid email address'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => resendErrorBody
      });

      try {
        await sendEmail({ to: 'test@example.com', subject: 'Test', text: 'Test', html: '<p>Test</p>' });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('Invalid email address');
        expect(error.provider).toBe('resend');
        expect(error.status).toBe(400);
        expect(error.providerCode).toBe('validation_error');
      }
    });

    it('falls back gracefully if response json fails to parse', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Unparsable'); }
      });

      try {
        await sendEmail({ to: 'test@example.com', subject: 'Test', text: 'Test', html: '<p>Test</p>' });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe('Email delivery failed');
        expect(error.provider).toBe('resend');
        expect(error.status).toBe(500);
        expect(error.providerCode).toBeUndefined();
      }
    });
  });

  describe('authController.ts', () => {
    const resendErrorBody = { name: 'rate_limit_exceeded', message: 'Too many requests' };
    
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => resendErrorBody
      });
      (Notification.create as jest.Mock).mockResolvedValue({});
    });

    it('register logs safe context without leaking secrets', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({ _id: '123', email: 'test@example.com', getSignedJwtToken: () => 'token', save: jest.fn() });
      
      const req = { body: { name: 'Test', email: 'test@example.com', password: 'password123' } } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), cookie: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      
      await register(req, res, jest.fn());
      
      expect(mockConsoleError).toHaveBeenCalledWith('📧 [EmailError]', {
        context: 'register_verification',
        provider: 'resend',
        status: 429,
        code: 'rate_limit_exceeded',
        message: 'Too many requests'
      });
      
      const logArgs = mockConsoleError.mock.calls[0][1];
      expect(JSON.stringify(logArgs)).not.toContain('test@example.com');
      expect(JSON.stringify(logArgs)).not.toContain('password123');
      expect(JSON.stringify(logArgs)).not.toContain('token');
      expect(JSON.stringify(logArgs)).not.toContain('test_key');
    });

    it('forgot-password logs safe context without leaking secrets', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ email: 'test@example.com', save: jest.fn() })
      });
      
      const req = { body: { email: 'test@example.com' } } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;
      
      await forgotPassword(req, res, jest.fn());
      
      expect(mockConsoleError).toHaveBeenCalledWith('📧 [EmailError]', {
        context: 'password_reset',
        provider: 'resend',
        status: 429,
        code: 'rate_limit_exceeded',
        message: 'Too many requests'
      });
    });

    it('resend-verification logs safe context without leaking secrets', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({ 
          email: 'test@example.com', 
          isEmailVerified: false,
          verificationSentAt: new Date(Date.now() - 100000), // > 60s ago
          save: jest.fn()
        })
      });
      
      const req = { body: { email: 'test@example.com' } } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;
      
      await resendVerification(req, res, jest.fn());
      
      expect(mockConsoleError).toHaveBeenCalledWith('📧 [EmailError]', {
        context: 'resend_verification',
        provider: 'resend',
        status: 429,
        code: 'rate_limit_exceeded',
        message: 'Too many requests'
      });
    });
  });
});
