import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/access';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.issues,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message });
  }

  // Generic error fallback
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
};
