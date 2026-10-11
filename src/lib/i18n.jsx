import { useSettings } from '@/lib/SettingsProvider';

const translations = {
  'pt-BR': {
    latest_publications: 'As últimas publicações',
    no_articles_published: 'Nenhum artigo publicado ainda.',
    category_not_found: 'Categoria não encontrada.',
    no_articles_in_category: 'Nenhum artigo nesta categoria.',
    article_not_found: 'Artigo não encontrado.',
    back_to_home: 'Voltar para a home',
    back: 'Voltar',
    page_not_found: 'Página não encontrada.',
    footer_default: 'Conteúdo de qualidade, publicado com rapidez.',
    pages: 'Páginas',
    social_networks: 'Redes sociais',
    all_rights_reserved: 'Todos os direitos reservados.',
    see_all: 'Ver todos',
    article: 'Artigo',
    written_by: 'Escrito por',
    site_name_default: 'Meu Site',
  },
  es: {
    latest_publications: 'Las últimas publicaciones',
    no_articles_published: 'Ningún artículo publicado todavía.',
    category_not_found: 'Categoría no encontrada.',
    no_articles_in_category: 'Ningún artículo en esta categoría.',
    article_not_found: 'Artículo no encontrado.',
    back_to_home: 'Volver al inicio',
    back: 'Volver',
    page_not_found: 'Página no encontrada.',
    footer_default: 'Contenido de calidad, publicado con rapidez.',
    pages: 'Páginas',
    social_networks: 'Redes sociales',
    all_rights_reserved: 'Todos los derechos reservados.',
    see_all: 'Ver todos',
    article: 'Artículo',
    written_by: 'Escrito por',
    site_name_default: 'Mi Sitio',
  },
  en: {
    latest_publications: 'Latest publications',
    no_articles_published: 'No articles published yet.',
    category_not_found: 'Category not found.',
    no_articles_in_category: 'No articles in this category.',
    article_not_found: 'Article not found.',
    back_to_home: 'Back to home',
    back: 'Back',
    page_not_found: 'Page not found.',
    footer_default: 'Quality content, published quickly.',
    pages: 'Pages',
    social_networks: 'Social networks',
    all_rights_reserved: 'All rights reserved.',
    see_all: 'See all',
    article: 'Article',
    written_by: 'Written by',
    site_name_default: 'My Site',
  },
};

export function useTranslation() {
  const { settings } = useSettings();
  const lang = settings?.language || 'pt-BR';
  const t = (key) => translations[lang]?.[key] ?? translations['pt-BR'][key] ?? key;
  return { t, lang };
}