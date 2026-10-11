import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await base44.entities.Article.filter({ slug, status: 'published' }, { limit: 1 });
        const a = (res.items || [])[0];
        if (!a) { setNotFound(true); return; }
        setArticle(a);
        if (a.category_id) {
          try {
            const c = await base44.entities.Category.get(a.category_id);
            setCategory(c);
          } catch (e) {}
        }
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (article) {
      document.title = article.seo_title || article.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', article.seo_description || article.summary || '');
    }
    return () => { document.title = ''; };
  }, [article]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (notFound) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground mb-4">Artigo não encontrado.</p>
      <Link to="/" className="text-sm underline">Voltar para a home</Link>
    </div>
  );

  return (
    <article className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      {category && (
        <Link to={`/categoria/${category.slug}`} className="text-xs font-semibold uppercase tracking-wider hover:underline" style={{ color: 'var(--brand-secondary)' }}>
          {category.name}
        </Link>
      )}
      <h1 className="font-heading font-bold text-3xl md:text-4xl leading-tight mt-2 mb-4" style={{ color: 'var(--brand-primary)' }}>
        {article.title}
      </h1>
      {article.summary && <p className="text-lg text-muted-foreground mb-6">{article.summary}</p>}
      {article.cover_image && (
        <div className="aspect-[16/9] overflow-hidden rounded-xl bg-muted mb-8">
          <Image src={article.cover_image} alt={article.title} className="w-full h-full" fittingType="fill" />
        </div>
      )}
      <div
        className="prose-content text-foreground/90 leading-relaxed [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: article.content || '' }}
      />
    </article>
  );
}