import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

let db = null;

export function initDb() {
  const dbPath = path.resolve(config.dbPath);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function getDb() {
  if (!db) initDb();
  return db;
}

// Convert a DB row (snake_case + 0/1 booleans) into a client record
export function mapRow(row, { booleanFields = [], jsonFields = [] } = {}) {
  if (!row) return null;
  const out = { ...row };
  for (const f of booleanFields) {
    if (out[f] !== undefined && out[f] !== null) out[f] = !!out[f];
  }
  for (const f of jsonFields) {
    if (out[f] && typeof out[f] === 'string') {
      try { out[f] = JSON.parse(out[f]); } catch { /* keep as string */ }
    }
  }
  return out;
}

// Convert a client record into DB values (booleans → 0/1, objects → JSON)
export function unmapData(data, { booleanFields = [], jsonFields = [] } = {}) {
  const out = { ...data };
  for (const f of booleanFields) {
    if (out[f] !== undefined && out[f] !== null) out[f] = out[f] ? 1 : 0;
  }
  for (const f of jsonFields) {
    if (out[f] !== undefined && out[f] !== null && typeof out[f] === 'object') {
      out[f] = JSON.stringify(out[f]);
    }
  }
  // Never allow client to set these
  delete out.id;
  delete out.created_date;
  delete out.updated_date;
  return out;
}