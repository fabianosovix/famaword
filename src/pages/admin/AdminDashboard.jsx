import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, FolderTree, FileBox, Bot } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ articles: 0, published: 0, categories: 0, pages: 0, queue: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [articles, published, categories, pages, queue] = await Promise.all([
          base44.entities.Article.count({}),
          base44.entities.Article.count({ status: 'published' }),
          base44.entities.Category.count({}),
          base44.entities.Page.count({}),
          base44.entities.AIQueue.count({ status: 'pending' }),
        ]);
        setStats({ articles, published, categories, pages, queue });
      } catch (e) {}
    })();
  }, []);

  const cards = [
    { label: 'Artigos', value: stats.articles, sub: `${stats.published} publicados`, icon: FileText, to: '/admin/artigos' },
    { label: 'Categorias', value: stats.categories, icon: FolderTree, to: '/admin/categorias' },
    { label: 'Páginas', value: stats.pages, icon: FileBox, to: '/admin/paginas' },
    { label: 'Fila de IA', value: stats.queue, sub: 'pendentes', icon: Bot, to: '/admin/ia' },
  ];

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="bg-background border border-border rounded-lg p-5 hover:shadow-sm transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-heading font-bold">{c.value}</p>
            {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
          </Link>
        ))}
      </div>
      <div className="mt-8 bg-background border border-border rounded-lg p-5">
        <h2 className="font-heading font-semibold mb-3">Atalhos</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/artigos/novo" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Novo artigo</Link>
          <Link to="/admin/ia" className="px-4 py-2 rounded-md border border-border text-sm font-medium">Gerar com IA</Link>
          <Link to="/admin/paginas" className="px-4 py-2 rounded-md border border-border text-sm font-medium">Páginas AdSense</Link>
        </div>
      </div>
    </div>
  );
}