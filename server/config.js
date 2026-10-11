import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function bool(val, fallback) {
  if (val === undefined) return fallback;
  return val === 'true' || val === '1';
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  root,
  dbPath: process.env.DB_PATH || path.join(root, 'data', 'veloccms.db'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'uploads'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
  version: process.env.npm_package_version || '1.0.0',
};

export function isConfigured() {
  return config.jwtSecret !== 'dev-only-change-me' && config.jwtSecret.length > 16;
}