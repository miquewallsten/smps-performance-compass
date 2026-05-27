import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useSystemModules, useSystemStatus, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
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
  const isAdminOrSocio = isAdmin || isSocio || !!currentUser.isManagingPartner;

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
      <div className="mb-3">
        <h4 className="text-xs font-bold text-accent uppercase tracking-widest mb-2">{groupLabel}</h4>
        {positions.map(pos => {
          const posUsers = groupUsers.filter(u => u.position === pos);
          return (
            <div key={pos} className="mb-2">
              <h5 className="text-[11px] font-semibold text-muted-foreground mb-1">{POSITION_LABELS[pos]} ({posUsers.length})</h5>
              <div className="space-y-0.5">
                {posUsers.map(u => {
                  const hasSelfEval = periodEvals.some(e => e.type === 'self' && e.evaluatorId === u.id);
                  const userAssigns = periodAssignments.filter(a => a.employeeId === u.id);
                  const completedSup = periodEvals.filter(e => e.type === 'supervisor' && e.evaluatedId === u.id);
                  return (
                    <div key={u.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/40 text-sm hover:bg-muted/60 transition-colors">
                      <span className="font-medium">{u.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {hasSelfEval && <CheckCircle className="h-3.5 w-3.5 text-smps-success" />}
                        <span>{completedSup.length}/{userAssigns.length}</span>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Panel Principal</h1>
          <p className="text-xs text-muted-foreground">Periodo: {CURRENT_PERIOD}</p>
        </div>
        {isAdminOrSocio && (
          <div className="flex items-center gap-1 bg-card rounded-md border p-0.5">
            {([
              { value: 'all', label: 'Todos' },
              { value: 'legal', label: 'Legal' },
              { value: 'administrativo', label: 'Administrativo' },
            ] as const).map(opt => (
              <button key={opt.value} onClick={() => setSelectedLevel(opt.value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 ${
                  selectedLevel === opt.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => toggleCard('employees')} className="smps-stat-card smps-fade-up smps-delay-1 text-left group">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedCard === 'employees' ? 'rotate-180' : ''}`} />
          </div>
          <p className="smps-stat-value">{totalEmployees}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Empleados</p>
        </button>

        <button onClick={() => toggleCard('evaluated')} className="smps-stat-card smps-fade-up smps-delay-2 text-left group">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-4 w-4 text-smps-success" />
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedCard === 'evaluated' ? 'rotate-180' : ''}`} />
          </div>
          <p className="smps-stat-value">{evaluatedCount}<span className="text-sm font-normal text-muted-foreground">/{totalEmployees}</span></p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Evaluados</p>
        </button>

        <button onClick={() => toggleCard('progress')} className="smps-stat-card smps-fade-up smps-delay-3 text-left group">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedCard === 'progress' ? 'rotate-180' : ''}`} />
          </div>
          <p className="smps-stat-value">{selfEvalCount}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Autoevaluaciones</p>
        </button>

        <div className="smps-stat-card smps-fade-up smps-delay-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <p className="smps-stat-value">{avgScore !== null ? `${avgScore}%` : '—'}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Promedio</p>
        </div>
      </div>

      {expandedCard === 'employees' && (
        <div className="smps-surface-card smps-fade-in">
          <p className="smps-section-title">Listado por Nivel ({totalEmployees})</p>
          {renderUserGroup(legalUsers, 'Legal')}
          {renderUserGroup(adminUsersGroup, 'Administrativo')}
        </div>
      )}

      {expandedCard === 'evaluated' && (
        <div className="smps-surface-card smps-fade-in">
          <p className="smps-section-title">Evaluados — {CURRENT_PERIOD}</p>
          {relevantEvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay evaluaciones completadas.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Promedio total: {avgScore}%</p>
          )}
        </div>
      )}

      {expandedCard === 'progress' && (
        <div className="smps-surface-card smps-fade-in">
          <p className="smps-section-title">Progreso por Posición</p>
          {POSITION_HIERARCHY.map(pos => {
            const posUsers = relevantUsers.filter(u => u.position === pos);
            if (posUsers.length === 0) return null;
            const selfDone = posUsers.filter(u => periodEvals.some(e => e.type === 'self' && e.evaluatorId === u.id)).length;
            const selfPct = Math.round((selfDone / posUsers.length) * 100);
            return (
              <div key={pos} className="mb-3">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium">{POSITION_LABELS[pos]}</span>
                  <span className="text-xs text-muted-foreground">{selfDone}/{posUsers.length}</span>
                </div>
                <div className="smps-progress-bar"><div className="fill" style={{ width: `${selfPct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="smps-surface-elevated">
          <p className="smps-section-title">Mi Autoevaluación</p>
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
                className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98]">
                Iniciar Autoevaluación
              </button>
            </div>
          )}
        </div>

        <div className="smps-surface-elevated">
          <p className="smps-section-title">Evaluaciones Pendientes</p>
          {myPendingEvals.length === 0 ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-smps-success" />
              <p className="text-sm">No tienes evaluaciones pendientes</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {myPendingEvals.map(a => {
                const emp = users.find(u => u.id === a.employeeId);
                return (
                  <div key={a.id} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
                    <p className="text-sm">{emp?.name} <span className="text-xs text-muted-foreground">— {emp ? POSITION_LABELS[emp.position] : ''}</span></p>
                    <button onClick={() => navigate(`/evaluations?evaluate=${a.employeeId}`)}
                      className="px-3 py-1 rounded-md bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98]">
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
