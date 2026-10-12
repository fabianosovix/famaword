import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { useTranslation } from '@/lib/i18n';
import { Loader2 } from 'lucide-react';
import ArticleContent from '@/components/public/ArticleContent';

export default function ArticlePage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      setEditor(null);
      try {
        const res = await base44.entities.Article.filter(
          { slug, status: 'published' },
          { limit: 1, fields: ['id', 'title', 'slug', 'summary', 'content', 'cover_image', 'category_id', 'editor_id', 'seo_title', 'seo_description'] }
        );
        const a = (res.items || [])[0];
        if (!a) { setNotFound(true); return; }
        setArticle(a);
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!article?.editor_id) { setEditor(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const ed = await base44.entities.Editor.get(article.editor_id);
        if (!cancelled) setEditor(ed);
      } catch (e) {}
    })();
    return () => { cancelled = true; };
  }, [article]);

  useEffect(() => {
    if (article) {
      document.title = article.seo_title || article.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', article.seo_description || article.summary || '');
      // Optimize content images: lazy-load + async decode to reduce render-blocking
      const imgs = document.querySelectorAll('.prose-content img');
      imgs.forEach((img) => {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      });
    }
    return () => { document.title = ''; };
  }, [article]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (notFound) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground mb-4">{t('article_not_found')}</p>
      <a href="/" className="text-sm underline">{t('back_to_home')}</a>
    </div>
  );

  return (
    <article className="max-w-2xl mx-auto px-4 py-8 overflow-hidden">
      <h1 className="font-heading font-bold text-3xl md:text-4xl leading-tight mb-4" style={{ color: 'var(--brand-primary)' }}>
        {article.title}
      </h1>
      {article.summary && <p className="text-lg text-muted-foreground mb-6">{article.summary}</p>}
      <div className="ad-slot ad-before-entry-content" data-ad="before-entry-content" />
      <ArticleContent
        content={article.content || ''}
        className="prose-content text-foreground/90 leading-relaxed break-words [&_*]:max-w-full [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_a]:underline [&_a]:break-words"
      />
      {editor && (
        <div className="mt-10 pt-6 border-t border-border flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0">
            {editor.photo ? <Image src={editor.photo} alt={editor.name} className="w-full h-full" fittingType="fill" width={56} height={56} originWidth={56} originHeight={56} /> : null}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('written_by')}</p>
            <p className="font-heading font-bold text-lg" style={{ color: 'var(--brand-primary)' }}>{editor.name}</p>
            {editor.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{editor.description}</p>}
          </div>
        </div>
      )}
    </article>
  );
}