import { randomUUID } from 'node:crypto';
import { generateImageSource } from './ai.js';

// Short HTTP requests keep slow image generation independent of proxy timeouts.
const jobs = new Map();
const RETENTION_MS = 10 * 60 * 1000;

export function startCoverJob(userId, title, articleId) {
  if ([...jobs.values()].some(job => job.userId === userId && job.status === 'processing')) {
    const error = new Error('Já existe uma capa sendo gerada. Aguarde a conclusão.');
    error.status = 409;
    throw error;
  }
  if (jobs.size >= 20) {
    const error = new Error('A geração de capas está ocupada. Tente novamente em alguns minutos.');
    error.status = 429;
    throw error;
  }
  const id = randomUUID();
  const job = { userId, status: 'processing' };
  jobs.set(id, job);
  setTimeout(() => jobs.delete(id), RETENTION_MS).unref();
  Promise.resolve().then(async () => {
    const url = await generateImageSource(`Capa de artigo profissional sobre "${title}", estilo editorial moderno, 16:9, sem texto`);
    job.result = { ok: true, url, article_id: articleId };
    job.status = 'done';
  }).catch(error => {
    job.error = error.name === 'TimeoutError'
      ? 'O provedor de imagens não respondeu em 3 minutos. Tente novamente.'
      : error.message;
    job.status = 'failed';
  });
  return id;
}

export function readCoverJob(id, userId) {
  const job = jobs.get(id);
  if (!job || job.userId !== userId) return null;
  return { status: job.status, result: job.result, error: job.error };
}