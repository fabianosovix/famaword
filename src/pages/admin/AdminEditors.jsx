import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Pencil, Trash2, Upload, X, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Image } from '@/components/ui/image';

export default function AdminEditors() {
  const { toast } = useToast();
  const [editors, setEditors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null); // null = list view, object = form

  const empty = { name: '', email: '', description: '', photo: '' };

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Editor.filter({}, { sort: 'name', limit: 200 });
      setEditors(res.items || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar editores', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadPhoto = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setEditing((e) => ({ ...e, photo: file_url }));
      toast({ title: 'Foto enviada (stored publicly)' });
    } catch (err) {
      toast({ title: 'Erro no upload: ' + err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!editing.name) return toast({ title: 'Nome é obrigatório', variant: 'destructive' });
    setSaving(true);
    try {
      if (editing.id) {
        await base44.entities.Editor.update(editing.id, {
          name: editing.name, email: editing.email, description: editing.description, photo: editing.photo,
        });
        toast({ title: 'Editor salvo' });
      } else {
        await base44.entities.Editor.create({
          name: editing.name, email: editing.email, description: editing.description, photo: editing.photo,
        });
        toast({ title: 'Editor criado' });
      }
      setEditing(null);
      load();
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Excluir este editor?')) return;
    try {
      await base44.entities.Editor.delete(id);
      toast({ title: 'Editor excluído' });
      load();
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition">
          <X className="w-4 h-4" /> Cancelar
        </button>
        <h1 className="font-heading font-bold text-2xl mb-6">{editing.id ? 'Editar editor' : 'Novo editor'}</h1>
        <form onSubmit={save} className="space-y-5 max-w-xl">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div>
            <Label>Foto</Label>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-accent transition">
                <Upload className="w-4 h-4" /> Enviar foto
                <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} className="hidden" disabled={uploading} />
              </label>
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            {editing.photo && (
              <div className="mt-3 w-20 h-20 overflow-hidden rounded-full bg-muted">
                <Image src={editing.photo} alt={editing.name} className="w-full h-full" fittingType="fill" />
              </div>
            )}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar editor
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="font-heading font-bold text-2xl">Editores</h1>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="w-4 h-4 mr-2" /> Novo editor</Button>
      </div>

      {editors.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum editor cadastrado. Crie o primeiro.</p>
      ) : (
        <div className="space-y-2">
          {editors.map((ed) => (
            <div key={ed.id} className="flex items-center gap-3 bg-background border border-border rounded-lg p-3">
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                {ed.photo ? <Image src={ed.photo} alt={ed.name} className="w-full h-full" fittingType="fill" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{ed.name}</p>
                {ed.email && <p className="text-xs text-muted-foreground truncate">{ed.email}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setEditing(ed)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(ed.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}