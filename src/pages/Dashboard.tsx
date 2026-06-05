import * as React from "react";
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useAnalyticsOverview, useAnalyticsEvaluations, useUnreadNotificationCount, usePeriods, usePendingActions } from '@/api/queries';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { useDisplayPeriod } from '@/hooks/useDisplayPeriod';
import { getPositionLabel, getPositionLevel, getPositionRank, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
import { canViewUserEvaluations } from '@/lib/visibility';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { CheckCircle, Clock, ArrowRight, PenLine, UserCheck, Bell, Megaphone, CalendarOff, AlertTriangle, FileCheck, Target, ChevronDown, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
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

class DashboardErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <AlertTriangle className="h-8 w-8 text-[hsl(var(--smps-warning))] mb-3" />
          <p className="text-sm font-semibold mb-1">Error al cargar el panel</p>
          <p className="text-xs text-muted-foreground mb-4">{this.state.error?.message || 'Ocurrió un error inesperado.'}</p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const currentPeriod = useCurrentPeriod();
  const { data: periodsData = [] } = usePeriods();
  const displayPeriod = useDisplayPeriod();

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(displayPeriod);
  const hasCurrentData = overview && (overview.selfEvalCompleted > 0 || overview.supervisorEvalCompleted > 0);
  const analyticsPeriod = displayPeriod;
  const isPeriodTransition = displayPeriod !== currentPeriod;
  const { data: evalAnalytics, isLoading: evalLoading } = useAnalyticsEvaluations(analyticsPeriod);
  const { data: pendingActions, isLoading: actionsLoading } = usePendingActions(currentPeriod);
  const { data: notifCount } = useUnreadNotificationCount();

  const { data: allUsers = [], isLoading: usersLoading } = useUsers();
  const { data: allEvaluations = [], isLoading: evalsLoading } = useEvaluations({ period: currentPeriod });
  const { data: allAssignments = [], isLoading: assignLoading } = useAssignments(currentPeriod);

  const navigate = useNavigate();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  if (!currentUser) return null;

  const isLoading = overviewLoading || evalLoading || usersLoading || evalsLoading || assignLoading;
  if (isLoading) return <DashboardSkeleton />;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrMore = isAdmin || isSocio || !!currentUser.isManagingPartner;
  const isSuperUser = currentUser.isSuperUser;

  const periodAssignments = allAssignments.filter((a: any) => a.period === currentPeriod);
  const periodEvals = allEvaluations.filter((e: any) => e.period === currentPeriod);

  const myTeamIds = isAdminOrMore
    ? null
    : periodAssignments.filter((a: any) => a.supervisorId === currentUser.id).map((a: any) => a.employeeId);

  const getRelevantUsers = () => {
    let base = allUsers.filter((u: any) => u.isActive && !u.isSuperUser);
    base = base.filter((u: any) => canViewUserEvaluations(currentUser, u));
    if (myTeamIds) {
      base = base.filter((u: any) => myTeamIds.includes(u.id) || u.id === currentUser.id);
    }
    if (selectedLevel !== 'all' && isAdminOrMore) {
      const legal = getLegalHierarchy();
      const admin = getAdminHierarchy();
      if (selectedLevel === 'legal') base = base.filter((u: any) => legal.includes(u.position));
      else if (selectedLevel === 'administrativo') base = base.filter((u: any) => admin.includes(u.position));
      else base = base.filter((u: any) => u.position === selectedLevel);
    }
    return base;
  };

  const relevantUsers = getRelevantUsers();
  const relevantEvals = periodEvals.filter((e: any) => relevantUsers.some((u: any) => u.id === e.evaluatedId));
  const selfEvals = relevantEvals.filter((e: any) => e.type === 'self');
  const supervisorEvals = relevantEvals.filter((e: any) => e.type === 'supervisor');

  const mySelfEval = periodEvals.find((e: any) => e.type === 'self' && e.evaluatorId === currentUser.id);
  const myAssignments = periodAssignments.filter((a: any) => a.supervisorId === currentUser.id);
  const myCompletedEvals = periodEvals.filter((e: any) => e.type === 'supervisor' && e.evaluatorId === currentUser.id);
  const myPendingEvals = myAssignments.filter((a: any) => !myCompletedEvals.find((e: any) => e.evaluatedId === a.employeeId));

  const legalHierarchy = getLegalHierarchy();
  const adminHierarchy = getAdminHierarchy();
  const legalUsers = relevantUsers.filter((u: any) => legalHierarchy.includes(u.position)).sort((a: any, b: any) => {
    const pi = legalHierarchy.indexOf(a.position) - legalHierarchy.indexOf(b.position);
    return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
  });
  const adminUsersGroup = relevantUsers.filter((u: any) => adminHierarchy.includes(u.position)).sort((a: any, b: any) => {
    const pi = adminHierarchy.indexOf(a.position) - adminHierarchy.indexOf(b.position);
    return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
  });

  const totalEmployees = relevantUsers.length;
  const evaluatedCount = new Set(supervisorEvals.map((e: any) => e.evaluatedId)).size;
  const selfEvalCount = selfEvals.length;
  const avgScore = relevantEvals.length > 0
    ? Math.round(relevantEvals.reduce((s: number, e: any) => s + e.totalScore, 0) / relevantEvals.length)
    : null;

  const toggleCard = (card: string) => setExpandedCard(expandedCard === card ? null : card);

  const renderUserGroup = (groupUsers: any[], groupLabel: string) => {
    if (groupUsers.length === 0) return null;
    const hierarchy = groupLabel === 'LEGAL' ? legalHierarchy : adminHierarchy;
    const positions = [...new Set(groupUsers.map((u: any) => u.position))];
    positions.sort((a, b) => hierarchy.indexOf(a) - hierarchy.indexOf(b));
    return (
      <div className="mb-4">
        <h4 className="text-sm font-bold text-accent uppercase tracking-wide mb-2">{groupLabel}</h4>
        {positions.map(pos => {
          const posUsers = groupUsers.filter((u: any) => u.position === pos);
          return (
            <div key={pos} className="mb-3">
              <h5 className="text-xs font-semibold text-muted-foreground mb-1 px-2">{getPositionLabel(pos)} ({posUsers.length})</h5>
              <div className="space-y-1">
                {posUsers.map((u: any) => {
                  const hasSelfEval = periodEvals.some((e: any) => e.type === 'self' && e.evaluatorId === u.id);
                  const completedSup = periodEvals.filter((e: any) => e.type === 'supervisor' && e.evaluatedId === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                      <span className="font-medium">{u.name}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{hasSelfEval ? '✓ Auto' : '— Auto'}</span>
                        <span>{completedSup.length > 0 ? '✓ Eval' : '— Eval'}</span>
                        {completedSup.length > 0 && (
                          <span className="font-semibold text-foreground">
                            {Math.round(completedSup.reduce((s: number, e: any) => s + e.totalScore, 0) / completedSup.length)}%
                          </span>
                        )}
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

  const totalFromAnalytics = overview?.totalEmployees || 0;
  const completionRate = overview?.completionRate || 0;
  const avgFromAnalytics = overview?.avgOverallScore != null ? Math.round(overview.avgOverallScore) : null;
  const selfCompleted = overview?.selfEvalCompleted || 0;
  const supCompleted = overview?.supervisorEvalCompleted || 0;
  const feedbackCompleted = overview?.feedbackCompleted || 0;
  const selfEnd = overview?.selfEnd;
  const supervisorEnd = overview?.supervisorEnd;
  const feedbackEnd = overview?.feedbackEnd;
  const actionPlanEnd = overview?.actionPlanEnd;
  const selfDone = selfCompleted > 0;
  const supDone = supCompleted > 0;
  const fbDone = feedbackCompleted > 0;
  const planDone = (overview?.actionPlansCreated || 0) > 0;

  return (
    <DashboardErrorBoundary>
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Panel</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Periodo: {currentPeriod}{isPeriodTransition && <span className="ml-1 text-[hsl(var(--smps-warning))]">(mostrando datos de {analyticsPeriod})</span>}</p>
        </div>
        {notifCount?.unread > 0 && (
          <button onClick={() => navigate('/notifications')} className="flex items-center gap-1.5 text-sm text-accent hover:opacity-80 transition-[opacity]">
            <Bell className="h-4 w-4" />
            <span className="font-medium">{notifCount.unread}</span>
          </button>
        )}
      </div>

      {/* ─── Level Filter ─────────────────────────────────────────── */}
      {isAdminOrMore && (
        <div className="flex items-center gap-1 bg-card rounded-lg border p-1">
          {([
            { value: 'all', label: 'Todos' },
            { value: 'legal', label: 'Legal' },
            { value: 'administrativo', label: 'Administrativo' },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setSelectedLevel(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-[background-color,color] ${
                selectedLevel === opt.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Metrics Strip (replaces hero-metric cards) ─────────────── */}
      <div className="smps-surface-card">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          <div className="smps-accent-bar pl-4 py-1" style={{ '--bar-color': 'hsl(215 50% 50%)' } as React.CSSProperties}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Empleados</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{totalEmployees}</p>
          </div>
          <div className="smps-accent-bar pl-4 py-1" style={{ '--bar-color': 'hsl(var(--smps-success))' } as React.CSSProperties}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Autoevaluaciones</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{selfEvalCount}<span className="text-sm font-normal text-muted-foreground">/{totalEmployees}</span></p>
          </div>
          <div className="smps-accent-bar pl-4 py-1" style={{ '--bar-color': 'hsl(var(--accent))' } as React.CSSProperties}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Evaluados</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{evaluatedCount}<span className="text-sm font-normal text-muted-foreground">/{totalEmployees}</span></p>
          </div>
          <div className="smps-accent-bar pl-4 py-1" style={{ '--bar-color': 'hsl(var(--smps-gold))' } as React.CSSProperties}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Promedio</p>
            <p className="text-2xl font-bold tracking-tight mt-0.5">{avgScore !== null ? `${avgScore}%` : '—'}</p>
          </div>
        </div>
      </div>

      {/* ─── Expandable Toggles ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => toggleCard('employees')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-[background-color,color,box-shadow] ${expandedCard === 'employees' ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-card hover:bg-muted/50 text-foreground'}`}>
          <Users className="h-3.5 w-3.5" />
          Empleados ({totalEmployees})
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedCard === 'employees' ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => toggleCard('evaluated')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-[background-color,color,box-shadow] ${expandedCard === 'evaluated' ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-card hover:bg-muted/50 text-foreground'}`}>
          <CheckCircle className="h-3.5 w-3.5" />
          Evaluados ({evaluatedCount})
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedCard === 'evaluated' ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => toggleCard('progress')} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-[background-color,color,box-shadow] ${expandedCard === 'progress' ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-card hover:bg-muted/50 text-foreground'}`}>
          <Target className="h-3.5 w-3.5" />
          Progreso
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedCard === 'progress' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ─── Employee List ─────────────────────────────────────────── */}
      {expandedCard === 'employees' && (
        <div className="smps-surface-elevated smps-fade-in">
          <h3 className="text-base font-semibold mb-4">Listado por Nivel ({totalEmployees})</h3>
          {renderUserGroup(legalUsers, 'LEGAL')}
          {renderUserGroup(adminUsersGroup, 'ADMINISTRATIVO')}
        </div>
      )}

      {expandedCard === 'evaluated' && (
        <div className="smps-surface-elevated smps-fade-in">
          <h3 className="text-base font-semibold mb-2">Evaluados — {currentPeriod}</h3>
          {relevantEvals.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay evaluaciones completadas.</p>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">Promedio total: {avgScore}%</p>
          )}
        </div>
      )}

      {expandedCard === 'progress' && (
        <div className="smps-surface-elevated smps-fade-in">
          <h3 className="text-base font-semibold mb-4">Progreso por Posición</h3>
          {getPositionHierarchy().map(pos => {
            const posUsers = relevantUsers.filter((u: any) => u.position === pos);
            if (posUsers.length === 0) return null;
            const selfDone = posUsers.filter((u: any) => periodEvals.some((e: any) => e.type === 'self' && e.evaluatorId === u.id)).length;
            const selfPct = Math.round((selfDone / posUsers.length) * 100);
            return (
              <div key={pos} className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{getPositionLabel(pos)} ({posUsers.length})</h4>
                <p className="text-xs text-muted-foreground mb-1">Autoevaluaciones: {selfDone}/{posUsers.length}</p>
                <div className="smps-progress-bar">
                  <div className="fill" style={{ width: `${selfPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── My Status + Pending (flat surface, no card) ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="smps-surface-card">
          <p className="smps-section-title">Mi Autoevaluación</p>
          {mySelfEval ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--smps-success))]" />
              <div>
                <p className="text-sm font-medium">Completada</p>
                <p className="text-xs text-muted-foreground">Calificación: {mySelfEval.totalScore}%</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">No has completado tu autoevaluación para este periodo.</p>
              <button onClick={() => navigate('/self-evaluation')}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-[opacity]">
                Iniciar Autoevaluación
              </button>
            </div>
          )}
        </div>

        <div className="smps-surface-card">
          <p className="smps-section-title">Evaluaciones Pendientes</p>
          {myPendingEvals.length === 0 ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--smps-success))]" />
              <p className="text-sm">No tienes evaluaciones pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myPendingEvals.map((a: any) => {
                const emp = allUsers.find((u: any) => u.id === a.employeeId);
                return (
                  <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{emp?.name} <span className="text-xs font-normal text-muted-foreground">— {emp ? getPositionLabel(emp.position) : ''}</span></p>
                    <button onClick={() => navigate(`/evaluations?evaluate=${a.employeeId}`)}
                      className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-[opacity]">
                      Evaluar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Phase Progress (flat surface) ─────────────────────────── */}
      <div className="smps-surface-flat">
        <div className="flex items-center justify-between mb-3">
          <p className="smps-section-title mb-0">Fases del Periodo</p>
          <span className="text-xs text-muted-foreground">{currentPeriod}</span>
        </div>
        <div className="flex items-stretch gap-1">
          {PHASES.map((p, i) => {
            const status = phaseStatus(p.key, selfDone, supDone, fbDone, planDone);
            const isDone = status === 'done';
            const isCurrent = status === 'current';
            return (
              <div key={p.key} className={`flex-1 rounded-lg px-3 py-2.5 text-center transition-[background-color,color] ${
                isDone ? 'bg-[hsl(var(--smps-success)/0.08)]' :
                isCurrent ? 'bg-[hsl(var(--smps-warning)/0.1)] ring-1 ring-[hsl(var(--smps-warning)/0.3)]' :
                'bg-muted/30'
              }`}>
                <div className={`text-base font-bold ${isDone ? 'text-[hsl(var(--smps-success))]' : isCurrent ? 'text-[hsl(var(--smps-warning))]' : 'text-muted-foreground/50'}`}>
                  {isDone ? '✓' : isCurrent ? '→' : '—'}
                </div>
                <div className={`text-[11px] font-medium mt-0.5 ${isDone ? 'text-[hsl(var(--smps-success))]' : isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {p.short}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Score Breakdown (flat surface) ─────────────────────────── */}
      {evalAnalytics && evalAnalytics.byType && (evalAnalytics.byType.self || evalAnalytics.byType.supervisor) && (
        <div className="smps-surface-flat">
          <p className="smps-section-title">Calificaciones</p>
          <div className="space-y-3">
            {evalAnalytics.byType.self && (() => {
              const score = evalAnalytics.byType.self.avgScore ? Math.round(evalAnalytics.byType.self.avgScore) : 0;
              return (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">Autoevaluación</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-[hsl(var(--smps-success))] transition-[width] duration-700 ease-out" style={{ width: `${score}%` }} />
                  </div>
                  <ScoreBadge value={score} size="md" />
                </div>
              );
            })()}
            {evalAnalytics.byType.supervisor && (() => {
              const score = evalAnalytics.byType.supervisor.avgScore ? Math.round(evalAnalytics.byType.supervisor.avgScore) : 0;
              return (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">Supervisor</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-[hsl(var(--accent))] transition-[width] duration-700 ease-out" style={{ width: `${score}%` }} />
                  </div>
                  <ScoreBadge value={score} size="md" />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
    </DashboardErrorBoundary>
  );
}
