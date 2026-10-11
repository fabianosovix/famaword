import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_date: u.created_date };
}

// GET / — list users (admin only, enforced by index.js)
router.get('/', (req, res, next) => {
  try {
    const rows = getDb().prepare('SELECT * FROM users ORDER BY created_date DESC').all();
    res.json({ items: rows.map(publicUser), next_cursor: null, has_more: false });
  } catch (e) { next(e); }
});

// PUT /:id — update role
router.put('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { role, full_name } = req.body;
    if (role && !['admin', 'user'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (role) db.prepare('UPDATE users SET role = ?, updated_date = datetime(\'now\') WHERE id = ?').run(role, req.params.id);
    if (full_name !== undefined) db.prepare('UPDATE users SET full_name = ?, updated_date = datetime(\'now\') WHERE id = ?').run(full_name, req.params.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json(publicUser(user));
  } catch (e) { next(e); }
});

// DELETE /:id
router.delete('/:id', (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    const result = getDb().prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /invite — create a new user (admin sets email + role; password generated)
router.post('/invite', async (req, res, next) => {
  try {
    const { email, role, full_name, password } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });
    const bcrypt = (await import('bcryptjs')).default;
    const { v4: uuidv4 } = await import('uuid');
    const db = getDb();
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase())) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)')
      .run(id, email.toLowerCase(), hash, full_name || null, role || 'user');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(publicUser(user));
  } catch (e) { next(e); }
});

export default router;