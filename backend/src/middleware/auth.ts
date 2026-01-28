import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export const generateToken = (userId: string, email: string, role?: string): string => {
  return jwt.sign(
    { id: userId, email, role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
};

export const verifyToken = (token: string): { id: string; email: string; role?: string } => {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role?: string };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: { message: 'Authentication required' } });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed', { error, path: req.path });
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Optional auth - continue without user
    next();
  }
};
