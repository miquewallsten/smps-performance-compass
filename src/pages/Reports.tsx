import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useActionPlans } from '@/api/queries';
import { POSITION_LABELS, POSITION_LEVELS } from '@/types';
import { CURRENT_PERIOD, getPositionHierarchy, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { canViewUserEvaluations } from '@/lib/visibility';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type AreaFilter = 'all' | 'legal' | 'administrativo';

export default function Reports() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations();
  const { data: assignments = [] } = useAssignments();
  const { data: actionPlans = [] } = useActionPlans();
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');

  if (!currentUser) return null;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrSocio = isAdmin || isSocio || !!currentUser.isManagingPartner;

  const periodAssignments = assignments.filter(a => a.period === CURRENT_PERIOD);

  const relevantUserIds = isAdminOrSocio
    ? users.filter(u => u.isActive).map(u => u.id)
    : periodAssignments.filter(a => a.supervisorId === currentUser.id).map(a => a.employeeId);

  const baseUsers = users
    .filter(u => u.isActive && !u.isSuperUser && !u.isDummy && relevantUserIds.includes(u.id))
    .filter(u => canViewUserEvaluations(currentUser as any, u));

  // Apply area filter
  const activeUsers = baseUsers.filter(u => {
    if (areaFilter === 'all') return true;
    return getPositionLevel(u.position) === areaFilter;
  });

  // Hierarchy to use based on filter
  const hierarchy = areaFilter === 'legal' ? getLegalHierarchy
    : areaFilter === 'administrativo' ? getAdminHierarchy
    : getPositionHierarchy;

  // Stage completion data
  const selfEvalsDone = activeUsers.filter(u => evaluations.some(e => e.type === 'self' && e.evaluatorId === u.id && e.period === CURRENT_PERIOD)).length;
  const supervisorEvalsDone = activeUsers.filter(u => {
    const userAssigns = periodAssignments.filter(a => a.employeeId === u.id);
    const supEvals = evaluations.filter(e => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === CURRENT_PERIOD);
    return userAssigns.length > 0 && supEvals.length >= userAssigns.length;
  }).length;
  const feedbackDone = activeUsers.filter(u => {
    const supEvals = evaluations.filter(e => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === CURRENT_PERIOD);
    return supEvals.some(e => e.feedbackCompleted);
  }).length;
  const actionPlansDone = activeUsers.filter(u => actionPlans.some(p => p.employeeId === u.id && p.period === CURRENT_PERIOD)).length;

  const fullyCompleted = activeUsers.filter(u => {
    const hasSelf = evaluations.some(e => e.type === 'self' && e.evaluatorId === u.id && e.period === CURRENT_PERIOD);
    const userAssigns = periodAssignments.filter(a => a.employeeId === u.id);
    const supEvals = evaluations.filter(e => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === CURRENT_PERIOD);
    const allSupDone = userAssigns.length > 0 && supEvals.length >= userAssigns.length;
    const hasFeedback = supEvals.some(e => e.feedbackCompleted);
    const hasActionPlan = actionPlans.some(p => p.employeeId === u.id && p.period === CURRENT_PERIOD);
    return hasSelf && allSupDone && hasFeedback && hasActionPlan;
  }).length;

  const totalUsers = activeUsers.length;

  const generalPieData = [
    { name: 'Completado', value: fullyCompleted },
    { name: 'En Proceso', value: totalUsers - fullyCompleted },
  ];

  const stageData = [
    { name: 'Autoevaluación', completado: selfEvalsDone, pendiente: totalUsers - selfEvalsDone },
    { name: 'Eval. Evaluadores', completado: supervisorEvalsDone, pendiente: totalUsers - supervisorEvalsDone },
    { name: 'Sesión Feedback', completado: feedbackDone, pendiente: totalUsers - feedbackDone },
    { name: 'Plan de Acción', completado: actionPlansDone, pendiente: totalUsers - actionPlansDone },
  ];

  const PIE_COLORS = ['hsl(145, 60%, 40%)', 'hsl(210, 15%, 85%)'];

  // Self-evaluations by level
  const selfByPosition = hierarchy.map(pos => {
    const posUsers = activeUsers.filter(u => u.position === pos);
    const done = posUsers.filter(u => evaluations.some(e => e.type === 'self' && e.evaluatorId === u.id && e.period === CURRENT_PERIOD)).length;
    return { name: getPositionLabel(pos), total: posUsers.length, completado: done, pendiente: posUsers.length - done };
  }).filter(d => d.total > 0);

  // Supervisor-evaluations by level (those evaluations performed for users at that level)
  const supervisorByPosition = hierarchy.map(pos => {
    const posUsers = activeUsers.filter(u => u.position === pos);
    let totalExpected = 0;
    let done = 0;
    posUsers.forEach(u => {
      const userAssigns = periodAssignments.filter(a => a.employeeId === u.id);
      totalExpected += userAssigns.length;
      done += evaluations.filter(e => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === CURRENT_PERIOD).length;
    });
    return { name: getPositionLabel(pos), total: totalExpected, completado: done, pendiente: Math.max(0, totalExpected - done) };
  }).filter(d => d.total > 0);

  const avgByPosition = hierarchy.map(pos => {
    const posUsers = activeUsers.filter(u => u.position === pos);
    const posEvals = evaluations.filter(e => e.period === CURRENT_PERIOD && posUsers.some(u => u.id === e.evaluatedId));
    const avg = posEvals.length > 0 ? Math.round(posEvals.reduce((s, e) => s + e.totalScore, 0) / posEvals.length) : 0;
    return { name: getPositionLabel(pos), promedio: avg };
  }).filter(d => d.promedio > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Periodo: {CURRENT_PERIOD} {!isAdminOrSocio && '· Mi Equipo'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-card rounded-lg border p-1">
          {([
            { value: 'all', label: 'Todas las áreas' },
            { value: 'legal', label: 'Legal' },
            { value: 'administrativo', label: 'Administrativo' },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setAreaFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                areaFilter === opt.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="smps-surface-card">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3">Evaluaciones Completadas (Todas las Etapas)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={generalPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {generalPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-sm text-muted-foreground mt-2">{fullyCompleted} de {totalUsers} empleados han completado todas las etapas</p>
        </div>

        <div className="smps-surface-card">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3">Realización por Etapa</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completado" fill="hsl(145, 60%, 40%)" name="Completado" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendiente" fill="hsl(210, 15%, 85%)" name="Pendiente" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="smps-surface-card">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3">Autoevaluaciones por Nivel</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={selfByPosition}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completado" fill="hsl(145, 60%, 40%)" name="Completado" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendiente" fill="hsl(210, 15%, 85%)" name="Pendiente" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="smps-surface-card">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3">Evaluaciones de Evaluadores por Nivel</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={supervisorByPosition}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completado" fill="hsl(210, 60%, 50%)" name="Realizadas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendiente" fill="hsl(210, 15%, 85%)" name="Pendientes" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {avgByPosition.length > 0 && (
          <div className="smps-surface-card lg:col-span-2">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Promedio por Posición</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={avgByPosition}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="promedio" fill="hsl(350, 80%, 42%)" name="Promedio %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
