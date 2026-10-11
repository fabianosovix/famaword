-- VelocCMS — Database schema v1.0.0
-- SQLite (WAL mode, foreign keys enabled)

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'user',   -- 'admin' | 'user'
  created_date  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  parent_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  in_main_menu  INTEGER NOT NULL DEFAULT 0,
  "order"       REAL NOT NULL DEFAULT 0,
  created_date  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_categories_menu ON categories(in_main_menu);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

CREATE TABLE IF NOT EXISTS editors (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT,
  description   TEXT,
  photo         TEXT,
  created_date  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS articles (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  summary         TEXT,
  content         TEXT,
  cover_image     TEXT,
  category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  editor_id       TEXT REFERENCES editors(id) ON DELETE SET NULL,
  language        TEXT NOT NULL DEFAULT 'pt-BR',
  status          TEXT NOT NULL DEFAULT 'draft',   -- draft | published | scheduled
  scheduled_date  TEXT,
  ai_generated    INTEGER NOT NULL DEFAULT 0,
  seo_title       TEXT,
  seo_description TEXT,
  created_date    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_articles_status   ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug      ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_created   ON articles(created_date);

CREATE TABLE IF NOT EXISTS pages (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  slug           TEXT NOT NULL,
  content        TEXT,
  page_type      TEXT NOT NULL DEFAULT 'custom',  -- about | contact | privacy | cookies | custom
  in_footer_menu INTEGER NOT NULL DEFAULT 1,
  "order"        REAL NOT NULL DEFAULT 0,
  created_date   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pages_footer ON pages(in_footer_menu);

CREATE TABLE IF NOT EXISTS settings (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  site_name        TEXT NOT NULL DEFAULT 'Meu Site',
  language         TEXT NOT NULL DEFAULT 'pt-BR',
  logo_url         TEXT,
  primary_color    TEXT DEFAULT '#111111',
  secondary_color  TEXT DEFAULT '#6b7280',
  header_scripts   TEXT,
  footer_scripts   TEXT,
  social_links     TEXT,   -- JSON
  ads_txt          TEXT,
  footer_text      TEXT
);

CREATE TABLE IF NOT EXISTS ai_queue (
  id                TEXT PRIMARY KEY,
  topic             TEXT NOT NULL,
  category_id       TEXT REFERENCES categories(id) ON DELETE SET NULL,
  language          TEXT NOT NULL DEFAULT 'pt-BR',
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  result_article_id TEXT,
  error             TEXT,
  created_date      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_queue(status);

CREATE TABLE IF NOT EXISTS ai_schedule (
  id           TEXT PRIMARY KEY,
  day_of_week  INTEGER NOT NULL,   -- 0-6
  topic        TEXT NOT NULL,
  category_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  language     TEXT NOT NULL DEFAULT 'pt-BR',
  active       INTEGER NOT NULL DEFAULT 1,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_schedule_active ON ai_schedule(active);

CREATE TABLE IF NOT EXISTS migrations (
  id        TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default settings
INSERT OR IGNORE INTO settings (id, site_name) VALUES (1, 'Meu Site');