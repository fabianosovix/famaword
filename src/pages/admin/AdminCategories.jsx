import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { slugify } from '@/lib/slugify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Pencil, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminCategories() {
  const { toast } = useToast();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', parent_id: '', in_main_menu: false, order: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Category.filter({}, { sort: 'order', limit: 200 });
      setCats(res.items || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar categorias', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, description: c.description || '', parent_id: c.parent_id || '', in_main_menu: !!c.in_main_menu, order: c.order || 0 });
  };

  const reset = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', parent_id: '', in_main_menu: false, order: 0 });
  };

  const save = async (e) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.name);
    if (!form.name || !slug) return toast({ title: 'Nome é obrigatório', variant: 'destructive' });
    const payload = { ...form, slug, parent_id: form.parent_id || null, order: Number(form.order) || 0 };
    try {
      if (editing) {
        await base44.entities.Category.update(editing.id, payload);
        toast({ title: 'Categoria atualizada' });
      } else {
        await base44.entities.Category.create(payload);
        toast({ title: 'Categoria criada' });
      }
      reset();
      load();
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    }
  };

  const remove = async (c) => {
    if (!confirm(`Excluir a categoria "${c.name}"?`)) return;
    try {
      await base44.entities.Category.delete(c.id);
      load();
      toast({ title: 'Categoria excluída' });
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    }
  };

  const toggleMenu = async (c) => {
    await base44.entities.Category.update(c.id, { in_main_menu: !c.in_main_menu });
    load();
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">Categorias</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={save} className="bg-background border border-border rounded-lg p-5 space-y-4 h-fit">
          <h2 className="font-heading font-semibold">{editing ? 'Editar categoria' : 'Nova categoria'}</h2>
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="parent">Categoria pai (opcional)</Label>
            <select id="parent" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Nenhuma</option>
              {cats.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.in_main_menu} onCheckedChange={(v) => setForm({ ...form, in_main_menu: v })} id="menu" />
            <Label htmlFor="menu">Aparecer no menu principal</Label>
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
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : cats.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma categoria ainda.</p>
          ) : cats.map((c) => (
            <div key={c.id} className="bg-background border border-border rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">/{c.slug}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={!!c.in_main_menu} onCheckedChange={() => toggleMenu(c)} />
                <button onClick={() => startEdit(c)} className="p-2 hover:bg-muted rounded-md"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(c)} className="p-2 hover:bg-muted rounded-md text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}