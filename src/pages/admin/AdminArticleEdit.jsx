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
import { fileToCoverWebp } from '@/lib/coverImage';
import CoverGenerationStatus from '@/components/admin/CoverGenerationStatus';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState([]);
  const [editors, setEditors] = useState([]);
  const [form, setForm] = useState({
    title: '', slug: '', summary: '', content: '', cover_image: '',
    category_id: '', editor_id: 'random', status: 'draft', seo_title: '', seo_description: '',
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCat, setAiCat] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverProgress, setCoverProgress] = useState('');
  const [coverError, setCoverError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.Category.filter({}, { sort: 'order', limit: 200 });
        setCats(res.items || []);
        const edRes = await base44.entities.Editor.filter({}, { sort: 'name', limit: 200 });
        setEditors(edRes.items || []);
        if (!isNew && id) {
          const a = await base44.entities.Article.get(id);
          setForm({
            title: a.title || '', slug: a.slug || '', summary: a.summary || '',
            content: a.content || '', cover_image: a.cover_image || '',
            category_id: a.category_id || '', editor_id: a.editor_id || 'random',
            status: a.status || 'draft',
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
      const blob = await fileToCoverWebp(file);
      const webpFile = new File([blob], 'cover.webp', { type: 'image/webp' });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: webpFile });
      setForm((f) => ({ ...f, cover_image: file_url }));
      toast({ title: 'Capa enviada (stored publicly)' });
    } catch (err) {
      toast({ title: 'Erro no upload: ' + err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const generateCover = async () => {
    const topic = form.title || aiTopic;
    if (!topic) return toast({ title: 'Informe o título do artigo primeiro', variant: 'destructive' });
    setCoverError('');
    setCoverProgress('Iniciando a geração da capa...');
    setCoverLoading(true);
    try {
      const res = await base44.functions.invoke('generateCoverImage', {
        topic, ...(!isNew ? { article_id: id } : {}),
      }, { onProgress: setCoverProgress });
      const url = res.data.url;
      if (!url) throw new Error('A IA não retornou uma capa.');
      setForm((f) => ({ ...f, cover_image: url }));
      toast({ title: isNew ? 'Capa gerada. Salve o artigo para vinculá-la.' : 'Capa gerada e salva no artigo.' });
    } catch (err) {
      const message = 'Não foi possível concluir a capa: ' + (err.response?.data?.error || err.message);
      setCoverError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setCoverLoading(false);
    }
  };

  const generateAI = async () => {
    if (!cats.length || !editors.length) return toast({ title: 'Cadastre pelo menos uma categoria e um editor antes de criar artigos.', variant: 'destructive' });
    const catId = aiCat || form.category_id;
    if (!aiTopic || !catId) return toast({ title: 'Informe tema e categoria', variant: 'destructive' });
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke('generateArticle', { topic: aiTopic, category_id: catId, editor_id: form.editor_id || 'random' });
      const article = res.data.article;
      setForm({
        title: article.title, slug: article.slug, summary: article.summary,
        content: article.content, cover_image: article.cover_image || '', category_id: article.category_id,
        editor_id: article.editor_id || 'random', status: 'draft',
        seo_title: article.seo_title, seo_description: article.seo_description,
      });
      toast({ title: 'Rascunho gerado pela IA. Revise e publique.', description: res.data.cover_error ? `Não foi possível gerar a capa: ${res.data.cover_error}` : undefined });
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
    if (!cats.length || !editors.length) return toast({ title: 'Cadastre pelo menos uma categoria e um editor antes de criar artigos.', variant: 'destructive' });
    if (!form.title || !form.category_id) return toast({ title: 'Título e categoria são obrigatórios', variant: 'destructive' });
    const slug = form.slug || slugify(form.title);
    // Resolve "aleatório" para um editor real
    let editorId = form.editor_id;
    if (editorId === 'random') {
      if (editors.length === 0) {
        editorId = '';
      } else {
        editorId = editors[Math.floor(Math.random() * editors.length)].id;
      }
    }
    const payload = { ...form, editor_id: editorId, slug };
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
  if (isNew && (!cats.length || !editors.length)) return (
    <div className="space-y-4">
      <h1 className="font-heading font-bold text-2xl">Novo artigo</h1>
      <p className="text-muted-foreground">Cadastre pelo menos uma categoria e um editor antes de criar artigos.</p>
      <div className="flex gap-4">
        <Link to="/admin/categorias" className="underline">Cadastrar categoria</Link>
        <Link to="/admin/editores" className="underline">Cadastrar editor</Link>
      </div>
    </div>
  );

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
          <Label htmlFor="editor">Editor / Escritor</Label>
          <select id="editor" value={form.editor_id} onChange={(e) => setForm({ ...form, editor_id: e.target.value })}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="random">Aleatório</option>
            {editors.map((ed) => <option key={ed.id} value={ed.id}>{ed.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-1">Escolha o escritor que assina este artigo, ou deixe em aleatório.</p>
        </div>
        <div>
          <Label htmlFor="summary">Resumo</Label>
          <Textarea id="summary" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>
        <div>
          <Label>Imagem de capa</Label>
          <p className="text-xs text-muted-foreground mt-1">Padrão único: 1200x675px, .webp. Capas de IA são ajustadas automaticamente; uploads devem ter esse tamanho e são convertidos para WebP.</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-accent transition">
              <Upload className="w-4 h-4" /> Enviar imagem
              <input type="file" accept="image/webp,image/png,image/jpeg" onChange={(e) => e.target.files[0] && uploadCover(e.target.files[0])}
                className="hidden" disabled={uploading || coverLoading} />
            </label>
            <Button type="button" variant="outline" onClick={generateCover} disabled={coverLoading || uploading}>
              {coverLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar capa com IA
            </Button>
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          <CoverGenerationStatus loading={coverLoading} progress={coverProgress} error={coverError} />
          {form.cover_image && (
            <div className="mt-3 aspect-[16/9] w-full max-w-sm overflow-hidden rounded-lg bg-muted">
              <img src={form.cover_image} alt="capa" className="w-full h-full object-cover" />
            </div>
          )}
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
        <Button type="submit" disabled={saving || coverLoading || uploading || aiLoading}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar artigo
        </Button>
      </form>
    </div>
  );
}