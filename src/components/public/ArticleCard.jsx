import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';

export default function ArticleCard({ article, category }) {
  return (
    <Link to={`/artigo/${article.slug}`} className="group block">
      <article className="flex flex-col gap-3">
        {article.cover_image ? (
          <div className="aspect-[16/9] overflow-hidden rounded-lg bg-muted">
            <Image src={article.cover_image} alt={article.title} className="w-full h-full" fittingType="fill" />
          </div>
        ) : (
          <div className="aspect-[16/9] rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
            {category?.name || 'Artigo'}
          </div>
        )}
        {category && (
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-secondary)' }}>
            {category.name}
          </span>
        )}
        <h2 className="font-heading font-bold text-lg leading-snug group-hover:underline" style={{ color: 'var(--brand-primary)' }}>
          {article.title}
        </h2>
        {article.summary && <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>}
      </article>
    </Link>
  );
}