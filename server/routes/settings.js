import express from 'express';
import { getDb, mapRow, unmapData } from '../db.js';
import { optionalAuth, requireAuth, requireAdmin } from '../auth.js';

const router = express.Router();
const TABLE = 'settings';
const JSON_FIELDS = ['social_links'];
const MAP_OPTS = { jsonFields: JSON_FIELDS };

// API key fields — never exposed to the client
const KEY_FIELDS = ['ai_text_api_key', 'ai_image_api_key'];
const KEY_MASK = '•••••';

// GET / — public read (keys are masked)
router.get('/', optionalAuth, (req, res, next) => {
  try {
    const row = getDb().prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get();
    if (!row) return res.json({});
    const mapped = mapRow(row, MAP_OPTS);
    for (const k of KEY_FIELDS) {
      mapped[k] = mapped[k] ? KEY_MASK : '';
    }
    res.json(mapped);
  } catch (e) { next(e); }
});

// PUT / — admin only (keys only updated when a new value is provided)
router.put('/', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const db = getDb();
    const data = unmapData(req.body, MAP_OPTS);
    delete data.id;
    // Skip key fields that are empty or still the mask — keep existing value
    for (const k of KEY_FIELDS) {
      if (!data[k] || data[k] === KEY_MASK) {
        delete data[k];
      }
    }
    const cols = Object.keys(data);
    const existing = db.prepare(`SELECT 1 FROM ${TABLE} WHERE id = 1`).get();
    if (!existing) {
      const colNames = cols.map((c) => `"${c}"`);
      const placeholders = cols.map(() => '?');
      db.prepare(`INSERT INTO ${TABLE} (id, ${colNames.join(', ')}) VALUES (1, ${placeholders.join(', ')})`)
        .run(...cols.map((c) => data[c]));
    } else if (cols.length) {
      db.prepare(`UPDATE ${TABLE} SET ${cols.map((c) => `"${c}" = ?`).join(', ')} WHERE id = 1`)
        .run(...cols.map((c) => data[c]));
    }
    const row = db.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get();
    const mapped = mapRow(row, MAP_OPTS);
    for (const k of KEY_FIELDS) {
      mapped[k] = mapped[k] ? KEY_MASK : '';
    }
    res.json(mapped);
  } catch (e) { next(e); }
});

export default router;