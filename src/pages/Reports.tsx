import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useActionPlans } from '@/api/queries';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { getPositionLabel, getPositionLevel, getLegalHierarchy, getAdminHierarchy, getPositionHierarchy } from '@/lib/evaluationConfig';
import { canViewUserEvaluations } from '@/lib/visibility';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { ReportsSkeleton } from '@/components/shared/SkeletonPage';

type AreaFilter = 'all' | 'legal' | 'administrativo';

const PIE_COLORS = ['hsl(145, 60%, 40%)', 'hsl(210, 15%, 85%)'];

export default function Reports() {
  const currentPeriod = useCurrentPeriod();
  const { user: currentUser } = useAuth();
  const { data: allUsers = [], isLoading: usersLoading } = useUsers();
  const { data: allEvaluations = [], isLoading: evalsLoading } = useEvaluations();
  const { data: allAssignments = [], isLoading: assignLoading } = useAssignments(currentPeriod);
  const { data: actionPlans = [], isLoading: apLoading } = useActionPlans();
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');

  if (!currentUser) return null;

  const isLoading = usersLoading || evalsLoading || assignLoading || apLoading;
  if (isLoading) return <ReportsSkeleton />;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrSocio = isAdmin || isSocio || !!currentUser.isManagingPartner;

  // ── Filter data ──
  const periodAssignments = allAssignments.filter((a: any) => a.period === currentPeriod);

  const relevantUserIds = isAdminOrSocio
    ? allUsers.filter((u: any) => u.isActive).map((u: any) => u.id)
    : periodAssignments.filter((a: any) => a.supervisorId === currentUser.id).map((a: any) => a.employeeId);

  const baseUsers = allUsers
    .filter((u: any) => u.isActive && !u.isSuperUser && !u.isDummy && relevantUserIds.includes(u.id))
    .filter((u: any) => canViewUserEvaluations(currentUser, u));

  // Apply area filter
  const activeUsers = baseUsers.filter((u: any) => {
    if (areaFilter === 'all') return true;
    return getPositionLevel(u.position) === areaFilter;
  });

  // Hierarchy to use based on filter
  const legalHierarchy = getLegalHierarchy();
  const adminHierarchy = getAdminHierarchy();
  const hierarchy = areaFilter === 'legal' ? legalHierarchy
    : areaFilter === 'administrativo' ? adminHierarchy
    : getPositionHierarchy();

  // ── Stage completion data ──
  const selfEvalsDone = activeUsers.filter((u: any) => allEvaluations.some((e: any) => e.type === 'self' && e.evaluatorId === u.id && e.period === currentPeriod)).length;
  const supervisorEvalsDone = activeUsers.filter((u: any) => {
    const userAssigns = periodAssignments.filter((a: any) => a.employeeId === u.id);
    const supEvals = allEvaluations.filter((e: any) => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === currentPeriod);
    return userAssigns.length > 0 && supEvals.length >= userAssigns.length;
  }).length;
  const feedbackDone = activeUsers.filter((u: any) => {
    const supEvals = allEvaluations.filter((e: any) => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === currentPeriod);
    return supEvals.some((e: any) => e.feedbackCompleted);
  }).length;
  const actionPlansDone = activeUsers.filter((u: any) => actionPlans.some((p: any) => p.employeeId === u.id && p.period === currentPeriod)).length;

  const fullyCompleted = activeUsers.filter((u: any) => {
    const hasSelf = allEvaluations.some((e: any) => e.type === 'self' && e.evaluatorId === u.id && e.period === currentPeriod);
    const userAssigns = periodAssignments.filter((a: any) => a.employeeId === u.id);
    const supEvals = allEvaluations.filter((e: any) => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === currentPeriod);
    const allSupDone = userAssigns.length > 0 && supEvals.length >= userAssigns.length;
    const hasFeedback = supEvals.some((e: any) => e.feedbackCompleted);
    const hasActionPlan = actionPlans.some((p: any) => p.employeeId === u.id && p.period === currentPeriod);
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

  // Self-evaluations by level (matching original)
  const selfByPosition = hierarchy.map(pos => {
    const posUsers = activeUsers.filter((u: any) => u.position === pos);
    const done = posUsers.filter((u: any) => allEvaluations.some((e: any) => e.type === 'self' && e.evaluatorId === u.id && e.period === currentPeriod)).length;
    return { name: getPositionLabel(pos), total: posUsers.length, completado: done, pendiente: posUsers.length - done };
  }).filter((d: any) => d.total > 0);

  // Supervisor evaluations by level (matching original)
  const supervisorByPosition = hierarchy.map(pos => {
    const posUsers = activeUsers.filter((u: any) => u.position === pos);
    let totalExpected = 0;
    let done = 0;
    posUsers.forEach((u: any) => {
      const userAssigns = periodAssignments.filter((a: any) => a.employeeId === u.id);
      const supEvals = allEvaluations.filter((e: any) => e.type === 'supervisor' && e.evaluatedId === u.id && e.period === currentPeriod);
      if (userAssigns.length > 0) {
        totalExpected += userAssigns.length;
        done += supEvals.length;
      }
    });
    return { name: getPositionLabel(pos), total: totalExpected, completado: done, pendiente: totalExpected - done };
  }).filter((d: any) => d.total > 0);

  // Average score by position
  const avgByPosition = hierarchy.map(pos => {
    const posUsers = activeUsers.filter((u: any) => u.position === pos);
    const posEvals = allEvaluations.filter((e: any) => posUsers.some((u: any) => u.id === e.evaluatedId) && e.period === currentPeriod);
    const avgScore = posEvals.length > 0
      ? Math.round(posEvals.reduce((s: number, e: any) => s + e.totalScore, 0) / posEvals.length)
      : null;
    return { name: getPositionLabel(pos), promedio: avgScore, total: posEvals.length };
  }).filter((d: any) => d.total > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-lg font-bold">Reportes</h1>
          <p className="text-xs text-muted-foreground">
            Periodo: {currentPeriod} {!isAdminOrSocio && '· Mi Equipo'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <a
            href={`/api/evaluations/export/csv?period=${currentPeriod}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Overview */}
        <div className="smps-surface-card">
          <h3 className="font-display text-base font-semibold mb-3">Evaluaciones Completadas (Todas las Etapas)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={generalPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>
                {generalPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-sm text-muted-foreground mt-2">{fullyCompleted} de {totalUsers} empleados han completado todas las etapas</p>
        </div>

        {/* Stage Completion */}
        <div className="smps-surface-card">
          <h3 className="font-display text-base font-semibold mb-3">Realización por Etapa</h3>
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

        {/* Self-evaluations by position (R03) */}
        {selfByPosition.length > 0 && (
          <div className="smps-surface-card">
            <h3 className="font-display text-base font-semibold mb-3">Autoevaluaciones por Nivel</h3>
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
        )}

        {/* Supervisor evaluations by position (R04) */}
        {supervisorByPosition.length > 0 && (
          <div className="smps-surface-card">
            <h3 className="font-display text-base font-semibold mb-3">Evaluaciones de Evaluadores por Nivel</h3>
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
        )}

        {/* Average by position */}
        {avgByPosition.length > 0 && (
          <div className="smps-surface-card lg:col-span-2">
            <h3 className="font-display text-base font-semibold mb-3">Promedio por Posición</h3>
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
