import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  Shield,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { Button, Card, Input } from '../../components/ui';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  isActive: boolean;
  isAvailable: boolean;
  skills: string[];
  maxConcurrent: number;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { assignedConversations: number };
}

export function TeamPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'AGENT' as 'OWNER' | 'ADMIN' | 'AGENT',
    skills: '',
    maxConcurrent: 10,
  });

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { members: TeamMember[] } }>('/team');
      return res.data.data.members;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['team-stats'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { totalMembers: number; activeMembers: number; availableMembers: number; totalAssignments: number } }>('/team/stats');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.post('/team', {
        ...data,
        skills: data.skills.split(',').map(s => s.trim()).filter(Boolean),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-stats'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData & { isActive: boolean }> }) => {
      const res = await api.patch(`/team/${id}`, {
        ...data,
        ...(data.skills && { skills: data.skills.split(',').map(s => s.trim()).filter(Boolean) }),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setEditingMember(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['team-stats'] });
    },
  });

  const resetForm = () => {
    setFormData({ email: '', name: '', password: '', role: 'AGENT', skills: '', maxConcurrent: 10 });
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      email: member.email,
      name: member.name,
      password: '',
      role: member.role,
      skills: member.skills.join(', '),
      maxConcurrent: member.maxConcurrent,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'ADMIN': return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default: return <Shield className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      OWNER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      AGENT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return styles[role as keyof typeof styles] || styles.AGENT;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona los miembros de tu equipo</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Agregar Miembro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: statsData?.totalMembers || 0, icon: Users },
          { label: 'Activos', value: statsData?.activeMembers || 0, icon: UserCheck },
          { label: 'Disponibles', value: statsData?.availableMembers || 0, icon: UserCheck },
          { label: 'Asignaciones', value: statsData?.totalAssignments || 0, icon: Users },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setIsCreateOpen(false); setEditingMember(null); resetForm(); }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingMember ? 'Editar Miembro' : 'Agregar Miembro'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nombre" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required disabled={!!editingMember} />
              {!editingMember && <Input label="Contraseña" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as 'OWNER' | 'ADMIN' | 'AGENT' })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700">
                  <option value="AGENT">Agente</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="OWNER">Propietario</option>
                </select>
              </div>
              <Input label="Skills (separados por coma)" value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="ventas, soporte, ingles" />
              <Input label="Max. Conversaciones" type="number" value={formData.maxConcurrent} onChange={e => setFormData({ ...formData, maxConcurrent: parseInt(e.target.value) })} min={1} max={50} />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => { setIsCreateOpen(false); setEditingMember(null); resetForm(); }}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingMember ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Members List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando equipo...</div>
      ) : membersData?.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Sin miembros</h3>
          <p className="text-gray-500 mb-4">Agrega miembros a tu equipo</p>
          <Button onClick={() => setIsCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>Agregar Miembro</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {membersData?.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold', member.isAvailable ? 'bg-green-500' : 'bg-gray-400')}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                      {getRoleIcon(member.role)}
                      <span className={cn('px-2 py-0.5 text-xs rounded-full', getRoleBadge(member.role))}>{member.role}</span>
                      {!member.isActive && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Inactivo</span>}
                    </div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                    {member.skills.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {member.skills.map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="text-gray-900 dark:text-white">{member._count.assignedConversations}/{member.maxConcurrent}</div>
                    <div className="text-gray-500">conversaciones</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(member)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="secondary" size="sm" onClick={() => { if (confirm('¿Eliminar este miembro?')) deleteMutation.mutate(member.id); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
