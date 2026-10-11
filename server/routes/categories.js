import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, mapRow, unmapData } from '../db.js';
import { buildWhere, buildSort } from '../lib/query.js';
import { optionalAuth } from '../auth.js';
import { slugify, uniqueSlug } from '../lib/slug.js';

const router = express.Router();
const TABLE = 'categories';
const BOOL_FIELDS = ['in_main_menu'];
const MAP_OPTS = { booleanFields: BOOL_FIELDS };

function camelKeys(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  return out;
}
function snakeKeys(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k.replace(/[A-Z]/g, c => '_' + c.toLowerCase())] = v;
  return out;
}

router.use(optionalAuth);

// GET / — list
router.get('/', (req, res, next) => {
  try {
    let query = {};
    if (req.query.q) { try { query = JSON.parse(req.query.q); } catch {} }
    const { where, params } = buildWhere(query);
    const sort = buildSort(req.query.sort || '"order"');
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = req.query.cursor ? parseInt(Buffer.from(req.query.cursor, 'base64').toString(), 10) || 0 : 0;

    let selectCols = '*';
    if (req.query.fields) {
      selectCols = req.query.fields.split(',').map(f => `"${f.trim()}"`).join(', ') + ', "id"';
    }

    const rows = getDb().prepare(`SELECT ${selectCols} FROM ${TABLE} ${where} ${sort} LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const items = rows.map(r => camelKeys(mapRow(r, MAP_OPTS)));
    const hasMore = items.length === limit;
    res.json({ items, next_cursor: hasMore ? Buffer.from(String(offset + limit)).toString('base64') : null, has_more: hasMore });
  } catch (e) { next(e); }
});

// GET /:id
router.get('/:id', (req, res, next) => {
  try {
    const row = getDb().prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(camelKeys(mapRow(row, MAP_OPTS)));
  } catch (e) { next(e); }
});

// POST / — create
router.post('/', (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const db = getDb();
    const body = { ...req.body };
    if (!body.name) return res.status(400).json({ message: 'Name is required' });
    body.slug = body.slug ? uniqueSlug(slugify(body.slug), TABLE) : uniqueSlug(slugify(body.name), TABLE);

    const id = uuidv4();
    const data = unmapData(snakeKeys(body), MAP_OPTS);
    const cols = Object.keys(data);
    db.prepare(
      `INSERT INTO ${TABLE} (id, ${cols.map(c => `"${c}"`).join(', ')}, created_date, updated_date)
       VALUES (?, ${cols.map(() => '?').join(', ')}, datetime('now'), datetime('now'))`
    ).run(id, ...cols.map(c => data[c]));
    const row = db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).get(id);
    res.status(201).json(camelKeys(mapRow(row, MAP_OPTS)));
  } catch (e) { next(e); }
});

// PUT /:id
router.put('/:id', (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const db = getDb();
    if (!db.prepare(`SELECT 1 FROM ${TABLE} WHERE id = ?`).get(req.params.id)) return res.status(404).json({ message: 'Not found' });
    const body = { ...req.body };
    if (body.slug) body.slug = uniqueSlug(slugify(body.slug), TABLE, req.params.id);
    const data = unmapData(snakeKeys(body), MAP_OPTS);
    const cols = Object.keys(data);
    if (cols.length) {
      db.prepare(`UPDATE ${TABLE} SET ${cols.map(c => `"${c}" = ?`).join(', ')}, updated_date = datetime('now') WHERE id = ?`)
        .run(...cols.map(c => data[c]), req.params.id);
    }
    res.json(camelKeys(mapRow(db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).get(req.params.id), MAP_OPTS)));
  } catch (e) { next(e); }
});

// DELETE /:id
router.delete('/:id', (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const result = getDb().prepare(`DELETE FROM ${TABLE} WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true, id: req.params.id });
  } catch (e) { next(e); }
});

export default router;