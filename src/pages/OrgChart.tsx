import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useSystemModules, useSystemStatus, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { getPositionLabel } from '@/lib/evaluationConfig';
import { CURRENT_PERIOD, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import HierarchyFilters, { filterByHierarchy } from '@/components/HierarchyFilters';

export default function OrgChart() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: assignments = [] } = useAssignments(CURRENT_PERIOD);
  const [levelFilter, setLevelFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');

  if (!currentUser) return null;
  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isManagingPartner = !!currentUser.isManagingPartner;
  if (!isAdmin && !isSocio && !currentUser.isSuperUser && !isManagingPartner) return <p className="text-center py-12 text-muted-foreground">Acceso restringido.</p>;

  const periodAssignments = (Array.isArray(assignments) ? assignments : []).filter(a => a.period === CURRENT_PERIOD);
  const activeUsers = (Array.isArray(users) ? users : []).filter(u => u.isActive && !u.isSuperUser).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const supervisors = [...new Set(periodAssignments.map(a => a.supervisorId))];

  const filteredSupervisors = filterByHierarchy(
    activeUsers.filter(u => supervisors.includes(u.id)),
    levelFilter,
    positionFilter
  );

  const renderGroup = (hierarchy: string[], groupLabel: string) => {
    const groupSups = filteredSupervisors.filter(u => hierarchy.includes(u.position));
    if (groupSups.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="font-display text-lg font-bold text-accent uppercase tracking-wide mb-3">{groupLabel}</h2>
        <div className="space-y-4">
          {hierarchy.map(pos => {
            const posSups = groupSups.filter(u => u.position === pos);
            if (posSups.length === 0) return null;
            return (
              <div key={pos}>
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{getPositionLabel(pos)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posSups.map(sup => {
                    const teamAssignments = periodAssignments.filter(a => a.supervisorId === sup.id);
                    const teamMembers = teamAssignments.map(a => activeUsers.find(u => u.id === a.employeeId)).filter(Boolean);
                    return <OrgCard key={sup.id} supervisor={sup} teamMembers={teamMembers as typeof activeUsers} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Mapa de Evaluaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">Periodo: {CURRENT_PERIOD} · Vista descendente por asignación</p>
        </div>
        <HierarchyFilters levelFilter={levelFilter} setLevelFilter={setLevelFilter} positionFilter={positionFilter} setPositionFilter={setPositionFilter} />
      </div>
      {renderGroup(getLegalHierarchy(), 'LEGAL')}
      {renderGroup(getAdminHierarchy(), 'ADMINISTRATIVO')}
    </div>
  );
}

function OrgCard({ supervisor, teamMembers }: { supervisor: any; teamMembers: any[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{supervisor.name}</p>
            <p className="text-xs text-muted-foreground">{getPositionLabel(supervisor.position)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="smps-badge bg-accent/10 text-accent">{teamMembers.length}</span>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && teamMembers.length > 0 && (
        <div className="border-t px-4 py-3 space-y-1.5">
          {teamMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-sm">
              <span>{member.name}</span>
              <span className="text-xs text-muted-foreground">{getPositionLabel(member.position)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
