import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useAssignments, useCreateAssignment, useDeleteAssignment, useEvaluations } from '@/api/queries';
import { POSITION_LABELS, Position } from '@/types';
import { CURRENT_PERIOD, PERIODS, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { Plus, X, AlertTriangle } from 'lucide-react';
import HierarchyFilters, { filterByHierarchy } from '@/components/HierarchyFilters';

export default function AssignSupervisors() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: assignments = [] } = useAssignments();
  const addAssignment = useCreateAssignment().mutate;
  const removeAssignment = useDeleteAssignment().mutate;
  const { data: evaluations = [] } = useEvaluations();
  const [selectedPeriod, setSelectedPeriod] = useState(CURRENT_PERIOD);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Filters for employee list
  const [empLevelFilter, setEmpLevelFilter] = useState('all');
  const [empPosFilter, setEmpPosFilter] = useState('all');

  // Filters for evaluator assignment
  const [evalLevelFilter, setEvalLevelFilter] = useState('all');
  const [evalPosFilter, setEvalPosFilter] = useState('all');

  // Filters for history
  const [histLevelFilter, setHistLevelFilter] = useState('all');
  const [histPosFilter, setHistPosFilter] = useState('all');

  if (!currentUser) return null;
  const isAdmin = currentUser.isAdmin;
  if (!isAdmin && !currentUser.isSuperUser) return <p className="text-center py-12 text-muted-foreground">Acceso restringido al administrador.</p>;

  const activeUsers = users.filter(u => u.isActive && !u.isSuperUser && !u.isDummy);
  const periodAssignments = assignments.filter(a => a.period === selectedPeriod);
  const periodEvals = evaluations.filter(e => e.period === selectedPeriod);

  const unassignedUsers = activeUsers.filter(u => !periodAssignments.some(a => a.employeeId === u.id));

  const filteredEmployees = filterByHierarchy(activeUsers, empLevelFilter, empPosFilter);

  const selectedEmp = users.find(u => u.id === selectedEmployee);
  const empAssignments = selectedEmployee ? periodAssignments.filter(a => a.employeeId === selectedEmployee) : [];

  const addEvaluator = (evaluatorId: string) => {
    if (!selectedEmployee) return;
    if (empAssignments.some(a => a.supervisorId === evaluatorId)) return;
    addAssignment({
      id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      employeeId: selectedEmployee,
      supervisorId: evaluatorId,
      period: selectedPeriod,
    });
  };

  const getEligibleEvaluators = (employeeId: string) => {
    const eligible = activeUsers.filter(u => u.id !== employeeId && !empAssignments.some(a => a.supervisorId === u.id));
    return filterByHierarchy(eligible, evalLevelFilter, evalPosFilter);
  };

  const renderHierarchyList = (hierarchy: typeof getLegalHierarchy, label: string) => {
    const groupUsers = filteredEmployees.filter(u => hierarchy.includes(u.position)).sort((a, b) => {
      const pi = hierarchy.indexOf(a.position) - hierarchy.indexOf(b.position);
      return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
    });
    if (groupUsers.length === 0) return null;

    return (
      <div className="mb-4">
        <p className="text-xs font-bold text-accent uppercase tracking-wide mb-2 px-2">{label}</p>
        {hierarchy.map(pos => {
          const posUsers = groupUsers.filter(u => u.position === pos);
          if (posUsers.length === 0) return null;
          return (
            <div key={pos} className="mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 px-2">{getPositionLabel(pos)}</p>
              {posUsers.map(u => {
                const assignCount = periodAssignments.filter(a => a.employeeId === u.id).length;
                return (
                  <button key={u.id} onClick={() => setSelectedEmployee(u.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedEmployee === u.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs ml-2 opacity-70">{assignCount} eval.</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // History section: filtered evaluations
  const histFilteredUsers = filterByHierarchy(activeUsers, histLevelFilter, histPosFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Asignar Evaluadores</h1>
          <p className="text-muted-foreground text-sm mt-1">Asigne evaluadores para cada colaborador</p>
        </div>
        <select value={selectedPeriod} onChange={e => { setSelectedPeriod(e.target.value); setSelectedEmployee(null); }}
          className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3">Seleccionar Empleado</h3>
          <HierarchyFilters levelFilter={empLevelFilter} setLevelFilter={setEmpLevelFilter} positionFilter={empPosFilter} setPositionFilter={setEmpPosFilter} className="mb-3" />
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {renderHierarchyList(getLegalHierarchy, 'LEGAL')}
            {renderHierarchyList(getAdminHierarchy, 'ADMINISTRATIVO')}

            {unassignedUsers.length > 0 && empLevelFilter === 'all' && empPosFilter === 'all' && (
              <div className="mb-3 mt-4 border-t pt-3">
                <p className="text-xs font-semibold text-smps-warning uppercase tracking-wide mb-1 px-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Sin Evaluador Asignado
                </p>
                {unassignedUsers.map(u => (
                  <button key={u.id} onClick={() => setSelectedEmployee(u.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedEmployee === u.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs ml-2 text-smps-warning">0 eval.</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedEmp ? (
            <div className="space-y-6">
              <div className="smps-surface-elevated">
                <h3 className="font-display text-lg font-semibold mb-1">{selectedEmp.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{getPositionLabel(selectedEmp.position)}</p>

                <h4 className="text-sm font-semibold mb-2">Personal asignado ({empAssignments.length})</h4>
                {empAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin evaluadores asignados</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {empAssignments.map(a => {
                      const sup = users.find(u => u.id === a.supervisorId);
                      if (!sup) return null;
                      return (
                        <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                          <div>
                            <span className="text-sm font-medium">{sup.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{getPositionLabel(sup.position)}</span>
                          </div>
                          <button onClick={() => removeAssignment(a.id)} className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <h4 className="text-sm font-semibold mb-2 mt-4">Agregar a evaluado</h4>
                <HierarchyFilters levelFilter={evalLevelFilter} setLevelFilter={setEvalLevelFilter} positionFilter={evalPosFilter} setPositionFilter={setEvalPosFilter} className="mb-3" />
                {(() => {
                  const eligible = getEligibleEvaluators(selectedEmp.id);
                  if (eligible.length === 0) return <p className="text-sm text-muted-foreground">No hay evaluadores disponibles con los filtros seleccionados.</p>;
                  return [
                    { hierarchy: getLegalHierarchy, label: 'LEGAL' },
                    { hierarchy: getAdminHierarchy, label: 'ADMINISTRATIVO' },
                  ].map(({ hierarchy, label }) => {
                    const groupEligible = eligible.filter(u => hierarchy.includes(u.position));
                    if (groupEligible.length === 0) return null;
                    return (
                      <div key={label} className="mb-3">
                        <p className="text-xs font-bold text-accent uppercase tracking-wide mb-1">{label}</p>
                        {hierarchy.map(pos => {
                          const posEligible = groupEligible.filter(u => u.position === pos);
                          if (posEligible.length === 0) return null;
                          return (
                            <div key={pos} className="mb-1">
                              <p className="text-xs text-muted-foreground mb-1">{getPositionLabel(pos)}</p>
                              <div className="flex flex-wrap gap-2">
                                {posEligible.sort((a, b) => a.name.localeCompare(b.name, 'es')).map(u => (
                                  <button key={u.id} onClick={() => addEvaluator(u.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                                    <Plus className="h-3 w-3" /> {u.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="smps-surface-elevated">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Historial de Evaluaciones - {selectedPeriod}</h4>
                  <HierarchyFilters levelFilter={histLevelFilter} setLevelFilter={setHistLevelFilter} positionFilter={histPosFilter} setPositionFilter={setHistPosFilter} />
                </div>
                {(() => {
                  const receivedEvals = periodEvals.filter(e => e.evaluatedId === selectedEmployee && e.type === 'supervisor');
                  const givenEvals = periodEvals.filter(e => e.evaluatorId === selectedEmployee && e.type === 'supervisor');
                  const filteredReceived = receivedEvals.filter(e => {
                    const evaluator = users.find(u => u.id === e.evaluatorId);
                    return evaluator ? filterByHierarchy([evaluator], histLevelFilter, histPosFilter).length > 0 : false;
                  });
                  const filteredGiven = givenEvals.filter(e => {
                    const evaluated = users.find(u => u.id === e.evaluatedId);
                    return evaluated ? filterByHierarchy([evaluated], histLevelFilter, histPosFilter).length > 0 : false;
                  });
                  return (
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Evaluado por:</p>
                        {filteredReceived.length === 0 ? <p className="text-muted-foreground">Sin evaluaciones recibidas</p> : (
                          filteredReceived.map(e => {
                            const evaluator = users.find(u => u.id === e.evaluatorId);
                            return <p key={e.id} className="py-1">{evaluator?.name} — {Math.round(e.totalScore)}%</p>;
                          })
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ha evaluado a:</p>
                        {filteredGiven.length === 0 ? <p className="text-muted-foreground">Sin evaluaciones realizadas</p> : (
                          filteredGiven.map(e => {
                            const evaluated = users.find(u => u.id === e.evaluatedId);
                            return <p key={e.id} className="py-1">{evaluated?.name} — {Math.round(e.totalScore)}%</p>;
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Seleccione un empleado para ver y asignar evaluadores</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
