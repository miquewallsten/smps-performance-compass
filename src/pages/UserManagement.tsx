import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useUpdateUser, useResetUserPassword, useCreateUser, useDeleteUser, useSystemStatus, useUpdateUserRole, usePositions, useWorkAreas, useLocations } from '@/api/queries';
import { Position } from '@/types';
import { getPositionLabel } from '@/lib/evaluationConfig';
import { PERIODS, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { Eye, Key, UserCheck, UserX, Search, Plus, Trash2, Star, Shield, Pencil, MapPin, Clock, Loader2 } from 'lucide-react';
import EvaluationViewer from '@/components/EvaluationViewer';
import { toast } from 'sonner';

export default function UserManagement() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations();
  const updateUserMut = useUpdateUser();
  const changePasswordMut = useResetUserPassword();
  const addUserMut = useCreateUser();
  const deleteUserMut = useDeleteUser();
  const updateUserRoleMut = useUpdateUserRole();
  const { data: systemStatus } = useSystemStatus();
  const { data: customPositions = [] } = usePositions();
  const { data: workAreas = [] } = useWorkAreas();
  const { data: locations = [] } = useLocations();

  const [search, setSearch] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewingEval, setViewingEval] = useState<string | null>(null);
  const [editPosition, setEditPosition] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cve: '', locationId: '', password: '1234' });

  // Build catalog from API data (single source of truth)
  const sortedAreas = [...workAreas].sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const sortedPositions = [...customPositions].sort((a: any, b: any) => (a as any).id.localeCompare((b as any).id));

  const resolvePositionLabel = (customPositionId: string | undefined) => {
    if (!customPositionId) return null;
    const pos = sortedPositions.find((p: any) => p.id === customPositionId);
    return pos ? (pos as any).label : null;
  };

  const resolveLocationLabel = (locationId: string | undefined) => {
    if (!locationId) return null;
    const loc = locations.find((l: any) => l.id === locationId);
    if (!loc) return null;
    const parts = [loc.city, loc.office, loc.floor, loc.desk].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : loc.label;
  };

  if (!currentUser || (!currentUser.isAdmin && !currentUser.isSuperUser)) {
    return <p className="text-center py-12 text-muted-foreground">Acceso restringido al administrador.</p>;
  }

  const isSuperUser = currentUser.isSuperUser;

  // Max user limit check
  const maxUsers = systemStatus?.maxUsers || 50;
  const activeNonDummyCount = (Array.isArray(users) ? users : []).filter(u => u.isActive && !u.isSuperUser).length;
  const maxReached = activeNonDummyCount >= maxUsers;

  const getVisibleUsers = () => {
    return users.filter(u => !u.isSuperUser);
  };

  const visibleUsers = getVisibleUsers();
  const filtered = visibleUsers
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const legalUsers = filtered.filter(u => getLegalHierarchy().includes(u.position)).sort((a, b) => {
    const posA = getLegalHierarchy().indexOf(a.position);
    const posB = getLegalHierarchy().indexOf(b.position);
    return posA !== posB ? posA - posB : a.name.localeCompare(b.name, 'es');
  });
  const adminUsers = filtered.filter(u => getAdminHierarchy().includes(u.position)).sort((a, b) => {
    const posA = getAdminHierarchy().indexOf(a.position);
    const posB = getAdminHierarchy().indexOf(b.position);
    return posA !== posB ? posA - posB : a.name.localeCompare(b.name, 'es');
  });

  // ─── Action handlers ───

  const handleToggleActive = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (!user.isActive && maxReached) {
      toast.error(`Se ha alcanzado el máximo de usuarios activos (${maxUsers}).`);
      return;
    }
    const newActiveState = !user.isActive;
    updateUserMut.mutate(
      { id: userId, isActive: newActiveState },
      {
        onSuccess: () => toast.success(newActiveState ? 'Usuario activado' : 'Usuario desactivado'),
        onError: (err: Error) => {
          toast.error(err.message || 'Error al cambiar estado del usuario');
        },
      }
    );
  }, [users, maxReached, updateUserMut]);

  const handleResetPassword = useCallback(() => {
    if (!showPasswordModal || !newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    changePasswordMut.mutate(
      { id: showPasswordModal, newPassword },
      { onSuccess: () => { toast.success('Contraseña restablecida'); setShowPasswordModal(null); setNewPassword(''); }, onError: (err: Error) => toast.error(err.message || 'Error') }
    );
  }, [showPasswordModal, newPassword, changePasswordMut]);

  const handlePositionChange = useCallback((userId: string, cve: string) => {
    const pos = sortedPositions.find((p: any) => p.id === cve);
    if (!pos) return;
    const area = sortedAreas.find((a: any) => a.id === (pos as any).workAreaId);
    const level = (area as any)?.level;
    updateUserMut.mutate(
      { id: userId, position: (pos as any).basePosition, practiceArea: level === 'legal' ? ((pos as any).workAreaId) : undefined, customPositionId: (pos as any).id },
      { onSuccess: () => { toast.success('Puesto actualizado'); setEditPosition(null); }, onError: (err: Error) => toast.error(err.message || 'Error') }
    );
  }, [sortedPositions, sortedAreas, updateUserMut]);

  const handleAddUser = useCallback(() => {
    if (!newUser.name.trim() || !newUser.email.trim()) { toast.error('Nombre y correo son obligatorios'); return; }
    if (!newUser.cve) { toast.error('Selecciona un puesto'); return; }
    const pos = sortedPositions.find((p: any) => p.id === newUser.cve);
    if (!pos) { toast.error('Puesto no encontrado'); return; }
    const area = sortedAreas.find((a: any) => a.id === (pos as any).workAreaId);
    const level = (area as any)?.level;
    addUserMut.mutate(
      {
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        position: (pos as any).basePosition,
        practiceArea: level === 'legal' ? ((pos as any).workAreaId) : undefined,
        customPositionId: (pos as any).id,
        locationId: newUser.locationId || undefined,
        password: newUser.password || '1234',
      },
      { onSuccess: () => { toast.success('Usuario creado exitosamente'); setNewUser({ name: '', email: '', cve: '', locationId: '', password: '1234' }); setShowAddUser(false); }, onError: (err: Error) => toast.error(err.message || 'Error al crear usuario') }
    );
  }, [newUser, sortedPositions, sortedAreas, addUserMut]);

  const handleDeleteUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    deleteUserMut.mutate(userId, {
      onSuccess: () => { toast.success('Usuario desactivado'); setDeleteConfirm(null); },
      onError: (err: Error) => toast.error(err.message || 'Error')
    });
  }, [users, deleteUserMut]);

  const handleToggleAdmin = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    updateUserRoleMut.mutate(
      { id: userId, isAdmin: !user.isAdmin },
      { onSuccess: () => toast.success(user.isAdmin ? 'Admin removido' : 'Admin asignado'), onError: (err: Error) => toast.error(err.message || 'Error') }
    );
  }, [users, updateUserRoleMut]);

  const handleToggleManagingPartner = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    updateUserRoleMut.mutate(
      { id: userId, isManagingPartner: !user.isManagingPartner },
      { onSuccess: () => toast.success(user.isManagingPartner ? 'Socio Adm. removido' : 'Socio Adm. asignado'), onError: (err: Error) => toast.error(err.message || 'Error') }
    );
  }, [users, updateUserRoleMut]);

  // ─── Render helpers ───

  const evalToView = viewingEval ? evaluations.find(e => e.id === viewingEval) : null;

  const renderUserRow = (user: any) => {
    const isEditingPosition = editPosition === user.id;
    const userEvals = evaluations.filter(e => e.evaluatedId === user.id);
    const posLabel = resolvePositionLabel(user.customPositionId) || getPositionLabel(user.position) || user.position;
    const locLabel = resolveLocationLabel(user.locationId);

    return (
      <tr key={user.id} className="border-b hover:bg-muted/20">
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${user.isActive ? 'bg-smps-success' : 'bg-muted-foreground/30'}`} />
            <span className={`text-sm ${!user.isActive ? 'text-muted-foreground' : ''}`}>{user.name}</span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-xs text-muted-foreground">{user.email}</td>
        <td className="py-2.5 px-3">
          {isEditingPosition ? (
            <select value={user.customPositionId || ''} onChange={e => handlePositionChange(user.id, e.target.value)} onBlur={() => setEditPosition(null)} autoFocus
              className="px-2 py-1 rounded border border-input bg-background text-sm w-full">
              {sortedAreas.map((area: any) => (
                <optgroup key={area.id} label={area.label}>
                  {sortedPositions.filter((p: any) => p.workAreaId === area.id).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditPosition(user.id)}>
              <span className="text-sm">{posLabel}</span>
              <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
            </div>
          )}
        </td>
        <td className="py-2.5 px-3">
          {locLabel ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
              <MapPin className="h-3 w-3" /> {locLabel}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1 flex-wrap">
            {user.isAdmin && <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-semibold">ADMIN</span>}
            {user.isManagingPartner && <span className="text-[10px] bg-yellow-400/10 text-yellow-600 px-1.5 py-0.5 rounded-full font-semibold">SOCIO ADM</span>}
            {userEvals.length > 0 && (
              <button onClick={() => setSelectedUser(user.id)} className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full font-semibold hover:bg-blue-500/20 transition-colors">
                <Eye className="h-3 w-3 inline mr-0.5" />{userEvals.length} eval
              </button>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3 text-right">
          <div className="flex items-center justify-end gap-0.5">
            <button onClick={() => navigate(`/users/${user.id}/timeline`)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ver Historial">
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => handleToggleActive(user.id)} className={`p-1.5 rounded transition-colors ${user.isActive ? 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive' : 'hover:bg-smps-success/10 text-muted-foreground hover:text-smps-success'}`} title={user.isActive ? 'Desactivar' : 'Activar'}>
              {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setShowPasswordModal(user.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Restablecer contraseña">
              <Key className="h-3.5 w-3.5" />
            </button>
            {isSuperUser && (
              <>
                <button onClick={() => handleToggleAdmin(user.id)} className={`p-1.5 rounded transition-colors ${user.isAdmin ? 'text-accent hover:bg-accent/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} title="Admin">
                  <Shield className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleToggleManagingPartner(user.id)} className={`p-1.5 rounded transition-colors ${user.isManagingPartner ? 'text-yellow-500 hover:bg-yellow-400/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} title="Socio Administrador">
                  <Star className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderUserTable = (userList: any[], title: string) => (
    <div className="smps-surface-elevated">
      <h2 className="font-display text-lg font-semibold mb-3">{title}</h2>
      {userList.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Sin usuarios</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 px-3">Nombre</th>
                <th className="py-2 px-3">Correo</th>
                <th className="py-2 px-3">Puesto</th>
                <th className="py-2 px-3">Ubicación</th>
                <th className="py-2 px-3">Roles</th>
                <th className="py-2 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {userList.map(renderUserRow)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" /> Usuarios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{activeNonDummyCount} / {maxUsers} activos</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className="pl-8 pr-3 py-2 rounded-lg border border-input bg-background text-sm w-48" />
          </div>
          <button onClick={() => setShowAddUser(true)} disabled={maxReached}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>
      </div>

      {renderUserTable(legalUsers, 'Legal')}
      {renderUserTable(adminUsers, 'Administrativo')}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowPasswordModal(null)}>
          <div className="smps-surface-elevated w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Restablecer Contraseña</h3>
            <div>
              <label className="text-sm font-medium text-foreground">Nueva contraseña</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mt-1" />
              <p className="text-xs text-muted-foreground mt-1">El usuario deberá cambiarla al iniciar sesión</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowPasswordModal(null); setNewPassword(''); }} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleResetPassword} disabled={newPassword.length < 6} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90">Restablecer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAddUser(false)}>
          <div className="smps-surface-elevated w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Nuevo Usuario</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Nombre completo</label>
                <input type="text" value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del colaborador" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Correo electrónico</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="correo@smps.com" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Puesto</label>
                <select value={newUser.cve} onChange={e => setNewUser(prev => ({ ...prev, cve: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm">
                  <option value="" disabled>Selecciona un puesto</option>
                  {sortedAreas.map((area: any) => (
                    <optgroup key={area.id} label={area.label}>
                      {sortedPositions.filter((p: any) => p.workAreaId === area.id).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Ubicación</label>
                <select value={newUser.locationId} onChange={e => setNewUser(prev => ({ ...prev, locationId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm">
                  <option value="">Sin ubicación</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{[loc.city, loc.office, loc.floor, loc.desk].filter(Boolean).join(' · ') || loc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Contraseña inicial</label>
                <input type="text" value={newUser.password} onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                <p className="text-xs text-muted-foreground mt-1">El usuario deberá cambiarla al primer inicio de sesión</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowAddUser(false); setNewUser({ name: '', email: '', cve: '', locationId: '', password: '1234' }); }} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleAddUser} disabled={!newUser.name.trim() || !newUser.email.trim() || !newUser.cve} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Crear Usuario</button>
            </div>
          </div>
        </div>
      )}

      {evalToView && <EvaluationViewer evaluation={evalToView} onClose={() => setViewingEval(null)} />}
    </div>
  );
}
