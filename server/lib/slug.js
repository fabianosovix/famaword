import { getDb } from '../db.js';

let counter = 0;

export function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

// Ensure slug is unique within a table by appending -2, -3, etc.
export function uniqueSlug(baseSlug, table, excludeId = null) {
  const db = getDb();
  let slug = baseSlug || 'sem-titulo';
  let suffix = 1;
  let candidate = slug;

  while (true) {
    const row = db.prepare(`SELECT id FROM ${table} WHERE slug = ? ${excludeId ? 'AND id != ?' : ''}`).get(candidate, ...(excludeId ? [excludeId] : []));
    if (!row) return candidate;
    suffix++;
    candidate = `${slug}-${suffix}`;
  }
}