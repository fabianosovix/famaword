import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminSettings() {
  const { toast } = useToast();
  const [settingsId, setSettingsId] = useState(null);
  const [form, setForm] = useState({
    site_name: '', language: 'pt-BR', logo_url: '', primary_color: '#111111', secondary_color: '#6b7280',
    header_scripts: '', footer_scripts: '', ads_txt: '', footer_text: '',
    social_links: { facebook: '', twitter: '', instagram: '', youtube: '', linkedin: '' },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const res = await base44.entities.SiteSettings.list({ limit: 1 });
      const s = (res.items || [])[0];
      if (s) {
        setSettingsId(s.id);
        setForm({
          site_name: s.site_name || '', language: s.language || 'pt-BR', logo_url: s.logo_url || '',
          primary_color: s.primary_color || '#111111', secondary_color: s.secondary_color || '#6b7280',
          header_scripts: s.header_scripts || '', footer_scripts: s.footer_scripts || '',
          ads_txt: s.ads_txt || '', footer_text: s.footer_text || '',
          social_links: { facebook: '', twitter: '', instagram: '', youtube: '', linkedin: '', ...(s.social_links || {}) },
        });
      }
    } catch (e) {
      toast({ title: 'Erro ao carregar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, logo_url: file_url }));
      toast({ title: 'Logo enviada (stored publicly)' });
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (settingsId) {
        await base44.entities.SiteSettings.update(settingsId, form);
      } else {
        const rec = await base44.entities.SiteSettings.create(form);
        setSettingsId(rec.id);
      }
      toast({ title: 'Configurações salvas' });
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <form onSubmit={save} className="space-y-8">
      <h1 className="font-heading font-bold text-2xl">Configurações</h1>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold">Marca</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="site_name">Nome do site</Label>
            <Input id="site_name" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="language">Idioma do site</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
              <SelectTrigger id="language" className="w-full"><SelectValue placeholder="Selecione o idioma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="es">Espanhol</SelectItem>
                <SelectItem value="en">Inglês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-3 mt-1">
              <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])} className="text-sm" disabled={uploading} />
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            {form.logo_url && <img src={form.logo_url} alt="logo" className="mt-2 h-12 object-contain" />}
          </div>
          <div>
            <Label htmlFor="primary">Cor primária</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-10 h-9 rounded border border-input" />
              <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="secondary">Cor secundária</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="w-10 h-9 rounded border border-input" />
              <Input value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold">Scripts personalizados</h2>
        <div>
          <Label htmlFor="header_scripts">Scripts do header (Google Analytics, AdSense, etc.)</Label>
          <Textarea id="header_scripts" rows={4} value={form.header_scripts} onChange={(e) => setForm({ ...form, header_scripts: e.target.value })} className="font-mono text-xs" placeholder="<script>...</script>" />
        </div>
        <div>
          <Label htmlFor="footer_scripts">Scripts do footer</Label>
          <Textarea id="footer_scripts" rows={4} value={form.footer_scripts} onChange={(e) => setForm({ ...form, footer_scripts: e.target.value })} className="font-mono text-xs" />
        </div>
      </section>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold">Redes sociais</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.keys(form.social_links).map((key) => (
            <div key={key}>
              <Label htmlFor={`social_${key}`} className="capitalize">{key}</Label>
              <Input id={`social_${key}`} value={form.social_links[key]} onChange={(e) => setForm({ ...form, social_links: { ...form.social_links, [key]: e.target.value } })} placeholder={`https://${key}.com/...`} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold">ads.txt</h2>
        <Textarea rows={4} value={form.ads_txt} onChange={(e) => setForm({ ...form, ads_txt: e.target.value })} className="font-mono text-xs" placeholder="google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0" />
        <p className="text-xs text-muted-foreground">O conteúdo será servido na rota /ads.txt do domínio.</p>
      </section>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold">Rodapé</h2>
        <div>
          <Label htmlFor="footer_text">Texto do rodapé</Label>
          <Textarea id="footer_text" rows={2} value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
        </div>
      </section>

      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar configurações
      </Button>
    </form>
  );
}