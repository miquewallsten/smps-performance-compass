import * as React from "react";
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsOverview, useAnalyticsEvaluations, usePendingActions, useUnreadNotificationCount, usePeriods } from '@/api/queries';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { CheckCircle, Clock, ArrowRight, PenLine, UserCheck, Bell, Megaphone, CalendarOff, AlertTriangle, FileCheck, Target } from 'lucide-react';
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
  const { data: periodsData = [] } = usePeriods();
  // Determine which period to use for analytics display
  // If the current period just started and has no data, fall back to the previous period
  const previousPeriod = (() => {
    const sorted = [...periodsData].sort((a: any, b: any) => b.period.localeCompare(a.period));
    const prev = sorted.find((p: any) => p.period < currentPeriod);
    return prev ? prev.period : currentPeriod;
  })();
  // Use previous period for analytics if current has no data
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(currentPeriod);
  const hasCurrentData = overview && (overview.totalEmployees > 0 || overview.selfEvalCompleted > 0);
  const analyticsPeriod = hasCurrentData ? currentPeriod : previousPeriod;
  const isPeriodTransition = !hasCurrentData && analyticsPeriod !== currentPeriod;
  const { data: evalAnalytics, isLoading: evalLoading } = useAnalyticsEvaluations(analyticsPeriod);
  const { data: pendingActions, isLoading: actionsLoading } = usePendingActions(currentPeriod);
  const { data: notifCount } = useUnreadNotificationCount();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isLoading = overviewLoading || evalLoading;
  if (isLoading) return <DashboardSkeleton />;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrMore = isAdmin || isSocio || !!currentUser.isManagingPartner;
  const isSuperUser = currentUser.isSuperUser;

  // Derive metrics from analytics API
  const totalEmployees = overview?.totalEmployees || 0;
  const completionRate = overview?.completionRate || 0;
  const avgScore = overview?.avgOverallScore != null ? Math.round(overview.avgOverallScore) : null;
  const selfCompleted = overview?.selfEvalCompleted || 0;
  const supCompleted = overview?.supervisorEvalCompleted || 0;
  const feedbackCompleted = overview?.feedbackCompleted || 0;

  // Determine current phase
  const selfEnd = overview?.selfEnd;
  const supervisorEnd = overview?.supervisorEnd;
  const feedbackEnd = overview?.feedbackEnd;
  const actionPlanEnd = overview?.actionPlanEnd;

  const selfDone = selfCompleted > 0;
  const supDone = supCompleted > 0;
  const fbDone = feedbackCompleted > 0;
  const planDone = (overview?.actionPlansCreated || 0) > 0;

  const actions = pendingActions?.actions || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold">Panel</h1>
          <p className="text-xs text-muted-foreground">Periodo: {currentPeriod}{isPeriodTransition && <span className="ml-1 text-amber-600">(mostrando datos de {analyticsPeriod})</span>}</p>
        </div>
        {notifCount?.unread > 0 && (
          <button onClick={() => navigate('/notifications')} className="flex items-center gap-1.5 text-sm text-accent hover:opacity-80 transition-opacity">
            <Bell className="h-4 w-4" />
            <span className="font-medium">{notifCount.unread}</span>
          </button>
        )}
      </div>

      {/* ─── Phase Progress ──────────────────────────────────────────────── */}
      <section className="rounded-lg border bg-card p-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Progreso del Periodo</p>
        <div className="flex items-center gap-2">
          {PHASES.map((phase, i) => {
            const status = phaseStatus(phase.key, selfDone, supDone, fbDone, planDone);
            const deadline = phase.key === 'self' ? selfEnd : phase.key === 'supervisor' ? supervisorEnd : phase.key === 'feedback' ? feedbackEnd : actionPlanEnd;
            const days = deadline ? daysUntil(deadline.split('T')[0]) : null;
            return (
              <React.Fragment key={phase.key}>
                {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />}
                <div className={`flex-1 rounded-md px-2.5 py-2 text-center transition-colors ${
                  status === 'done' ? 'bg-smps-success/10 border border-smps-success/20' :
                  status === 'current' ? 'bg-accent/10 border border-accent/30' :
                  'bg-muted border border-muted'
                }`}>
                  <p className={`text-[11px] font-semibold ${status === 'done' ? 'text-smps-success' : status === 'current' ? 'text-accent' : 'text-muted-foreground/50'}`}>
                    {phase.short}
                  </p>
                  {status === 'current' && days !== null && (
                    <p className={`text-[10px] mt-0.5 ${days <= 3 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {days <= 0 ? '¡Vencido!' : `${days}d`}
                    </p>
                  )}
                  {status === 'done' && <CheckCircle className="h-3 w-3 mx-auto mt-0.5 text-smps-success" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── Left: Metrics ─────────────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-3">
          <section className="rounded-lg border bg-card p-4 space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Métricas</p>
            <div className="space-y-2">
              <MetricRow label="Autoevaluación" done={selfCompleted} total={totalEmployees} colorClass="bg-blue-500" />
              <MetricRow label="Eval. Supervisor" done={supCompleted} total={totalEmployees} colorClass="bg-emerald-500" />
              <MetricRow label="Feedback" done={feedbackCompleted} total={totalEmployees} colorClass="bg-amber-500" />
              <MetricRow label="Planes de Acción" done={overview?.actionPlansCreated || 0} total={totalEmployees} colorClass="bg-purple-500" />
            </div>
            <div className="pt-2 border-t flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Tasa de completado</span>
                <span className="text-sm font-display font-bold tabular-nums ml-2">{completionRate}%</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Promedio general</span>
                <span className="text-sm font-display font-bold tabular-nums ml-2">{avgScore !== null ? `${avgScore}%` : '—'}</span>
              </div>
            </div>
          </section>

          {/* Pending Actions */}
          {actions.length > 0 && (
            <section className="rounded-lg border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Acciones Pendientes</p>
                <span className="text-[10px] text-accent font-bold">{actions.length}</span>
              </div>
              <div className="divide-y">
                {actions.map((action: any, i: number) => (
                  <button key={i} onClick={() => navigate(action.url)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left">
                    {action.type === 'evaluation' ? <PenLine className="h-4 w-4 text-blue-500 shrink-0" /> :
                     action.type === 'action_plan' ? <FileCheck className="h-4 w-4 text-purple-500 shrink-0" /> :
                     action.type === 'vacation' ? <CalendarOff className="h-4 w-4 text-amber-500 shrink-0" /> :
                     <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{action.title}</p>
                      {action.deadline && (
                        <p className="text-[10px] text-muted-foreground">
                          {daysUntil(action.deadline.split('T')[0]) ?? 0 <= 0 ? '¡Vencido!' : `Vence en ${daysUntil(action.deadline.split('T')[0])} días`}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Evaluation Score Breakdown (from analytics) */}
          {evalAnalytics && evalAnalytics.byType && (
            <section className="rounded-lg border bg-card p-4 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Calificaciones</p>
              {evalAnalytics.byType.self && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Autoevaluación</span>
                  <ScoreBadge value={evalAnalytics.byType.self.avgScore ? Math.round(evalAnalytics.byType.self.avgScore) : 0} size="md" />
                </div>
              )}
              {evalAnalytics.byType.supervisor && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Supervisor</span>
                  <ScoreBadge value={evalAnalytics.byType.supervisor.avgScore ? Math.round(evalAnalytics.byType.supervisor.avgScore) : 0} size="md" />
                </div>
              )}
            </section>
          )}
        </div>

        {/* ─── Right: Evaluation Details ──────────────────────────────────── */}
        <div className="lg:col-span-7">
          <section className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {isAdminOrMore ? 'Resumen General' : 'Mi Equipo'}
              </p>
              <span className="text-[10px] text-muted-foreground tabular-nums">{totalEmployees} empleados</span>
            </div>
            <div className="p-4 space-y-3">
              {/* Overview stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Empleados" value={totalEmployees} />
                <StatCard label="Evaluados" value={supCompleted} />
                <StatCard label="Autoevaluaciones" value={selfCompleted} />
                <StatCard label="Feedback" value={feedbackCompleted} />
              </div>

              {/* Quick action links */}
              <div className="pt-2 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Acciones Rápidas</p>
                <div className="grid grid-cols-2 gap-2">
                  <QuickAction icon={<PenLine className="h-3.5 w-3.5" />} label="Autoevaluación" onClick={() => navigate('/self-evaluation')} />
                  <QuickAction icon={<Target className="h-3.5 w-3.5" />} label="Objetivos" onClick={() => navigate('/personal-objectives')} />
                  <QuickAction icon={<FileCheck className="h-3.5 w-3.5" />} label="Plan de Acción" onClick={() => navigate('/my-action-plan')} />
                  <QuickAction icon={<CalendarOff className="h-3.5 w-3.5" />} label="Vacaciones" onClick={() => navigate('/vacations')} />
                </div>
              </div>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-display font-bold tabular-nums">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted/30 transition-colors text-left active:scale-[0.98]">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
