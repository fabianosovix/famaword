import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/lib/SettingsProvider';
import { Image } from '@/components/ui/image';
import { Loader2 } from 'lucide-react';

export default function PublicHeader() {
  const { settings } = useSettings();
  const [cats, setCats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.Category.filter({ in_main_menu: true }, { sort: 'order', limit: 50 });
        setCats(res.items || []);
      } catch (e) { setCats([]); }
    })();
  }, []);

  return (
    <header className="border-b border-border bg-background sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          {settings?.logo_url ? (
            <Image src={settings.logo_url} alt={settings.site_name} className="h-8 w-auto max-w-[160px] object-contain" fittingType="fit" />
          ) : (
            <span className="font-heading font-bold text-lg truncate" style={{ color: 'var(--brand-primary)' }}>
              {settings?.site_name || 'Meu Site'}
            </span>
          )}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/categoria/${c.slug}`)}
              className="px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-md transition whitespace-nowrap"
            >
              {c.name}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}