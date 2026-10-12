import express from 'express';
import { getDb } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { chatCompletion, generateImageSource } from '../lib/ai.js';
import { slugify, uniqueSlug } from '../lib/slug.js';

import { resolveArticleRelations } from '../lib/articleRelations.js';
import { startCoverJob, readCoverJob } from '../lib/coverJobs.js';

const router = express.Router();

// POST /api/ai/generate-article — generate an article draft via AI
router.post('/generate-article', async (req, res, next) => {
  try {
    const { topic, category_id, language = 'pt-BR', generate_cover = true } = req.body;
    if (!topic) return res.status(400).json({ message: 'Topic is required' });
    const { editor_id } = resolveArticleRelations(category_id, req.body.editor_id);

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


    // Create draft article
    const id = uuidv4();
    const slug = uniqueSlug(slugify(parsed.title || topic), 'articles');
    db.prepare(
      `INSERT INTO articles (id, title, slug, summary, content, category_id, editor_id, language, status, ai_generated, seo_title, seo_description, created_date, updated_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, datetime('now'), datetime('now'))`
    ).run(id, parsed.title || topic, slug, parsed.summary || '', parsed.content || '', category_id || null, editor_id, language, parsed.seo_title || null, parsed.seo_description || null);

    // Return the temporary source; only the converted WebP is uploaded
    // and associated with this draft by the self-hosted client.
    let cover_source;
    let cover_error;
    if (generate_cover) {
      try {
        cover_source = await generateImageSource(`Capa de artigo profissional sobre "${parsed.title || topic}", estilo editorial moderno, 16:9, sem texto`);
      } catch (coverErr) {
        cover_error = coverErr.message;
      }
    }

    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
    res.json({ ok: true, article_id: id, article, cover_source, cover_error });
  } catch (e) { next(e); }
});

// Start quickly; the client polls while the provider works in the background.
router.post('/generate-cover', (req, res, next) => {
  try {
    const { article_id, topic, prompt } = req.body;
    const article = article_id
      ? getDb().prepare('SELECT title FROM articles WHERE id = ?').get(article_id)
      : null;
    if (article_id && !article) return res.status(404).json({ message: 'Article not found' });
    const title = topic || prompt || article?.title;
    if (!title || typeof title !== 'string') return res.status(400).json({ message: 'Informe o título ou o artigo para gerar a capa.' });
    const job_id = startCoverJob(req.user.id, title, article_id);
    res.status(202).json({ ok: true, job_id });
  } catch (e) { next(e); }
});

router.get('/cover-jobs/:id', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const job = readCoverJob(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ message: 'A geração expirou ou o servidor foi reiniciado. Gere a capa novamente.' });
  res.json(job);
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
        const relations = resolveArticleRelations(task.category_id);
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


        const articleId = uuidv4();
        const slug = uniqueSlug(slugify(parsed.title || task.topic), 'articles');
        db.prepare(
          `INSERT INTO articles (id, title, slug, summary, content, category_id, editor_id, language, status, ai_generated, seo_title, seo_description, created_date, updated_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 1, ?, ?, datetime('now'), datetime('now'))`
        ).run(articleId, parsed.title || task.topic, slug, parsed.summary || '', parsed.content || '', relations.category_id, relations.editor_id, task.language, parsed.seo_title || null, parsed.seo_description || null);

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