import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, KeyRound, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
];

const DEFAULT_MODELS = {
  openai: { text: 'gpt-4o-mini', image: 'dall-e-3' },
  gemini: { text: 'gemini-2.0-flash', image: 'imagen-3.0-generate-002' },
};

export default function AIProviderConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState({
    ai_text_provider: 'openai',
    ai_text_api_key: '',
    ai_text_model: '',
    ai_image_provider: 'openai',
    ai_image_api_key: '',
    ai_image_model: '',
  });
  const [keySet, setKeySet] = useState({ text: false, image: false });

  const load = async () => {
    setLoading(true);
    try {
      const s = await base44.entities.SiteSettings.get();
      setKeySet({
        text: !!s.ai_text_api_key,
        image: !!s.ai_image_api_key,
      });
      setCfg({
        ai_text_provider: s.ai_text_provider || 'openai',
        ai_text_api_key: '',
        ai_text_model: s.ai_text_model || '',
        ai_image_provider: s.ai_image_provider || 'openai',
        ai_image_api_key: '',
        ai_image_model: s.ai_image_model || '',
      });
    } catch {
      toast({ title: 'Erro ao carregar configurações de IA', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const data = {
        ai_text_provider: cfg.ai_text_provider,
        ai_text_model: cfg.ai_text_model || DEFAULT_MODELS[cfg.ai_text_provider].text,
        ai_image_provider: cfg.ai_image_provider,
        ai_image_model: cfg.ai_image_model || DEFAULT_MODELS[cfg.ai_image_provider].image,
      };
      if (cfg.ai_text_api_key) data.ai_text_api_key = cfg.ai_text_api_key;
      if (cfg.ai_image_api_key) data.ai_image_api_key = cfg.ai_image_api_key;

      await base44.entities.SiteSettings.update(null, data);
      toast({ title: 'Configurações de IA salvas' });
      load();
    } catch (e) {
      toast({ title: 'Erro: ' + e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4" /> Geração de texto (artigos)</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="mb-1.5 block">Provedor</Label>
            <select
              value={cfg.ai_text_provider}
              onChange={(e) => setCfg({ ...cfg, ai_text_provider: e.target.value, ai_text_model: '' })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">
              Chave da API {keySet.text && <span className="text-xs text-muted-foreground ml-1">(configurada)</span>}
            </Label>
            <Input
              type="password"
              placeholder={keySet.text ? '••••• (deixe vazio para manter)' : 'Cole sua chave aqui'}
              value={cfg.ai_text_api_key}
              onChange={(e) => setCfg({ ...cfg, ai_text_api_key: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Modelo (opcional)</Label>
            <Input
              placeholder={`Padrão: ${DEFAULT_MODELS[cfg.ai_text_provider].text}`}
              value={cfg.ai_text_model}
              onChange={(e) => setCfg({ ...cfg, ai_text_model: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Geração de imagens (capas)</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="mb-1.5 block">Provedor</Label>
            <select
              value={cfg.ai_image_provider}
              onChange={(e) => setCfg({ ...cfg, ai_image_provider: e.target.value, ai_image_model: '' })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">
              Chave da API {keySet.image && <span className="text-xs text-muted-foreground ml-1">(configurada)</span>}
            </Label>
            <Input
              type="password"
              placeholder={keySet.image ? '••••• (deixe vazio para manter)' : 'Cole sua chave aqui'}
              value={cfg.ai_image_api_key}
              onChange={(e) => setCfg({ ...cfg, ai_image_api_key: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Modelo (opcional)</Label>
            <Input
              placeholder={`Padrão: ${DEFAULT_MODELS[cfg.ai_image_provider].image}`}
              value={cfg.ai_image_model}
              onChange={(e) => setCfg({ ...cfg, ai_image_model: e.target.value })}
            />
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar configurações de IA
      </Button>
    </div>
  );
}