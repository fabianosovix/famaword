import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { slugify, uniqueSlug, buildArticlePrompt, buildCoverPrompt, articleSchema } from "../../shared/cms.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'editor') {
      return Response.json({ error: 'Acesso restrito a admins e editores' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const topic = body.topic;
    const categoryId = body.category_id;
    const language = body.language || 'pt-BR';
    if (!topic || !categoryId) {
      return Response.json({ error: 'topic e category_id são obrigatórios' }, { status: 400 });
    }

    const category = await base44.entities.Category.get(categoryId);

    const [genRes, coverRes] = await Promise.allSettled([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: buildArticlePrompt(topic, category.name, language),
        response_json_schema: articleSchema
      }),
      base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: buildCoverPrompt(topic)
      })
    ]);
    if (genRes.status !== 'fulfilled') throw new Error('Falha ao gerar o texto');
    const gen = genRes.value;
    const coverUrl = coverRes.status === 'fulfilled' ? coverRes.value.url : '';

    const slug = uniqueSlug(slugify(gen.title));
    const article = await base44.entities.Article.create({
      title: gen.title,
      slug,
      summary: gen.summary || "",
      content: gen.content || "",
      category_id: categoryId,
      language,
      cover_image: coverUrl,
      status: 'draft',
      ai_generated: true,
      seo_title: gen.seo_title || gen.title,
      seo_description: gen.seo_description || gen.summary || ""
    });

    return Response.json({ article });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}