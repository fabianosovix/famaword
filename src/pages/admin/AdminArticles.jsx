import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABEL = { draft: 'Rascunho', published: 'Publicado', scheduled: 'Agendado' };
const STATUS_COLOR = { draft: 'bg-muted text-muted-foreground', published: 'bg-green-100 text-green-700', scheduled: 'bg-amber-100 text-amber-700' };

export default function AdminArticles() {
  const { toast } = useToast();
  const [articles, setArticles] = useState([]);
  const [cats, setCats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const query = filter === 'all' ? {} : { status: filter };
      const [artRes, catRes] = await Promise.all([
        base44.entities.Article.filter(query, { sort: '-created_date', limit: 100 }),
        base44.entities.Category.filter({}, { limit: 200 }),
      ]);
      const catMap = {};
      (catRes.items || []).forEach((c) => (catMap[c.id] = c));
      setArticles(artRes.items || []);
      setCats(catMap);
    } catch (e) {
      toast({ title: 'Erro ao carregar artigos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const remove = async (a) => {
    if (!confirm(`Excluir o artigo "${a.title}"?`)) return;
    await base44.entities.Article.delete(a.id);
    load();
    toast({ title: 'Artigo excluído' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="font-heading font-bold text-2xl">Artigos</h1>
        <Link to="/admin/artigos/novo"><Button><Plus className="w-4 h-4 mr-2" /> Novo artigo</Button></Link>
      </div>
      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'published', 'scheduled'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${filter === f ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>
            {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : articles.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">Nenhum artigo.</p>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="bg-background border border-border rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link to={`/admin/artigos/${a.id}`} className="font-medium hover:underline truncate block">{a.title}</Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cats[a.category_id]?.name || '—'} · {new Date(a.created_date).toLocaleDateString('pt-BR')}
                  {a.ai_generated && ' · IA'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                <button onClick={() => remove(a)} className="p-2 hover:bg-muted rounded-md text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}