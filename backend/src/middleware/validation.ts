import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    schema.parse({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msgs = error.errors
        .map(e => e.message)
        .filter(m => m && m !== 'Required');
      res.status(400).json({
        success: false,
        message: msgs.length > 0 ? msgs.join('. ') : 'Please fill in all required fields correctly.',
      });
      return;
    }
    next(error);
  }
};

// Only validate required fields — .passthrough() allows everything else through
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(254, 'Email is too long'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
  }).passthrough(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const reviewLogSchema = z.object({
  body: z.object({
    topicId: z.string().min(1),
    quality: z.number().min(0).max(5),
    responseTime: z.number().min(0),
    correct: z.boolean(),
  }),
});
