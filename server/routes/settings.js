import express from 'express';
import { getDb, mapRow, unmapData } from '../db.js';
import { optionalAuth, requireAuth, requireAdmin } from '../auth.js';

const router = express.Router();
const TABLE = 'settings';
const JSON_FIELDS = ['social_links'];
const MAP_OPTS = { jsonFields: JSON_FIELDS };

// GET / — public read
router.get('/', optionalAuth, (req, res, next) => {
  try {
    const row = getDb().prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get();
    if (!row) return res.json({});
    res.json(mapRow(row, MAP_OPTS));
  } catch (e) { next(e); }
});

// PUT / — admin only
router.put('/', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const db = getDb();
    const data = unmapData(req.body, MAP_OPTS);
    delete data.id;
    const cols = Object.keys(data);
    // Upsert: settings is a single-row table (id = 1)
    const existing = db.prepare(`SELECT 1 FROM ${TABLE} WHERE id = 1`).get();
    if (!existing) {
      const colNames = cols.map(c => `"${c}"`);
      const placeholders = cols.map(() => '?');
      db.prepare(`INSERT INTO ${TABLE} (id, ${colNames.join(', ')}) VALUES (1, ${placeholders.join(', ')})`)
        .run(...cols.map(c => data[c]));
    } else {
      if (cols.length) {
        db.prepare(`UPDATE ${TABLE} SET ${cols.map(c => `"${c}" = ?`).join(', ')} WHERE id = 1`)
          .run(...cols.map(c => data[c]));
      }
    }
    const row = db.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get();
    res.json(mapRow(row, MAP_OPTS));
  } catch (e) { next(e); }
});

export default router;