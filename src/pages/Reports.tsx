import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsEvaluations, useAnalyticsObjectives, useAnalyticsVacations, useAnalyticsActionPlans, useAnalyticsTrends } from '@/api/queries';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { ReportsSkeleton } from '@/components/shared/SkeletonPage';
import { Download } from 'lucide-react';

const PIE_COLORS = ['hsl(145, 60%, 40%)', 'hsl(210, 15%, 85%)'];

export default function Reports() {
  const currentPeriod = useCurrentPeriod();
  const { user: currentUser } = useAuth();
  const { data: evalAnalytics, isLoading: evalLoading } = useAnalyticsEvaluations(currentPeriod);
  const { data: objectives, isLoading: objLoading } = useAnalyticsObjectives(currentPeriod);
  const { data: vacations, isLoading: vacLoading } = useAnalyticsVacations();
  const { data: actionPlans, isLoading: apLoading } = useAnalyticsActionPlans(currentPeriod);
  const { data: trends } = useAnalyticsTrends();

  if (!currentUser) return null;

  const isLoading = evalLoading || objLoading || vacLoading || apLoading;
  if (isLoading) return <ReportsSkeleton />;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrSocio = isAdmin || isSocio || !!currentUser.isManagingPartner;

  // Evaluation data from analytics
  const evalData = evalAnalytics || { total: 0, completed: 0, byType: {}, byPosition: {} };
  const fullyCompleted = evalData.completed || 0;
  const totalEvals = evalData.total || 0;
  const inProgress = totalEvals - fullyCompleted;

  const generalPieData = [
    { name: 'Completado', value: fullyCompleted },
    { name: 'En Proceso', value: inProgress },
  ];

  // Stage completion from analytics
  const stageData = [
    { 
      name: 'Autoevaluación', 
      completado: (evalData.byType?.self?.completed || 0),
      pendiente: (evalData.byType?.self?.total || 0) - (evalData.byType?.self?.completed || 0)
    },
    { 
      name: 'Eval. Supervisor', 
      completado: (evalData.byType?.supervisor?.completed || 0),
      pendiente: (evalData.byType?.supervisor?.total || 0) - (evalData.byType?.supervisor?.completed || 0)
    },
  ];

  // Score by position
  const positionData = Object.entries(evalData.byPosition || {}).map(([pos, data]: [string, any]) => ({
    name: getPositionLabel(pos),
    promedio: data.avgScore ? Math.round(data.avgScore) : 0,
    total: data.total || 0,
  }));

  // Trend data
  const trendData = (trends?.evaluationTrends || []).map((t: any) => ({
    period: t.period,
    avgScore: t.avg_score ? Math.round(t.avg_score * 10) / 10 : null,
    type: t.type,
  }));

  // Objectives summary
  const objByStatus = objectives?.byStatus || {};

  // Vacations summary
  const vacByStatus = vacations?.byStatus || {};

  // Action plans summary
  const apByStatus = actionPlans?.byStatus || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold">Reportes</h1>
          <p className="text-xs text-muted-foreground">
            Periodo: {currentPeriod} {!isAdminOrSocio && '· Mi Equipo'}
          </p>
        </div>
        <a
          href={`/api/evaluations/export/csv?period=${currentPeriod}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Overview */}
        <div className="smps-surface-card">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3">Evaluaciones Completadas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={generalPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {generalPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-sm text-muted-foreground mt-2">{fullyCompleted} de {totalEvals} evaluaciones completadas</p>
        </div>

        {/* Stage Completion */}
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

        {/* Score by Position */}
        {positionData.length > 0 && (
          <div className="smps-surface-card">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Promedio por Posición</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={positionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="promedio" fill="hsl(350, 80%, 42%)" name="Promedio %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trend Chart (if data available) */}
        {trendData.length > 0 && (
          <div className="smps-surface-card">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Tendencia de Calificaciones</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avgScore" stroke="hsl(210, 60%, 50%)" name="Promedio" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Objectives Summary */}
        {Object.keys(objByStatus).length > 0 && (
          <div className="smps-surface-card">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Objetivos</h3>
            <div className="space-y-2">
              {Object.entries(objByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{status}</span>
                  <span className="text-sm font-bold tabular-nums">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vacation Summary */}
        {Object.keys(vacByStatus).length > 0 && (
          <div className="smps-surface-card">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Vacaciones</h3>
            <div className="space-y-2">
              {Object.entries(vacByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{status}</span>
                  <span className="text-sm font-bold tabular-nums">{count as number}</span>
                </div>
              ))}
              {vacations?.totalDays > 0 && (
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total días</span>
                  <span className="text-sm font-bold tabular-nums">{vacations.totalDays}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Plans Summary */}
        {Object.keys(apByStatus).length > 0 && (
          <div className="smps-surface-card">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Planes de Acción</h3>
            <div className="space-y-2">
              {Object.entries(apByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{status}</span>
                  <span className="text-sm font-bold tabular-nums">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getPositionLabel(pos: string): string {
  const LABELS: Record<string, string> = {
    socio: 'Socio', salary_partner: 'Salary Partner', counsel: 'Counsel',
    asociado_sr: 'Asociado Sr', asociado_mid: 'Asociado Mid', asociado_jr: 'Asociado Jr',
    pasante_carrera: 'Pasante Carrera', pasante: 'Pasante',
    director: 'Director', gerente: 'Gerente', coordinador: 'Coordinador',
    analista: 'Analista', asistente: 'Asistente', soporte: 'Soporte',
    archivo_soporte: 'Archivo/Soporte',
  };
  return LABELS[pos] || pos;
}
