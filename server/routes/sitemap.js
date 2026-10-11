import express from 'express';
import { getDb } from '../db.js';
import { config } from '../config.js';

const router = express.Router();

function escapeXml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function baseUrl() {
  return (config.publicUrl || '').replace(/\/+$/, '');
}

function toIsoDate(sqlDate) {
  if (!sqlDate) return new Date().toISOString();
  // SQLite stores as "YYYY-MM-DD HH:MM:SS" (UTC). Convert to ISO 8601.
  const d = new Date(sqlDate.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// GET /sitemap.xml
router.get('/sitemap.xml', (req, res, next) => {
  try {
    const base = baseUrl();
    const db = getDb();
    const urls = [];

    // Homepage
    urls.push({
      loc: `${base}/`,
      changefreq: 'daily',
      priority: '1.0',
      lastmod: new Date().toISOString(),
    });

    // Published articles (newest first)
    const articles = db.prepare(
      `SELECT slug, updated_date FROM articles WHERE status = 'published' ORDER BY created_date DESC`
    ).all();
    for (const a of articles) {
      urls.push({
        loc: `${base}/artigo/${encodeURIComponent(a.slug)}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: toIsoDate(a.updated_date),
      });
    }

    // Categories
    const categories = db.prepare(
      `SELECT slug, updated_date FROM categories ORDER BY "order" ASC, name ASC`
    ).all();
    for (const c of categories) {
      urls.push({
        loc: `${base}/categoria/${encodeURIComponent(c.slug)}`,
        changefreq: 'weekly',
        priority: '0.6',
        lastmod: toIsoDate(c.updated_date),
      });
    }

    // Static pages
    const pages = db.prepare(
      `SELECT slug, updated_date FROM pages ORDER BY "order" ASC, title ASC`
    ).all();
    for (const p of pages) {
      urls.push({
        loc: `${base}/pagina/${encodeURIComponent(p.slug)}`,
        changefreq: 'monthly',
        priority: '0.5',
        lastmod: toIsoDate(p.updated_date),
      });
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (e) { next(e); }
});

// GET /ads.txt
router.get('/ads.txt', (req, res, next) => {
  try {
    const row = getDb().prepare('SELECT ads_txt FROM settings WHERE id = 1').get();
    const body = (row && row.ads_txt) || '';
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (e) { next(e); }
});

// GET /robots.txt
router.get('/robots.txt', (req, res, next) => {
  try {
    const base = baseUrl();
    const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (e) { next(e); }
});

export default router;