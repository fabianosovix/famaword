export default async function waitForCover(jobId, request) {
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const job = await request(`/ai/cover-jobs/${encodeURIComponent(jobId)}`);
    if (job.status === 'failed') throw new Error(job.error || 'Não foi possível gerar a capa.');
    if (job.status === 'done') {
      if (!job.result?.url) throw new Error('O provedor terminou sem retornar uma imagem.');
      return job.result;
    }
  }
  throw new Error('A geração não foi concluída no tempo esperado. Tente novamente.');
}