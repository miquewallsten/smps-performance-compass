import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useUpdateUser, useResetUserPassword, useCreateUser, useDeleteUser, useSystemStatus, useUpdateUserRole, usePositions } from '@/api/queries';
import { POSITION_LABELS, PERIODS, Position, LEGAL_HIERARCHY, ADMIN_HIERARCHY, PracticeArea, PRACTICE_AREA_LABELS } from '@/types';
import { Eye, Key, UserCheck, UserX, Search, Plus, Trash2, Bot, Star, Shield } from 'lucide-react';
import EvaluationViewer from '@/components/EvaluationViewer';
import { toast } from 'sonner';
import { POSITION_CATALOG, resolvePositionLabel } from '@/data/positionCatalog';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations();
  const updateUser = useUpdateUser().mutate;
  const changePassword = useResetUserPassword().mutate;
  const addUser = useCreateUser().mutate;
  const deleteUser = useDeleteUser().mutate;
  const { data: systemStatus } = useSystemStatus();
  const setManagingPartner = useUpdateUserRole().mutate;
  const { data: customPositions = [] } = usePositions();

  const [search, setSearch] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewingEval, setViewingEval] = useState<string | null>(null);
  const [editPosition, setEditPosition] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddDummy, setShowAddDummy] = useState(false);
  const [showDummyFilter, setShowDummyFilter] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cve: 'SMPS12', password: '1234' });
  const [newDummyUser, setNewDummyUser] = useState({ name: '', email: '', password: '1234' });

  const cveCatalog = [...POSITION_CATALOG, ...customPositions.filter(c => !POSITION_CATALOG.some(p => p.cve === c.id)).map(c => ({ cve: c.id, label: c.label, basePosition: c.basePosition, practiceArea: c.practiceArea, level: c.level }))];
  const groupedCatalog = {
    corporativo: cveCatalog.filter(p => p.level === 'legal' && p.practiceArea === 'corporativo'),
    consultoria_fiscal: cveCatalog.filter(p => p.level === 'legal' && p.practiceArea === 'consultoria_fiscal'),
    litigio_fiscal: cveCatalog.filter(p => p.level === 'legal' && p.practiceArea === 'litigio_fiscal'),
    general: cveCatalog.filter(p => p.level === 'legal' && (!p.practiceArea || p.practiceArea === 'general')),
    administrativo: cveCatalog.filter(p => p.level === 'administrativo'),
  };


  if (!currentUser || (!currentUser.isAdmin && !currentUser.isSuperUser && !currentUser.isDummy)) {
    return <p className="text-center py-12 text-muted-foreground">Acceso restringido al administrador.</p>;
  }

  const isSuperUser = currentUser.isSuperUser;
  const isDummyUser = currentUser.isDummy;

  // Max user limit check
  const maxUsers = systemStatus?.maxUsers || 50;
  const activeNonDummyCount = users.filter(u => u.isActive && !u.isSuperUser && !u.isDummy).length;
  const maxReached = activeNonDummyCount >= maxUsers;

  // For dummy users: only see users they created or superuser created
  const getVisibleUsers = () => {
    if (isSuperUser) {
      if (showDummyFilter) return users.filter(u => u.isDummy);
      return users.filter(u => !u.isSuperUser);
    }
    if (isDummyUser) {
      // Dummy users see only users they created or superuser created for them
      return users.filter(u => u.createdBy === currentUser.id || u.createdBy === 'u0' || u.id === currentUser.id).filter(u => !u.isSuperUser);
    }
    // Regular admin: no dummy users visible
    return users.filter(u => !u.isSuperUser && !u.isDummy);
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
  const dummyUsers = filtered.filter(u => u.position === 'dummy');

  const toggleActive = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    // Check limit when activating
    if (!user.isActive && !user.isDummy && maxReached) {
      alert(`Se ha alcanzado el máximo de usuarios activos (${maxUsers}). Contacte al administrador.`);
      return;
    }
    updateUser({ ...user, isActive: !user.isActive });
  };

  const handleChangePassword = () => {
    if (showPasswordModal && newPassword.length >= 4) {
      changePassword(showPasswordModal, newPassword);
      setShowPasswordModal(null);
      setNewPassword('');
    }
  };

  const handlePositionChange = (userId: string, cve: string) => {
    const user = users.find(u => u.id === userId);
    const cat = cveCatalog.find(p => p.cve === cve);
    if (user && cat) {
      updateUser({
        ...user,
        position: cat.basePosition,
        practiceArea: cat.level === 'legal' ? (cat.practiceArea || 'general') : undefined,
        customPositionId: cat.cve,
      });
      setEditPosition(null);
    }
  };


  const handleAddUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    if (maxReached && !isSuperUser) {
      alert(`Se ha alcanzado el máximo de usuarios activos (${maxUsers}). Contacte al administrador.`);
      return;
    }
    const catEntry = cveCatalog.find(p => p.cve === newUser.cve);
    if (!catEntry) { toast.error('Selecciona un puesto válido'); return; }
    addUser({
      id: `u-${Date.now()}`,
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      position: catEntry.basePosition,
      practiceArea: catEntry.level === 'legal' ? (catEntry.practiceArea || 'general') : undefined,
      customPositionId: catEntry.cve,
      isAdmin: false,
      isActive: true,
      password: newUser.password || '1234',
      createdBy: currentUser.id,
    });
    setNewUser({ name: '', email: '', cve: 'SMPS12', password: '1234' });
    setShowAddUser(false);
  };



  const handleAddDummyUser = () => {
    if (!newDummyUser.name.trim() || !newDummyUser.email.trim()) return;
    addUser({
      id: `ud-${Date.now()}`,
      name: newDummyUser.name.trim(),
      email: newDummyUser.email.trim().toLowerCase(),
      position: 'dummy',
      isAdmin: false,
      isActive: true,
      password: newDummyUser.password || '1234',
      isDummy: true,
      createdBy: currentUser.id,
    });
    setNewDummyUser({ name: '', email: '', password: '1234' });
    setShowAddDummy(false);
  };

  const handleDeleteUser = () => {
    if (deleteConfirm) {
      deleteUser(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const selectedUserData = users.find(u => u.id === selectedUser);
  const userEvals = selectedUserData ? evaluations.filter(e => e.evaluatedId === selectedUserData.id).sort((a, b) => a.period.localeCompare(b.period)) : [];
  const evalToView = viewingEval ? evaluations.find(e => e.id === viewingEval) : null;

  const renderUserTable = (userList: typeof filtered, groupLabel: string) => {
    if (userList.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold mb-3 text-accent">{groupLabel}</h3>
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
                      {user.isDummy && <span className="ml-2 text-[10px] bg-smps-warning/10 text-smps-warning px-1.5 py-0.5 rounded-full">DUMMY</span>}
                      {user.isManagingPartner && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                          <Star className="h-2.5 w-2.5" /> Socio Administrador
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {user.isDummy ? (
                        <span className="text-muted-foreground">Dummy</span>
                      ) : editPosition === user.id ? (
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
                      <button onClick={() => toggleActive(user.id)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${user.isActive ? 'bg-smps-success/10 text-smps-success' : 'bg-muted text-muted-foreground'}`}>
                        {user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Admin toggle: solo el admin principal puede asignar/quitar al segundo admin */}
                        {!user.isDummy && !user.isSuperUser && currentUser.isPrimaryAdmin && user.id !== currentUser.id && (() => {
                          const adminCount = users.filter(u => u.isAdmin && !u.isSuperUser).length;
                          const canAdd = adminCount < 2;
                          const isAdminUser = !!user.isAdmin;
                          const disabled = !isAdminUser && !canAdd;
                          return (
                            <button
                              disabled={disabled}
                              onClick={() => {
                                if (isAdminUser) {
                                  if (user.isPrimaryAdmin) { toast.error('No puedes quitar al administrador principal.'); return; }
                                  if (confirm(`¿Quitar permisos de Administrador a ${user.name}?`)) {
                                    updateUser({ ...user, isAdmin: false });
                                    toast.success('Permisos actualizados');
                                  }
                                } else {
                                  if (confirm(`¿Asignar a ${user.name} como segundo Administrador del sistema?`)) {
                                    updateUser({ ...user, isAdmin: true });
                                    toast.success(`${user.name} es ahora Administrador`);
                                  }
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${isAdminUser ? 'bg-accent/10 text-accent' : 'hover:bg-muted text-muted-foreground'}`}
                              title={isAdminUser ? (user.isPrimaryAdmin ? 'Administrador Principal' : 'Administrador (clic para revocar)') : disabled ? 'Máximo 2 administradores' : 'Asignar como Administrador'}
                            >
                              <Shield className={`h-4 w-4 ${isAdminUser ? 'fill-current' : ''}`} />
                            </button>
                          );
                        })()}
                        {/* Mostrar badge si es admin pero el viewer no es admin principal */}
                        {!currentUser.isPrimaryAdmin && user.isAdmin && !user.isSuperUser && (
                          <span title={user.isPrimaryAdmin ? 'Administrador Principal' : 'Administrador'} className="p-1.5">
                            <Shield className={`h-4 w-4 ${user.isPrimaryAdmin ? 'text-accent fill-current' : 'text-accent'}`} />
                          </span>
                        )}
                        {user.position === 'socio' && (
                          <button
                            onClick={() => {
                              if (user.isManagingPartner) {
                                toast.info('Para quitar el rol, asígnalo a otro Socio.');
                                return;
                              }
                              if (confirm(`Asignar a ${user.name} como Socio Administrador único? Esto reemplazará al actual.`)) {
                                setManagingPartner(user.id);
                                toast.success(`${user.name} es ahora Socio Administrador`);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${user.isManagingPartner ? 'bg-accent/10 text-accent' : 'hover:bg-muted text-muted-foreground'}`}
                            title={user.isManagingPartner ? 'Socio Administrador actual' : 'Asignar como Socio Administrador'}
                          >
                            <Star className={`h-4 w-4 ${user.isManagingPartner ? 'fill-current' : ''}`} />
                          </button>
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
          <p className="text-muted-foreground text-sm mt-1">{visibleUsers.filter(u => !u.isDummy).length} usuarios registrados</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperUser && (
            <>
              <button onClick={() => setShowDummyFilter(!showDummyFilter)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${showDummyFilter ? 'bg-smps-warning/10 border-smps-warning/30 text-smps-warning' : 'border-input hover:bg-muted'}`}>
                <Bot className="h-4 w-4" /> Dummy
              </button>
              <button onClick={() => setShowAddDummy(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
                <Plus className="h-4 w-4" /> Dummy
              </button>
            </>
          )}
          <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o correo..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
      </div>

      {showDummyFilter && isSuperUser ? (
        renderUserTable(dummyUsers, 'USUARIOS DUMMY')
      ) : (
        <>
          {renderUserTable(legalUsers, 'LEGAL')}
          {renderUserTable(adminUsers, 'ADMINISTRATIVO')}
        </>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAddUser(false)}>
          <div className="bg-card rounded-xl border p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-4">Nuevo Usuario</h3>
            {maxReached && !isSuperUser && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-sm text-destructive mb-4">
                ⚠️ Se ha alcanzado el máximo de usuarios activos ({maxUsers}). Contacte al administrador.
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nombre completo</label>
                <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Lic. Nombre Apellido"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Correo electrónico</label>
                <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="usuario@smps.com" type="email"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Puesto (catálogo SMPS)</label>
                <select value={newUser.cve} onChange={e => setNewUser({ ...newUser, cve: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <optgroup label="Corporativo">{groupedCatalog.corporativo.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                  <optgroup label="Consultoría Fiscal">{groupedCatalog.consultoria_fiscal.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                  <optgroup label="Litigio Fiscal">{groupedCatalog.litigio_fiscal.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                  {groupedCatalog.general.length > 0 && (
                    <optgroup label="Legal (general)">{groupedCatalog.general.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                  )}
                  <optgroup label="Administrativo">{groupedCatalog.administrativo.map(p => <option key={p.cve} value={p.cve}>{p.cve} · {p.label}</option>)}</optgroup>
                </select>
              </div>

              <div>

                <label className="text-xs text-muted-foreground">Contraseña</label>
                <input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="1234"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddUser(false)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleAddUser} disabled={!newUser.name.trim() || !newUser.email.trim() || (maxReached && !isSuperUser)} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Crear Usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dummy User Modal */}
      {showAddDummy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAddDummy(false)}>
          <div className="bg-card rounded-xl border p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-1">Nuevo Usuario Dummy</h3>
            <p className="text-xs text-muted-foreground mb-4">Invisible para otros usuarios. Tiene capacidades de admin.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nombre</label>
                <input value={newDummyUser.name} onChange={e => setNewDummyUser({ ...newDummyUser, name: e.target.value })} placeholder="Usuario de Prueba"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Correo electrónico</label>
                <input value={newDummyUser.email} onChange={e => setNewDummyUser({ ...newDummyUser, email: e.target.value })} placeholder="dummy@test.com" type="email"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Contraseña</label>
                <input value={newDummyUser.password} onChange={e => setNewDummyUser({ ...newDummyUser, password: e.target.value })} placeholder="1234"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddDummy(false)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleAddDummyUser} disabled={!newDummyUser.name.trim() || !newDummyUser.email.trim()} className="flex-1 py-2 rounded-lg bg-smps-warning text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Crear Dummy</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card rounded-xl border p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-2 text-destructive">Eliminar Usuario</h3>
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
          <div className="bg-card rounded-xl border p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-4">Cambiar Contraseña</h3>
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
          <div className="bg-card rounded-xl border p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

      {evalToView && <EvaluationViewer evaluation={evalToView} onClose={() => setViewingEval(null)} />}
    </div>
  );
}
