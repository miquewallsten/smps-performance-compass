import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useObjectives, useCreateObjectives, useAssignments, useSubmitObjectives, useReviewObjective } from '@/api/queries';
import {
  POSITION_LABELS, POSITION_LEVELS, CURRENT_PERIOD, PERIODS,
  AdminObjective, LegalObjective, PersonalObjectives as POType, User,
} from '@/types';
import { Target, ChevronDown, ChevronRight, Save, Plus, Trash2, Upload, Download } from 'lucide-react';

// Dynamic import for xlsx to avoid "require is not defined" in browser
let _xlsx: any = null;
async function getXLSX() { if (!_xlsx) _xlsx = await import("xlsx"); return _xlsx; }

import { toast } from 'sonner';

const emptyLegalObj = (): LegalObjective => ({
  id: `lo-${Date.now()}`,
  horasMeta: 0, horasAjustadas: 0, porcentajeHorasVsMeta: 0, porcentajeEficiencia: 0,
  metaProBono: 0, realizadoProBono: 0, metaMarketing: 0, realizadoMarketing: 0,
  metaBusinessDev: 0, realizadoBusinessDev: 0, metaMentoring: 0, realizadoMentoring: 0,
  resultadoArea: 0, resultadoFirma: 0, porcentajeTotalBono: 0,
});

const emptyAdminObj = (): AdminObjective => ({
  id: `ao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  tipoObjetivo: '', nombreObjetivo: '', pilaresEstrategicos: '', alcance: '', porcentajeAvance: 0,
  status: 'draft',
});

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', pending: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado',
};
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-smps-warning/15 text-smps-warning',
  approved: 'bg-smps-success/15 text-smps-success',
  rejected: 'bg-destructive/15 text-destructive',
};


function TrafficLight({ value }: { value: number }) {
  let color = 'bg-destructive';
  if (value >= 90) color = 'bg-smps-success';
  else if (value >= 80) color = 'bg-smps-warning';
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm font-medium">{value}%</span>
    </div>
  );
}

export default function PersonalObjectivesPage() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: personalObjectives = [] } = useObjectives();
  const createObjectives = useCreateObjectives().mutate;
  const { data: assignments = [] } = useAssignments();
  const submitObjectives = useSubmitObjectives().mutate;
  const reviewObjective = useReviewObjective().mutate;
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editAdminObjs, setEditAdminObjs] = useState<AdminObjective[]>([]);
  const [editLegalObj, setEditLegalObj] = useState<LegalObjective>(emptyLegalObj());
  const [reviewing, setReviewing] = useState<{ userId: string; objectiveId: string; status: 'approved' | 'rejected' } | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;
  const isAdminUser = currentUser.isAdmin || currentUser.isSuperUser;
  const isSupervisorOf = (userId: string) => assignments.some(a => a.employeeId === userId && a.supervisorId === currentUser.id && a.period === period);
  const canEditUser = (userId: string) => isAdminUser || userId === currentUser.id;
  const canReview = (userId: string) => isAdminUser || isSupervisorOf(userId);


  const activeUsers = users.filter(u => u.isActive && !u.isSuperUser && !u.isDummy && u.position !== 'dummy');
  const adminUsers = activeUsers.filter(u => POSITION_LEVELS[u.position] === 'administrativo').sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const legalUsers = activeUsers.filter(u => POSITION_LEVELS[u.position] === 'legal').sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const getObjectives = (userId: string): POType | undefined => {
    return personalObjectives.find(o => o.userId === userId && o.period === period);
  };

  const startEditing = (user: User) => {
    const existing = getObjectives(user.id);
    const level = POSITION_LEVELS[user.position];
    if (level === 'administrativo') {
      setEditAdminObjs(existing?.adminObjectives?.length ? [...existing.adminObjectives] : [emptyAdminObj()]);
    } else {
      setEditLegalObj(existing?.legalObjective || emptyLegalObj());
    }
    setEditingUser(user.id);
    setExpandedUser(user.id);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditAdminObjs([]);
    setEditLegalObj(emptyLegalObj());
  };

  const handleSaveAdmin = (userId: string) => {
    createObjectives({
      userId,
      period,
      type: 'admin',
      adminObjectives: editAdminObjs,
    });
    setEditingUser(null);
  };

  const handleSaveLegal = (userId: string) => {
    createObjectives({
      userId,
      period,
      type: 'legal',
      legalObjective: editLegalObj,
    });
    setEditingUser(null);
  };

  const adminHeaders = ['email', 'type', 'tipoObjetivo', 'nombreObjetivo', 'pilaresEstrategicos', 'alcance', 'porcentajeAvance'];
  const legalHeaders = [
    'email', 'type', 'horasMeta', 'horasAjustadas', 'porcentajeHorasVsMeta', 'porcentajeEficiencia',
    'metaProBono', 'realizadoProBono', 'metaMarketing', 'realizadoMarketing',
    'metaBusinessDev', 'realizadoBusinessDev', 'metaMentoring', 'realizadoMentoring',
    'resultadoArea', 'resultadoFirma', 'porcentajeTotalBono',
  ];

  const downloadAdminTemplate = async () => {
    const X = await getXLSX();
    const wb = X.utils.book_new();
    const sample = [Object.fromEntries(adminHeaders.map(h => [h, h === 'type' ? 'admin' : h === 'email' ? 'usuario@smps.com' : '']))];
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(sample, { header: adminHeaders }), 'Administrativo');
    X.writeFile(wb, `plantilla-administrativo-${period}.xlsx`);
    toast.success('Plantilla Administrativo descargada');
  };

  const downloadLegalTemplate = async () => {
    const X = await getXLSX();
    const wb = X.utils.book_new();
    const sample = [Object.fromEntries(legalHeaders.map(h => [h, h === 'type' ? 'legal' : h === 'email' ? 'usuario@smps.com' : 0]))];
    X.utils.book_append_sheet(wb, X.utils.json_to_sheet(sample, { header: legalHeaders }), 'Legal');
    X.writeFile(wb, `plantilla-legal-${period}.xlsx`);
    toast.success('Plantilla Legal descargada');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const X = await getXLSX();
      const wb = X.read(data);
      let imported = 0;
      let skipped = 0;
      const userByEmail = new Map(users.map(u => [u.email.toLowerCase().trim(), u]));

      for (const sheetName of wb.SheetNames) {
        const rows: Record<string, unknown>[] = (X.utils.sheet_to_json as any)(wb.Sheets[sheetName]);
        for (const row of rows) {
          const email = String(row.email || '').toLowerCase().trim();
          const type = String(row.type || '').toLowerCase().trim();
          const user = userByEmail.get(email);
          if (!user || (type !== 'admin' && type !== 'legal')) { skipped++; continue; }
          const level: string = POSITION_LEVELS[user.position];
          if (level !== type) { skipped++; continue; }

          if (type === 'admin') {
            const adminObj: AdminObjective = {
              id: `ao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tipoObjetivo: String(row.tipoObjetivo || ''),
              nombreObjetivo: String(row.nombreObjetivo || ''),
              pilaresEstrategicos: String(row.pilaresEstrategicos || ''),
              alcance: String(row.alcance || ''),
              porcentajeAvance: Math.min(100, Math.max(0, Number(row.porcentajeAvance) || 0)),
            };
            const existing = personalObjectives.find(o => o.userId === user.id && o.period === period);
            const merged = existing?.adminObjectives ? [...existing.adminObjectives, adminObj].slice(0, 5) : [adminObj];
            createObjectives({ userId: user.id, period, type: 'admin', adminObjectives: merged });
          } else {
            const legalObj: LegalObjective = {
              id: `lo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              horasMeta: Number(row.horasMeta) || 0,
              horasAjustadas: Number(row.horasAjustadas) || 0,
              porcentajeHorasVsMeta: Number(row.porcentajeHorasVsMeta) || 0,
              porcentajeEficiencia: Number(row.porcentajeEficiencia) || 0,
              metaProBono: Number(row.metaProBono) || 0,
              realizadoProBono: Number(row.realizadoProBono) || 0,
              metaMarketing: Number(row.metaMarketing) || 0,
              realizadoMarketing: Number(row.realizadoMarketing) || 0,
              metaBusinessDev: Number(row.metaBusinessDev) || 0,
              realizadoBusinessDev: Number(row.realizadoBusinessDev) || 0,
              metaMentoring: Number(row.metaMentoring) || 0,
              realizadoMentoring: Number(row.realizadoMentoring) || 0,
              resultadoArea: Number(row.resultadoArea) || 0,
              resultadoFirma: Number(row.resultadoFirma) || 0,
              porcentajeTotalBono: Number(row.porcentajeTotalBono) || 0,
            };
            createObjectives({ userId: user.id, period, type: 'legal', legalObjective: legalObj });
          }
          imported++;
        }
      }
      toast.success(`Importados: ${imported}${skipped ? ` · Omitidos: ${skipped}` : ''}`);
    } catch (err) {
      toast.error('Error al procesar el archivo');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderAdminUserCard = (user: User) => {
    const isOpen = expandedUser === user.id;
    const isEditing = editingUser === user.id;
    const existing = getObjectives(user.id);
    const objs = isEditing ? editAdminObjs : (existing?.adminObjectives || []);

    return (
      <div key={user.id} className="bg-card rounded-xl border overflow-hidden">
        <button
          onClick={() => { if (!editingUser) setExpandedUser(prev => prev === user.id ? null : user.id); }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          disabled={!!editingUser && editingUser !== user.id}
        >
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-accent flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{POSITION_LABELS[user.position]} · {objs.length} objetivo(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const hasPending = objs.some(o => (o.status || 'draft') !== 'approved');
              const allApproved = objs.length > 0 && objs.every(o => o.status === 'approved');
              const hasDraft = objs.some(o => !o.status || o.status === 'draft' || o.status === 'rejected');
              if (allApproved) return <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-smps-success/15 text-smps-success">Aprobado</span>;
              if (hasPending && objs.some(o => o.status === 'pending')) return <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-smps-warning/15 text-smps-warning">En revisión</span>;
              return null;
            })()}
            {canEditUser(user.id) && !isEditing && !editingUser && (
              <span onClick={e => { e.stopPropagation(); startEditing(user); }} className="text-xs px-3 py-1 rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer">Editar</span>
            )}
            {user.id === currentUser.id && !isEditing && objs.some(o => !o.status || o.status === 'draft' || o.status === 'rejected') && (
              <span onClick={e => { e.stopPropagation(); const obj = personalObjectives.find((o: any) => o.userId === user.id && o.period === period); if (obj) { submitObjectives(obj.id); toast.success('Objetivos enviados a revisión'); } }}
                className="text-xs px-3 py-1 rounded-lg border border-accent text-accent hover:bg-accent/10 cursor-pointer">Enviar a revisión</span>
            )}
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {isOpen && (
          <div className="border-t px-5 py-4 space-y-4">
            {objs.length === 0 && !isEditing && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin objetivos configurados</p>
            )}
            {objs.map((obj, idx) => (
              <div key={obj.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent">Objetivo {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {!isEditing && <TrafficLight value={obj.porcentajeAvance} />}
                    {isEditing && (
                      <button onClick={() => setEditAdminObjs(prev => prev.filter(o => o.id !== obj.id))} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Tipo de Objetivo</label>
                      <input value={obj.tipoObjetivo} onChange={e => setEditAdminObjs(prev => prev.map(o => o.id === obj.id ? { ...o, tipoObjetivo: e.target.value } : o))}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Nombre del Objetivo</label>
                      <input value={obj.nombreObjetivo} onChange={e => setEditAdminObjs(prev => prev.map(o => o.id === obj.id ? { ...o, nombreObjetivo: e.target.value } : o))}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Pilares Estratégicos</label>
                      <input value={obj.pilaresEstrategicos} onChange={e => setEditAdminObjs(prev => prev.map(o => o.id === obj.id ? { ...o, pilaresEstrategicos: e.target.value } : o))}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Alcance</label>
                      <input value={obj.alcance} onChange={e => setEditAdminObjs(prev => prev.map(o => o.id === obj.id ? { ...o, alcance: e.target.value } : o))}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">% de Avance</label>
                      <input type="number" value={obj.porcentajeAvance} min={0} max={100}
                        onChange={e => setEditAdminObjs(prev => prev.map(o => o.id === obj.id ? { ...o, porcentajeAvance: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) } : o))}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">Tipo:</span><p className="font-medium">{obj.tipoObjetivo || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Nombre:</span><p className="font-medium">{obj.nombreObjetivo || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Pilares:</span><p className="font-medium">{obj.pilaresEstrategicos || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Alcance:</span><p className="font-medium">{obj.alcance || '—'}</p></div>
                    <div><span className="text-xs text-muted-foreground">Avance:</span><TrafficLight value={obj.porcentajeAvance} /></div>
                    <div className="col-span-2 sm:col-span-3 flex items-center justify-between pt-1 border-t">
                      <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_COLOR[obj.status || 'draft']}`}>
                        {STATUS_LABEL[obj.status || 'draft']}
                      </span>
                      {obj.reviewerComment && (
                        <span className="text-xs text-muted-foreground italic">"{obj.reviewerComment}"</span>
                      )}
                      {canReview(user.id) && obj.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setReviewing({ userId: user.id, objectiveId: obj.id, status: 'approved' }); setReviewComment(''); }}
                            className="text-xs px-2 py-1 rounded bg-smps-success/10 text-smps-success hover:bg-smps-success/20">Aprobar</button>
                          <button onClick={() => { setReviewing({ userId: user.id, objectiveId: obj.id, status: 'rejected' }); setReviewComment(''); }}
                            className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20">Rechazar</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ))}
            {isEditing && objs.length < 5 && (
              <button onClick={() => setEditAdminObjs(prev => [...prev, emptyAdminObj()])}
                className="w-full py-2 rounded-lg border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Agregar Objetivo ({objs.length}/5)
              </button>
            )}
            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button onClick={cancelEditing} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancelar</button>
                <button onClick={() => handleSaveAdmin(user.id)} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" /> Guardar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const legalFields: { key: keyof LegalObjective; label: string; suffix?: string }[] = [
    { key: 'horasMeta', label: 'Horas Meta' },
    { key: 'horasAjustadas', label: 'Horas Ajustadas' },
    { key: 'porcentajeHorasVsMeta', label: '% Horas Ajustadas vs. Meta', suffix: '%' },
    { key: 'porcentajeEficiencia', label: '% de Eficiencia', suffix: '%' },
    { key: 'metaProBono', label: 'Meta Pro Bono' },
    { key: 'realizadoProBono', label: 'Realizado Pro Bono' },
    { key: 'metaMarketing', label: 'Meta Marketing' },
    { key: 'realizadoMarketing', label: 'Realizado Marketing' },
    { key: 'metaBusinessDev', label: 'Meta Business Development' },
    { key: 'realizadoBusinessDev', label: 'Realizado Business Development' },
    { key: 'metaMentoring', label: 'Meta Mentoring' },
    { key: 'realizadoMentoring', label: 'Realizado Mentoring' },
    { key: 'resultadoArea', label: 'Resultado Área' },
    { key: 'resultadoFirma', label: 'Resultado Firma' },
    { key: 'porcentajeTotalBono', label: '% Total para Bono', suffix: '%' },
  ];

  const renderLegalUserCard = (user: User) => {
    const isOpen = expandedUser === user.id;
    const isEditing = editingUser === user.id;
    const existing = getObjectives(user.id);
    const obj = isEditing ? editLegalObj : (existing?.legalObjective || null);

    return (
      <div key={user.id} className="bg-card rounded-xl border overflow-hidden">
        <button
          onClick={() => { if (!editingUser) setExpandedUser(prev => prev === user.id ? null : user.id); }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          disabled={!!editingUser && editingUser !== user.id}
        >
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-accent flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{POSITION_LABELS[user.position]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEditUser(user.id) && !isEditing && !editingUser && (
              <span onClick={e => { e.stopPropagation(); startEditing(user); }} className="text-xs px-3 py-1 rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer">Editar</span>
            )}
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
        {isOpen && (
          <div className="border-t px-5 py-4">
            {!obj && !isEditing ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin objetivos configurados</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {legalFields.map(f => (
                  <div key={f.key} className="bg-muted/30 rounded-lg p-3">
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editLegalObj[f.key] as number}
                        onChange={e => setEditLegalObj(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm mt-1"
                      />
                    ) : (
                      <p className="text-sm font-semibold mt-1">{obj ? (obj[f.key] as number) : 0}{f.suffix || ''}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isEditing && (
              <div className="flex gap-3 pt-4">
                <button onClick={cancelEditing} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancelar</button>
                <button onClick={() => handleSaveLegal(user.id)} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" /> Guardar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Objetivos Personales</h1>
          <p className="text-muted-foreground text-sm">
            Objetivos individuales por colaborador {!isAdminUser && '(edita los tuyos y consulta los del equipo)'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdminUser && (

            <>
              <button onClick={downloadAdminTemplate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                <Download className="h-4 w-4" /> Plantilla Administrativo
              </button>
              <button onClick={downloadLegalTemplate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input text-sm hover:bg-muted transition-colors">
                <Download className="h-4 w-4" /> Plantilla Legal
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
                <Upload className="h-4 w-4" /> Cargar Archivo
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleFileUpload} />
            </>
          )}
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Personal Administrativo
          </h2>
          <div className="space-y-2">
            {adminUsers.length === 0 && <p className="text-sm text-muted-foreground">Sin personal administrativo</p>}
            {adminUsers.map(u => renderAdminUserCard(u))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Personal Legal
          </h2>
          <div className="space-y-2">
            {legalUsers.length === 0 && <p className="text-sm text-muted-foreground">Sin personal legal</p>}
            {legalUsers.map(u => renderLegalUserCard(u))}
          </div>
        </div>
      </div>
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setReviewing(null)}>
          <div className="bg-card rounded-2xl border shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold mb-2">{reviewing.status === 'approved' ? 'Aprobar objetivo' : 'Rechazar objetivo'}</h2>
            <p className="text-sm text-muted-foreground mb-3">Deja un comentario para el colaborador.</p>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={4}
              placeholder={reviewing.status === 'approved' ? 'Comentario opcional...' : 'Indica los cambios requeridos...'}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setReviewing(null)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={() => {
                if (reviewing.status === 'rejected' && !reviewComment.trim()) { toast.error('El comentario es obligatorio al rechazar'); return; }
                const pObj = personalObjectives.find((o: any) => o.userId === reviewing.userId && o.period === period); if (pObj) { reviewObjective({ id: pObj.id, objectiveId: reviewing.objectiveId, status: reviewing.status, comment: reviewComment.trim() }); }
                toast.success(reviewing.status === 'approved' ? 'Objetivo aprobado' : 'Objetivo rechazado');
                setReviewing(null);
              }} className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${reviewing.status === 'approved' ? 'bg-smps-success' : 'bg-destructive'} hover:opacity-90`}>
                {reviewing.status === 'approved' ? 'Aprobar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

