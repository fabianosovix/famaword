import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDb } from './db.js';
import { runMigrations } from './migrate.js';
import { authRouter, optionalAuth, requireAuth, requireAdmin } from './auth.js';
import articlesRouter from './routes/articles.js';
import categoriesRouter from './routes/categories.js';
import pagesRouter from './routes/pages.js';
import editorsRouter from './routes/editors.js';
import settingsRouter from './routes/settings.js';
import usersRouter from './routes/users.js';
import aiRouter from './routes/ai.js';
import mediaRouter from './routes/media.js';
import sitemapRouter from './routes/sitemap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const app = express();

// --- Init ---
initDb();
runMigrations();
if (!fs.existsSync(config.uploadsDir)) fs.mkdirSync(config.uploadsDir, { recursive: true });

// --- Middleware ---
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Serve uploaded files
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '30d' }));

// --- API ---
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/pages', pagesRouter);
app.use('/api/editors', editorsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/users', requireAuth, requireAdmin, usersRouter);
app.use('/api/ai', requireAuth, aiRouter);
app.use('/api/media', requireAuth, mediaRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, version: config.version }));

// SEO: sitemap.xml + robots.txt (dynamic, reflects latest published content)
app.use(sitemapRouter);

// --- Serve built frontend ---
const distDir = path.join(root, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '1h' }));
  // SPA fallback: any non-API route serves index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ message: 'Frontend not built. Run: npm run build' });
    }
    res.status(503).send('Frontend not built. Run: npm run build');
  });
}

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`\n  VelocCMS v${config.version}`);
  console.log(`  → ${config.publicUrl}\n`);
});