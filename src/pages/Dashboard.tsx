import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useSystemModules, useSystemStatus, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { CURRENT_PERIOD } from '@/types';
import { POSITION_LABELS, CURRENT_PERIOD, Position, LEGAL_HIERARCHY, ADMIN_HIERARCHY, POSITION_HIERARCHY } from '@/types';
import { Users, CheckCircle, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations({ period: CURRENT_PERIOD });
  const { data: assignments = [] } = useAssignments(CURRENT_PERIOD);
  const navigate = useNavigate();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  if (!currentUser) return null;
  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrSocio = isAdmin || isSocio;

  const periodAssignments = assignments.filter(a => a.period === CURRENT_PERIOD);
  const periodEvals = evaluations.filter(e => e.period === CURRENT_PERIOD);

  const myTeamIds = isAdminOrSocio
    ? null
    : periodAssignments.filter(a => a.supervisorId === currentUser.id).map(a => a.employeeId);

  const getRelevantUsers = () => {
    let base = users.filter(u => u.isActive && !u.isSuperUser);
    if (myTeamIds) {
      base = base.filter(u => myTeamIds.includes(u.id) || u.id === currentUser.id);
    }
    if (selectedLevel !== 'all' && isAdminOrSocio) {
      if (selectedLevel === 'legal') base = base.filter(u => LEGAL_HIERARCHY.includes(u.position));
      else if (selectedLevel === 'administrativo') base = base.filter(u => ADMIN_HIERARCHY.includes(u.position));
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

  const mySelfEval = periodEvals.find(e => e.type === 'self' && e.evaluatorId === currentUser.id);
  const myAssignments = periodAssignments.filter(a => a.supervisorId === currentUser.id);
  const myCompletedEvals = periodEvals.filter(e => e.type === 'supervisor' && e.evaluatorId === currentUser.id);
  const myPendingEvals = myAssignments.filter(a => !myCompletedEvals.find(e => e.evaluatedId === a.employeeId));

  const toggleCard = (card: string) => setExpandedCard(expandedCard === card ? null : card);

  // Group users by LEGAL / ADMINISTRATIVO
  const legalUsers = relevantUsers.filter(u => LEGAL_HIERARCHY.includes(u.position)).sort((a, b) => {
    const pi = LEGAL_HIERARCHY.indexOf(a.position) - LEGAL_HIERARCHY.indexOf(b.position);
    return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
  });
  const adminUsersGroup = relevantUsers.filter(u => ADMIN_HIERARCHY.includes(u.position)).sort((a, b) => {
    const pi = ADMIN_HIERARCHY.indexOf(a.position) - ADMIN_HIERARCHY.indexOf(b.position);
    return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
  });

  const avgScore = relevantEvals.length > 0
    ? Math.round(relevantEvals.reduce((s, e) => s + e.totalScore, 0) / relevantEvals.length)
    : null;

  const renderUserGroup = (groupUsers: typeof relevantUsers, groupLabel: string) => {
    if (groupUsers.length === 0) return null;
    const positions = [...new Set(groupUsers.map(u => u.position))];
    return (
      <div className="mb-4">
        <h4 className="text-sm font-bold text-accent uppercase tracking-wide mb-2">{groupLabel}</h4>
        {positions.map(pos => {
          const posUsers = groupUsers.filter(u => u.position === pos);
          return (
            <div key={pos} className="mb-3">
              <h5 className="text-xs font-semibold text-muted-foreground mb-1 px-2">{POSITION_LABELS[pos]} ({posUsers.length})</h5>
              <div className="space-y-1">
                {posUsers.map(u => {
                  const hasSelfEval = periodEvals.some(e => e.type === 'self' && e.evaluatorId === u.id);
                  const userAssigns = periodAssignments.filter(a => a.employeeId === u.id);
                  const completedSup = periodEvals.filter(e => e.type === 'supervisor' && e.evaluatedId === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                      <span className="font-medium">{u.name}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className={hasSelfEval ? 'text-smps-success' : 'text-smps-warning'}>
                          Auto: {hasSelfEval ? '✓' : 'Pendiente'}
                        </span>
                        <span className="text-muted-foreground">Eval. recibidas: {completedSup.length}/{userAssigns.length}</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isAdmin ? 'Panel Administrativo' : 'Mi Panel'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Periodo: {CURRENT_PERIOD} · Bienvenido, {currentUser.name}
          </p>
        </div>
        {isAdminOrSocio && (
          <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}
            className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="all">Todo el Despacho</option>
            <option value="legal">Legal</option>
            <option value="administrativo">Administrativo</option>
            {POSITION_HIERARCHY.map(p => (
              <option key={p} value={p}>{POSITION_LABELS[p]}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="smps-stat-card" onClick={() => toggleCard('employees')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total de Empleados</p>
              <p className="text-3xl font-bold font-display text-foreground mt-1">{totalEmployees}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground mt-2 transition-transform ${expandedCard === 'employees' ? 'rotate-180' : ''}`} />
        </div>

        <div className="smps-stat-card" onClick={() => toggleCard('evaluated')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Evaluados</p>
              <p className="text-3xl font-bold font-display text-foreground mt-1">{evaluatedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-smps-success/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-smps-success" />
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground mt-2 transition-transform ${expandedCard === 'evaluated' ? 'rotate-180' : ''}`} />
        </div>

        <div className="smps-stat-card" onClick={() => toggleCard('progress')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">En Progreso</p>
              <p className="text-3xl font-bold font-display text-foreground mt-1">{totalEmployees > 0 ? Math.round((selfEvalCount / totalEmployees) * 100) : 0}%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-smps-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-smps-warning" />
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground mt-2 transition-transform ${expandedCard === 'progress' ? 'rotate-180' : ''}`} />
        </div>

        <div className="smps-stat-card">
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

      {expandedCard === 'employees' && (
        <div className="bg-card rounded-xl border p-6 animate-fade-in">
          <h3 className="font-display text-lg font-semibold mb-4">Listado por Nivel ({totalEmployees})</h3>
          {renderUserGroup(legalUsers, 'LEGAL')}
          {renderUserGroup(adminUsersGroup, 'ADMINISTRATIVO')}
        </div>
      )}

      {expandedCard === 'evaluated' && (
        <div className="bg-card rounded-xl border p-6 animate-fade-in">
          <h3 className="font-display text-lg font-semibold mb-2">Evaluados - {CURRENT_PERIOD}</h3>
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
          {POSITION_HIERARCHY.map(pos => {
            const posUsers = relevantUsers.filter(u => u.position === pos);
            if (posUsers.length === 0) return null;
            const selfDone = posUsers.filter(u => periodEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length;
            const selfPct = Math.round((selfDone / posUsers.length) * 100);
            return (
              <div key={pos} className="mb-3">
                <h4 className="text-sm font-semibold mb-1">{POSITION_LABELS[pos]} ({posUsers.length})</h4>
                <p className="text-xs text-muted-foreground mb-1">Autoevaluaciones: {selfDone}/{posUsers.length}</p>
                <div className="smps-progress-bar"><div className="fill" style={{ width: `${selfPct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-display text-lg font-semibold mb-3">Mi Autoevaluación</h3>
          {mySelfEval ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-smps-success" />
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
              <CheckCircle className="h-5 w-5 text-smps-success" />
              <p className="text-sm">No tienes evaluaciones pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myPendingEvals.map(a => {
                const emp = users.find(u => u.id === a.employeeId);
                return (
                  <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{emp?.name} <span className="text-xs font-normal text-muted-foreground">— {emp ? POSITION_LABELS[emp.position] : ''}</span></p>
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
    </div>
  );
}
