import express from 'express';
import { getDb } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { chatCompletion, generateImage } from '../lib/ai.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import { config } from '../config.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// POST /api/ai/generate-article — generate an article draft via AI
router.post('/generate-article', async (req, res, next) => {
  try {
    const { topic, category_id, language = 'pt-BR', generate_cover = true } = req.body;
    if (!topic) return res.status(400).json({ message: 'Topic is required' });

    const langNames = { 'pt-BR': 'português brasileiro', 'es': 'espanhol', 'en': 'inglês', 'fr': 'francês', 'ar': 'árabe' };
    const langName = langNames[language] || 'português';

    const prompt = `Você é um redator profissional. Escreva um artigo completo e otimizado para SEO sobre: "${topic}".
Requisitos:
- Idioma: ${langName}
- Mínimo 800 palavras
- Use HTML semântico (<h2>, <h3>, <p>, <ul>, <ol>)
- Inclua uma introdução envolvente e conclusão
- Otimize para leitura na web (parágrafos curtos, subtítulos)
- Não inclua a tag <h1> (o título é gerado separadamente)

Responda em JSON com este formato:
{
  "title": "título do artigo (máx 70 caracteres)",
  "summary": "resumo de 1-2 frases (máx 160 caracteres)",
  "content": "conteúdo HTML completo",
  "seo_title": "título SEO (máx 60 caracteres)",
  "seo_description": "descrição SEO (máx 160 caracteres)"
}`;

    const jsonText = await chatCompletion({
      messages: [{ role: 'user', content: prompt }],
      jsonSchema: true,
      temperature: 0.7,
    });

    let parsed;
    try { parsed = JSON.parse(jsonText); }
    catch { parsed = { title: topic, summary: '', content: jsonText }; }

    // Resolve editor
    const db = getDb();
    const editors = db.prepare('SELECT id FROM editors ORDER BY RANDOM() LIMIT 1').all();
    const editor_id = editors[0]?.id || null;

    // Create draft article
    const id = uuidv4();
    const slug = uniqueSlug(slugify(parsed.title || topic), 'articles');
    db.prepare(
      `INSERT INTO articles (id, title, slug, summary, content, category_id, editor_id, language, status, ai_generated, seo_title, seo_description, created_date, updated_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, datetime('now'), datetime('now'))`
    ).run(id, parsed.title || topic, slug, parsed.summary || '', parsed.content || '', category_id || null, editor_id, language, parsed.seo_title || null, parsed.seo_description || null);

    // Optionally generate cover
    if (generate_cover) {
      try {
        const coverPrompt = `Capa de artigo profissional sobre "${parsed.title || topic}", estilo editorial moderno, 16:9, sem texto`;
        const buffer = await generateImage({ prompt: coverPrompt, size: '1792x1024' });
        if (buffer) {
          const filename = `${uuidv4()}.webp`;
          const destPath = path.join(config.uploadsDir, filename);
          fs.writeFileSync(destPath, buffer);
          const localUrl = `${config.publicUrl.replace(/\/$/, '')}/uploads/${filename}`;
          db.prepare('UPDATE articles SET cover_image = ? WHERE id = ?').run(localUrl, id);
        }
      } catch (coverErr) {
        console.error('Cover generation failed:', coverErr.message);
        // Continue without cover
      }
    }

    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    res.json({ ok: true, article_id: id, article });
  } catch (e) { next(e); }
});

// POST /api/ai/generate-cover — generate cover image for an existing article
router.post('/generate-cover', async (req, res, next) => {
  try {
    const { article_id } = req.body;
    if (!article_id) return res.status(400).json({ message: 'article_id is required' });
    const db = getDb();
    const article = db.prepare('SELECT title FROM articles WHERE id = ?').get(article_id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    const coverPrompt = `Capa de artigo profissional sobre "${article.title}", estilo editorial moderno, 16:9, sem texto`;
    const buffer = await generateImage({ prompt: coverPrompt, size: '1792x1024' });
    if (!buffer) return res.status(500).json({ message: 'Image generation failed' });

    const filename = `${uuidv4()}.webp`;
    const destPath = path.join(config.uploadsDir, filename);
    fs.writeFileSync(destPath, buffer);
    const localUrl = `${config.publicUrl.replace(/\/$/, '')}/uploads/${filename}`;
    db.prepare('UPDATE articles SET cover_image = ? WHERE id = ?').run(localUrl, article_id);

    res.json({ ok: true, cover_image: localUrl });
  } catch (e) { next(e); }
});

// POST /api/ai/run-scheduled — process scheduled AI tasks for today
router.post('/run-scheduled', async (req, res, next) => {
  try {
    const db = getDb();
    const today = new Date().getDay();

    // Get today's scheduled topics
    const scheduled = db.prepare('SELECT * FROM ai_schedule WHERE day_of_week = ? AND active = 1').all(today);
    // Get pending queue items
    const queued = db.prepare("SELECT * FROM ai_queue WHERE status = 'pending'").all();

    const tasks = [
      ...scheduled.map(s => ({ type: 'schedule', ...s })),
      ...queued.map(q => ({ type: 'queue', ...q })),
    ].slice(0, 3);  // Max 3 per run

    const results = [];
    for (const task of tasks) {
      try {
        // Mark as processing
        if (task.type === 'queue') {
          db.prepare("UPDATE ai_queue SET status = 'processing', updated_date = datetime('now') WHERE id = ?").run(task.id);
        }

        // Generate article (reuse the generate-article logic via internal call)
        const langNames = { 'pt-BR': 'português brasileiro', 'es': 'espanhol', 'en': 'inglês', 'fr': 'francês', 'ar': 'árabe' };
        const langName = langNames[task.language] || 'português';
        const prompt = `Escreva um artigo completo e otimizado para SEO sobre: "${task.topic}". Idioma: ${langName}. Mínimo 800 palavras. Use HTML semântico. Responda em JSON: {"title":"","summary":"","content":"","seo_title":"","seo_description":""}`;

        const jsonText = await chatCompletion({ messages: [{ role: 'user', content: prompt }], jsonSchema: true });
        let parsed;
        try { parsed = JSON.parse(jsonText); } catch { parsed = { title: task.topic, summary: '', content: jsonText }; }

        const editors = db.prepare('SELECT id FROM editors ORDER BY RANDOM() LIMIT 1').all();
        const articleId = uuidv4();
        const slug = uniqueSlug(slugify(parsed.title || task.topic), 'articles');
        db.prepare(
          `INSERT INTO articles (id, title, slug, summary, content, category_id, editor_id, language, status, ai_generated, seo_title, seo_description, created_date, updated_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 1, ?, ?, datetime('now'), datetime('now'))`
        ).run(articleId, parsed.title || task.topic, slug, parsed.summary || '', parsed.content || '', task.category_id || null, editors[0]?.id || null, task.language, parsed.seo_title || null, parsed.seo_description || null);

        if (task.type === 'queue') {
          db.prepare("UPDATE ai_queue SET status = 'done', result_article_id = ?, updated_date = datetime('now') WHERE id = ?").run(articleId, task.id);
        }

        results.push({ topic: task.topic, status: 'done', article_id: articleId });
      } catch (err) {
        if (task.type === 'queue') {
          db.prepare("UPDATE ai_queue SET status = 'failed', error = ?, updated_date = datetime('now') WHERE id = ?").run(err.message, task.id);
        }
        results.push({ topic: task.topic, status: 'failed', error: err.message });
      }
    }

    res.json({ ok: true, processed: results.length, results });
  } catch (e) { next(e); }
});

// POST /api/ai/llm — generic LLM invocation (replaces base44 InvokeLLM)
router.post('/llm', async (req, res, next) => {
  try {
    const { prompt, model, response_json_schema } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });
    const content = await chatCompletion({
      messages: [{ role: 'user', content: prompt }],
      model,
      jsonSchema: !!response_json_schema,
    });
    res.json({ content });
  } catch (e) { next(e); }
});

export default router;