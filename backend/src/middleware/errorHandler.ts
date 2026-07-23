import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';

  // Log every error in dev
  if (!['production', 'test'].includes(process.env.NODE_ENV || '')) {
    console.error(`\n❌ [${statusCode}] ${err.message}`);
  }

  // MongoDB connection / network errors
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoServerSelectionError' ||
      err.message?.includes('ECONNREFUSED') || err.message?.includes('buffering timed out') ||
      err.message?.includes('ENOTFOUND')) {
    statusCode = 503;
    message = 'Cannot connect to database. Please wait a moment and try again.';
  }

  if (err.code === 'LIMIT_FILE_SIZE') { statusCode = 413; message = 'File is too large. Maximum size is 10 MB.'; }
  if (String(err.message || '').startsWith('File type not supported')) { statusCode = 400; message = err.message; }

  // Mongoose duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = field === 'email'
      ? 'This email is already registered. Please log in instead.'
      : `A record with this ${field} already exists.`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e: any) => e.message).join('. ');
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid session. Please log in again.'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Session expired. Please log in again.'; }

  // Never send raw stack trace or generic "Internal Server Error" — always helpful message
  if (statusCode === 500 && message === 'Internal Server Error') {
    message = 'Something went wrong on our end. Please try again in a moment.';
  }

  res.status(statusCode).json({ success: false, message });
};
