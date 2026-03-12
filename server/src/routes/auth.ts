import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import pool from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { sendWelcomeEmail } from '../lib/email.js';
import type { UserRole } from '../types/index.js';

const googleClient = new OAuth2Client(config.googleClientId);

const router = Router();
const SALT_ROUNDS = 12;

function signToken(userId: string, role: UserRole): string {
  return jwt.sign(
    { userId, role },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, role, firstName, lastName } = req.body;
  if (!email || !password || !role || !firstName || !lastName) {
    return res.status(400).json({ error: 'Missing required fields: email, password, role, firstName, lastName' });
  }
  if (role !== 'student' && role !== 'pi') {
    return res.status(400).json({ error: 'Role must be student or pi' });
  }
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, first_name, last_name, created_at`,
      [email, password_hash, role, firstName, lastName]
    );
    const user = result.rows[0];
    if (role === 'student') {
      await pool.query(
        'INSERT INTO student_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    } else {
      await pool.query(
        'INSERT INTO pi_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    }
    const token = signToken(user.id, role);
    sendWelcomeEmail(user.email, user.first_name).catch(() => {});
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    throw err;
  }
}));

// POST /api/auth/google - sign in or register via Google OAuth (@ufl.edu only)
router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { credential, role } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential' });
  }
  if (!config.googleClientId) {
    return res.status(503).json({ error: 'Google login is not configured on this server' });
  }

  // Verify the Google ID token
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Invalid Google credential' });
  }

  if (!payload?.email) {
    return res.status(401).json({ error: 'Could not retrieve email from Google' });
  }

  if (!payload.email.toLowerCase().endsWith('@ufl.edu')) {
    return res.status(403).json({ error: 'Only @ufl.edu Google accounts are allowed' });
  }

  const email = payload.email.toLowerCase();
  const firstName = payload.given_name ?? email.split('@')[0];
  const lastName = payload.family_name ?? '';

  // Find existing user
  const existing = await pool.query(
    'SELECT id, email, role, first_name, last_name FROM users WHERE email = $1',
    [email]
  );

  if (existing.rows[0]) {
    const user = existing.rows[0];
    const token = signToken(user.id, user.role);
    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
    });
  }

  // New user — role is required for registration
  const resolvedRole: UserRole = role === 'pi' ? 'pi' : 'student';
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, role, first_name, last_name`,
    [email, passwordHash, resolvedRole, firstName, lastName]
  );
  const user = result.rows[0];

  if (resolvedRole === 'student') {
    await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [user.id]);
  } else {
    await pool.query('INSERT INTO pi_profiles (user_id) VALUES ($1)', [user.id]);
  }

  sendWelcomeEmail(user.email, user.first_name).catch(() => {});
  const token = signToken(user.id, resolvedRole);
  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
  });
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  const result = await pool.query(
    'SELECT id, email, password_hash, role, first_name, last_name FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user.id, user.role);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  });
}));

// POST /api/auth/demo - instant demo login, upserts demo accounts
router.post('/demo', asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  if (role !== 'student' && role !== 'pi') {
    return res.status(400).json({ error: 'Role must be student or pi' });
  }
  const email = role === 'student' ? 'demo.student@researchhub.dev' : 'demo.pi@researchhub.dev';
  const firstName = 'Demo';
  const lastName = role === 'student' ? 'Student' : 'PI';

  let user = (await pool.query('SELECT id, email, role, first_name, last_name FROM users WHERE email = $1', [email])).rows[0];

  if (!user) {
    const passwordHash = await bcrypt.hash('demo-password-not-for-login', SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, first_name, last_name`,
      [email, passwordHash, role, firstName, lastName]
    );
    user = result.rows[0];
    if (role === 'student') {
      await pool.query('INSERT INTO student_profiles (user_id) VALUES ($1)', [user.id]);
    } else {
      await pool.query('INSERT INTO pi_profiles (user_id) VALUES ($1)', [user.id]);
    }
  }

  const token = signToken(user.id, user.role);
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
  });
}));

router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id, email, role, first_name, last_name, created_at FROM users WHERE id = $1',
    [req.userId]
  );
  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
  });
}));

export default router;
