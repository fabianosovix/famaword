import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/lib/i18n';
import { Loader2 } from 'lucide-react';

export default function StaticPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await base44.entities.Page.filter({ slug }, { limit: 1 });
        const p = (res.items || [])[0];
        if (!p) { setNotFound(true); return; }
        setPage(p);
        document.title = p.title;
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (notFound) return <p className="text-muted-foreground text-center py-20">{t('page_not_found')}</p>;

  return (
    <article className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-heading font-bold text-3xl mb-6" style={{ color: 'var(--brand-primary)' }}>{page.title}</h1>
      <div
        className="prose-content text-foreground/90 leading-relaxed [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4"
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
      />
    </article>
  );
}