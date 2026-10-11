import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { slugify } from '@/lib/slugify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Loader2, Sparkles, Save, Upload, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

export default function AdminArticleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'novo' || !id;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({
    title: '', slug: '', summary: '', content: '', cover_image: '',
    category_id: '', status: 'draft', seo_title: '', seo_description: '',
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCat, setAiCat] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.Category.filter({}, { sort: 'order', limit: 200 });
        setCats(res.items || []);
        if (!isNew && id) {
          const a = await base44.entities.Article.get(id);
          setForm({
            title: a.title || '', slug: a.slug || '', summary: a.summary || '',
            content: a.content || '', cover_image: a.cover_image || '',
            category_id: a.category_id || '', status: a.status || 'draft',
            seo_title: a.seo_title || '', seo_description: a.seo_description || '',
          });
        }
      } catch (e) {
        toast({ title: 'Erro ao carregar', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const uploadCover = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm((f) => ({ ...f, cover_image: file_url }));
      toast({ title: 'Imagem enviada (stored publicly)' });
    } catch (err) {
      toast({ title: 'Erro no upload: ' + err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const generateAI = async () => {
    const catId = aiCat || form.category_id;
    if (!aiTopic || !catId) return toast({ title: 'Informe tema e categoria', variant: 'destructive' });
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke('generateArticle', { topic: aiTopic, category_id: catId });
      const article = res.data.article;
      setForm({
        title: article.title, slug: article.slug, summary: article.summary,
        content: article.content, cover_image: '', category_id: article.category_id,
        status: 'draft', seo_title: article.seo_title, seo_description: article.seo_description,
      });
      toast({ title: 'Rascunho gerado pela IA. Revise e publique.' });
      setAiOpen(false);
      setAiTopic('');
      navigate(`/admin/artigos/${article.id}`);
    } catch (err) {
      toast({ title: 'Erro na IA: ' + (err.response?.data?.error || err.message), variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category_id) return toast({ title: 'Título e categoria são obrigatórios', variant: 'destructive' });
    const slug = form.slug || slugify(form.title);
    const payload = { ...form, slug };
    setSaving(true);
    try {
      if (isNew) {
        const a = await base44.entities.Article.create(payload);
        toast({ title: 'Artigo criado' });
        navigate(`/admin/artigos/${a.id}`);
      } else {
        await base44.entities.Article.update(id, payload);
        toast({ title: 'Artigo salvo' });
      }
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <Link to="/admin/artigos" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Voltar para artigos
      </Link>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="font-heading font-bold text-2xl">{isNew ? 'Novo artigo' : 'Editar artigo'}</h1>
        <Button variant="outline" onClick={() => setAiOpen((v) => !v)}><Sparkles className="w-4 h-4 mr-2" /> Gerar com IA</Button>
      </div>

      {aiOpen && (
        <div className="bg-muted/40 border border-border rounded-lg p-4 mb-6 space-y-3">
          <p className="text-sm font-medium">Descreva o tema do artigo e escolha a categoria. A IA vai gerar um rascunho para você revisar.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Tema do artigo (ex: benefícios da caminhada)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
            <select value={aiCat || form.category_id} onChange={(e) => setAiCat(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Selecione a categoria</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button onClick={generateAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Gerar rascunho
          </Button>
        </div>
      )}

      <form onSubmit={save} className="space-y-5">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: isNew ? slugify(e.target.value) : form.slug })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cat">Categoria</Label>
            <select id="cat" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Selecione</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="summary">Resumo</Label>
          <Textarea id="summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>
        <div>
          <Label>Imagem de capa</Label>
          <div className="flex items-center gap-3 mt-1">
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadCover(e.target.files[0])}
              className="text-sm" disabled={uploading} />
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          {form.cover_image && <img src={form.cover_image} alt="capa" className="mt-2 h-24 rounded-md object-cover" />}
        </div>
        <div>
          <Label>Conteúdo</Label>
          <div className="mt-1">
            <ReactQuill theme="snow" modules={QUILL_MODULES} value={form.content} onChange={(v) => setForm({ ...form, content: v })}
              className="bg-background" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="scheduled">Agendado</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="seo_title">SEO Título</Label>
          <Input id="seo_title" value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="seo_desc">SEO Descrição</Label>
          <Textarea id="seo_desc" rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar artigo
        </Button>
      </form>
    </div>
  );
}