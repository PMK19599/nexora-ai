import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest } from '../types';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token: string | undefined = req.cookies?.nexora_session;
    if (!token) { res.status(401).json({ success: false, message: 'Not authorized' }); return; }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-only-change-me') as { id: string; version: number };
    const user = await User.findById(decoded.id).select('+tokenVersion');
    if (!user || (user.tokenVersion || 0) !== (decoded.version || 0)) { res.status(401).json({ success: false, message: 'User not found' }); return; }
    req.user = user;
    next();
  } catch { res.status(401).json({ success: false, message: 'Not authorized' }); }
};

export const requireVerified = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.isEmailVerified) { res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email to access this feature.' }); return; }
  next();
};

export const authorize = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !roles.includes(req.user.role)) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  next();
};
