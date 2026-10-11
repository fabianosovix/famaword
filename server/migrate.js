import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  const db = getDb();

  // 1. Apply base schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  // 2. Run versioned migrations (future-proof)
  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const id = file.replace('.sql', '');
      const applied = db.prepare('SELECT 1 FROM migrations WHERE id = ?').get(id);
      if (applied) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO migrations (id) VALUES (?)').run(id);
      console.log(`  Migration applied: ${id}`);
    }
  }

  console.log('Database ready.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__dirname, 'migrate.js')) {
  runMigrations();
}