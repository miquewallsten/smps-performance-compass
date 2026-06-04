import * as React from "react";
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useAnalyticsOverview, useAnalyticsEvaluations, useUnreadNotificationCount, usePeriods } from '@/api/queries';
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

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const currentPeriod = useCurrentPeriod();
  const { data: periodsData = [] } = usePeriods();
  const displayPeriod = useDisplayPeriod();

  // Analytics: use display period (most recent with data)
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(displayPeriod);
  const hasCurrentData = overview && (overview.selfEvalCompleted > 0 || overview.supervisorEvalCompleted > 0);
  const analyticsPeriod = displayPeriod;
  const isPeriodTransition = displayPeriod !== currentPeriod;
  const { data: evalAnalytics, isLoading: evalLoading } = useAnalyticsEvaluations(analyticsPeriod);
  const { data: pendingActions, isLoading: actionsLoading } = usePendingActions(currentPeriod);
  const { data: notifCount } = useUnreadNotificationCount();

  // Raw data for per-employee table (original behavior)
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

  // ── Period data for per-employee table ──
  const periodAssignments = allAssignments.filter((a: any) => a.period === currentPeriod);
  const periodEvals = allEvaluations.filter((e: any) => e.period === currentPeriod);

  // Visibility filtering
  const myTeamIds = isAdminOrMore
    ? null
    : periodAssignments.filter((a: any) => a.supervisorId === currentUser.id).map((a: any) => a.employeeId);

  const getRelevantUsers = () => {
    let base = allUsers.filter((u: any) => u.isActive && !u.isSuperUser);
    // Apply visibility rules
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

  // My evaluation status
  const mySelfEval = periodEvals.find((e: any) => e.type === 'self' && e.evaluatorId === currentUser.id);
  const myAssignments = periodAssignments.filter((a: any) => a.supervisorId === currentUser.id);
  const myCompletedEvals = periodEvals.filter((e: any) => e.type === 'supervisor' && e.evaluatorId === currentUser.id);
  const myPendingEvals = myAssignments.filter((a: any) => !myCompletedEvals.find((e: any) => e.evaluatedId === a.employeeId));

  // Group users by LEGAL / ADMINISTRATIVO
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
    // Sort positions by hierarchy rank
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
                  const userAssigns = periodAssignments.filter((a: any) => a.employeeId === u.id);
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

  // ── Analytics data ──
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

      {/* ─── Level Filter ─────────────────────────────────────────── */}
      {isAdminOrMore && (
        <div className="flex items-center gap-1 bg-card rounded-lg border p-1">
          {([
            { value: 'all', label: 'Todos' },
            { value: 'legal', label: 'Legal' },
            { value: 'administrativo', label: 'Administrativo' },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setSelectedLevel(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                selectedLevel === opt.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="smps-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Empleados</p>
              <p className="text-3xl font-bold font-display text-foreground mt-1">{totalEmployees}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="smps-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Autoevaluaciones</p>
              <p className="text-3xl font-bold font-display text-foreground mt-1">{selfEvalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>

        <div className="smps-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Evaluados</p>
              <p className="text-3xl font-bold font-display text-foreground mt-1">{evaluatedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="smps-stat-card" onClick={() => toggleCard('avg')} style={{ cursor: 'pointer' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Promedio General</p>
              <p className="text-3xl font-bold font-display text-foreground mt-1">{avgScore !== null ? `${avgScore}%` : '—'}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Expandable Cards ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => toggleCard('employees')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${expandedCard === 'employees' ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-muted/50'}`}>
          <Users className="h-4 w-4" />
          Empleados ({totalEmployees})
          <ChevronDown className={`h-4 w-4 transition-transform ${expandedCard === 'employees' ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => toggleCard('evaluated')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${expandedCard === 'evaluated' ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-muted/50'}`}>
          <CheckCircle className="h-4 w-4" />
          Evaluados ({evaluatedCount})
          <ChevronDown className={`h-4 w-4 transition-transform ${expandedCard === 'evaluated' ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={() => toggleCard('progress')} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${expandedCard === 'progress' ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-muted/50'}`}>
          <Target className="h-4 w-4" />
          Progreso
          <ChevronDown className={`h-4 w-4 transition-transform ${expandedCard === 'progress' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ─── Employee List ─────────────────────────────────────────── */}
      {expandedCard === 'employees' && (
        <div className="bg-card rounded-xl border p-6 animate-fade-in">
          <h3 className="font-display text-lg font-semibold mb-4">Listado por Nivel ({totalEmployees})</h3>
          {renderUserGroup(legalUsers, 'LEGAL')}
          {renderUserGroup(adminUsersGroup, 'ADMINISTRATIVO')}
        </div>
      )}

      {expandedCard === 'evaluated' && (
        <div className="bg-card rounded-xl border p-6 animate-fade-in">
          <h3 className="font-display text-lg font-semibold mb-2">Evaluados - {currentPeriod}</h3>
          {relevantEvals.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay evaluaciones completadas.</p>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">Promedio total: {avgScore}%</p>
          )}
        </div>
      )}

      {expandedCard === 'progress' && (
        <div className="bg-card rounded-xl border p-6 animate-fade-in">
          <h3 className="font-display text-lg font-semibold mb-4">Progreso por Posición</h3>
          {getPositionHierarchy().map(pos => {
            const posUsers = relevantUsers.filter((u: any) => u.position === pos);
            if (posUsers.length === 0) return null;
            const selfDone = posUsers.filter((u: any) => periodEvals.some((e: any) => e.type === 'self' && e.evaluatorId === u.id)).length;
            const selfPct = Math.round((selfDone / posUsers.length) * 100);
            return (
              <div key={pos} className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{getPositionLabel(pos)} ({posUsers.length})</h4>
                <p className="text-xs text-muted-foreground mb-1">Autoevaluaciones: {selfDone}/{posUsers.length}</p>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-[width] duration-700 ease-out" style={{ width: `${selfPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── My Autoevaluación + Pending Evals ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-display text-lg font-semibold mb-3">Mi Autoevaluación</h3>
          {mySelfEval ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completada</p>
                <p className="text-xs text-muted-foreground">Calificación: {mySelfEval.totalScore}%</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">No has completado tu autoevaluación para este periodo.</p>
              <button onClick={() => navigate('/self-evaluation')}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                Iniciar Autoevaluación
              </button>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-display text-lg font-semibold mb-3">Evaluaciones Pendientes</h3>
          {myPendingEvals.length === 0 ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
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
                      className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                      Evaluar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Phase Progress ────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Fases del Periodo</p>
          <span className="text-[10px] text-muted-foreground">{currentPeriod}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PHASES.map(p => {
            const status = phaseStatus(p.key, selfDone, supDone, fbDone, planDone);
            const config = {
              done: { bg: 'bg-green-500/10', text: 'text-green-600', label: '✓' },
              current: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: '→' },
              upcoming: { bg: 'bg-muted/30', text: 'text-muted-foreground', label: '—' },
            }[status];
            return (
              <div key={p.key} className={`rounded-md p-3 ${config.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${config.text}`}>{config.label}</span>
                  <span className="text-xs font-medium">{p.short}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Evaluation Score Breakdown ─────────────────────────────── */}
      {evalAnalytics && evalAnalytics.byType && (evalAnalytics.byType.self || evalAnalytics.byType.supervisor) && (
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
  );
}
