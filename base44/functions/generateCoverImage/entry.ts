import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { buildCoverPrompt } from "../../shared/cms.ts";

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
    if (!topic) return Response.json({ error: 'topic é obrigatório' }, { status: 400 });

    const gen = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt: buildCoverPrompt(topic)
    });

    return Response.json({ url: gen.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}