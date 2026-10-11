import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, mapRow, unmapData } from '../db.js';
import { buildWhere, buildSort } from './query.js';

// Encode/decode cursor (offset-based, base64)
function encodeCursor(offset) {
  return Buffer.from(String(offset)).toString('base64');
}
function decodeCursor(cursor) {
  if (!cursor) return 0;
  try { return parseInt(Buffer.from(cursor, 'base64').toString(), 10) || 0; }
  catch { return 0; }
}

// Convert snake_case row keys to camelCase for client compatibility
function camelCase(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function toCamelKeys(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[camelCase(k)] = v;
  return out;
}

// Convert camelCase keys to snake_case for DB columns
function snakeCase(str) {
  return str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}
function toSnakeKeys(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[snakeCase(k)] = v;
  return out;
}

// Default per-page
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;

/**
 * Create a full CRUD router for one database table.
 * @param {object} opts
 * @param {string} opts.table       - DB table name
 * @param {string[]} opts.booleanFields - fields stored as 0/1
 * @param {string[]} opts.jsonFields    - fields stored as JSON strings
 * @param {boolean} opts.publishedOnlyForAnon - if true, unauthenticated GET filters status='published'
 * @param {string} opts.publicFilterField - field to force-filter for anon (e.g. 'status')
 * @param {string} opts.publicFilterValue - value to force for anon (e.g. 'published')
 */
export function createCrudRouter(opts) {
  const {
    table,
    booleanFields = [],
    jsonFields = [],
    publishedOnlyForAnon = false,
    publicFilterField = 'status',
    publicFilterValue = 'published',
  } = opts;

  const router = express.Router();
  const mapOpts = { booleanFields, jsonFields };

  // GET /  — list with filter, sort, limit, cursor, fields, distinct, count
  router.get('/', (req, res, next) => {
    try {
      const db = getDb();
      let query = {};
      if (req.query.q) {
        try { query = JSON.parse(req.query.q); } catch { query = {}; }
      }

      // Enforce published-only for anonymous users
      if (publishedOnlyForAnon && !req.user) {
        query[publicFilterField] = publicFilterValue;
      }

      const { where, params } = buildWhere(query);

      // Distinct
      if (req.query.distinct) {
        const col = req.query.distinct;
        const rows = db.prepare(`SELECT DISTINCT "${col}" as v FROM ${table} ${where} ORDER BY v`).all(...params);
        return res.json({ items: rows.map(r => r.v).filter(v => v !== null), next_cursor: null, has_more: false });
      }

      // Count
      if (req.query.count !== undefined) {
        const row = db.prepare(`SELECT COUNT(*) as n FROM ${table} ${where}`).get(...params);
        return res.json(row.n);
      }

      // Aggregate
      if (req.query.aggregate !== undefined) {
        return res.status(400).json({ message: 'Aggregate not supported yet' });
      }

      // Sort
      const sort = buildSort(req.query.sort || '-created_date');

      // Pagination
      const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
      const offset = decodeCursor(req.query.cursor);

      // Fields
      let selectCols = '*';
      if (req.query.fields) {
        const fields = req.query.fields.split(',').map(f => `"${f.trim()}"`);
        selectCols = fields.join(', ') + ', "id"';
      }

      const sql = `SELECT ${selectCols} FROM ${table} ${where} ${sort} LIMIT ? OFFSET ?`;
      const rows = db.prepare(sql).all(...params, limit, offset);
      const items = rows.map(r => toCamelKeys(mapRow(r, mapOpts)));

      const hasMore = items.length === limit;
      const nextCursor = hasMore ? encodeCursor(offset + limit) : null;

      res.json({ items, next_cursor: nextCursor, has_more: hasMore });
    } catch (e) { next(e); }
  });

  // GET /:id
  router.get('/:id', (req, res, next) => {
    try {
      const db = getDb();
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ message: 'Not found' });

      const record = toCamelKeys(mapRow(row, mapOpts));
      if (publishedOnlyForAnon && !req.user && record[publicFilterField] !== publicFilterValue) {
        return res.status(404).json({ message: 'Not found' });
      }
      res.json(record);
    } catch (e) { next(e); }
  });

  // POST /  — create
  router.post('/', (req, res, next) => {
    try {
      const db = getDb();
      const id = uuidv4();
      const data = unmapData(toSnakeKeys(req.body), mapOpts);
      const cols = Object.keys(data);
      const vals = cols.map(c => data[c]);
      const placeholders = cols.map(() => '?').join(', ');
      db.prepare(
        `INSERT INTO ${table} (id, ${cols.map(c => `"${c}"`).join(', ')}, created_date, updated_date)
         VALUES (?, ${placeholders}, datetime('now'), datetime('now'))`
      ).run(id, ...vals);
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      res.status(201).json(toCamelKeys(mapRow(row, mapOpts)));
    } catch (e) { next(e); }
  });

  // POST /bulk — bulk create
  router.post('/bulk', (req, res, next) => {
    try {
      const db = getDb();
      const records = Array.isArray(req.body) ? req.body : req.body.records;
      if (!Array.isArray(records)) return res.status(400).json({ message: 'Expected array' });
      const created = [];
      const insert = db.prepare(
        `INSERT INTO ${table} (id, created_date, updated_date) VALUES (?, datetime('now'), datetime('now'))`
      );
      const update = db.transaction((recs) => {
        for (const rec of recs) {
          const id = uuidv4();
          insert.run(id);
          const data = unmapData(toSnakeKeys(rec), mapOpts);
          const cols = Object.keys(data);
          if (cols.length === 0) continue;
          const setClause = cols.map(c => `"${c}" = ?`).join(', ');
          db.prepare(`UPDATE ${table} SET ${setClause}, updated_date = datetime('now') WHERE id = ?`)
            .run(...cols.map(c => data[c]), id);
          created.push(toCamelKeys(mapRow(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id), mapOpts)));
        }
      });
      update(records);
      res.json({ created: created.length, records: created });
    } catch (e) { next(e); }
  });

  // PUT /:id — update
  router.put('/:id', (req, res, next) => {
    try {
      const db = getDb();
      const existing = db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Not found' });
      const data = unmapData(toSnakeKeys(req.body), mapOpts);
      const cols = Object.keys(data);
      if (cols.length > 0) {
        const setClause = cols.map(c => `"${c}" = ?`).join(', ');
        db.prepare(`UPDATE ${table} SET ${setClause}, updated_date = datetime('now') WHERE id = ?`)
          .run(...cols.map(c => data[c]), req.params.id);
      }
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
      res.json(toCamelKeys(mapRow(row, mapOpts)));
    } catch (e) { next(e); }
  });

  // DELETE /:id
  router.delete('/:id', (req, res, next) => {
    try {
      const db = getDb();
      const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
      if (result.changes === 0) return res.status(404).json({ message: 'Not found' });
      res.json({ ok: true, id: req.params.id });
    } catch (e) { next(e); }
  });

  // POST /delete-many — delete by query
  router.post('/delete-many', (req, res, next) => {
    try {
      const db = getDb();
      const { where, params } = buildWhere(req.body || {});
      const result = db.prepare(`DELETE FROM ${table} ${where}`).run(...params);
      res.json({ deleted: result.changes });
    } catch (e) { next(e); }
  });

  return router;
}