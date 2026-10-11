import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db.js';
import { config } from './config.js';

const router = express.Router();

// --- Helpers ---
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    created_date: user.created_date,
  };
}

// --- Middleware ---
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
      if (user) req.user = publicUser(user);
    } catch { /* invalid token — treat as anonymous */ }
  }
  next();
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = publicUser(user);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// --- Routes ---

// POST /api/auth/register  (open during initial setup; admin-only after first user exists)
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const db = getDb();
    const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
    // After the first admin is created, only admins can register new users
    if (userCount > 0) {
      const header = req.headers.authorization;
      if (!header) return res.status(403).json({ message: 'Registration is closed. Ask an admin for an invite.' });
      try {
        const payload = jwt.verify(header.slice(7), config.jwtSecret);
        const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(payload.id);
        if (!admin || admin.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      } catch {
        return res.status(403).json({ message: 'Admin access required' });
      }
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    const role = userCount === 0 ? 'admin' : 'user';  // First user becomes admin
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`
    ).run(id, email.toLowerCase(), hash, full_name || null, role);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) { next(e); }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/me
router.put('/me', requireAuth, (req, res, next) => {
  try {
    const { full_name } = req.body;
    const db = getDb();
    db.prepare('UPDATE users SET full_name = ?, updated_date = datetime(\'now\') WHERE id = ?')
      .run(full_name || null, req.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json(publicUser(user));
  } catch (e) { next(e); }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const ok = await bcrypt.compare(current_password || '', user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_date = datetime(\'now\') WHERE id = ?')
      .run(hash, req.user.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;