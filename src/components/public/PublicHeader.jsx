import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/lib/SettingsProvider';
import { useTranslation } from '@/lib/i18n';
import { Image } from '@/components/ui/image';
import { Loader2, ChevronDown, Menu, X } from 'lucide-react';

export default function PublicHeader() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [cats, setCats] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.Category.filter({ in_main_menu: true }, { sort: 'order', limit: 100, fields: ['id', 'name', 'slug', 'parent_id'] });
        setCats(res.items || []);
      } catch (e) { setCats([]); }
    })();
  }, []);

  // Build a tree: top-level items (no parent or parent not in the menu set),
  // each with its children that are also flagged for the main menu.
  const menuIds = new Set(cats.map((c) => c.id));
  const childrenByParent = {};
  const topLevel = [];
  cats.forEach((c) => {
    if (c.parent_id && menuIds.has(c.parent_id)) {
      (childrenByParent[c.parent_id] ||= []).push(c);
    } else {
      topLevel.push(c);
    }
  });

  const go = (slug) => {
    window.location.href = `/categoria/${slug}`;
  };

  const renderItem = (c, isSub = false) => {
    const children = childrenByParent[c.id] || [];
    return (
      <div key={c.id} className={isSub ? '' : 'border-b border-border last:border-b-0'}>
        <button
          onClick={() => go(c.slug)}
          className={`block w-full text-left px-3 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition ${isSub ? 'pl-6 text-foreground/70' : ''}`}
        >
          {c.name}
        </button>
        {children.length > 0 && (
          <div className="bg-muted/30">
            <button
              onClick={() => go(c.slug)}
              className="block w-full text-left px-3 py-2 text-xs font-medium text-foreground/60 hover:text-foreground hover:bg-muted transition pl-9"
            >
              {t('see_all')}
            </button>
            {children.map((sub) => (
              <button
                key={sub.id}
                onClick={() => go(sub.slug)}
                className="block w-full text-left px-3 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-muted transition pl-9"
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2 min-w-0">
          {settings?.logo_url ? (
            <Image src={settings.logo_url} alt={settings.site_name} className="h-8 w-auto max-w-[160px] object-contain" fittingType="fit" />
          ) : (
            <span className="font-heading font-bold text-lg truncate" style={{ color: 'var(--brand-primary)' }}>
              {settings?.site_name || t('site_name_default')}
            </span>
          )}
        </a>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2 overflow-visible">
          {topLevel.map((c) => {
            const children = childrenByParent[c.id] || [];
            if (children.length === 0) {
              return (
                <button
                  key={c.id}
                  onClick={() => go(c.slug)}
                  className="px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-md transition whitespace-nowrap"
                >
                  {c.name}
                </button>
              );
            }
            return (
              <div key={c.id} className="relative group">
                <button
                  onClick={() => go(c.slug)}
                  className="px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-md transition whitespace-nowrap flex items-center gap-1"
                >
                  {c.name}
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-40">
                  <div className="min-w-[200px] rounded-md border border-border bg-background shadow-lg py-1">
                    <button
                      onClick={() => go(c.slug)}
                      className="block w-full text-left px-3 py-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition"
                    >
                      {t('see_all')}
                    </button>
                    {children.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => go(sub.slug)}
                        className="block w-full text-left px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground hover:bg-muted transition pl-5"
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="sm:hidden p-2 -mr-2 text-foreground hover:bg-muted rounded-md transition"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-background">
          <div className="max-w-5xl mx-auto px-4 py-2">
            {topLevel.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">{t('site_name_default')}</p>
            ) : (
              topLevel.map((c) => renderItem(c))
            )}
          </div>
        </div>
      )}
    </header>
  );
}