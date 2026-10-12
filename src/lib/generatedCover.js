import { urlToCoverWebp } from '@/lib/coverImage';

// One final format for generated covers, whether standalone or part of a draft.
export default async function generatedCover(source, upload, persist, onProgress) {
  onProgress?.('Convertendo a capa para 1200×675 pixels em WebP...');
  const { blob } = await urlToCoverWebp(source);
  const file = new File([blob], 'cover.webp', { type: 'image/webp' });
  onProgress?.('Salvando a imagem da capa...');
  const { file_url } = await upload(file);
  if (!file_url) throw new Error('Não foi possível salvar a capa.');
  if (persist) {
    onProgress?.('Vinculando a capa ao artigo...');
    await persist(file_url);
  }
  return file_url;
}