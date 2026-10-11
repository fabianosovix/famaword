import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, UserCog } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.User.list({ limit: 100 });
      setUsers(res.items || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    if (!email) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(email, role);
      toast({ title: `Convite enviado para ${email} (${role})` });
      setEmail('');
      load();
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const remove = async (u) => {
    if (!confirm(`Remover o usuário ${u.email}?`)) return;
    try {
      await base44.entities.User.delete(u.id);
      load();
      toast({ title: 'Usuário removido' });
    } catch (err) {
      toast({ title: 'Erro: ' + err.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-2xl mb-6">Usuários</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={invite} className="bg-background border border-border rounded-lg p-5 space-y-4 h-fit">
          <h2 className="font-heading font-semibold flex items-center gap-2"><UserCog className="w-4 h-4" /> Convidar usuário</h2>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" />
          </div>
          <div>
            <Label htmlFor="role">Papel</Label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Enviar convite
          </Button>
        </form>

        <div className="space-y-2">
          {loading ? <p className="text-muted-foreground text-sm">Carregando...</p> : users.map((u) => (
            <div key={u.id} className="bg-background border border-border rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.role === 'admin' ? 'Admin' : 'Editor'}</p>
              </div>
              <button onClick={() => remove(u)} className="p-2 hover:bg-muted rounded-md text-destructive shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}