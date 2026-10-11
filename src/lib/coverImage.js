// Padrão de capa: 1200x675 (16:9), WebP. Dimensões fixas evitam CLS e melhoram PageSpeed.
export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 675;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível ler a imagem'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem gerada'));
    img.src = url;
  });
}

function drawToWebp(img) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = COVER_WIDTH;
    canvas.height = COVER_HEIGHT;
    const ctx = canvas.getContext('2d');
    // Comportamento object-cover: preenche o quadro recortando o excedente.
    const scale = Math.max(COVER_WIDTH / img.width, COVER_HEIGHT / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (COVER_WIDTH - w) / 2;
    const y = (COVER_HEIGHT - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Não foi possível converter para WebP'));
    }, 'image/webp', 0.9);
  });
}

// Upload: exige exatamente o tamanho padrão e converte para WebP.
export async function fileToCoverWebp(file) {
  const img = await loadImageFromFile(file);
  if (img.width !== COVER_WIDTH || img.height !== COVER_HEIGHT) {
    throw new Error(`A imagem deve ter exatamente ${COVER_WIDTH}x${COVER_HEIGHT}px. Recebido: ${img.width}x${img.height}`);
  }
  return drawToWebp(img);
}

// IA: baixa a imagem gerada, redimensiona/recorta para o padrão e converte para WebP.
// Retorna { blob } em caso de sucesso, ou { fallback: url } se o canvas for bloqueado (CORS).
export async function urlToCoverWebp(url) {
  try {
    const img = await loadImageFromUrl(url);
    const blob = await drawToWebp(img);
    return { blob };
  } catch (e) {
    return { fallback: url };
  }
}