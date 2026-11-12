import { NextFunction, Request, Response } from 'express';

type RateEntry = { count: number; resetAt: number };

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
};

export const createRateLimiter = (windowMs: number, max: number) => {
  const entries = new Map<string, RateEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    if (entries.size >= 5_000) {
      for (const [entryKey, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(entryKey);
      }
      if (entries.size >= 5_000) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey) entries.delete(oldestKey);
      }
    }

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = entries.get(key);

    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - current.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta nuevamente más tarde.' });
      return;
    }

    next();
  };
};
