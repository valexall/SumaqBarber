import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { clearSessionCookie, setSessionCookie } from '../utils/sessionCookie';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.register(req.body);
    setSessionCookie(res, result.token);
    res.status(201).json({ user: result.user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.login(req.body);
    setSessionCookie(res, result.token);
    res.status(200).json({ user: result.user });
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const logout = (_req: Request, res: Response): void => {
  clearSessionCookie(res);
  res.status(204).send();
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const user = await authService.getProfile(userId);
    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const user = await authService.updateProfile(userId, req.body);
    res.status(200).json({ success: true, message: 'Perfil actualizado', data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

