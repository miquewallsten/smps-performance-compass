import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { usePositionConfig } from '@/hooks/useEvaluationConfig';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { ScoreRing } from '@/components/shared/ScoreRing';
import { Users, CheckCircle, Clock, ChevronDown, ArrowRight, ClipboardList } from 'lucide-react';
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

  const posData = useMemo(() => getPositionHierarchy().map(pos => {
    const pu = visible.filter(u => u.position === pos);
    if (pu.length === 0) return null;
    return {
      name: getPositionLabel(pos),
      selfPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length / pu.length) * 100),
      supPct: Math.round((pu.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length / pu.length) * 100),
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
      {/* ─── Status line (thin, no card) ────────────────────────────────── */}
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
              {/* Evaluators */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Evaluadores</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-bold tabular-nums">{supEvalDone}</span>
                  <span className="text-xs text-muted-foreground">/ {supTotal}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${supTotal > 0 ? (supEvalDone / supTotal) * 100 : 0}%` }} />
                </div>
              </div>
              {/* Avg score */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Promedio</p>
                  {avgScore !== null ? <ScoreBadge value={avgScore} size="lg" /> : <span className="text-xs text-muted-foreground">--</span>}
                </div>
                {avgScore !== null && <ScoreRing value={avgScore} size={40} />}
              </div>
            </div>
          </div>

          {/* Position chart */}
          {posData.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Avance por Posici\u00f3n</p>
              <ResponsiveContainer width="100%" height={Math.max(100, posData.length * 24)}>
                <BarChart data={posData} layout="vertical" margin={{ left: 72, right: 8, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#71717a' }} tickFormatter={(v: number) => `${v}%`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={68} tick={{ fontSize: 10, fill: '#1e293b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="selfPct" name="Autoeval." radius={[0, 2, 2, 0]} barSize={14}>
                    {posData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.selfPct >= 80 ? '#2d8a4e' : entry.selfPct >= 50 ? '#b8860b' : '#c2364d'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="supPct" name="Evaluadores" radius={[0, 2, 2, 0]} barSize={14}>
                    {posData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.supPct >= 80 ? '#2d8a4e' : entry.supPct >= 50 ? '#b8860b' : '#d48806'} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ─── Right column: Actions + Team ──────────────────────────────── */}
        <div className="lg:col-span-4 space-y-3">

          {/* Urgent actions */}
          {urgentItems.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Pendiente</p>
              <div className="space-y-1">
                {urgentItems.map((item, i) => (
                  <button key={i} onClick={item.action}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-[background-color,transform] duration-150 active:scale-[0.98] text-left ${
                      item.variant === 'accent' ? 'bg-accent text-accent-foreground hover:opacity-90'
                      : item.variant === 'warning' ? 'bg-smps-warning/10 text-smps-warning hover:bg-smps-warning/15'
                      : 'hover:bg-muted/60'
                    }`}>
                    <ClipboardList className="h-3 w-3 shrink-0 opacity-70" />
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
      </div>

      {/* ─── Expandable detail (optional, below fold) ──────────────────── */}
      <div className="space-y-2">
        <div className="rounded-lg border bg-card overflow-hidden">
          <button onClick={() => setExpanded(expanded === 'progress' ? null : 'progress')}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-[background-color] duration-150">
            <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-accent" /><span className="text-xs font-medium">Progreso Detallado por Posici\u00f3n</span></div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${expanded === 'progress' ? 'rotate-180' : ''}`} />
          </button>
          {expanded === 'progress' && (
            <div className="px-3 pb-3 border-t smps-fade-in space-y-2">
              {getPositionHierarchy().map(pos => {
                const pu = visible.filter(u => u.position === pos);
                if (pu.length === 0) return null;
                const sDone = pu.filter(u => pEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length;
                const supD = pu.filter(u => pEvals.some(e => e.type === 'supervisor' && e.evaluatedId === u.id)).length;
                const selfPct = pu.length > 0 ? Math.round((sDone / pu.length) * 100) : 0;
                const supPct = pu.length > 0 ? Math.round((supD / pu.length) * 100) : 0;
                return (
                  <div key={pos}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-medium">{getPositionLabel(pos)}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{sDone}/{pu.length}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5"><span>Autoeval.</span><span>{selfPct}%</span></div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${selfPct}%` }} /></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5"><span>Evaluadores</span><span>{supPct}%</span></div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-smps-success transition-[width] duration-700 ease-out" style={{ width: `${supPct}%` }} /></div>
                      </div>
                    </div>
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
