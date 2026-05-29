import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { CURRENT_PERIOD, getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
import { ScoreBadge, scoreColorText } from '@/components/shared/ScoreBadge';
import { ScoreRing } from '@/components/shared/ScoreRing';
import { Users, CheckCircle, Clock, TrendingUp, ChevronDown, ArrowRight, ClipboardList, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type PhaseKey = 'self' | 'supervisor' | 'feedback' | 'action_plan';

const PHASES: { key: PhaseKey; label: string; short: string }[] = [
  { key: 'self', label: 'Autoevaluación', short: 'Autoeval.' },
  { key: 'supervisor', label: 'Evaluadores', short: 'Evaluad.' },
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

function ProgressBar({ value, max, label, color = 'accent' }: { value: number; max: number; label: string; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fill = color === 'success' ? 'hsl(var(--smps-success))' : color === 'warning' ? 'hsl(var(--smps-warning))' : 'hsl(var(--accent))';
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium min-w-[130px] truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: fill }} />
      </div>
      <span className="text-sm tabular-nums text-muted-foreground min-w-[44px] text-right">{value}/{max}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-display font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">{p.name}: <span className="text-foreground font-medium">{p.value}%</span></p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations({ period: CURRENT_PERIOD });
  const { data: assignments = [] } = useAssignments(CURRENT_PERIOD);
  const { data: periodConfigs = [] } = usePeriods();
  const { data: announcements = [] } = useAnnouncements();
  const { data: vacationRequests = [] } = useVacationRequests();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('all');

  if (!currentUser) return null;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrMore = isAdmin || isSocio || !!currentUser.isManagingPartner;
  const isSuperUser = currentUser.isSuperUser;

  const pAssign = (Array.isArray(assignments) ? assignments : []).filter(a => a.period === CURRENT_PERIOD);
  const pEvals = (Array.isArray(evaluations) ? evaluations : []).filter(e => e.period === CURRENT_PERIOD);
  const curCfg = (Array.isArray(periodConfigs) ? periodConfigs : []).find((c: any) => c.period === CURRENT_PERIOD);

  const myTeamIds = isAdminOrMore ? null : pAssign.filter(a => a.supervisorId === currentUser.id).map(a => a.employeeId);

  const visible = (() => {
    let base = (Array.isArray(users) ? users : []).filter(u => u.isActive && !u.isSuperUser);
    if (myTeamIds) base = base.filter(u => myTeamIds.includes(u.id) || u.id === currentUser.id);
    if (levelFilter !== 'all' && isAdminOrMore) {
      if (levelFilter === 'legal') base = base.filter(u => getLegalHierarchy().includes(u.position));
      else if (levelFilter === 'administrativo') base = base.filter(u => getAdminHierarchy().includes(u.position));
      else base = base.filter(u => u.position === levelFilter);
    }
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
    const withSup = withAssign.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id));
    return withSup.length;
  })();
  const supTotal = (() => {
    const withAssign = visible.filter(u => pAssign.some(a => a.employeeId === u.id));
    return withAssign.length;
  })();

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

  const posData = useMemo(() => getPositionHierarchy().map(pos => {
    const pu = visible.filter(u => u.position === pos);
    if (pu.length === 0) return null;
    return {
      name: getPositionLabel(pos),
      selfPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length / pu.length) * 100),
      supPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length / pu.length) * 100),
    };
  }).filter(Boolean), [visible, pEvals]);

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
      <div className="mb-4 last:mb-0">
        <p className="text-[11px] font-bold text-accent uppercase tracking-widest mb-2">{label}</p>
        {positions.map(pos => {
          const pu = groupUsers.filter(u => u.position === pos);
          return (
            <div key={pos} className="mb-2 last:mb-0">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">{getPositionLabel(pos)} ({pu.length})</p>
              <div className="space-y-0.5">
                {pu.map(u => {
                  const hasSelf = pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id);
                  const selfScore = pEvals.find(e => e.type === 'self' && e.evaluatorId === u.id);
                  return (
                    <button key={u.id} onClick={() => navigate(`/profile/${u.id}`)}
                      className="w-full flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                      <span className="text-sm truncate">{u.name}</span>
                      <div className="flex items-center gap-2">
                        {selfScore ? <ScoreBadge value={Math.round(selfScore.totalScore)} size="sm" /> : hasSelf ? <CheckCircle className="h-3 w-3 text-smps-success" /> : null}
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

  const urgentItems: { label: string; action: () => void; variant: 'accent' | 'warning' | 'default' }[] = [];
  if (!selfDone) urgentItems.push({ label: 'Completar autoevaluación', action: () => navigate('/self-evaluation'), variant: 'accent' });
  myPending.forEach(a => {
    const emp = (users as any[]).find(u => u.id === a.employeeId);
    if (emp) urgentItems.push({ label: `Evaluar a ${emp.name}`, action: () => navigate(`/evaluations?evaluate=${a.employeeId}`), variant: 'warning' });
  });
  if (unread > 0) urgentItems.push({ label: `${unread} comunicado${unread > 1 ? 's' : ''} sin leer`, action: () => navigate('/communications'), variant: 'default' });
  if (pendVac > 0 && (isAdmin || isSuperUser || !!currentUser.isManagingPartner)) urgentItems.push({ label: `${pendVac} solicitud${pendVac > 1 ? 'es' : ''} de vacaciones`, action: () => navigate('/vacations'), variant: 'default' });

  return (
    <div className="space-y-4">
      {/* Context header */}
      <div className="rounded-xl border bg-card smps-fade-up">
        <div className="p-4 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">Panel de Control</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {CURRENT_PERIOD}{currentPhase ? <> · Fase: <span className="text-foreground font-medium">{currentPhase.label}</span></> : null}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isAdminOrMore && (
                <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
                  {(['all', 'legal', 'administrativo'] as const).map(v => (
                    <button key={v} onClick={() => setLevelFilter(v)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ${levelFilter === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                      {v === 'all' ? 'Todos' : v === 'legal' ? 'Legal' : 'Admin.'}
                    </button>
                  ))}
                </div>
              )}
              {daysLeft !== null && daysLeft > 0 && daysLeft <= 90 && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-smps-warning/10 text-smps-warning font-medium">
                  <Clock className="h-3 w-3" />
                  {daysLeft} d\u00eda{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Phase stepper */}
        <div className="px-4 pb-4">
          <div className="flex items-stretch gap-0.5">
            {PHASES.map((p, i) => {
              const st = phaseStatus(p.key, selfDone, allSupDone, feedbackDone, planDone);
              const nextSt = i < PHASES.length - 1 ? phaseStatus(PHASES[i + 1].key, selfDone, allSupDone, feedbackDone, planDone) : null;
              return (
                <div key={p.key} className="flex items-center flex-1 min-w-0">
                  <div className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium min-w-0 transition-[background-color,color] duration-200 w-full ${
                    st === 'done' ? 'bg-smps-success/10 text-smps-success'
                    : st === 'current' ? 'bg-accent/10 text-accent'
                    : 'bg-muted/40 text-muted-foreground'
                  }`}>
                    {st === 'done' ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    : st === 'current' ? <span className="h-2 w-2 rounded-full bg-accent shrink-0 animate-pulse" />
                    : <span className="h-2 w-2 rounded-full bg-muted-foreground/25 shrink-0" />}
                    <span className="hidden sm:inline truncate">{p.label}</span>
                    <span className="sm:hidden truncate">{p.short}</span>
                  </div>
                  {i < PHASES.length - 1 && (
                    <div className={`w-5 h-px mx-0.5 shrink-0 transition-[background-color] duration-300 ${
                      st === 'done' && nextSt !== 'upcoming' ? 'bg-smps-success/40' : 'bg-border'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Urgent action lane */}
      {urgentItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 md:-mx-5 md:px-5 smps-fade-up smps-delay-1">
          {urgentItems.map((item, i) => (
            <button key={i} onClick={item.action}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-[background-color,transform] duration-150 active:scale-[0.97] ${
                item.variant === 'accent' ? 'bg-accent text-accent-foreground hover:opacity-90'
                : item.variant === 'warning' ? 'bg-smps-warning/10 text-smps-warning hover:bg-smps-warning/15 border border-smps-warning/20'
                : 'bg-muted text-foreground hover:bg-muted/80'
              }`}>
              {item.variant === 'accent' && <ClipboardList className="h-3.5 w-3.5" />}
              {item.variant === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
              {item.label}
              <ArrowRight className="h-3 w-3 opacity-50" />
            </button>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Cycle progress */}
        <div className="lg:col-span-3 rounded-xl border bg-card p-5 smps-fade-up smps-delay-2">
          <p className="smps-section-title mb-4">Progreso del Ciclo</p>
          {isAdminOrMore && (
            <p className="text-xs text-muted-foreground -mt-3 mb-4">
              {totalEmployees} colaborador{totalEmployees !== 1 ? 'es' : ''}{levelFilter !== 'all' ? ` · ${levelFilter === 'legal' ? 'Legal' : 'Administrativo'}` : ''}
            </p>
          )}
          <div className="space-y-3">
            <ProgressBar label="Evaluaciones completadas" value={evaluatedCount} max={totalEmployees} color="success" />
            <ProgressBar label="Autoevaluaciones" value={selfEvalCount} max={totalEmployees} />
            <ProgressBar label="Evaluadores" value={supEvalDone} max={supTotal} />
            {avgScore !== null && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium">Promedio general</span>
                <ScoreBadge value={avgScore} size="lg" />
              </div>
            )}
          </div>

          {posData.length > 0 && (
            <div className="mt-5 pt-4 border-t">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avance por Posici\u00f3n</p>
              <ResponsiveContainer width="100%" height={Math.max(120, posData.length * 28)}>
                <BarChart data={posData} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="selfPct" name="Autoevaluaci\u00f3n" radius={[0, 3, 3, 0]} barSize={8}>
                    {posData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.selfPct >= 80 ? 'hsl(var(--smps-success))' : entry.selfPct >= 50 ? 'hsl(var(--smps-gold))' : 'hsl(var(--accent))'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="supPct" name="Evaluadores" radius={[0, 3, 3, 0]} barSize={8}>
                    {posData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.supPct >= 80 ? 'hsl(var(--smps-success))' : entry.supPct >= 50 ? 'hsl(var(--smps-gold))' : 'hsl(var(--smps-warning))'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* My Actions sidebar */}
        <div className="lg:col-span-2 space-y-4 smps-fade-up smps-delay-3">
          {avgScore !== null && (
            <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
              <ScoreRing value={avgScore} size={56} label="Promedio" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Promedio del equipo</p>
                <p className="text-xs text-muted-foreground mt-0.5">{totalEmployees} evaluados · {CURRENT_PERIOD}</p>
              </div>
            </div>
          )}

          {myPending.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="smps-section-title mb-3">Evaluaciones Pendientes</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {myPending.map(a => {
                  const emp = (users as any[]).find(u => u.id === a.employeeId);
                  return (
                    <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-[background-color] duration-150">
                      <span className="text-sm truncate">{emp?.name}</span>
                      <button onClick={() => navigate(`/evaluations?evaluate=${a.employeeId}`)}
                        className="px-2.5 py-1 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98] ml-2 shrink-0">
                        Evaluar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(unread > 0 || pendVac > 0) && (isAdmin || isSuperUser || !!currentUser.isManagingPartner) && (
            <div className="rounded-xl border bg-card p-4 space-y-1.5">
              <p className="smps-section-title mb-2">Requiere Atenci\u00f3n</p>
              {unread > 0 && (
                <button onClick={() => navigate('/communications')} className="w-full flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-sm">{unread} comunicado{unread > 1 ? 's' : ''} sin leer</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              {pendVac > 0 && (
                <button onClick={() => navigate('/vacations')} className="w-full flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-[background-color] duration-150 text-left">
                  <span className="text-sm">{pendVac} solicitud{pendVac > 1 ? 'es' : ''} de vacaciones</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable sections */}
      <div className="space-y-2">
        <div className="rounded-xl border bg-card overflow-hidden smps-fade-up smps-delay-4">
          <button onClick={() => setExpanded(expanded === 'employees' ? null : 'employees')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-[background-color] duration-150">
            <div className="flex items-center gap-3"><Users className="h-4 w-4 text-accent" /><span className="text-sm font-medium">Colaboradores por Nivel</span><span className="text-xs text-muted-foreground">({totalEmployees})</span></div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded === 'employees' ? 'rotate-180' : ''}`} />
          </button>
          {expanded === 'employees' && (
            <div className="px-4 pb-4 border-t smps-fade-in">
              {renderGroup(legal, 'Legal')}
              {renderGroup(admin, 'Administrativo')}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card overflow-hidden smps-fade-up smps-delay-5">
          <button onClick={() => setExpanded(expanded === 'progress' ? null : 'progress')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-[background-color] duration-150">
            <div className="flex items-center gap-3"><TrendingUp className="h-4 w-4 text-accent" /><span className="text-sm font-medium">Progreso Detallado por Posici\u00f3n</span></div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded === 'progress' ? 'rotate-180' : ''}`} />
          </button>
          {expanded === 'progress' && (
            <div className="px-4 pb-4 border-t smps-fade-in space-y-3">
              {getPositionHierarchy().map(pos => {
                const pu = visible.filter(u => u.position === pos);
                if (pu.length === 0) return null;
                const sDone = pu.filter(u => pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length;
                const supD = pu.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length;
                return (
                  <div key={pos}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-medium">{getPositionLabel(pos)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{sDone}/{pu.length} autoeval.</span>
                    </div>
                    <ProgressBar label="Autoevaluaciones" value={sDone} max={pu.length} color="accent" />
                    <ProgressBar label="Evaluadores" value={supD} max={pu.length} color="success" />
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
