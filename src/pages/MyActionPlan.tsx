import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useActionPlans, useCreateActionPlan, useUpdateActionPlan, useApproveActionPlan , usePeriods } from '@/api/queries';
import { ActionPlan, SmartActionItem, QuestionCategory } from '@/types';
import { getPositionLabel, getPositionRank, SECTION_LABELS, getSectionByCategory } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { getCategoriesList } from '@/pages/QuestionLibrary';

import { FileText, Save, ShieldCheck, ShieldX, Clock, Plus, Trash2, Target } from 'lucide-react';
import { toast } from 'sonner';

const emptyItem = (): SmartActionItem => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  competencia: '',
  objetivo: '',
  acciones: '',
  queEvitar: '',
  fechaRevision: '',
  apoyos: '',
});

function PlanItemsView({ items, content }: { items?: SmartActionItem[]; content?: string }) {
  if (items && items.length > 0) {
    return (
      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={it.id} className="bg-muted/30 rounded-lg p-3 text-sm border">
            <p className="font-semibold text-accent mb-1">#{idx + 1} · {it.competencia || 'Sin competencia'}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div><dt className="text-muted-foreground">Objetivo (SMART)</dt><dd>{it.objetivo || '—'}</dd></div>
              <div><dt className="text-muted-foreground">Acciones</dt><dd>{it.acciones || '—'}</dd></div>
              <div><dt className="text-muted-foreground">Qué debo evitar</dt><dd>{it.queEvitar || '—'}</dd></div>
              <div><dt className="text-muted-foreground">Fecha de revisión</dt><dd>{it.fechaRevision || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Apoyos requeridos del supervisor</dt><dd>{it.apoyos || '—'}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    );
  }
  return <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap">{content || '—'}</div>;
}

export default function MyActionPlan() {
  const { user: currentUser } = useAuth();
  const currentPeriod = useCurrentPeriod();
  const { data: users = [] } = useUsers();
  const { data: periodsData = [] } = usePeriods();
  const periods = periodsData.map((p: any) => p.period).sort();
  const [period, setPeriod] = useState(currentPeriod);
  const { data: evaluations = [] } = useEvaluations({ period });
  const { data: assignments = [] } = useAssignments(period);
  const { data: actionPlans = [] } = useActionPlans({ period });
  const addOrUpdateActionPlan = useCreateActionPlan().mutate;
  const updateActionPlan = useUpdateActionPlan().mutate;
  const approveActionPlan = useApproveActionPlan().mutate;
  const [items, setItems] = useState<SmartActionItem[]>([emptyItem()]);
  const [approvalComments, setApprovalComments] = useState('');

  const mySupervisorIds = assignments.filter(a => currentUser && a.employeeId === currentUser.id && a.period === period).map(a => a.supervisorId);
  const mySupervisors = users.filter(u => mySupervisorIds.includes(u.id));
  const seniorSupervisor = useMemo(() => {
    if (mySupervisors.length === 0) return null;
    return [...mySupervisors].sort((a, b) => getPositionRank(a.position) - getPositionRank(b.position))[0];
  }, [mySupervisors]);

  const myPlan = actionPlans.find(p => currentUser && p.employeeId === currentUser.id && p.period === period);

  // Cargar items existentes al cambiar de periodo o plan
  useEffect(() => {
    if (myPlan?.items && myPlan.items.length > 0) setItems(myPlan.items);
    else setItems([emptyItem()]);
  }, [myPlan?.id, period]);

  if (!currentUser) return null;

  const selfDone = evaluations.some(e => e.evaluatedId === currentUser.id && e.type === 'self' && e.period === period);
  const supEvalsCount = evaluations.filter(e => e.evaluatedId === currentUser.id && e.type === 'supervisor' && e.period === period).length;
  const allSupDone = mySupervisorIds.length > 0 && supEvalsCount >= mySupervisorIds.length;
  const feedbackDone = evaluations.some(e => e.evaluatedId === currentUser.id && e.type === 'supervisor' && e.period === period && e.feedbackCompleted);
  const canFillPlan = selfDone && allSupDone && feedbackDone;
  const allEvalsReady = selfDone && allSupDone;

  const updateItem = (id: string, patch: Partial<SmartActionItem>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const isItemComplete = (it: SmartActionItem) =>
    it.competencia.trim() && it.objetivo.trim() && it.acciones.trim() && it.fechaRevision.trim();
  const allItemsValid = items.length > 0 && items.every(isItemComplete);

  const handleSave = () => {
    if (!allItemsValid) { toast.error('Completa al menos competencia, objetivo, acciones y fecha de revisión en cada acción.'); return; }
    const now = new Date().toISOString().split('T')[0];
    if (myPlan) {
      // Update existing plan
      updateActionPlan({
        id: myPlan.id,
        content: myPlan.content || '',
        items,
      });
    } else {
      // Create new plan
      const plan: ActionPlan = {
        id: `ap-${currentUser.id}-${period}-${Date.now()}`,
        employeeId: currentUser.id,
        supervisorId: seniorSupervisor?.id || currentUser.id,
        period,
        content: '',
        items,
        createdAt: now,
        updatedAt: now,
        approvalStatus: 'pending',
        approvalComments: undefined,
        approvedBy: undefined,
        approvedAt: undefined,
      };
      addOrUpdateActionPlan(plan);
    }
  };

  const isSeniorEvaluatorOfPlan = (plan: ActionPlan) => {
    const supIds = assignments.filter(a => a.employeeId === plan.employeeId && a.period === plan.period).map(a => a.supervisorId);
    if (supIds.length === 0) return false;
    const sups = users.filter(u => supIds.includes(u.id));
    const senior = [...sups].sort((a, b) => getPositionRank(a.position) - getPositionRank(b.position))[0];
    return senior?.id === currentUser.id;
  };

  const handleApprove = (plan: ActionPlan, status: 'approved' | 'rejected') => {
    approveActionPlan({ id: plan.id, status, comments: approvalComments });
    toast.success(status === 'approved' ? 'Plan aprobado' : 'Plan rechazado');
    setApprovalComments('');
  };

  const pendingForMyApproval = actionPlans.filter(p =>
    p.period === period &&
    p.employeeId !== currentUser.id &&
    (!p.approvalStatus || p.approvalStatus === 'pending') &&
    isSeniorEvaluatorOfPlan(p)
  );

  const statusBadge = (status?: string) => {
    if (status === 'approved') return <span className="text-xs px-2 py-0.5 rounded-full bg-smps-success/10 text-smps-success font-medium">Aprobado</span>;
    if (status === 'rejected') return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Rechazado</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-smps-warning/10 text-smps-warning font-medium">Pendiente</span>;
  };

  const planLocked = myPlan?.approvalStatus === 'approved' || feedbackDone;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-accent" /> Mi Plan de Acción <span className="text-xs uppercase tracking-wider bg-accent/10 text-accent px-2 py-0.5 rounded-full">SMART</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define acciones <strong>Específicas</strong>, <strong>Medibles</strong>, <strong>Alcanzables</strong>, <strong>Relevantes</strong> y con <strong>Tiempo</strong> definido.
          </p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          {periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Status banners */}
      {!selfDone && (
        <div className="bg-smps-warning/10 border border-smps-warning/30 rounded-lg p-4 text-sm">
          ⚠️ Debes completar primero tu <strong>autoevaluación</strong> para llenar el plan de acción.
        </div>
      )}
      {selfDone && !allSupDone && (
        <div className="bg-smps-warning/10 border border-smps-warning/30 rounded-lg p-4 text-sm">
          ⏳ Debes esperar a que tus evaluadores completen sus evaluaciones ({supEvalsCount}/{mySupervisorIds.length} completadas).
        </div>
      )}
      {selfDone && allSupDone && !feedbackDone && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-sm">
          <Clock className="h-4 w-4 inline mr-1 text-accent" />
          Pendiente la sesión de feedback. Una vez realizada, podrás crear tu plan de acción.
        </div>
      )}
      {feedbackDone && (
        <div className="bg-muted/40 border rounded-lg p-4 text-sm">
          🔒 La sesión de feedback ya se realizó. Tu plan de acción está bloqueado para edición.
        </div>
      )}

      {/* Visor (plan ya aprobado o bloqueado) */}
      {planLocked && myPlan && (
        <div className="smps-surface-elevated">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold">Plan de Acción — {period}</h3>
            {statusBadge(myPlan.approvalStatus)}
          </div>
          <PlanItemsView items={myPlan.items} content={myPlan.content} />
        </div>
      )}

      {/* Editor SMART */}
      {canFillPlan && !planLocked && (
        <div className="smps-surface-elevated">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold">Plan de Acción — {period}</h3>
            {myPlan && statusBadge(myPlan.approvalStatus)}
          </div>
          {seniorSupervisor && (
            <p className="text-xs text-muted-foreground mb-3">
              Será autorizado por: <span className="font-medium">{seniorSupervisor.name}</span> ({getPositionLabel(seniorSupervisor.position)})
            </p>
          )}
          {myPlan?.approvalStatus === 'rejected' && myPlan.approvalComments && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-4 text-sm">
              <p className="font-semibold text-destructive mb-1">Retroalimentación del evaluador:</p>
              <p className="text-muted-foreground">{myPlan.approvalComments}</p>
            </div>
          )}

          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={it.id} className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Acción #{idx + 1}</p>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(it.id)} className="text-destructive hover:opacity-70 text-xs flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Competencia / Área *</label>
                    <select value={it.competencia} onChange={e => updateItem(it.id, { competencia: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      <option value="">Selecciona una categoría...</option>
                      <optgroup label="Competencias">
                        {getCategoriesList().filter(c => getSectionByCategory(c) === 'competencias').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Criterio Técnico">
                        {getCategoriesList().filter(c => getSectionByCategory(c) === 'tecnico').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Habilidades Blandas">
                        {getCategoriesList().filter(c => getSectionByCategory(c) === 'blandas').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Fecha de revisión *</label>
                    <input type="date" value={it.fechaRevision} onChange={e => updateItem(it.id, { fechaRevision: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Objetivo SMART *</label>
                    <textarea value={it.objetivo} onChange={e => updateItem(it.id, { objetivo: e.target.value })}
                      placeholder="Específico, Medible, Alcanzable, Relevante y con Tiempo definido"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm h-20" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Acciones a realizar *</label>
                    <textarea value={it.acciones} onChange={e => updateItem(it.id, { acciones: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm h-20" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Qué debo evitar</label>
                    <textarea value={it.queEvitar} onChange={e => updateItem(it.id, { queEvitar: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm h-20" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground">Apoyos requeridos del supervisor/jefe</label>
                    <textarea value={it.apoyos} onChange={e => updateItem(it.id, { apoyos: e.target.value })}
                      placeholder="Capacitaciones, mentoría, tiempo asignado, recursos..."
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm h-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={addItem}
              className="px-3 py-2 rounded-lg border border-accent/40 text-accent text-sm font-medium hover:bg-accent/10 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Agregar acción
            </button>
            <button onClick={handleSave} disabled={!allItemsValid}
              className="flex-1 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> {myPlan ? 'Actualizar Plan' : 'Enviar a aprobación'}
            </button>
          </div>
        </div>
      )}

      {/* Planes pendientes de mi aprobación */}
      {pendingForMyApproval.length > 0 && (
        <div className="bg-card rounded-xl border border-accent/30 p-6">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3 text-accent">
            Planes pendientes de tu autorización ({pendingForMyApproval.length})
          </h3>
          <div className="space-y-4">
            {pendingForMyApproval.map(plan => {
              const employee = users.find(u => u.id === plan.employeeId);
              return (
                <div key={plan.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{employee?.name}</p>
                      <p className="text-xs text-muted-foreground">{employee && getPositionLabel(employee.position)} · Actualizado {plan.updatedAt}</p>
                    </div>
                    {statusBadge(plan.approvalStatus)}
                  </div>
                  <PlanItemsView items={plan.items} content={plan.content} />
                  <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                    placeholder="Comentarios (opcional para aprobar, requerido para rechazar)..."
                    className="w-full h-20 px-3 py-2 rounded-lg border border-input bg-background text-sm my-3" />
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(plan, 'approved')}
                      className="flex-1 py-2 rounded-lg bg-smps-success text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1">
                      <ShieldCheck className="h-4 w-4" /> Autorizar
                    </button>
                    <button onClick={() => handleApprove(plan, 'rejected')} disabled={!approvalComments.trim()}
                      className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1">
                      <ShieldX className="h-4 w-4" /> Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
