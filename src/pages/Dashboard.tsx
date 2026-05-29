import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { CURRENT_PERIOD, getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
import { Users, CheckCircle, Clock, TrendingUp, ChevronDown, ChevronRight, ClipboardCheck, ArrowRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Phase progress types ─────────────────────────────────────────────────
type PhaseKey = 'self' | 'supervisor' | 'feedback' | 'action_plan';

const PHASES: { key: PhaseKey; label: string; shortLabel: string }[] = [
  { key: 'self', label: 'Autoevaluación', shortLabel: 'Autoeval.' },
  { key: 'supervisor', label: 'Evaluadores', shortLabel: 'Evaluadores' },
  { key: 'feedback', label: 'Sesión de Feedback', shortLabel: 'Feedback' },
  { key: 'action_plan', label: 'Plan de Acción', shortLabel: 'Plan Acción' },
];

function getPhaseStatus(phase: PhaseKey, selfDone: boolean, allSupDone: boolean, feedbackDone: boolean, planDone: boolean): 'done' | 'current' | 'upcoming' {
  switch (phase) {
    case 'self': return selfDone ? 'done' : 'current';
    case 'supervisor': return allSupDone ? 'done' : selfDone ? 'current' : 'upcoming';
    case 'feedback': return feedbackDone ? 'done' : allSupDone ? 'current' : 'upcoming';
    case 'action_plan': return planDone ? 'done' : feedbackDone ? 'current' : 'upcoming';
  }
}

function getDaysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// ─── Progress Bar component ──────────────────────────────────────────────
function ProgressBar({ value, max, label, color = 'accent' }: { value: number; max: number; label: string; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barColor = color === 'success' ? 'hsl(var(--smps-success))' : color === 'warning' ? 'hsl(var(--smps-warning))' : 'hsl(var(--accent))';
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium min-w-[140px] truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-sm tabular-nums text-muted-foreground min-w-[48px] text-right">{value}/{max}</span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations({ period: CURRENT_PERIOD });
  const { data: assignments = [] } = useAssignments(CURRENT_PERIOD);
  const { data: periodConfigs = [] } = usePeriods();
  const { data: announcements = [] } = useAnnouncements();
  const { data: vacationRequests = [] } = useVacationRequests();
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  if (!currentUser) return null;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrSocio = isAdmin || isSocio || !!currentUser.isManagingPartner;
  const isSuperUser = currentUser.isSuperUser;

  // ─── Data derivation ───────────────────────────────────────────────────
  const periodAssignments = (Array.isArray(assignments) ? assignments : []).filter(a => a.period === CURRENT_PERIOD);
  const periodEvals = (Array.isArray(evaluations) ? evaluations : []).filter(e => e.period === CURRENT_PERIOD);
  const currentConfig = (Array.isArray(periodConfigs) ? periodConfigs : []).find((c: any) => c.period === CURRENT_PERIOD);

  const myTeamIds = isAdminOrSocio
    ? null
    : periodAssignments.filter(a => a.supervisorId === currentUser.id).map(a => a.employeeId);

  const getRelevantUsers = () => {
    let base = (Array.isArray(users) ? users : []).filter(u => u.isActive && !u.isSuperUser);
    if (myTeamIds) {
      base = base.filter(u => myTeamIds.includes(u.id) || u.id === currentUser.id);
    }
    if (selectedLevel !== 'all' && isAdminOrSocio) {
      if (selectedLevel === 'legal') base = base.filter(u => getLegalHierarchy().includes(u.position));
      else if (selectedLevel === 'administrativo') base = base.filter(u => getAdminHierarchy().includes(u.position));
      else base = base.filter(u => u.position === selectedLevel);
    }
    return base;
  };

  const relevantUsers = getRelevantUsers();
  const relevantEvals = periodEvals.filter(e => relevantUsers.some(u => u.id === e.evaluatedId));
  const selfEvals = relevantEvals.filter(e => e.type === 'self');
  const supervisorEvals = relevantEvals.filter(e => e.type === 'supervisor');

  const totalEmployees = relevantUsers.length;
  const evaluatedCount = new Set(supervisorEvals.map(e => e.evaluatedId)).size;
  const selfEvalCount = selfEvals.length;
  const completionPct = totalEmployees > 0 ? Math.round((evaluatedCount / totalEmployees) * 100) : 0;
  const selfPct = totalEmployees > 0 ? Math.round((selfEvalCount / totalEmployees) * 100) : 0;
  const supPct = totalEmployees > 0 ? Math.round(
    (() => {
      const withAssignments = relevantUsers.filter(u => periodAssignments.some(a => a.employeeId === u.id));
      const withSupEval = withAssignments.filter(u => periodEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id));
      return withAssignments.length > 0 ? (withSupEval.length / withAssignments.length) * 100 : 0;
    })()
  ) : 0;

  const mySelfEval = periodEvals.find(e => e.type === 'self' && e.evaluatorId === currentUser.id);
  const myAssignments = periodAssignments.filter(a => a.supervisorId === currentUser.id);
  const myCompletedEvals = periodEvals.filter(e => e.type === 'supervisor' && e.evaluatorId === currentUser.id);
  const myPendingEvals = myAssignments.filter(a => !myCompletedEvals.find(e => e.evaluatedId === a.employeeId));

  // My progress for phase indicator
  const mySupAssignments = periodAssignments.filter(a => a.employeeId === currentUser.id);
  const mySupervisorEvals = periodEvals.filter(e => e.type === 'supervisor' && e.evaluatedId === currentUser.id);
  const myAllSupDone = mySupAssignments.length > 0 && mySupervisorEvals.length >= mySupAssignments.length;
  const myFeedbackDone = mySupervisorEvals.some(e => e.feedbackCompleted);
  const selfDone = !!mySelfEval;

  // Urgent items
  const unreadAnnouncements = (Array.isArray(announcements) ? announcements : []).filter(a => {
    if (a.archived) return false;
    if (a.readBy && a.readBy.includes(currentUser.id)) return false;
    return true;
  }).length;

  const pendingVacationCount = (() => {
    const myEvaluados = periodAssignments.filter(a => a.supervisorId === currentUser.id).map(a => a.employeeId);
    return (Array.isArray(vacationRequests) ? vacationRequests : []).filter(r => {
      if (r.status !== 'pending') return false;
      if (isAdmin || isSuperUser || !!currentUser.isManagingPartner) return true;
      return myEvaluados.includes(r.userId);
    }).length;
  })();

  // Phase computation
  const planDone = false; // action plan completion checked elsewhere
  const currentPhase = PHASES.find(p => getPhaseStatus(p.key, selfDone, myAllSupDone, myFeedbackDone, planDone) === 'current');
  const currentPhaseIndex = currentPhase ? PHASES.indexOf(currentPhase) : PHASES.length;

  // Days until period end
  const daysUntilEnd = currentConfig ? getDaysUntil(currentConfig.actionPlanEnd || currentConfig.feedbackEnd || currentConfig.supervisorEnd || currentConfig.selfEnd) : null;

  // Average score
  const avgScore = relevantEvals.length > 0
    ? Math.round(relevantEvals.reduce((s, e) => s + e.totalScore, 0) / relevantEvals.length)
    : null;

  // Chart data for team progress
  const positionProgressData = useMemo(() => {
    return getPositionHierarchy()
      .map(pos => {
        const posUsers = relevantUsers.filter(u => u.position === pos);
        if (posUsers.length === 0) return null;
        const selfDone = posUsers.filter(u => periodEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length;
        const supDone = posUsers.filter(u => periodEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length;
        return {
          name: getPositionLabel(pos),
          selfPct: posUsers.length > 0 ? Math.round((selfDone / posUsers.length) * 100) : 0,
          supPct: posUsers.length > 0 ? Math.round((supDone / posUsers.length) * 100) : 0,
          total: posUsers.length,
        };
      })
      .filter(Boolean);
  }, [relevantUsers, periodEvals]);

  // Legal / admin user groups
  const legalUsers = relevantUsers.filter(u => getLegalHierarchy().includes(u.position)).sort((a, b) => {
    const pi = getLegalHierarchy().indexOf(a.position) - getLegalHierarchy().indexOf(b.position);
    return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
  });
  const adminUsersGroup = relevantUsers.filter(u => getAdminHierarchy().includes(u.position)).sort((a, b) => {
    const pi = getAdminHierarchy().indexOf(a.position) - getAdminHierarchy().indexOf(b.position);
    return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
  });

  const renderUserGroup = (groupUsers: typeof relevantUsers, groupLabel: string) => {
    if (groupUsers.length === 0) return null;
    const positions = [...new Set(groupUsers.map(u => u.position))];
    return (
      <div className="mb-4">
        <p className="text-xs font-bold text-accent uppercase tracking-widest mb-2">{groupLabel}</p>
        {positions.map(pos => {
          const posUsers = groupUsers.filter(u => u.position === pos);
          return (
            <div key={pos} className="mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">{getPositionLabel(pos)} ({posUsers.length})</p>
              <div className="space-y-0.5">
                {posUsers.map(u => {
                  const hasSelfEval = periodEvals.some(e => e.type === 'self' && e.evaluatorId === u.id);
                  const completedSup = periodEvals.filter(e => e.type === 'supervisor' && e.evaluatedId === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/30 transition-[background-color] duration-150">
                      <span className="text-sm">{u.name}</span>
                      <div className="flex items-center gap-2">
                        {hasSelfEval && <CheckCircle className="h-3.5 w-3.5 text-smps-success" />}
                        {completedSup.length > 0 && <span className="text-[10px] text-muted-foreground">{completedSup.length} eval.</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Urgent items list ─────────────────────────────────────────────────
  const urgentItems: { label: string; action: () => void; variant: 'accent' | 'warning' | 'default' }[] = [];
  if (!selfDone) {
    urgentItems.push({ label: 'Completar autoevaluación', action: () => navigate('/self-evaluation'), variant: 'accent' });
  }
  myPendingEvals.forEach(a => {
    const emp = users.find(u => u.id === a.employeeId);
    if (emp) urgentItems.push({ label: `Evaluar a ${emp.name}`, action: () => navigate(`/evaluations?evaluate=${a.employeeId}`), variant: 'warning' });
  });
  if (unreadAnnouncements > 0) {
    urgentItems.push({ label: `${unreadAnnouncements} comunicado${unreadAnnouncements > 1 ? 's' : ''} sin leer`, action: () => navigate('/communications'), variant: 'default' });
  }
  if (pendingVacationCount > 0 && (isAdmin || isSuperUser || !!currentUser.isManagingPartner)) {
    urgentItems.push({ label: `${pendingVacationCount} solicitud${pendingVacationCount > 1 ? 'es' : ''} de vacaciones`, action: () => navigate('/vacations'), variant: 'default' });
  }

  return (
    <div className="space-y-5">
      {/* ─── Context Bar ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold">Panel de Control</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {CURRENT_PERIOD}
              {currentPhase && (
                <> &middot; Fase actual: <span className="text-foreground font-medium">{currentPhase.label}</span></>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdminOrSocio && (
              <div className="flex gap-1 bg-muted rounded-md p-0.5">
                {(['all', 'legal', 'administrativo'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setSelectedLevel(v)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-[background-color,color] duration-150 ${
                      selectedLevel === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v === 'all' ? 'Todos' : v === 'legal' ? 'Legal' : 'Administrativo'}
                  </button>
                ))}
              </div>
            )}
            {daysUntilEnd !== null && daysUntilEnd > 0 && daysUntilEnd <= 90 && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-smps-warning/10 text-smps-warning font-medium">
                <Clock className="h-3 w-3" />
                {daysUntilEnd} día{daysUntilEnd !== 1 ? 's' : ''} restante{daysUntilEnd !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Phase Progress */}
        <div className="mt-4 flex items-center gap-1">
          {PHASES.map((phase, i) => {
            const status = getPhaseStatus(phase.key, selfDone, myAllSupDone, myFeedbackDone, planDone);
            return (
              <div key={phase.key} className="flex items-center flex-1 min-w-0">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium min-w-0 transition-[background-color,color] duration-200 ${
                  status === 'done'
                    ? 'bg-smps-success/10 text-smps-success'
                    : status === 'current'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {status === 'done' ? (
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : status === 'current' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0 animate-pulse" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className="hidden sm:inline truncate">{phase.label}</span>
                  <span className="sm:hidden truncate">{phase.shortLabel}</span>
                </div>
                {i < PHASES.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Urgent Lane ─────────────────────────────────────────────────── */}
      {urgentItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:-mx-5 md:px-5 scrollbar-thin">
          {urgentItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,transform] duration-150 active:scale-[0.98] ${
                item.variant === 'accent'
                  ? 'bg-accent text-accent-foreground hover:opacity-90'
                  : item.variant === 'warning'
                  ? 'bg-smps-warning/10 text-smps-warning hover:bg-smps-warning/20'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {item.label}
              <ArrowRight className="h-3.5 w-3.5 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* ─── Stat Cluster + My Actions ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Cycle Progress */}
        <div className="lg:col-span-3 rounded-xl border bg-card p-5">
          <p className="smps-section-title mb-4">Progreso del Ciclo</p>
          {isAdminOrSocio && (
            <p className="text-xs text-muted-foreground -mt-3 mb-4">
              {totalEmployees} colaborador{totalEmployees !== 1 ? 'es' : ''}{selectedLevel !== 'all' ? ` · ${selectedLevel === 'legal' ? 'Legal' : 'Administrativo'}` : ''}
            </p>
          )}
          <div className="space-y-3">
            <ProgressBar label="Evaluaciones completadas" value={evaluatedCount} max={totalEmployees} color="success" />
            <ProgressBar label="Autoevaluaciones" value={selfEvalCount} max={totalEmployees} color="accent" />
            <ProgressBar label="Evaluadores" value={(() => {
              const withAssign = relevantUsers.filter(u => periodAssignments.some(a => a.employeeId === u.id));
              const withSup = withAssign.filter(u => periodEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id));
              return withSup.length;
            })()} max={(() => {
              const withAssign = relevantUsers.filter(u => periodAssignments.some(a => a.employeeId === u.id));
              return withAssign.length;
            })()} />
            {avgScore !== null && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium">Promedio general</span>
                <ScoreBadge value={avgScore} size="md" />
              </div>
            )}
          </div>

          {/* Team Progress Chart */}
          {positionProgressData.length > 0 && (
            <div className="mt-5 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avance por Posición</p>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(120, positionProgressData.length * 28)}>
                <BarChart data={positionProgressData} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={76} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name === 'selfPct' ? 'Autoeval.' : 'Evaluadores']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="selfPct" fill="hsl(var(--accent))" name="Autoeval." radius={[0, 3, 3, 0]} barSize={10} />
                  <Bar dataKey="supPct" fill="hsl(var(--smps-navy-light))" name="Evaluadores" radius={[0, 3, 3, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* My Actions */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 flex flex-col gap-4">
          <p className="smps-section-title">Mis Acciones</p>

          {/* Self Evaluation */}
          <div className={`rounded-lg border p-3 transition-[border-color] duration-200 ${!selfDone ? 'border-accent/30' : 'border-transparent'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selfDone ? 'bg-smps-success/10' : 'bg-accent/10'
                }`}>
                  <ClipboardCheck className={`h-4 w-4 ${selfDone ? 'text-smps-success' : 'text-accent'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Autoevaluación</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selfDone ? `Completada · ${Math.round(mySelfEval!.totalScore)}%` : 'Pendiente'}
                  </p>
                </div>
              </div>
              {!selfDone && (
                <button
                  onClick={() => navigate('/self-evaluation')}
                  className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98]"
                >
                  Iniciar
                </button>
              )}
            </div>
          </div>

          {/* Pending Evaluations */}
          <div className={`rounded-lg border p-3 transition-[border-color] duration-200 ${
            myPendingEvals.length > 0 ? 'border-smps-warning/30' : 'border-transparent'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Evaluaciones Pendientes</p>
              {myPendingEvals.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-smps-warning/15 text-smps-warning text-[10px] font-bold px-1.5">
                  {myPendingEvals.length}
                </span>
              )}
            </div>
            {myPendingEvals.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-smps-success" />
                <p className="text-sm">Sin evaluaciones pendientes</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {myPendingEvals.map(a => {
                  const emp = users.find(u => u.id === a.employeeId);
                  return (
                    <div key={a.id} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted/40 transition-[background-color] duration-150">
                      <p className="text-sm truncate">{emp?.name}</p>
                      <button
                        onClick={() => navigate(`/evaluations?evaluate=${a.employeeId}`)}
                        className="px-2.5 py-1 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98] ml-2 flex-shrink-0"
                      >
                        Evaluar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unread announcements & vacations (for admins) */}
          {(unreadAnnouncements > 0 || pendingVacationCount > 0) && (isAdmin || isSuperUser || !!currentUser.isManagingPartner) && (
            <div className="space-y-1.5 pt-2 border-t">
              {unreadAnnouncements > 0 && (
                <button onClick={() => navigate('/communications')}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-sm">{unreadAnnouncements} comunicado{unreadAnnouncements > 1 ? 's' : ''} sin leer</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              {pendingVacationCount > 0 && (
                <button onClick={() => navigate('/vacations')}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-sm">{pendingVacationCount} solicitud{pendingVacationCount > 1 ? 'es' : ''} de vacaciones</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Expandable Sections ─────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Collaborators List */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'employees' ? null : 'employees')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-[background-color] duration-150"
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Colaboradores por Nivel</span>
              <span className="text-xs text-muted-foreground">({totalEmployees})</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedSection === 'employees' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'employees' && (
            <div className="px-4 pb-4 border-t smps-fade-in">
              {renderUserGroup(legalUsers, 'Legal')}
              {renderUserGroup(adminUsersGroup, 'Administrativo')}
            </div>
          )}
        </div>

        {/* Progress by Position (detailed) */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'progress' ? null : 'progress')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-[background-color] duration-150"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Progreso Detallado por Posición</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedSection === 'progress' ? 'rotate-180' : ''}`} />
          </button>
          {expandedSection === 'progress' && (
            <div className="px-4 pb-4 border-t smps-fade-in space-y-3">
              {getPositionHierarchy().map(pos => {
                const posUsers = relevantUsers.filter(u => u.position === pos);
                if (posUsers.length === 0) return null;
                const selfDone = posUsers.filter(u => periodEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length;
                const supDone = posUsers.filter(u => periodEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length;
                const selfPct = Math.round((selfDone / posUsers.length) * 100);
                const supPct = Math.round((supDone / posUsers.length) * 100);
                return (
                  <div key={pos}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-medium">{getPositionLabel(pos)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{selfDone}/{posUsers.length} autoeval.</span>
                    </div>
                    <ProgressBar label="Autoevaluaciones" value={selfDone} max={posUsers.length} color="accent" />
                    <ProgressBar label="Evaluadores" value={supDone} max={posUsers.length} color="success" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
