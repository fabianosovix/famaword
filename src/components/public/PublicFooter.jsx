import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/lib/SettingsProvider';
import { Facebook, Twitter, Instagram, Youtube, Linkedin } from 'lucide-react';

const SOCIAL_ICONS = {
  facebook: Facebook, twitter: Twitter, instagram: Instagram,
  youtube: Youtube, linkedin: Linkedin
};

export default function PublicFooter() {
  const { settings } = useSettings();
  const [pages, setPages] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.Page.filter({ in_footer_menu: true }, { sort: 'order', limit: 20 });
        setPages(res.items || []);
      } catch (e) { setPages([]); }
    })();
  }, []);

  const socials = settings?.social_links || {};

  return (
    <footer className="border-t border-border mt-16 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row gap-8 justify-between">
          <div className="max-w-xs">
            <p className="font-heading font-bold text-base mb-2" style={{ color: 'var(--brand-primary)' }}>
              {settings?.site_name || 'Meu Site'}
            </p>
            <p className="text-sm text-muted-foreground">{settings?.footer_text || 'Conteúdo de qualidade, publicado com rapidez.'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Páginas</p>
            {pages.map((p) => (
              <Link key={p.id} to={`/pagina/${p.slug}`} className="text-sm text-foreground/70 hover:text-foreground transition">
                {p.title}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Redes sociais</p>
            <div className="flex gap-3">
              {Object.entries(socials).map(([key, url]) => {
                if (!url) return null;
                const Icon = SOCIAL_ICONS[key];
                return Icon ? (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition" aria-label={key}>
                    <Icon className="w-5 h-5" />
                  </a>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings?.site_name || 'Meu Site'}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}