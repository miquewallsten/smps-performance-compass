import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useObjectives } from '@/api/queries';
import { CURRENT_PERIOD, PERIODS, POSITION_LABELS, POSITION_LEVELS, LEVEL_LABELS } from '@/types';
import { User as UserIcon, Target, TrendingUp, Sparkles } from 'lucide-react';

function TrafficLight({ value }: { value: number }) {
  let color = 'bg-destructive';
  if (value >= 90) color = 'bg-smps-success';
  else if (value >= 80) color = 'bg-smps-warning';
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-sm font-medium">{value}%</span>
    </div>
  );
}

export default function MyProfile() {
  const { user: currentUser } = useAuth();
  const { data: personalObjectives = [] } = useObjectives();
  const { data: evaluations = [] } = useEvaluations();
  const { data: assignments = [] } = useAssignments();
  const { data: users = [] } = useUsers();
  const [period, setPeriod] = useState(CURRENT_PERIOD);

  if (!currentUser) return null;
  const level = POSITION_LEVELS[currentUser.position];
  const obj = personalObjectives.find(o => o.userId === currentUser.id && o.period === period);
  const selfEval = evaluations.find(e => e.evaluatorId === currentUser.id && e.type === 'self' && e.period === period);
  const recvEvals = evaluations.filter(e => e.evaluatedId === currentUser.id && e.type === 'supervisor' && e.period === period);
  const avgRecv = recvEvals.length > 0 ? Math.round(recvEvals.reduce((s, e) => s + e.totalScore, 0) / recvEvals.length) : null;

  // Equipo: usuarios asignados a mí en este periodo
  const teamIds = assignments.filter(a => a.supervisorId === currentUser.id && a.period === period).map(a => a.employeeId);
  const teamSummary = teamIds.map(id => {
    const u = users.find(x => x.id === id);
    const self = evaluations.find(e => e.evaluatedId === id && e.type === 'self' && e.period === period);
    const sup = evaluations.find(e => e.evaluatedId === id && e.evaluatorId === currentUser.id && e.type === 'supervisor' && e.period === period);
    return { id, user: u, selfScore: self?.totalScore ?? null, supScore: sup?.totalScore ?? null };
  }).filter(t => t.user);

  const legalFields: { key: keyof NonNullable<typeof obj>['legalObjective']; label: string; suffix?: string }[] = [
    { key: 'horasMeta', label: 'Horas Meta' },
    { key: 'horasAjustadas', label: 'Horas Ajustadas' },
    { key: 'porcentajeHorasVsMeta', label: '% Horas vs. Meta', suffix: '%' },
    { key: 'porcentajeEficiencia', label: '% Eficiencia', suffix: '%' },
    { key: 'metaProBono', label: 'Meta Pro Bono' },
    { key: 'realizadoProBono', label: 'Realizado Pro Bono' },
    { key: 'metaMarketing', label: 'Meta Marketing' },
    { key: 'realizadoMarketing', label: 'Realizado Marketing' },
    { key: 'metaBusinessDev', label: 'Meta Business Dev' },
    { key: 'realizadoBusinessDev', label: 'Realizado Business Dev' },
    { key: 'metaMentoring', label: 'Meta Mentoring' },
    { key: 'realizadoMentoring', label: 'Realizado Mentoring' },
    { key: 'resultadoArea', label: 'Resultado Área' },
    { key: 'resultadoFirma', label: 'Resultado Firma' },
    { key: 'porcentajeTotalBono', label: '% Total para Bono', suffix: '%' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-accent" /> Mi Perfil
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentUser.name} · {POSITION_LABELS[currentUser.position]} · {LEVEL_LABELS[level]}
          </p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Datos del usuario */}
      <div className="smps-surface-elevated">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-display text-lg font-semibold">Información Personal</h3>
          <Link to={`/help?position=${currentUser.position}&open=competencias`}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> ¿Qué se espera de mí?
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{currentUser.name}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{currentUser.email}</span></div>
          <div><span className="text-muted-foreground">Posición:</span> <span className="font-medium">{POSITION_LABELS[currentUser.position]}</span></div>
          <div><span className="text-muted-foreground">Área:</span> <span className="font-medium">{LEVEL_LABELS[level]}</span></div>
        </div>
      </div>

      {/* Resumen de evaluaciones */}
      <div className="smps-surface-elevated">
        <h3 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" /> Resumen de Evaluación — {period}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Mi Autoevaluación</p>
            <p className="text-2xl font-bold font-display mt-1">{selfEval ? `${selfEval.totalScore}%` : '—'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Promedio Evaluaciones Recibidas ({recvEvals.length})</p>
            <p className="text-2xl font-bold font-display mt-1">{avgRecv !== null ? `${avgRecv}%` : '—'}</p>
          </div>
        </div>

        {/* Detalle de evaluadores */}
        {recvEvals.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Por Evaluador</p>
            <div className="space-y-1">
              {recvEvals.map(e => {
                const ev = users.find(u => u.id === e.evaluatorId);
                return (
                  <div key={e.id} className="flex justify-between text-sm bg-muted/20 rounded px-3 py-2">
                    <span>{ev?.name || 'Evaluador'}</span>
                    <span className="font-semibold">{e.totalScore}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Resumen del Equipo */}
      {teamSummary.length > 0 && (
        <div className="smps-surface-elevated">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-accent" /> Mi Equipo — {period}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="py-2">Colaborador</th>
                  <th className="py-2">Posición</th>
                  <th className="py-2 text-right">Autoevaluación</th>
                  <th className="py-2 text-right">Mi Evaluación</th>
                </tr>
              </thead>
              <tbody>
                {teamSummary.map(t => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{t.user!.name}</td>
                    <td className="py-2 text-muted-foreground">{POSITION_LABELS[t.user!.position]}</td>
                    <td className="py-2 text-right">{t.selfScore !== null ? `${t.selfScore}%` : '—'}</td>
                    <td className="py-2 text-right">{t.supScore !== null ? `${t.supScore}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Objetivos / Cumplimiento */}
      <div className="smps-surface-elevated">
        <h3 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" /> Objetivos y Cumplimiento — {period}
        </h3>
        {!obj && (
          <p className="text-sm text-muted-foreground text-center py-6">No hay objetivos configurados para este periodo.</p>
        )}
        {obj && level === 'administrativo' && obj.adminObjectives && (
          <div className="space-y-3">
            {obj.adminObjectives.length === 0 && <p className="text-sm text-muted-foreground">Sin objetivos.</p>}
            {obj.adminObjectives.map((o, idx) => (
              <div key={o.id} className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-accent">Objetivo {idx + 1}</span>
                  <TrafficLight value={o.porcentajeAvance} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  <div><span className="text-xs text-muted-foreground">Tipo:</span><p className="font-medium">{o.tipoObjetivo || '—'}</p></div>
                  <div><span className="text-xs text-muted-foreground">Nombre:</span><p className="font-medium">{o.nombreObjetivo || '—'}</p></div>
                  <div><span className="text-xs text-muted-foreground">Pilares:</span><p className="font-medium">{o.pilaresEstrategicos || '—'}</p></div>
                  <div><span className="text-xs text-muted-foreground">Alcance:</span><p className="font-medium">{o.alcance || '—'}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
        {obj && level === 'legal' && obj.legalObjective && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {legalFields.map(f => {
              const v = obj.legalObjective![f.key];
              return (
                <div key={f.key} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-base font-semibold mt-1">{v}{f.suffix || ''}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
