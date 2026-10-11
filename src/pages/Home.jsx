import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/lib/SettingsProvider';
import { useTranslation } from '@/lib/i18n';
import { Image } from '@/components/ui/image';
import ArticleCard from '@/components/public/ArticleCard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const catRes = await base44.entities.Category.filter({ in_main_menu: true }, { limit: 100, fields: ['id', 'name', 'slug', 'parent_id'] });
        const cats = catRes.items || [];
        const catMap = {};
        cats.forEach((c) => (catMap[c.id] = c));
        const ids = cats.map((c) => c.id);
        if (ids.length === 0) { setArticles([]); return; }
        const artRes = await base44.entities.Article.filter(
          { category_id: { $in: ids }, status: 'published' },
          { sort: '-created_date', limit: 24, fields: ['id', 'title', 'slug', 'summary', 'cover_image', 'category_id'] }
        );
        setArticles(artRes.items || []);
        setCategories(catMap);
      } catch (e) {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [featured, ...rest] = articles;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <section className="mb-8">
        <h1 className="font-heading font-bold text-2xl mb-1" style={{ color: 'var(--brand-primary)' }}>
          {settings?.site_name || t('site_name_default')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('latest_publications')}</p>
      </section>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : articles.length === 0 ? (
        <p className="text-muted-foreground text-center py-20">{t('no_articles_published')}</p>
      ) : (
        <>
          {featured && (
            <a href={`/artigo/${featured.slug}`} className="group block mb-10">
              <article className="grid md:grid-cols-2 gap-6 items-center">
                {featured.cover_image ? (
                  <div className="aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                    <Image src={featured.cover_image} alt={featured.title} className="w-full h-full" fittingType="fill" originWidth={1200} originHeight={675} loading="eager" fetchPriority="high" />
                  </div>
                ) : (
                  <div className="aspect-[16/9] rounded-xl bg-muted" />
                )}
                <div>
                  {categories[featured.category_id] && (
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-secondary)' }}>
                      {categories[featured.category_id].name}
                    </span>
                  )}
                  <h2 className="font-heading font-bold text-2xl md:text-3xl leading-tight mt-2 group-hover:underline" style={{ color: 'var(--brand-primary)' }}>
                    {featured.title}
                  </h2>
                  {featured.summary && <p className="text-muted-foreground mt-3">{featured.summary}</p>}
                </div>
              </article>
            </a>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {rest.map((a) => (
              <ArticleCard key={a.id} article={a} category={categories[a.category_id]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}