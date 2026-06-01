import * as React from "react";
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { getPositionLabel, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { usePositionConfig } from '@/hooks/useEvaluationConfig';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { CheckCircle, Clock, ArrowRight, PenLine, UserCheck, Megaphone, CalendarOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from '@/components/shared/SkeletonPage';

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

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const currentPeriod = useCurrentPeriod();
  const { data: posConfigData } = usePositionConfig();
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

  if (!currentUser) return null;

  // Show skeleton while data loads
  const isDashboardLoading = !usersData || !evaluationsData || !assignmentsData;
  if (isDashboardLoading) return <DashboardSkeleton />;

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

  // Team grouped by area
  const legal = visible.filter(u => getLegalHierarchy().includes(u.position)).sort((a, b) => {
    const d = getLegalHierarchy().indexOf(a.position) - getLegalHierarchy().indexOf(b.position);
    return d !== 0 ? d : a.name.localeCompare(b.name, 'es');
  });
  const admin = visible.filter(u => getAdminHierarchy().includes(u.position)).sort((a, b) => {
    const d = getAdminHierarchy().indexOf(a.position) - getAdminHierarchy().indexOf(b.position);
    return d !== 0 ? d : a.name.localeCompare(b.name, 'es');
  });

  // Action items
  const actions: { icon: React.ElementType; label: string; sublabel?: string; action: () => void; variant: 'accent' | 'warning' | 'muted' }[] = [];
  if (!selfDone) actions.push({ icon: PenLine, label: 'Completar Autoevaluación', action: () => navigate('/self-evaluation'), variant: 'accent' });
  myPending.forEach(a => {
    const emp = (users as any[]).find(u => u.id === a.employeeId);
    if (emp) actions.push({ icon: UserCheck, label: `Evaluar a ${emp.name.split(' ').slice(-1)[0]}`, sublabel: getPositionLabel(emp.position), action: () => navigate(`/evaluations?evaluate=${a.employeeId}`), variant: 'warning' });
  });
  if (unread > 0) actions.push({ icon: Megaphone, label: `${unread} comunicado${unread > 1 ? 's' : ''} sin leer`, action: () => navigate('/communications'), variant: 'muted' });
  if (pendVac > 0 && (isAdmin || isSuperUser || !!currentUser.isManagingPartner)) actions.push({ icon: CalendarOff, label: `${pendVac} solicitud${pendVac > 1 ? 'es' : ''} de vacaciones`, action: () => navigate('/vacations'), variant: 'muted' });

  return (
    <div className="smps-fade-up max-w-5xl mx-auto space-y-5 px-4 py-5 md:px-6 md:py-6">

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight leading-tight">Panel de Control</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/8 text-foreground tabular-nums">{currentPeriod}</span>
            {currentPhase && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-accent/10 text-accent">{currentPhase.label}</span>
            )}
          </div>
        </div>
        {daysLeft !== null && daysLeft > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <span className="tabular-nums">{daysLeft}d restantes</span>
          </div>
        )}
      </header>

      {/* ─── Phase strip ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {PHASES.map((p, i) => {
          const st = phaseStatus(p.key, selfDone, allSupDone, feedbackDone, planDone);
          return (
            <div key={p.key} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-[background-color] duration-150 ${
                st === 'done' ? 'bg-smps-success/10 text-smps-success'
                : st === 'current' ? 'bg-accent/10 text-accent'
                : 'bg-muted text-muted-foreground/50'
              }`}>
                {st === 'done' ? <CheckCircle className="h-3 w-3" /> : null}
                {st === 'current' ? <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> : null}
                <span className="hidden sm:inline">{p.label}</span>
                <span className="sm:hidden">{p.short}</span>
              </div>
              {i < PHASES.length - 1 && (
                <div className={`w-3 h-px mx-0.5 ${st === 'done' ? 'bg-smps-success/30' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ─── Left: Actions + Stats ─────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-5">

          {/* Personal actions */}
          <section>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Pendientes</p>
            {actions.length === 0 ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-smps-success/5 border-smps-success/20">
                <CheckCircle className="h-4 w-4 text-smps-success shrink-0" />
                <span className="text-sm font-medium text-smps-success">Todo al día</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {actions.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} onClick={item.action}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-[background-color,border-color] duration-150 active:scale-[0.98] ${
                        item.variant === 'accent' ? 'border-accent/30 bg-accent/5 hover:bg-accent/10'
                        : item.variant === 'warning' ? 'border-smps-warning/30 bg-smps-warning/5 hover:bg-smps-warning/10'
                        : 'border-border bg-card hover:bg-muted/50'
                      }`}>
                      <Icon className={`h-4 w-4 shrink-0 ${
                        item.variant === 'accent' ? 'text-accent'
                        : item.variant === 'warning' ? 'text-smps-warning'
                        : 'text-muted-foreground'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium leading-tight block truncate">{item.label}</span>
                        {item.sublabel && <span className="text-[11px] text-muted-foreground block">{item.sublabel}</span>}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Progress metrics */}
          <section>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Avance {currentPeriod}</p>
            <div className="space-y-3">
              <MetricRow label="Completadas" done={evaluatedCount} total={totalEmployees} colorClass="bg-smps-success" />
              <MetricRow label="Autoevaluaciones" done={selfEvalCount} total={totalEmployees} colorClass="bg-accent" />
              <MetricRow label="Eval. Supervisor" done={supEvalDone} total={supTotal} colorClass="bg-primary" />
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">Promedio general</span>
                <span className="text-sm font-display font-bold tabular-nums">{avgScore !== null ? `${avgScore}%` : '—'}</span>
              </div>
            </div>
          </section>

          {/* My self-eval result */}
          {mySelfEval && (
            <section className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card">
              <CheckCircle className="h-4 w-4 text-smps-success shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Autoevaluación completada</p>
                <p className="text-[11px] text-muted-foreground">Tu calificación</p>
              </div>
              <ScoreBadge value={Math.round(mySelfEval.totalScore)} size="lg" />
            </section>
          )}
        </div>

        {/* ─── Right: Team ──────────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          <section className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Equipo</p>
              <span className="text-[10px] text-muted-foreground tabular-nums">{totalEmployees}</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {legal.length > 0 && <TeamGroup label="Legal" users={legal} pEvals={pEvals} />}
              {admin.length > 0 && <TeamGroup label="Administrativo" users={admin} pEvals={pEvals} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────── */

function MetricRow({ label, done, total, colorClass }: { label: string; done: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{done}<span className="text-muted-foreground/50">/{total}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colorClass} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TeamGroup({ label, users, pEvals }: { label: string; users: any[]; pEvals: any[] }) {
  const positions = [...new Set(users.map(u => u.position))];
  return (
    <div className="border-b last:border-b-0">
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{label}</p>
      </div>
      {positions.map(pos => {
        const posUsers = users.filter(u => u.position === pos);
        return (
          <div key={pos}>
            <div className="px-4 pt-1.5 pb-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground">{getPositionLabel(pos)} <span className="text-muted-foreground/50">({posUsers.length})</span></p>
            </div>
            <div className="px-2 pb-1">
              {posUsers.map(u => {
                const selfScore = pEvals.find((e: any) => e.type === 'self' && e.evaluatorId === u.id);
                const hasSup = pEvals.some((e: any) => e.type === 'supervisor' && e.evaluatedId === u.id);
                const selfDone = !!selfScore;
                return (
                  <UserButton key={u.id} user={u} selfScore={selfScore ? Math.round(selfScore.totalScore) : null} hasSup={hasSup} selfDone={selfDone} />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UserButton({ user, selfScore, hasSup, selfDone }: { user: any; selfScore: number | null; hasSup: boolean; selfDone: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/profile/${user.id}`)}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-[background-color] duration-150 text-left active:scale-[0.98]"
    >
      <span className="text-sm truncate flex-1">{user.name}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {selfDone ? <ScoreBadge value={selfScore} size="sm" /> : null}
        {hasSup && !selfDone ? <CheckCircle className="h-3 w-3 text-smps-success" /> : null}
        {!selfDone && !hasSup ? <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /> : null}
      </div>
    </button>
  );
}
