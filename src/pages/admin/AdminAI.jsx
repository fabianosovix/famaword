import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Loader2, Sparkles, Plus, Play } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const QUEUE_STATUS = { pending: 'Pendente', processing: 'Processando', done: 'Concluído', failed: 'Falhou' };
const LANGUAGES = [
  { value: 'pt-BR', label: 'Português' },
  { value: 'es', label: 'Espanhol' },
  { value: 'en', label: 'Inglês' },
  { value: 'fr', label: 'Francês' },
  { value: 'ar', label: 'Árabe' },
];
const LANG_LABEL = (v) => LANGUAGES.find((l) => l.value === v)?.label || '—';

export default function AdminAI() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const [aiTopic, setAiTopic] = useState('');
  const [aiCat, setAiCat] = useState('');
  const [aiLang, setAiLang] = useState('pt-BR');
  const [aiLoading, setAiLoading] = useState(false);

  const [schedForm, setSchedForm] = useState({ day_of_week: 1, topic: '', category_id: '', language: 'pt-BR' });
  const [queueForm, setQueueForm] = useState({ topic: '', category_id: '', language: 'pt-BR' });

  const load = async () => {
    setLoading(true);
    try {
      const [c, s, q] = await Promise.all([
        base44.entities.Category.filter({}, { sort: 'order', limit: 200 }),
        base44.entities.AISchedule.filter({}, { sort: 'day_of_week', limit: 100 }),
        base44.entities.AIQueue.filter({}, { sort: '-created_date', limit: 50 }),
      ]);
      setCats(c.items || []);
      setSchedules(s.items || []);
      setQueue(q.items || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generateNow = async () => {
    if (!aiTopic || !aiCat) return toast({ title: 'Informe tema e categoria', variant: 'destructive' });
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke('generateArticle', { topic: aiTopic, category_id: aiCat, language: aiLang });
      toast({ title: 'Rascunho gerado pela IA' });
      setAiTopic('');
      navigate(`/admin/artigos/${res.data.article.id}`);
    } catch (err) {
      toast({ title: 'Erro: ' + (err.response?.data?.error || err.message), variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const addSchedule = async (e) => {
    e.preventDefault();
    if (!schedForm.topic || !schedForm.category_id) return toast({ title: 'Preencha tudo', variant: 'destructive' });
    await base44.entities.AISchedule.create({ ...schedForm, day_of_week: Number(schedForm.day_of_week), active: true });
    setSchedForm({ day_of_week: 1, topic: '', category_id: '', language: 'pt-BR' });
    load();
    toast({ title: 'Agenda adicionada' });
  };

  const toggleSchedule = async (s) => {
    await base44.entities.AISchedule.update(s.id, { active: !s.active });
    load();
  };

  const removeSchedule = async (s) => {
    await base44.entities.AISchedule.delete(s.id);
    load();
  };

  const addQueue = async (e) => {
    e.preventDefault();
    if (!queueForm.topic || !queueForm.category_id) return toast({ title: 'Preencha tudo', variant: 'destructive' });
    await base44.entities.AIQueue.create({ ...queueForm, status: 'pending' });
    setQueueForm({ topic: '', category_id: '', language: 'pt-BR' });
    load();
    toast({ title: 'Tema adicionado à fila' });
  };

  const removeQueue = async (q) => {
    await base44.entities.AIQueue.delete(q.id);
    load();
  };

  const runNow = async () => {
    try {
      const res = await base44.functions.invoke('runScheduledAI', {});
      toast({ title: `Processado: ${res.data.processed} artigo(s)` });
      load();
    } catch (err) {
      toast({ title: 'Erro: ' + (err.response?.data?.error || err.message), variant: 'destructive' });
    }
  };

  const catName = (id) => cats.find((c) => c.id === id)?.name || '—';

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-heading font-bold text-2xl">Inteligência Artificial</h1>
        <Button variant="outline" onClick={runNow}><Play className="w-4 h-4 mr-2" /> Processar agora</Button>
      </div>

      <section className="bg-background border border-border rounded-lg p-5 space-y-3">
        <h2 className="font-heading font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4" /> Gerar artigo agora</h2>
        <p className="text-sm text-muted-foreground">A IA cria um rascunho que você revisa e publica.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Tema do artigo" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
          <select value={aiCat} onChange={(e) => setAiCat(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Categoria</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={aiLang} onChange={(e) => setAiLang(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <Button onClick={generateNow} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Gerar rascunho
        </Button>
      </section>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold">Agenda semanal</h2>
        <p className="text-sm text-muted-foreground">A IA publica automaticamente nos dias selecionados. Roda diariamente às 9h (UTC).</p>
        <form onSubmit={addSchedule} className="grid sm:grid-cols-5 gap-2">
          <select value={schedForm.day_of_week} onChange={(e) => setSchedForm({ ...schedForm, day_of_week: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <Input placeholder="Tema" value={schedForm.topic} onChange={(e) => setSchedForm({ ...schedForm, topic: e.target.value })} />
          <select value={schedForm.category_id} onChange={(e) => setSchedForm({ ...schedForm, category_id: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Categoria</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={schedForm.language} onChange={(e) => setSchedForm({ ...schedForm, language: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <Button type="submit"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </form>
        <div className="space-y-2">
          {schedules.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma agenda.</p> : schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border border-border rounded-md p-3">
              <div>
                <p className="text-sm font-medium">{DAYS[s.day_of_week]} · {s.topic}</p>
                <p className="text-xs text-muted-foreground">{catName(s.category_id)} · {LANG_LABEL(s.language)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!s.active} onCheckedChange={() => toggleSchedule(s)} />
                <button onClick={() => removeSchedule(s)} className="p-2 hover:bg-muted rounded-md text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background border border-border rounded-lg p-5 space-y-4">
        <h2 className="font-heading font-semibold">Fila de temas</h2>
        <p className="text-sm text-muted-foreground">Temas pendentes que a IA consome conforme a agenda.</p>
        <form onSubmit={addQueue} className="grid sm:grid-cols-4 gap-2">
          <Input placeholder="Tema" value={queueForm.topic} onChange={(e) => setQueueForm({ ...queueForm, topic: e.target.value })} />
          <select value={queueForm.category_id} onChange={(e) => setQueueForm({ ...queueForm, category_id: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Categoria</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={queueForm.language} onChange={(e) => setQueueForm({ ...queueForm, language: e.target.value })} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <Button type="submit"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
        </form>
        <div className="space-y-2">
          {queue.length === 0 ? <p className="text-sm text-muted-foreground">Fila vazia.</p> : queue.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 border border-border rounded-md p-3">
              <div>
                <p className="text-sm font-medium">{q.topic}</p>
                <p className="text-xs text-muted-foreground">{catName(q.category_id)} · {LANG_LABEL(q.language)} · {QUEUE_STATUS[q.status]}</p>
              </div>
              <button onClick={() => removeQueue(q)} className="p-2 hover:bg-muted rounded-md text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}