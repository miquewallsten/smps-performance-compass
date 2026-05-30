import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { usePositionConfig } from '@/hooks/useEvaluationConfig';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { ScoreRing } from '@/components/shared/ScoreRing';
import { Users, CheckCircle, Clock, ChevronDown, ArrowRight, ClipboardList, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type PhaseKey = 'self' | 'supervisor' | 'feedback' | 'action_plan';

const PHASES: { key: PhaseKey; label: string; short: string }[] = [
  { key: 'self', label: 'Autoevaluación', short: 'Autoeval.' },
  { key: 'supervisor', label: 'Eval. Supervisor', short: 'Eval. Sup.' },
  { key: 'feedback', label: 'Feedback', short: 'Feedback' },
  { key: 'action_plan', label: 'Plan de Acción', short: 'Plan Acc.' },
];

function phaseStatus(phase: PhaseKey, selfDone: boolean, supDone: boolean, fbDone: boolean, planDone: boolean): 'done' | 'current' | 'upcoming' {
  switch (phase) {
    case 'self': return selfDone ? 'done' : 'current';
    case 'supervisor': return supDone ? 'done' : selfDone ? 'current' : 'upcoming';
    case 'feedback': return fbDone ? 'done' : supDone ? 'current' : 'upcoming';
    case 'action_plan': return planDone ? 'done' : fbDone ? 'current' : 'upcoming';
  }
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr + 'T23:59:59');
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

function StatusDot({ done, total }: { done: number; total: number }) {
  if (done === 0) return <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/25" />;
  if (done >= total) return <span className="inline-block w-2 h-2 rounded-full bg-smps-success" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-accent" />;
}

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const currentPeriod = useCurrentPeriod();
  const { data: posConfigData } = usePositionConfig();
  const posConfig = Array.isArray(posConfigData) ? posConfigData : [];
  const { data: usersData } = useUsers();
  const users = Array.isArray(usersData) ? usersData : [];
  const { data: evaluationsData } = useEvaluations({ period: currentPeriod });
  const evaluations = Array.isArray(evaluationsData) ? evaluationsData : [];
  const { data: assignmentsData } = useAssignments(currentPeriod);
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
  const { data: periodConfigsData } = usePeriods();
  const periodConfigs = Array.isArray(periodConfigsData) ? periodConfigsData : [];
  const { data: announcementsData } = useAnnouncements();
  const announcements = Array.isArray(announcementsData) ? announcementsData : [];
  const { data: vacationRequestsData } = useVacationRequests();
  const vacationRequests = Array.isArray(vacationRequestsData) ? vacationRequestsData : [];
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!currentUser) return null;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrMore = isAdmin || isSocio || !!currentUser.isManagingPartner;
  const isSuperUser = currentUser.isSuperUser;

  const pAssign = (Array.isArray(assignments) ? assignments : []).filter(a => a.period === currentPeriod);
  const pEvals = (Array.isArray(evaluations) ? evaluations : []).filter(e => e.period === currentPeriod);
  const curCfg = (Array.isArray(periodConfigs) ? periodConfigs : []).find((c: any) => c.period === currentPeriod);

  const myTeamIds = isAdminOrMore ? null : pAssign.filter(a => a.supervisorId === currentUser.id).map(a => a.employeeId);

  const visible = (() => {
    let base = (Array.isArray(users) ? users : []).filter(u => u.isActive && !u.isSuperUser);
    if (myTeamIds) base = base.filter(u => myTeamIds.includes(u.id) || u.id === currentUser.id);
    return base;
  })();

  const vEvals = pEvals.filter(e => visible.some(u => u.id === e.evaluatedId));
  const selfEvals = vEvals.filter(e => e.type === 'self');
  const supEvals = vEvals.filter(e => e.type === 'supervisor');
  const totalEmployees = visible.length;
  const evaluatedCount = new Set(supEvals.map(e => e.evaluatedId)).size;
  const selfEvalCount = selfEvals.length;
  const supEvalDone = (() => {
    const withAssign = visible.filter(u => pAssign.some(a => a.employeeId === u.id));
    return withAssign.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length;
  })();
  const supTotal = visible.filter(u => pAssign.some(a => a.employeeId === u.id)).length;

  const mySelfEval = pEvals.find(e => e.type === 'self' && e.evaluatorId === currentUser.id);
  const myAssigns = pAssign.filter(a => a.supervisorId === currentUser.id);
  const myCompleted = pEvals.filter(e => e.type === 'supervisor' && e.evaluatorId === currentUser.id);
  const myPending = myAssigns.filter(a => !myCompleted.find(e => e.evaluatedId === a.employeeId));

  const selfDone = !!mySelfEval;
  const mySupAssigns = pAssign.filter(a => a.employeeId === currentUser.id);
  const mySupEvals = pEvals.filter(e => e.type === 'supervisor' && e.evaluatedId === currentUser.id);
  const allSupDone = mySupAssigns.length > 0 && mySupEvals.length >= mySupAssigns.length;
  const feedbackDone = mySupEvals.some(e => e.feedbackCompleted);
  const planDone = false;
  const currentPhase = PHASES.find(p => phaseStatus(p.key, selfDone, allSupDone, feedbackDone, planDone) === 'current');

  const daysLeft = curCfg ? daysUntil(curCfg.actionPlanEnd || curCfg.feedbackEnd || curCfg.supervisorEnd || curCfg.selfEnd) : null;

  const unread = (Array.isArray(announcements) ? announcements : []).filter(a => !a.archived && !(a.readBy || []).includes(currentUser.id)).length;
  const pendVac = (() => {
    const myEv = pAssign.filter(a => a.supervisorId === currentUser.id).map(a => a.employeeId);
    return (Array.isArray(vacationRequests) ? vacationRequests : []).filter(r => r.status === 'pending' && (isAdmin || isSuperUser || !!currentUser.isManagingPartner || myEv.includes(r.userId))).length;
  })();

  const avgScore = vEvals.length > 0 ? Math.round(vEvals.reduce((s, e) => s + e.totalScore, 0) / vEvals.length) : null;

  // Position-level data for the detail table
  const posData = useMemo(() => getPositionHierarchy().map(pos => {
    const pu = visible.filter(u => u.position === pos);
    if (pu.length === 0) return null;
    const selfDone = pu.filter(u => pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id));
    const supDone = pu.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id));
    const posEvals = pEvals.filter(e => pu.some(u => u.id === e.evaluatedId || u.id === e.evaluatorId));
    const avg = posEvals.length > 0 ? Math.round(posEvals.reduce((s, e) => s + e.totalScore, 0) / posEvals.length) : null;
    return {
      key: pos,
      label: getPositionLabel(pos),
      total: pu.length,
      selfDone: selfDone.length,
      supDone: supDone.length,
      avg,
      pendingSelf: pu.filter(u => !pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)),
      pendingSup: pu.filter(u => !pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)),
    };
  }).filter(Boolean), [visible, pEvals, posConfig]);

  const legal = visible.filter(u => getLegalHierarchy().includes(u.position)).sort((a, b) => {
    const d = getLegalHierarchy().indexOf(a.position) - getLegalHierarchy().indexOf(b.position);
    return d !== 0 ? d : a.name.localeCompare(b.name, 'es');
  });
  const admin = visible.filter(u => getAdminHierarchy().includes(u.position)).sort((a, b) => {
    const d = getAdminHierarchy().indexOf(a.position) - getAdminHierarchy().indexOf(b.position);
    return d !== 0 ? d : a.name.localeCompare(b.name, 'es');
  });

  const renderGroup = (groupUsers: typeof visible, label: string) => {
    if (groupUsers.length === 0) return null;
    const positions = [...new Set(groupUsers.map(u => u.position))];
    return (
      <div className="mb-3 last:mb-0">
        <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">{label}</p>
        {positions.map(pos => {
          const pu = groupUsers.filter(u => u.position === pos);
          return (
            <div key={pos} className="mb-1.5 last:mb-0">
              <p className="text-[10px] font-semibold text-muted-foreground">{getPositionLabel(pos)} ({pu.length})</p>
              <div className="space-y-px">
                {pu.map(u => {
                  const selfScore = pEvals.find(e => e.type === 'self' && e.evaluatorId === u.id);
                  const hasSup = pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id);
                  return (
                    <button key={u.id} onClick={() => navigate(`/profile/${u.id}`)}
                      className="w-full flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                      <span className="text-xs truncate">{u.name}</span>
                      <div className="flex items-center gap-1.5">
                        {selfScore ? <ScoreBadge value={Math.round(selfScore.totalScore)} size="sm" /> : null}
                        {hasSup && !selfScore ? <CheckCircle className="h-2.5 w-2.5 text-smps-success" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Urgent actions
  const urgentItems: { label: string; action: () => void; variant: 'accent' | 'warning' | 'default' }[] = [];
  if (!selfDone) urgentItems.push({ label: 'Autoevaluación', action: () => navigate('/self-evaluation'), variant: 'accent' });
  myPending.slice(0, 3).forEach(a => {
    const emp = (users as any[]).find(u => u.id === a.employeeId);
    if (emp) urgentItems.push({ label: emp.name.split(' ')[0], action: () => navigate(`/evaluations?evaluate=${a.employeeId}`), variant: 'warning' });
  });
  if (unread > 0) urgentItems.push({ label: `${unread} aviso${unread > 1 ? 's' : ''}`, action: () => navigate('/communications'), variant: 'default' });
  if (pendVac > 0 && (isAdmin || isSuperUser || !!currentUser.isManagingPartner)) urgentItems.push({ label: `${pendVac} vac.`, action: () => navigate('/vacations'), variant: 'default' });

  return (
    <div className="space-y-3 smps-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-display text-lg font-bold tracking-tight">Panel de Control</h1>
          <span className="text-xs text-muted-foreground">{currentPeriod}</span>
          {currentPhase && <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">{currentPhase.short}</span>}
          {daysLeft !== null && daysLeft > 0 && daysLeft <= 90 && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{daysLeft}d
            </span>
          )}
        </div>
        {/* Phase dots */}
        <div className="flex items-center gap-1">
          {PHASES.map((p, i) => {
            const st = phaseStatus(p.key, selfDone, allSupDone, feedbackDone, planDone);
            return (
              <div key={p.key} className="flex items-center">
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  st === 'done' ? 'text-smps-success' : st === 'current' ? 'text-accent' : 'text-muted-foreground/40'
                }`}>
                  {st === 'done' ? <CheckCircle className="h-3 w-3" />
                  : st === 'current' ? <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />}
                  <span className="hidden lg:inline">{p.short}</span>
                </div>
                {i < PHASES.length - 1 && <span className="text-muted-foreground/20 mx-0.5">·</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Main grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* ─── Left column: Progress ────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-3">

          {/* Progress metrics */}
          <div className="rounded-lg border bg-card p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Completion */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Completadas</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-bold tabular-nums">{evaluatedCount}</span>
                  <span className="text-xs text-muted-foreground">/ {totalEmployees}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-smps-success transition-[width] duration-700 ease-out" style={{ width: `${totalEmployees > 0 ? (evaluatedCount / totalEmployees) * 100 : 0}%` }} />
                </div>
              </div>
              {/* Self-evals */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Autoevaluaciones</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-bold tabular-nums">{selfEvalCount}</span>
                  <span className="text-xs text-muted-foreground">/ {totalEmployees}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${totalEmployees > 0 ? (selfEvalCount / totalEmployees) * 100 : 0}%` }} />
                </div>
              </div>
              {/* Supervisor evals */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Eval. Supervisor</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-bold tabular-nums">{supEvalDone}</span>
                  <span className="text-xs text-muted-foreground">/ {supTotal}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${supTotal > 0 ? (supEvalDone / supTotal) * 100 : 0}%` }} />
                </div>
              </div>
              {/* Average */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Promedio</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-bold tabular-nums">{avgScore !== null ? `${avgScore}%` : '—'}</span>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-accent" />Autoeval.</span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-primary" />Eval. Sup.</span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="w-2 h-2 rounded-full bg-smps-success" />Completadas</span>
            </div>
          </div>

          {/* Urgent actions */}
          {urgentItems.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Pendientes</p>
              <div className="flex flex-wrap gap-1.5">
                {urgentItems.map((item, i) => (
                  <button key={i} onClick={item.action}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-[opacity,transform] duration-150 active:scale-[0.97] ${
                      item.variant === 'accent' ? 'bg-accent/10 text-accent hover:opacity-80'
                      : item.variant === 'warning' ? 'bg-smps-warning/10 text-smps-warning hover:opacity-80'
                      : 'bg-muted hover:bg-muted/80'
                    }`}>
                    {item.variant === 'accent' && <ClipboardList className="h-3 w-3" />}
                    {item.variant === 'warning' && <AlertCircle className="h-3 w-3" />}
                    <span className="truncate">{item.label}</span>
                    <ArrowRight className="h-3 w-3 ml-auto opacity-40 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team overview */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Equipo</p>
              <span className="text-[10px] text-muted-foreground tabular-nums">{totalEmployees}</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {renderGroup(legal, 'Legal')}
              {renderGroup(admin, 'Administrativo')}
            </div>
          </div>

          {/* Admin alerts (compact) */}
          {(unread > 0 || pendVac > 0) && (isAdmin || isSuperUser || !!currentUser.isManagingPartner) && (
            <div className="rounded-lg border bg-card p-3 space-y-1">
              {unread > 0 && (
                <button onClick={() => navigate('/communications')} className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-xs">{unread} comunicado{unread > 1 ? 's' : ''} sin leer</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
              {pendVac > 0 && (
                <button onClick={() => navigate('/vacations')} className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-xs">{pendVac} solicitud{pendVac > 1 ? 'es' : ''} de vacaciones</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Right column: Sidebar ──────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-3">
          {/* My self-eval card */}
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Mi Autoevaluación</p>
            {mySelfEval ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-smps-success" />
                <div>
                  <p className="text-sm font-medium">Completada</p>
                  <p className="text-[11px] text-muted-foreground">Calificación: {Math.round(mySelfEval.totalScore)}%</p>
                </div>
              </div>
            ) : (
              <button onClick={() => navigate('/self-evaluation')}
                className="w-full px-3 py-2 rounded bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-[opacity] duration-150 active:scale-[0.97]">
                Iniciar Autoevaluación
              </button>
            )}
          </div>

          {/* My pending evals */}
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Evaluaciones Pendientes</p>
            {myPending.length === 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-smps-success" />
                <p className="text-sm">Sin pendientes</p>
              </div>
            ) : (
              <div className="space-y-1">
                {myPending.map(a => {
                  const emp = (users as any[]).find(u => u.id === a.employeeId);
                  return (
                    <button key={a.id} onClick={() => navigate(`/evaluations?evaluate=${a.employeeId}`)}
                      className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                      <span className="text-xs truncate">{emp?.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick links */}
          {isAdminOrMore && (
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Administración</p>
              {[
                { to: '/users', label: 'Usuarios', icon: Users },
                ...(isAdmin || isSuperUser ? [{ to: '/periods', label: 'Periodos', icon: Clock }] : []),
              ].map(item => (
                <button key={item.to} onClick={() => navigate(item.to)}
                  className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-xs truncate">{item.label}</span>
                  <ArrowRight className="h-3 w-3 ml-auto opacity-40 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Team overview */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Equipo</p>
              <span className="text-[10px] text-muted-foreground tabular-nums">{totalEmployees}</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {renderGroup(legal, 'Legal')}
              {renderGroup(admin, 'Administrativo')}
            </div>
          </div>

          {/* Admin alerts (compact) */}
          {(unread > 0 || pendVac > 0) && (isAdmin || isSuperUser || !!currentUser.isManagingPartner) && (
            <div className="rounded-lg border bg-card p-3 space-y-1">
              {unread > 0 && (
                <button onClick={() => navigate('/communications')} className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-xs">{unread} comunicado{unread > 1 ? 's' : ''} sin leer</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
              {pendVac > 0 && (
                <button onClick={() => navigate('/vacations')} className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-xs">{pendVac} solicitud{pendVac > 1 ? 'es' : ''} de vacaciones</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Expandable detail: Compact status table ───────────────────── */}
      <div className="space-y-2">
        <div className="rounded-lg border bg-card overflow-hidden">
          <button onClick={() => setExpanded(expanded === 'progress' ? null : 'progress')}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-[background-color] duration-150">
            <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-accent" /><span className="text-xs font-medium">Progreso por Posición</span></div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expanded === 'progress' ? 'rotate-180' : ''}`} />
          </button>
          {expanded === 'progress' && (
            <div className="border-t smps-fade-in">
              {/* Compact table header */}
              <div className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem_3.5rem] gap-x-2 px-3 py-1.5 border-b bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                <span>Posición</span>
                <span className="text-center">Total</span>
                <span className="text-center">Auto.</span>
                <span className="text-center">Sup.</span>
                <span className="text-center">Prom.</span>
              </div>
              {/* Table rows */}
              <div className="divide-y divide-border/50">
                {posData.map(row => {
                  if (!row) return null;
                  return (
                    <div key={row.key} className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem_3.5rem] gap-x-2 px-3 py-1.5 items-center hover:bg-muted/20 transition-[background-color] duration-150">
                      <span className="text-xs font-medium truncate">{row.label}</span>
                      <span className="text-[11px] text-center tabular-nums text-muted-foreground">{row.total}</span>
                      <span className="text-[11px] text-center tabular-nums flex items-center justify-center gap-1">
                        <StatusDot done={row.selfDone} total={row.total} />
                        <span className={row.selfDone === row.total ? 'text-smps-success' : row.selfDone > 0 ? 'text-accent' : 'text-muted-foreground/50'}>{row.selfDone}</span>
                      </span>
                      <span className="text-[11px] text-center tabular-nums flex items-center justify-center gap-1">
                        <StatusDot done={row.supDone} total={row.total} />
                        <span className={row.supDone === row.total ? 'text-smps-success' : row.supDone > 0 ? 'text-primary' : 'text-muted-foreground/50'}>{row.supDone}</span>
                      </span>
                      <span className="text-[11px] text-center tabular-nums font-display font-semibold">{row.avg !== null ? `${row.avg}%` : '—'}</span>
                    </div>
                  );
                })}
              </div>

              {/* Pending actions section */}
              {(() => {
                const allPendingSelf = posData.flatMap(r => r ? r.pendingSelf.map(u => ({ ...u, type: 'self' as const })) : []);
                const allPendingSup = posData.flatMap(r => r ? r.pendingSup.map(u => ({ ...u, type: 'supervisor' as const })) : []);
                const totalPending = allPendingSelf.length + allPendingSup.length;
                if (totalPending === 0) return null;
                return (
                  <div className="border-t">
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Pendientes ({totalPending})</p>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {allPendingSelf.slice(0, 5).map(u => (
                        <button key={`self-${u.id}`} onClick={() => navigate(u.id === currentUser.id ? '/self-evaluation' : `/profile/${u.id}`)}
                          className="w-full flex items-center gap-2 px-3 py-1 hover:bg-muted/30 transition-[background-color] duration-150 text-left">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                          <span className="text-[11px] truncate flex-1">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground">Autoeval. pendiente</span>
                        </button>
                      ))}
                      {allPendingSup.slice(0, 5).map(u => (
                        <button key={`sup-${u.id}`} onClick={() => navigate(`/evaluations?evaluate=${u.id}`)}
                          className="w-full flex items-center gap-2 px-3 py-1 hover:bg-muted/30 transition-[background-color] duration-150 text-left">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-[11px] truncate flex-1">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground">Eval. Sup. pendiente</span>
                        </button>
                      ))}
                      {totalPending > 10 && (
                        <p className="px-3 py-1 text-[10px] text-muted-foreground">+{totalPending - 10} más</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
