#!/usr/bin/env node
// Create the initial admin account.
// Usage: node scripts/create-admin.js <email> <password>
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDb, getDb } from '../db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters');
    process.exit(1);
  }

  initDb();
  const db = getDb();

  const existing = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    console.error('Email already registered. Use the existing account or delete it first.');
    process.exit(1);
  }

  const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const role = userCount === 0 ? 'admin' : 'user';
  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(id, email.toLowerCase(), hash, role);

  console.log(`✓ Account created: ${email} (${role})`);
  if (role === 'admin') {
    console.log('  You can now log in at /login');
  }
}

main().catch(e => { console.error(e); process.exit(1); });