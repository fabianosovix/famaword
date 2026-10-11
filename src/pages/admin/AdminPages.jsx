import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { slugify } from '@/lib/slugify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trash2, Pencil, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PAGE_TYPES = [
  { value: 'custom', label: 'Personalizada' },
  { value: 'about', label: 'Sobre' },
  { value: 'contact', label: 'Contato' },
  { value: 'privacy', label: 'Privacidade' },
  { value: 'cookies', label: 'Cookies' },
];

export default function AdminPages() {
  const { toast } = useToast();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', content: '', page_type: 'custom', in_footer_menu: true, order: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Page.filter({}, { sort: 'order', limit: 100 });
      setPages(res.items || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar páginas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generateAdsense = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateAdsensePages', {});
      toast({ title: `${res.data.created} páginas criadas, ${res.data.skipped?.length || 0} já existiam` });
      load();
    } catch (err) {
      toast({ title: 'Erro: ' + (err.response?.data?.error || err.message), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setEditing(null);
    setForm({ title: '', slug: '', content: '', page_type: 'custom', in_footer_menu: true, order: 0 });
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({ title: p.title, slug: p.slug, content: p.content || '', page_type: p.page_type, in_footer_menu: !!p.in_footer_menu, order: p.order || 0 });
  };

  const save = async (e) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.title);
    if (!form.title) return toast({ title: 'Título obrigatório', variant: 'destructive' });
    const payload = { ...form, slug, order: Number(form.order) || 0 };
    try {
      if (editing) {
        await base44.entities.Page.update(editing.id, payload);
        toast({ title: 'Página atualizada' });
      } else {
        await base44.entities.Page.create(payload);
        toast({ title: 'Página criada' });
      }
      reset();
      load();
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    }
  };

  const remove = async (p) => {
    if (!confirm(`Excluir a página "${p.title}"?`)) return;
    await base44.entities.Page.delete(p.id);
    load();
    toast({ title: 'Página excluída' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="font-heading font-bold text-2xl">Páginas</h1>
        <Button onClick={generateAdsense} disabled={generating} variant="outline">
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Gerar páginas AdSense
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={save} className="bg-background border border-border rounded-lg p-5 space-y-4 h-fit">
          <h2 className="font-heading font-semibold">{editing ? 'Editar página' : 'Nova página'}</h2>
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="type">Tipo</Label>
            <select id="type" value={form.page_type} onChange={(e) => setForm({ ...form, page_type: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              {PAGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="content">Conteúdo (HTML)</Label>
            <Textarea id="content" rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="font-mono text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.in_footer_menu} onCheckedChange={(v) => setForm({ ...form, in_footer_menu: v })} id="footer" />
            <Label htmlFor="footer">No menu do rodapé</Label>
          </div>
          <div>
            <Label htmlFor="order">Ordem</Label>
            <Input id="order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
            {editing && <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>}
          </div>
        </form>

        <div className="space-y-2">
          {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : pages.map((p) => (
            <div key={p.id} className="bg-background border border-border rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">/pagina/{p.slug} · {p.in_footer_menu ? 'rodapé' : 'oculta'}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(p)} className="p-2 hover:bg-muted rounded-md"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(p)} className="p-2 hover:bg-muted rounded-md text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}