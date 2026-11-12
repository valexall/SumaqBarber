import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { SESSION_COOKIE } from '../utils/sessionCookie';
import prisma from '../config/prisma';

export interface AuthPayload {
  userId: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

const getCookie = (req: Request, name: string): string | undefined => {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
};

const getToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();
  return getCookie(req, SESSION_COOKIE);
};

const verifyToken = (token: string): AuthPayload => jwt.verify(token, JWT_SECRET) as AuthPayload;

const resolveActiveUser = async (token: string): Promise<AuthPayload> => {
  const payload = verifyToken(token);
  if (!payload.userId) throw new Error('Invalid token payload');

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, isActive: true },
    select: { id: true, role: true },
  });
  if (!user) throw new Error('Inactive or missing user');

  return { userId: user.id, role: user.role };
};

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    (req as AuthenticatedRequest).user = await resolveActiveUser(token);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = getToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    (req as AuthenticatedRequest).user = await resolveActiveUser(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'La sesión no es válida o expiró.' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
