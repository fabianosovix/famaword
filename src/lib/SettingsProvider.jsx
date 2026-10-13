import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { injectHeaderScripts, injectFooterScripts } from '@/lib/injectScripts';

const SettingsContext = createContext({ settings: null, loading: true, refresh: async () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await base44.entities.SiteSettings.list({ limit: 1 });
      setSettings(res.items[0] || null);
    } catch (e) {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      if (settings.primary_color) root.style.setProperty('--brand-primary', settings.primary_color);
      if (settings.secondary_color) root.style.setProperty('--brand-secondary', settings.secondary_color);
    }
  }, [settings]);

  // Delay script injection until ad-slot hooks are in the DOM on article
  // pages — the article content is fetched async, so injecting scripts
  // immediately can cause ad scripts to scan before hooks exist.
  useEffect(() => {
    if (!settings) return;

    let injected = false;
    const doInject = () => {
      if (injected) return;
      injected = true;
      injectHeaderScripts(settings.header_scripts || '');
      injectFooterScripts(settings.footer_scripts || '');
    };

    const isArticlePage = window.location.pathname.startsWith('/artigo/');

    if (!isArticlePage) {
      const timer = setTimeout(doInject, 300);
      return () => clearTimeout(timer);
    }

    // Article page: poll for .ad-slot elements before injecting
    let attempts = 0;
    const maxAttempts = 15; // ~1.5s
    const poll = setInterval(() => {
      attempts++;
      if (document.querySelector('.ad-slot') || attempts >= maxAttempts) {
        clearInterval(poll);
        doInject();
      }
    }, 100);

    return () => clearInterval(poll);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);