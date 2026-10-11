import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

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

  useEffect(() => {
    if (!settings) return;
    // inject header scripts
    const headerContainer = document.getElementById('__header_scripts');
    if (headerContainer) headerContainer.innerHTML = settings.header_scripts || '';
    const footerContainer = document.getElementById('__footer_scripts');
    if (footerContainer) footerContainer.innerHTML = settings.footer_scripts || '';
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);