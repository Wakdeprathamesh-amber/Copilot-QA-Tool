import { Router, Request, Response } from 'express';
import { generateToken } from '../middleware/auth';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const LOGIN_EMAIL = process.env.LOGIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';

/** Constant-time string comparison to reduce timing attack surface */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { token: string, user: { id, email, role } }
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
      logger.warn('Auth login attempted but LOGIN_EMAIL or LOGIN_PASSWORD not configured');
      res.status(503).json({ error: { message: 'Login is not configured' } });
      return;
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: { message: 'Email and password are required' } });
      return;
    }

    const emailMatch = email.trim().toLowerCase() === LOGIN_EMAIL.trim().toLowerCase();
    const passwordMatch = secureCompare(password, LOGIN_PASSWORD);

    if (!emailMatch || !passwordMatch) {
      logger.warn('Auth login failed', { email: email?.trim ? email.trim() : '(missing)' });
      res.status(401).json({ error: { message: 'Invalid email or password' } });
      return;
    }

    const userId = 'admin';
    const role = 'admin';
    const token = generateToken(userId, LOGIN_EMAIL.trim(), role);

    res.json({
      token,
      user: { id: userId, email: LOGIN_EMAIL.trim(), role },
    });
  } catch (error) {
    logger.error('Auth login error', { error });
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * GET /api/auth/me
 * Requires: Authorization: Bearer <token>
 * Returns: { user: { id, email, role } }
 */
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: { message: 'Authentication required' } });
    return;
  }
  res.json({ user: req.user });
});

export default router;
