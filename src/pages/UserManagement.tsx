import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useUpdateUser, useResetUserPassword, useCreateUser, useDeleteUser, useSystemStatus, useUpdateUserRole, usePositions } from '@/api/queries';
import { POSITION_LABELS, PERIODS, Position, LEGAL_HIERARCHY, ADMIN_HIERARCHY, PracticeArea, PRACTICE_AREA_LABELS } from '@/types';
import { Eye, Key, UserCheck, UserX, Search, Plus, Trash2, Star, Shield } from 'lucide-react';
import EvaluationViewer from '@/components/EvaluationViewer';
import { toast } from 'sonner';
import { POSITION_CATALOG, resolvePositionLabel } from '@/data/positionCatalog';

export default function UserManagement() {
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

  const [search, setSearch] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewingEval, setViewingEval] = useState<string | null>(null);
  const [editPosition, setEditPosition] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cve: 'SMPS12', password: '1234' });

  const cveCatalog = [...POSITION_CATALOG, ...customPositions.filter(c => !POSITION_CATALOG.some(p => p.cve === c.id)).map(c => ({ cve: c.id, label: c.label, basePosition: c.basePosition, practiceArea: c.practiceArea, level: c.level }))];
  const groupedCatalog = {
    corporativo: cveCatalog.filter(p => p.level === 'legal' && p.practiceArea === 'corporativo'),
    consultoria_fiscal: cveCatalog.filter(p => p.level === 'legal' && p.practiceArea === 'consultoria_fiscal'),
    litigio_fiscal: cveCatalog.filter(p => p.level === 'legal' && p.practiceArea === 'litigio_fiscal'),
    general: cveCatalog.filter(p => p.level === 'legal' && (!p.practiceArea || p.practiceArea === 'general')),
    administrativo: cveCatalog.filter(p => p.level === 'administrativo'),
  };


  if (!currentUser || (!currentUser.isAdmin && !currentUser.isSuperUser)) {
    return <p className="text-center py-12 text-muted-foreground">Acceso restringido al administrador.</p>;
  }

  const isSuperUser = currentUser.isSuperUser;

  // Max user limit check
  const maxUsers = systemStatus?.maxUsers || 50;
  const activeNonDummyCount = users.filter(u => u.isActive && !u.isSuperUser).length;
  const maxReached = activeNonDummyCount >= maxUsers;

  // Visibility: show all non-superuser users to admins and superadmins
  const getVisibleUsers = () => {
    return users.filter(u => !u.isSuperUser);
  };

  const visibleUsers = getVisibleUsers();
  const filtered = visibleUsers
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const legalUsers = filtered.filter(u => LEGAL_HIERARCHY.includes(u.position)).sort((a, b) => {
    const posA = LEGAL_HIERARCHY.indexOf(a.position);
    const posB = LEGAL_HIERARCHY.indexOf(b.position);
    return posA !== posB ? posA - posB : a.name.localeCompare(b.name, 'es');
  });
  const adminUsers = filtered.filter(u => ADMIN_HIERARCHY.includes(u.position)).sort((a, b) => {
    const posA = ADMIN_HIERARCHY.indexOf(a.position);
    const posB = ADMIN_HIERARCHY.indexOf(b.position);
    return posA !== posB ? posA - posB : a.name.localeCompare(b.name, 'es');
  });

  // ─── Action handlers (with proper async/await and error handling) ───

  const handleToggleActive = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (!user.isActive && maxReached) {
      toast.error(`Se ha alcanzado el máximo de usuarios activos (${maxUsers}).`);
      return;
    }
    updateUserMut.mutate(
      { id: userId, isActive: !user.isActive },
      { onSuccess: () => toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario activado'), onError: (err: Error) => toast.error(err.message || 'Error al actualizar') }
    );
  }, [users, maxReached, updateUserMut]);

  const handleChangePassword = useCallback(() => {
    if (!showPasswordModal || newPassword.length < 4) return;
    changePasswordMut.mutate(
      { id: showPasswordModal, newPassword },
      { onSuccess: () => { toast.success('Contraseña actualizada'); setShowPasswordModal(null); setNewPassword(''); }, onError: (err: Error) => toast.error(err.message || 'Error al cambiar contraseña') }
    );
  }, [showPasswordModal, newPassword, changePasswordMut]);

  const handlePositionChange = useCallback((userId: string, cve: string) => {
    const user = users.find(u => u.id === userId);
    const cat = cveCatalog.find(p => p.cve === cve);
    if (!user || !cat) return;
    updateUserMut.mutate(
      { id: userId, position: cat.basePosition, practiceArea: cat.level === 'legal' ? (cat.practiceArea || 'general') : undefined, customPositionId: cat.cve },
      { onSuccess: () => toast.success('Posición actualizada'), onError: (err: Error) => toast.error(err.message || 'Error al actualizar') }
    );
    setEditPosition(null);
  }, [users, cveCatalog, updateUserMut]);

  const handleToggleAdmin = useCallback((userId: string, makeAdmin: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    // Managing Partner must stay admin
    if (user.isManagingPartner && !makeAdmin) {
      toast.error('No se puede quitar el rol de Administrador al Socio Administrador.');
      return;
    }
    if (makeAdmin) {
      const adminCount = users.filter(u => u.isAdmin && !u.isSuperUser).length;
      if (adminCount >= 2) {
        toast.error('Máximo 2 Administradores permitidos. Quite permisos a otro primero.');
        return;
      }
    }
    updateUserRoleMut.mutate(
      { id: userId, isAdmin: makeAdmin },
      { onSuccess: () => toast.success(makeAdmin ? `${user.name} es ahora Administrador` : 'Permisos actualizados'), onError: (err: Error) => toast.error(err.message || 'Error al actualizar rol') }
    );
  }, [users, updateUserRoleMut]);

  const handleToggleManagingPartner = useCallback((userId: string, makeMP: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (makeMP) {
      const currentMP = users.find(u => u.isManagingPartner && !u.isSuperUser);
      if (currentMP && currentMP.id !== userId) {
        toast.error(`Solo puede haber un Socio Administrador. Actualmente es ${currentMP.name}.`);
        return;
      }
    }
    updateUserRoleMut.mutate(
      { id: userId, isManagingPartner: makeMP, ...(makeMP ? { isAdmin: true } : {}) },
      { onSuccess: () => toast.success(makeMP ? `${user.name} es ahora Socio Administrador` : `${user.name} ya no es Socio Administrador`), onError: (err: Error) => toast.error(err.message || 'Error al actualizar rol') }
    );
  }, [users, updateUserRoleMut]);

  const handleToggleSuperUser = useCallback((userId: string, makeSU: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (makeSU) {
      if (!confirm(`¿Asignar a ${user.name} como SuperUser? Control total del sistema.`)) return;
    } else {
      if (!confirm(`¿Quitar permisos de SuperUser a ${user.name}?`)) return;
    }
    updateUserRoleMut.mutate(
      { id: userId, isSuperUser: makeSU },
      { onSuccess: () => toast.success(makeSU ? `${user.name} es ahora SuperUser` : `${user.name} ya no es SuperUser`), onError: (err: Error) => toast.error(err.message || 'Error al actualizar rol') }
    );
  }, [users, updateUserRoleMut]);

  const handleAddUser = useCallback(() => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Nombre y correo son obligatorios');
      return;
    }
    if (newUser.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    const catEntry = cveCatalog.find(p => p.cve === newUser.cve);
    if (!catEntry) { toast.error('Selecciona un puesto válido'); return; }
    addUserMut.mutate(
      {
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        position: catEntry.basePosition,
        practiceArea: catEntry.level === 'legal' ? (catEntry.practiceArea || 'general') : undefined,
        customPositionId: catEntry.cve,
        isAdmin: false,
        password: newUser.password || '1234',
      },
      { onSuccess: () => { toast.success('Usuario creado exitosamente'); setNewUser({ name: '', email: '', cve: 'SMPS12', password: '1234' }); setShowAddUser(false); }, onError: (err: Error) => toast.error(err.message || 'Error al crear usuario') }
    );
  }, [newUser, cveCatalog, addUserMut]);

  const handleDeleteUser = useCallback(() => {
    if (!deleteConfirm) return;
    const user = users.find(u => u.id === deleteConfirm);
    deleteUserMut.mutate(deleteConfirm, {
      onSuccess: () => { toast.success(`${user?.name || 'Usuario'} eliminado`); setDeleteConfirm(null); },
      onError: (err: Error) => toast.error(err.message || 'Error al eliminar'),
    });
  }, [deleteConfirm, users, deleteUserMut]);

  const selectedUserData = users.find(u => u.id === selectedUser);
  const userEvals = selectedUserData ? evaluations.filter(e => e.evaluatedId === selectedUserData.id).sort((a, b) => a.period.localeCompare(b.period)) : [];
  const evalToView = viewingEval ? evaluations.find(e => e.id === viewingEval) : null;

  const renderUserTable = (userList: typeof filtered, groupLabel: string) => {
    if (userList.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="smps-section-title font-display text-base font-semibold mb-3 text-accent">{groupLabel}</h3>
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Posición</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contraseña</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Activo</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {userList.map(user => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">
                      {user.name}
                      {user.isSuperUser && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-yellow-400/20 text-yellow-600 px-1.5 py-0.5 rounded-full">
                          <Shield className="h-2.5 w-2.5" /> SUPERUSER
                        </span>
                      )}
                      {!user.isSuperUser && user.isManagingPartner && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                          <Star className="h-2.5 w-2.5" /> Socio Adm.
                        </span>
                      )}
                      {!user.isSuperUser && !user.isManagingPartner && user.isAdmin && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-yellow-400/10 text-yellow-600 px-1.5 py-0.5 rounded-full">
                          <Shield className="h-2.5 w-2.5" /> Admin
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editPosition === user.id ? (
                        <select value={user.customPositionId || ''} onChange={e => handlePositionChange(user.id, e.target.value)} onBlur={() => setEditPosition(null)} autoFocus
                          className="px-2 py-1 rounded border border-input bg-background text-sm">
                          <optgroup label="Corporativo">{groupedCatalog.corporativo.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                          <optgroup label="Consultoría Fiscal">{groupedCatalog.consultoria_fiscal.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                          <optgroup label="Litigio Fiscal">{groupedCatalog.litigio_fiscal.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                          {groupedCatalog.general.length > 0 && <optgroup label="Legal (general)">{groupedCatalog.general.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>}
                          <optgroup label="Administrativo">{groupedCatalog.administrativo.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                        </select>
                      ) : (
                        <button onClick={() => setEditPosition(user.id)} className="text-muted-foreground hover:text-foreground transition-colors text-left">
                          {resolvePositionLabel(user.customPositionId, customPositions) || POSITION_LABELS[user.position]}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{user.password}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleToggleActive(user.id)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${user.isActive ? 'bg-smps-success/10 text-smps-success' : 'bg-muted text-muted-foreground'}`}>
                        {user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Admin (Shield) toggle — SuperUser, Socio Adm., or Admin can modify */}
                        {(isSuperUser || currentUser.isManagingPartner || (currentUser.isAdmin && !currentUser.isManagingPartner)) && !user.isSuperUser && user.id !== currentUser.id && (
                          <button
                            disabled={!user.isAdmin && !user.isManagingPartner && users.filter(u => u.isAdmin && !u.isSuperUser).length >= 2}
                            onClick={() => handleToggleAdmin(user.id, !user.isAdmin)}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${user.isAdmin ? 'bg-yellow-400/20 text-yellow-600' : 'hover:bg-muted text-muted-foreground'}`}
                            title={user.isManagingPartner ? 'Socio Adm. (siempre Admin)' : user.isAdmin ? 'Administrador (clic para quitar)' : 'Asignar como Administrador'}
                          >
                            <Shield className={`h-4 w-4 ${user.isAdmin ? 'fill-current' : ''}`} />
                          </button>
                        )}
                        {/* SuperUser (Shield) toggle — only SuperUser can modify */}
                        {isSuperUser && user.id !== currentUser.id && (
                          <button
                            onClick={() => handleToggleSuperUser(user.id, !user.isSuperUser)}
                            className={`p-1.5 rounded-lg transition-colors ${user.isSuperUser ? 'bg-yellow-400/20 text-yellow-600' : 'hover:bg-muted text-muted-foreground'}`}
                            title={user.isSuperUser ? 'SuperUser (clic para quitar)' : 'Asignar como SuperUser'}
                          >
                            <Shield className={`h-4 w-4 ${user.isSuperUser ? 'fill-current text-yellow-600' : ''}`} />
                          </button>
                        )}
                        {/* Show admin badge for non-SuperUser viewers */}
                        {!isSuperUser && user.isAdmin && !user.isSuperUser && (
                          <span title={user.isManagingPartner ? 'Socio Administrador' : 'Administrador'} className="p-1.5">
                            <Shield className={`h-4 w-4 ${user.isManagingPartner ? 'text-accent fill-current' : 'text-accent'}`} />
                          </span>
                        )}
                        {/* Managing Partner (Star) toggle — SuperUser and Managing Partner can assign */}
                        {(isSuperUser || currentUser.isManagingPartner) && user.id !== currentUser.id && (
                          <button
                            onClick={() => handleToggleManagingPartner(user.id, !user.isManagingPartner)}
                            className={`p-1.5 rounded-lg transition-colors ${user.isManagingPartner ? 'bg-accent/10 text-accent' : 'hover:bg-muted text-muted-foreground'}`}
                            title={user.isManagingPartner ? 'Socio Administrador (clic para quitar)' : 'Asignar como Socio Administrador'}
                          >
                            <Star className={`h-4 w-4 ${user.isManagingPartner ? 'fill-current' : ''}`} />
                          </button>
                        )}
                        {/* Show Star badge for non-SuperUser viewers */}
                        {!isSuperUser && user.isManagingPartner && !user.isSuperUser && (
                          <span title="Socio Administrador" className="p-1.5">
                            <Star className="h-4 w-4 text-accent fill-current" />
                          </span>
                        )}
                        <button onClick={() => setSelectedUser(user.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Ver evaluaciones"><Eye className="h-4 w-4 text-muted-foreground" /></button>
                        <button onClick={() => setShowPasswordModal(user.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Cambiar contraseña"><Key className="h-4 w-4 text-muted-foreground" /></button>
                        <button onClick={() => setDeleteConfirm(user.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Eliminar usuario"><Trash2 className="h-4 w-4 text-destructive/70" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-1">{visibleUsers.length} usuarios registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o correo..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
      </div>

      {renderUserTable(legalUsers, 'LEGAL')}
      {renderUserTable(adminUsers, 'ADMINISTRATIVO')}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="smps-surface-elevated w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="smps-section-title font-display text-base font-semibold mb-2 text-destructive">Eliminar Usuario</h3>
            <p className="text-sm text-muted-foreground mb-1">¿Está seguro de que desea eliminar a:</p>
            <p className="text-sm font-semibold mb-4">{users.find(u => u.id === deleteConfirm)?.name}?</p>
            <p className="text-xs text-destructive/70 mb-4">Esta acción no se puede deshacer. Se eliminarán todas las asignaciones relacionadas.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleDeleteUser} className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowPasswordModal(null)}>
          <div className="smps-surface-elevated w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Cambiar Contraseña</h3>
            <p className="text-sm text-muted-foreground mb-3">{users.find(u => u.id === showPasswordModal)?.name}</p>
            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nueva contraseña"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowPasswordModal(null)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleChangePassword} disabled={newPassword.length < 4} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* View Evaluations Modal */}
      {selectedUser && selectedUserData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="smps-surface-elevated w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-1">{selectedUserData.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{POSITION_LABELS[selectedUserData.position]}</p>
            {userEvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay evaluaciones registradas.</p>
            ) : (
              <div className="space-y-3">
                {PERIODS.map(period => {
                  const pEvals = userEvals.filter(e => e.period === period);
                  if (pEvals.length === 0) return null;
                  const selfEval = pEvals.find(e => e.type === 'self');
                  const supEvals = pEvals.filter(e => e.type === 'supervisor');
                  const supAvg = supEvals.length > 0 ? Math.round(supEvals.reduce((s, e) => s + e.totalScore, 0) / supEvals.length) : null;
                  return (
                    <div key={period} className="bg-muted/50 rounded-lg p-4">
                      <span className="text-sm font-semibold">{period}</span>
                      <div className="space-y-1 mt-2">
                        {selfEval && (
                          <div className="flex items-center justify-between text-xs">
                            <span>Autoevaluación: {selfEval.totalScore}%</span>
                            <button onClick={() => setViewingEval(selfEval.id)} className="p-1 rounded hover:bg-muted"><Eye className="h-3 w-3" /></button>
                          </div>
                        )}
                        {supEvals.map(se => {
                          const evaluator = users.find(u => u.id === se.evaluatorId);
                          return (
                            <div key={se.id} className="flex items-center justify-between text-xs">
                              <span>Evaluador ({evaluator?.name}): {se.totalScore}%</span>
                              <button onClick={() => setViewingEval(se.id)} className="p-1 rounded hover:bg-muted"><Eye className="h-3 w-3" /></button>
                            </div>
                          );
                        })}
                        {supAvg !== null && supEvals.length > 1 && (
                          <div className="text-xs font-medium text-accent">Promedio evaluadores: {supAvg}%</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setSelectedUser(null)} className="mt-4 w-full py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cerrar</button>
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
                <label className="text-sm font-medium text-foreground">Puesto (CVE)</label>
                <select value={newUser.cve} onChange={e => setNewUser(prev => ({ ...prev, cve: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm">
                  <optgroup label="Corporativo">{groupedCatalog.corporativo.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                  <optgroup label="Consultoría Fiscal">{groupedCatalog.consultoria_fiscal.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                  <optgroup label="Litigio Fiscal">{groupedCatalog.litigio_fiscal.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                  {groupedCatalog.general.length > 0 && <optgroup label="Legal (general)">{groupedCatalog.general.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>}
                  <optgroup label="Administrativo">{groupedCatalog.administrativo.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
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
              <button onClick={() => { setShowAddUser(false); setNewUser({ name: '', email: '', cve: 'SMPS12', password: '1234' }); }} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleAddUser} disabled={!newUser.name.trim() || !newUser.email.trim()} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Crear Usuario</button>
            </div>
          </div>
        </div>
      )}

      {evalToView && <EvaluationViewer evaluation={evalToView} onClose={() => setViewingEval(null)} />}
    </div>
  );
}
