import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

export const validateBody = (schema: ZodType) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: 'Los datos enviados no son válidos.',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  req.body = result.data;
  next();
};

export const validateQuery = (schema: ZodType) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: 'Los parámetros enviados no son válidos.',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  res.locals.validatedQuery = result.data;
  next();
};
