import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { slugify, uniqueSlug, buildArticlePrompt, buildCoverPrompt, articleSchema } from "../../shared/cms.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const today = new Date();
    const dow = today.getDay();

    const schedulesRes = await svc.entities.AISchedule.filter({ day_of_week: dow, active: true });
    const queueRes = await svc.entities.AIQueue.filter({ status: 'pending' }, { sort: 'created_date', limit: 5 });

    const tasks = [];
    for (const s of schedulesRes.items || []) {
      tasks.push({ topic: s.topic, category_id: s.category_id, language: s.language || 'pt-BR', source: 'schedule', id: s.id });
    }
    for (const q of queueRes.items || []) {
      tasks.push({ topic: q.topic, category_id: q.category_id, language: q.language || 'pt-BR', source: 'queue', id: q.id });
    }

    // Carrega editores uma vez para atribuição aleatória
    let editors = [];
    try {
      const edRes = await svc.entities.Editor.filter({}, { limit: 200 });
      editors = edRes.items || [];
    } catch (e) {}
    const randomEditorId = () => editors.length > 0 ? editors[Math.floor(Math.random() * editors.length)].id : '';

    const results = [];
    for (const t of tasks.slice(0, 3)) {
      try {
        const category = await svc.entities.Category.get(t.category_id);
        const [genRes, coverRes] = await Promise.allSettled([
          svc.integrations.Core.InvokeLLM({
            prompt: buildArticlePrompt(t.topic, category.name, t.language),
            response_json_schema: articleSchema
          }),
          svc.integrations.Core.GenerateImage({
            prompt: buildCoverPrompt(t.topic)
          })
        ]);
        if (genRes.status !== 'fulfilled') throw new Error('Falha ao gerar o texto');
        const gen = genRes.value;
        const coverUrl = coverRes.status === 'fulfilled' ? coverRes.value.url : '';
        const slug = uniqueSlug(slugify(gen.title));
        const article = await svc.entities.Article.create({
          title: gen.title,
          slug,
          summary: gen.summary || "",
          content: gen.content || "",
          category_id: t.category_id,
          editor_id: randomEditorId(),
          language: t.language,
          cover_image: coverUrl,
          status: 'published',
          ai_generated: true,
          seo_title: gen.seo_title || gen.title,
          seo_description: gen.seo_description || gen.summary || ""
        });
        if (t.source === 'queue') {
          await svc.entities.AIQueue.update(t.id, { status: 'done', result_article_id: article.id });
        }
        results.push({ ok: true, title: gen.title, source: t.source });
      } catch (e) {
        if (t.source === 'queue') {
          await svc.entities.AIQueue.update(t.id, { status: 'failed', error: e.message });
        }
        results.push({ ok: false, error: e.message, source: t.source });
      }
    }

    return Response.json({ processed: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}