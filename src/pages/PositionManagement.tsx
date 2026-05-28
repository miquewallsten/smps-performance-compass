import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkAreas, useCreateWorkArea, useUpdateWorkArea, useDeleteWorkArea, usePositions, useCreatePosition, useUpdatePosition, useDeletePosition, useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/api/queries';
import { Position, PositionLevel } from '@/types';
import { getPositionLabel } from '@/lib/evaluationConfig';
import { getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { Briefcase, MapPin, Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PositionManagement() {
  const { user: currentUser } = useAuth();
  const { data: workAreas = [] } = useWorkAreas();
  const createWorkAreaMut = useCreateWorkArea();
  const updateWorkAreaMut = useUpdateWorkArea();
  const deleteWorkAreaMut = useDeleteWorkArea();
  const { data: positions = [] } = usePositions();
  const createPositionMut = useCreatePosition();
  const updatePositionMut = useUpdatePosition();
  const deletePositionMut = useDeletePosition();
  const { data: locations = [] } = useLocations();
  const createLocationMut = useCreateLocation();
  const updateLocationMut = useUpdateLocation();
  const deleteLocationMut = useDeleteLocation();

  const [tab, setTab] = useState<'areas' | 'locations'>('areas');
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [showAddArea, setShowAddArea] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [newArea, setNewArea] = useState({ label: '', level: 'legal' as PositionLevel });
  const [editAreaData, setEditAreaData] = useState({ label: '', level: 'legal' as PositionLevel });

  const [showAddPosition, setShowAddPosition] = useState<string | null>(null); // workAreaId
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState({ id: '', label: '', workAreaId: '', basePosition: 'asistente' as Position });
  const [editPositionData, setEditPositionData] = useState({ id: '', label: '', workAreaId: '', basePosition: 'asistente' as Position });

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState({ city: '', office: '', floor: '', desk: '' });
  const [editLocationData, setEditLocationData] = useState({ label: '', city: '', office: '', floor: '', desk: '' });

  if (!currentUser || (!currentUser.isAdmin && !currentUser.isSuperUser)) {
    return <p className="text-center py-12 text-muted-foreground">Acceso restringido al administrador.</p>;
  }

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  // ─── Work Area handlers ───
  const handleCreateArea = () => {
    if (!newArea.label.trim()) { toast.error('El nombre del área es obligatorio'); return; }
    const slug = newArea.label.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    createWorkAreaMut.mutate(
      { id: slug, label: newArea.label.trim(), level: newArea.level },
      { onSuccess: () => { toast.success('Área creada'); setShowAddArea(false); setNewArea({ label: '', level: 'legal' }); }, onError: (err: Error) => toast.error(err.message) }
    );
  };

  const handleUpdateArea = (areaId: string) => {
    updateWorkAreaMut.mutate(
      { id: areaId, label: editAreaData.label.trim(), level: editAreaData.level },
      { onSuccess: () => { toast.success('Área actualizada'); setEditingArea(null); }, onError: (err: Error) => toast.error(err.message) }
    );
  };

  const handleDeleteArea = (areaId: string) => {
    if (!confirm('¿Eliminar esta área? No se puede si tiene puestos asignados.')) return;
    deleteWorkAreaMut.mutate(areaId, {
      onSuccess: () => toast.success('Área eliminada'),
      onError: (err: Error) => toast.error(err.message)
    });
  };

  // ─── Position handlers ───
  const handleCreatePosition = () => {
    if (!newPosition.id.trim() || !newPosition.label.trim() || !newPosition.workAreaId) {
      toast.error('CVE, nombre y área son obligatorios'); return;
    }
    createPositionMut.mutate(
      { id: newPosition.id.trim().toUpperCase(), label: newPosition.label.trim(), workAreaId: newPosition.workAreaId, basePosition: newPosition.basePosition },
      { onSuccess: () => { toast.success('Puesto creado'); setShowAddPosition(null); setNewPosition({ id: '', label: '', workAreaId: '', basePosition: 'asistente' }); }, onError: (err: Error) => toast.error(err.message) }
    );
  };

  const handleUpdatePosition = (positionId: string) => {
    updatePositionMut.mutate(
      { id: positionId, label: editPositionData.label.trim(), workAreaId: editPositionData.workAreaId, basePosition: editPositionData.basePosition },
      { onSuccess: () => { toast.success('Puesto actualizado'); setEditingPosition(null); }, onError: (err: Error) => toast.error(err.message) }
    );
  };

  const handleDeletePosition = (positionId: string) => {
    if (!confirm('¿Eliminar este puesto? No se puede si tiene usuarios asignados.')) return;
    deletePositionMut.mutate(positionId, {
      onSuccess: () => toast.success('Puesto eliminado'),
      onError: (err: Error) => toast.error(err.message)
    });
  };

  // ─── Location handlers ───
  const handleCreateLocation = () => {
    if (!newLocation.city.trim()) { toast.error('La ciudad es obligatoria'); return; }
    const city = newLocation.city.trim();
    const office = newLocation.office.trim();
    const parts = [city];
    if (office) parts.push(office);
    if (newLocation.floor.trim()) parts.push('P' + newLocation.floor.trim());
    if (newLocation.desk.trim()) parts.push(newLocation.desk.trim());
    const label = parts.join(' ');
    const id = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_') + (office ? '-' + office.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_') : '');
    createLocationMut.mutate(
      { id, label, city: city, office: office || undefined, floor: newLocation.floor || undefined, desk: newLocation.desk || undefined },
      { onSuccess: () => { toast.success('Ubicación creada'); setShowAddLocation(false); setNewLocation({ city: '', office: '', floor: '', desk: '' }); }, onError: (err: Error) => toast.error(err.message) }
    );
  };

  const handleUpdateLocation = (locationId: string) => {
    updateLocationMut.mutate(
      { id: locationId, label: editLocationData.label.trim(), city: editLocationData.city || undefined, office: editLocationData.office || undefined, floor: editLocationData.floor || undefined, desk: editLocationData.desk || undefined },
      { onSuccess: () => { toast.success('Ubicación actualizada'); setEditingLocation(null); }, onError: (err: Error) => toast.error(err.message) }
    );
  };

  const handleDeleteLocation = (locationId: string) => {
    if (!confirm('¿Eliminar esta ubicación? No se puede si tiene usuarios asignados.')) return;
    deleteLocationMut.mutate(locationId, {
      onSuccess: () => toast.success('Ubicación eliminada'),
      onError: (err: Error) => toast.error(err.message)
    });
  };

  const locationTag = (loc: any) => {
    const parts = [loc.city, loc.office, loc.floor, loc.desk].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : loc.label;
  };

  const allPositions = positions.sort((a: any, b: any) => a.id.localeCompare(b.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-accent" /> Áreas y Puestos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Administra áreas de trabajo, puestos (CVE) y ubicaciones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
        <button onClick={() => setTab('areas')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'areas' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <Building2 className="h-4 w-4" /> Áreas y Puestos
        </button>
        <button onClick={() => setTab('locations')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'locations' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <MapPin className="h-4 w-4" /> Ubicaciones
        </button>
      </div>

      {/* ─── Tab 1: Áreas y Puestos ─── */}
      {tab === 'areas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddArea(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Nueva Área
            </button>
          </div>

          {workAreas.map((area: any) => {
            const areaPositions = allPositions.filter((p: any) => p.workAreaId === area.id);
            const isExpanded = expandedAreas.has(area.id);

            return (
              <div key={area.id} className="smps-surface-elevated">
                {/* Area Header */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleArea(area.id)}>
                  <button className="p-1 rounded hover:bg-muted transition-colors">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1">
                    {editingArea === area.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input type="text" value={editAreaData.label} onChange={e => setEditAreaData(p => ({ ...p, label: e.target.value }))} className="px-2 py-1 rounded border border-input bg-background text-sm w-48" />
                        <select value={editAreaData.level} onChange={e => setEditAreaData(p => ({ ...p, level: e.target.value as PositionLevel }))} className="px-2 py-1 rounded border border-input bg-background text-sm">
                          <option value="legal">Legal</option>
                          <option value="administrativo">Administrativo</option>
                        </select>
                        <button onClick={() => handleUpdateArea(area.id)} className="p-1.5 rounded bg-accent text-accent-foreground hover:opacity-90"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditingArea(null)} className="p-1.5 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-semibold">{area.label}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${area.level === 'legal' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-600'}`}>
                          {area.level === 'legal' ? 'Legal' : 'Administrativo'}
                        </span>
                        <span className="text-xs text-muted-foreground">{areaPositions.length} puesto(s)</span>
                      </div>
                    )}
                  </div>
                  {editingArea !== area.id && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingArea(area.id); setEditAreaData({ label: area.label, level: area.level }); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar área">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteArea(area.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors" title="Eliminar área">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setShowAddPosition(area.id); setNewPosition(p => ({ ...p, workAreaId: area.id, basePosition: area.level === 'legal' ? 'asociado_jr' : 'asistente' })); }} className="p-1.5 rounded hover:bg-accent/10 text-accent transition-colors" title="Agregar puesto">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Positions Table */}
                {isExpanded && (
                  <div className="mt-3 border-t pt-3">
                    {areaPositions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Sin puestos en esta área.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-muted-foreground border-b">
                              <th className="py-2 px-2">CVE</th>
                              <th className="py-2 px-2">Puesto</th>
                              <th className="py-2 px-2">Posición Base</th>
                              <th className="py-2 px-2 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {areaPositions.map((pos: any) => (
                              editingPosition === pos.id ? (
                                <tr key={pos.id} className="border-b bg-muted/20">
                                  <td className="py-2 px-2 font-mono text-xs">{pos.id}</td>
                                  <td className="py-2 px-2">
                                    <input type="text" value={editPositionData.label} onChange={e => setEditPositionData(p => ({ ...p, label: e.target.value }))} className="px-2 py-1 rounded border border-input bg-background text-sm w-full" />
                                  </td>
                                  <td className="py-2 px-2">
                                    <select value={editPositionData.basePosition} onChange={e => setEditPositionData(p => ({ ...p, basePosition: e.target.value as Position }))} className="px-2 py-1 rounded border border-input bg-background text-sm">
                                      {(area.level === 'legal' ? getLegalHierarchy : getAdminHierarchy).map(p => <option key={p} value={p}>{getPositionLabel(p)}</option>)}
                                    </select>
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => handleUpdatePosition(pos.id)} className="p-1.5 rounded bg-accent text-accent-foreground hover:opacity-90"><Save className="h-3.5 w-3.5" /></button>
                                      <button onClick={() => setEditingPosition(null)} className="p-1.5 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr key={pos.id} className="border-b hover:bg-muted/20">
                                  <td className="py-2 px-2 font-mono text-xs text-accent font-semibold">{pos.id}</td>
                                  <td className="py-2 px-2">{pos.label}</td>
                                  <td className="py-2 px-2 text-muted-foreground">{getPositionLabel(pos.basePosition as Position) || pos.basePosition}</td>
                                  <td className="py-2 px-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => { setEditingPosition(pos.id); setEditPositionData({ id: pos.id, label: pos.label, workAreaId: pos.workAreaId, basePosition: pos.basePosition }); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar puesto">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => handleDeletePosition(pos.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors" title="Eliminar puesto">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Area Modal */}
          {showAddArea && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAddArea(false)}>
              <div className="smps-surface-elevated w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="smps-section-title font-display text-base font-semibold mb-3">Nueva Área de Trabajo</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nombre del Área</label>
                    <input type="text" value={newArea.label} onChange={e => setNewArea(p => ({ ...p, label: e.target.value }))} placeholder="ej. Corporativo" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" autoFocus />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Tipo de Área</label>
                    <select value={newArea.level} onChange={e => setNewArea(p => ({ ...p, level: e.target.value as PositionLevel }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      <option value="legal">Legal</option>
                      <option value="administrativo">Administrativo</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowAddArea(false); setNewArea({ label: '', level: 'legal' }); }} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={handleCreateArea} disabled={!newArea.label.trim()} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Crear Área</button>
                </div>
              </div>
            </div>
          )}

          {/* Add Position Modal */}
          {showAddPosition && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAddPosition(null)}>
              <div className="smps-surface-elevated w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="smps-section-title font-display text-base font-semibold mb-3">Nuevo Puesto</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">CVE (código)</label>
                    <input type="text" value={newPosition.id} onChange={e => setNewPosition(p => ({ ...p, id: e.target.value }))} placeholder="ej. SMPS30" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Nombre del Puesto</label>
                    <input type="text" value={newPosition.label} onChange={e => setNewPosition(p => ({ ...p, label: e.target.value }))} placeholder="ej. Asociado Jr Corporativo" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Área de Trabajo</label>
                    <select value={newPosition.workAreaId} onChange={e => { const area = workAreas.find((a: any) => a.id === e.target.value); setNewPosition(p => ({ ...p, workAreaId: e.target.value, basePosition: area?.level === 'legal' ? 'asociado_jr' : 'asistente' })); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      {workAreas.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Posición Base</label>
                    <select value={newPosition.basePosition} onChange={e => setNewPosition(p => ({ ...p, basePosition: e.target.value as Position }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      {(workAreas.find((a: any) => a.id === newPosition.workAreaId)?.level === 'legal' ? getLegalHierarchy : getAdminHierarchy).map(p => <option key={p} value={p}>{getPositionLabel(p)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowAddPosition(null); setNewPosition({ id: '', label: '', workAreaId: '', basePosition: 'asistente' }); }} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={handleCreatePosition} disabled={!newPosition.id.trim() || !newPosition.label.trim() || !newPosition.workAreaId} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Crear Puesto</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 2: Ubicaciones ─── */}
      {tab === 'locations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddLocation(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Nueva Ubicación
            </button>
          </div>

          {locations.length === 0 ? (
            <div className="smps-surface-elevated text-center py-8">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay ubicaciones configuradas. Agrega la primera.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 px-3">Ubicación</th>
                    <th className="py-2 px-3">Ciudad</th>
                    <th className="py-2 px-3">Oficina</th>
                    <th className="py-2 px-3">Piso</th>
                    <th className="py-2 px-3">Escritorio</th>
                    <th className="py-2 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc: any) => (
                    editingLocation === loc.id ? (
                      <tr key={loc.id} className="border-b bg-muted/20">
                        <td className="py-2 px-3"><input type="text" value={editLocationData.label} onChange={e => setEditLocationData(p => ({ ...p, label: e.target.value }))} className="px-2 py-1 rounded border border-input bg-background text-sm w-full" /></td>
                        <td className="py-2 px-3"><input type="text" value={editLocationData.city} onChange={e => setEditLocationData(p => ({ ...p, city: e.target.value }))} className="px-2 py-1 rounded border border-input bg-background text-sm w-full" /></td>
                        <td className="py-2 px-3"><input type="text" value={editLocationData.office} onChange={e => setEditLocationData(p => ({ ...p, office: e.target.value }))} className="px-2 py-1 rounded border border-input bg-background text-sm w-full" /></td>
                        <td className="py-2 px-3"><input type="text" value={editLocationData.floor} onChange={e => setEditLocationData(p => ({ ...p, floor: e.target.value }))} className="px-2 py-1 rounded border border-input bg-background text-sm w-20" /></td>
                        <td className="py-2 px-3"><input type="text" value={editLocationData.desk} onChange={e => setEditLocationData(p => ({ ...p, desk: e.target.value }))} className="px-2 py-1 rounded border border-input bg-background text-sm w-20" /></td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleUpdateLocation(loc.id)} className="p-1.5 rounded bg-accent text-accent-foreground hover:opacity-90"><Save className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setEditingLocation(null)} className="p-1.5 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={loc.id} className="border-b hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                            <MapPin className="h-3 w-3" /> {locationTag(loc)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{loc.city || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{loc.office || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{loc.floor || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{loc.desk || '—'}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingLocation(loc.id); setEditLocationData({ label: loc.label, city: loc.city || '', office: loc.office || '', floor: loc.floor || '', desk: loc.desk || '' }); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar ubicación">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDeleteLocation(loc.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors" title="Eliminar ubicación">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Location Modal */}
          {showAddLocation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowAddLocation(false)}>
              <div className="smps-surface-elevated w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="smps-section-title font-display text-base font-semibold mb-3">Nueva Ubicación</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Ciudad</label>
                    <input type="text" value={newLocation.city} onChange={e => setNewLocation(p => ({ ...p, city: e.target.value }))} placeholder="ej. CDMX" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" autoFocus />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Oficina <span className="text-muted-foreground font-normal">(opcional)</span></label>
                    <input type="text" value={newLocation.office} onChange={e => setNewLocation(p => ({ ...p, office: e.target.value }))} placeholder="ej. Oficentro" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground">Piso <span className="text-muted-foreground font-normal">(opcional)</span></label>
                      <input type="text" value={newLocation.floor} onChange={e => setNewLocation(p => ({ ...p, floor: e.target.value }))} placeholder="3" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Escritorio <span className="text-muted-foreground font-normal">(opcional)</span></label>
                      <input type="text" value={newLocation.desk} onChange={e => setNewLocation(p => ({ ...p, desk: e.target.value }))} placeholder="A12" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowAddLocation(false); setNewLocation({ city: '', office: '', floor: '', desk: '' }); }} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={handleCreateLocation} disabled={!newLocation.city.trim()} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Crear Ubicación</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
