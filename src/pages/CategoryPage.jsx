import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ArticleCard from '@/components/public/ArticleCard';
import { useTranslation } from '@/lib/i18n';
import { Loader2 } from 'lucide-react';

export default function CategoryPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const catRes = await base44.entities.Category.filter({ slug }, { limit: 1 });
        const c = (catRes.items || [])[0];
        if (!c) { setNotFound(true); return; }
        setCategory(c);
        const artRes = await base44.entities.Article.filter(
          { category_id: c.id, status: 'published' },
          { sort: '-created_date', limit: 50 }
        );
        setArticles(artRes.items || []);
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (notFound) return <p className="text-muted-foreground text-center py-20">{t('category_not_found')}</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-heading font-bold text-2xl mb-1" style={{ color: 'var(--brand-primary)' }}>{category.name}</h1>
      {category.description && <p className="text-muted-foreground text-sm mb-8">{category.description}</p>}
      {articles.length === 0 ? (
        <p className="text-muted-foreground text-center py-20">{t('no_articles_in_category')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 mt-8">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}