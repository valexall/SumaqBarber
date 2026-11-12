import { Response } from 'express';

export const SESSION_COOKIE = 'sumaq_session';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: FOURTEEN_DAYS_MS,
  path: '/',
};

export const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(SESSION_COOKIE, token, cookieOptions);
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
};
