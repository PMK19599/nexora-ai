import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export const CSRF_COOKIE = 'nexora_csrf';

export const newCsrfToken = () => crypto.randomBytes(32).toString('hex');

export const setCsrfCookie = (res: Response, token = newCsrfToken()) => {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  return token;
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (['/auth/register', '/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/auth/resend-verification'].includes(req.path)) return next();
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header('X-CSRF-Token');
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    res.status(403).json({ success: false, message: 'Security check failed. Refresh the page and try again.' });
    return;
  }
  next();
};
