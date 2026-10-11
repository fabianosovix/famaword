import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { LayoutDashboard, FileText, FolderTree, FileBox, Bot, Users, Settings, LogOut, ExternalLink, Menu, X, PenLine } from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/artigos', label: 'Artigos', icon: FileText },
  { to: '/admin/categorias', label: 'Categorias', icon: FolderTree },
  { to: '/admin/paginas', label: 'Páginas', icon: FileBox },
  { to: '/admin/ia', label: 'IA', icon: Bot },
  { to: '/admin/editores', label: 'Editores', icon: PenLine },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 h-16 flex items-center border-b border-border">
        <span className="font-heading font-bold text-base">Painel Admin</span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/70 hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <n.icon className="w-4 h-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground/70 hover:bg-muted hover:text-foreground transition">
          <ExternalLink className="w-4 h-4" /> Ver site
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground/70 hover:bg-muted hover:text-foreground transition">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="hidden md:block fixed inset-y-0 left-0 w-60 bg-background border-r border-border">
        <SidebarContent />
      </div>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <div className="w-60 h-full bg-background" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}
      <div className="md:pl-60">
        <div className="md:hidden h-14 border-b border-border bg-background flex items-center px-4 sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2"><Menu className="w-5 h-5" /></button>
          <span className="font-heading font-bold text-sm ml-2">Painel Admin</span>
        </div>
        <main className="p-4 md:p-8 max-w-5xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}