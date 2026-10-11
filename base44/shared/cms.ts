export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(base) {
  return base + "-" + Math.random().toString(36).slice(2, 6);
}

export const articleSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    content: { type: "string" },
    seo_title: { type: "string" },
    seo_description: { type: "string" }
  },
  required: ["title", "summary", "content"]
};

const LANGUAGES = {
  'pt-BR': 'português do Brasil',
  'es': 'espanhol',
  'en': 'inglês',
  'fr': 'francês',
  'ar': 'árabe'
};

export function buildArticlePrompt(topic, categoryName, language = 'pt-BR') {
  const langName = LANGUAGES[language] || LANGUAGES['pt-BR'];
  return `Você é um redator profissional de conteúdo para web. Crie um artigo original, bem escrito e otimizado para SEO em ${langName} sobre o tema: "${topic}". Categoria do site: ${categoryName}.

O artigo deve ter entre 600 e 1000 palavras, com introdução, desenvolvimento em seções e conclusão. Todo o conteúdo (título, resumo e corpo) deve ser escrito inteiramente em ${langName}.

Retorne EXATAMENTE este JSON:
- title: título chamativo (até 70 caracteres)
- summary: resumo de 1 a 2 frases (até 200 caracteres)
- content: o corpo do artigo em HTML válido usando apenas as tags <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>. Não inclua <h1> nem tags html/body. Comece com um <h2> de introdução.
- seo_title: título SEO (até 60 caracteres)
- seo_description: meta description (até 160 caracteres)`;
}

export function buildCoverPrompt(topic) {
  return `Wide editorial cover image for a web article about: "${topic}". Modern, clean, professional, high quality, 16:9 landscape composition, no text, no watermark.`;
}