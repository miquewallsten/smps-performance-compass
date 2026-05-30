import { ScoreBadge, scoreColorText, scoreBgClass } from '@/components/shared/ScoreBadge';
import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations , usePeriods } from '@/api/queries';
import { getPositionLabel, getPositionLevel, normalizePracticeArea } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { canViewUserEvaluations } from '@/lib/visibility';
import { BarChart3, Filter, ChevronDown, ChevronRight, TrendingUp, Users } from 'lucide-react';
import { ResponsiveRadar } from '@nivo/radar';
import { ScoreAnalysisSkeleton } from '@/components/shared/SkeletonPage';

type GroupBy = 'area' | 'practice' | 'position';

interface ScoreRow {
  key: string;
  name: string;
  count: number;
  avgTotal: number | null;
  avgSelf: number | null;
  avgSupervisor: number | null;
  evalCount: number;
  selfCount: number;
  supCount: number;
}

interface IndividualRow {
  id: string;
  name: string;
  position: string;
  practiceArea: string;
  selfScore: number | null;
  supervisorScore: number | null;
  totalScore: number | null;
  evalCount: number;
}

export default function ScoreAnalysis() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations();
  const currentPeriod = useCurrentPeriod();
  const { data: periodsData = [] } = usePeriods();
  const periods = periodsData.map((p: any) => p.period).sort();
  const [period, setPeriod] = useState(currentPeriod);
  const [groupBy, setGroupBy] = useState<GroupBy>('position');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  if (!currentUser) return null;

  const isScoreLoading = !users || !evaluations;
  if (isScoreLoading) return <ScoreAnalysisSkeleton />;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrSocio = isAdmin || isSocio || !!currentUser.isManagingPartner || currentUser.isSuperUser;

  if (!isAdminOrSocio) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground">Esta sección está disponible solo para administradores y socios.</p>
      </div>
    );
  }

  const visibleUsers = (Array.isArray(users) ? users : [])
    .filter(u => u.isActive && !u.isSuperUser && !u.isDummy)
    .filter(u => canViewUserEvaluations(currentUser as any, u));

  const filteredUsers = visibleUsers.filter(u => {
    if (areaFilter === 'all') return true;
    return getPositionLevel(u.position) === areaFilter;
  });

  const periodEvals = evaluations.filter(e => e.period === period);

  // Compute grouped data
  const groupedData = useMemo((): ScoreRow[] => {
    const groups = new Map<string, { users: typeof filteredUsers; label: string }>();

    if (groupBy === 'area') {
      const legalUsers = filteredUsers.filter(u => getPositionLevel(u.position) === 'legal');
      const adminUsers = filteredUsers.filter(u => getPositionLevel(u.position) === 'administrativo');
      groups.set('legal', { users: legalUsers, label: 'Legal' });
      groups.set('administrativo', { users: adminUsers, label: 'Administrativo' });
    } else if (groupBy === 'practice') {
      const legalUsers = filteredUsers.filter(u => getPositionLevel(u.position) === 'legal');
      const practiceGroups = new Map<string, typeof filteredUsers>();
      legalUsers.forEach(u => {
        const area = u.practiceArea || 'sin_area';
        if (!practiceGroups.has(area)) practiceGroups.set(area, []);
        practiceGroups.get(area)!.push(u);
      });
      const adminUsers = filteredUsers.filter(u => getPositionLevel(u.position) === 'administrativo');
      if (adminUsers.length > 0) {
        groups.set('administrativo', { users: adminUsers, label: 'Administrativo' });
      }
      practiceGroups.forEach((usrs, area) => {
        const label = area === 'sin_area'
          ? 'Sin área de práctica'
          : normalizePracticeArea(area).charAt(0).toUpperCase() + normalizePracticeArea(area).slice(1).replace(/_/g, ' ');
        groups.set(area, { users: usrs, label });
      });
    } else {
      const positions = [...new Set(filteredUsers.map(u => u.position))];
      positions.forEach(pos => {
        const posUsers = filteredUsers.filter(u => u.position === pos);
        groups.set(pos, { users: posUsers, label: getPositionLabel(pos) });
      });
    }

    const rows: ScoreRow[] = [];
    groups.forEach((group, key) => {
      if (group.users.length === 0) return;

      let totalScoreSum = 0;
      let totalScoreCount = 0;
      let selfScoreSum = 0;
      let selfScoreCount = 0;
      let supScoreSum = 0;
      let supCount = 0;

      group.users.forEach(u => {
        const userEvals = periodEvals.filter(e => e.evaluatedId === u.id && e.totalScore > 0);
        userEvals.forEach(e => {
          totalScoreSum += e.totalScore;
          totalScoreCount++;
          if (e.type === 'self') { selfScoreSum += e.totalScore; selfScoreCount++; }
          else { supScoreSum += e.totalScore; supCount++; }
        });
      });

      rows.push({
        key,
        name: group.label,
        count: group.users.length,
        avgTotal: totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : null,
        avgSelf: selfScoreCount > 0 ? Math.round(selfScoreSum / selfScoreCount) : null,
        avgSupervisor: supCount > 0 ? Math.round(supScoreSum / supCount) : null,
        evalCount: totalScoreCount,
        selfCount: selfScoreCount,
        supCount,
      });
    });

    return rows;
  }, [groupBy, filteredUsers, periodEvals]);

  // Compute individual data for expanded rows
  const getIndividualData = useCallback((groupKey: string): IndividualRow[] => {
    const groupUsers = filteredUsers.filter(u => {
      if (groupBy === 'area') return getPositionLevel(u.position) === groupKey;
      if (groupBy === 'practice') {
        if (groupKey === 'administrativo') return getPositionLevel(u.position) === 'administrativo';
        return u.practiceArea === groupKey && getPositionLevel(u.position) === 'legal';
      }
      return u.position === groupKey;
    });

    return groupUsers.map(u => {
      const userEvals = periodEvals.filter(e => e.evaluatedId === u.id);
      const selfEval = userEvals.find(e => e.type === 'self');
      const supEvals = userEvals.filter(e => e.type === 'supervisor');
      const avgSup = supEvals.length > 0 ? Math.round(supEvals.reduce((s, e) => s + e.totalScore, 0) / supEvals.length) : null;
      const scoredEvals = userEvals.filter(e => e.totalScore > 0);
      const avgTotal = scoredEvals.length > 0 ? Math.round(scoredEvals.reduce((s, e) => s + e.totalScore, 0) / scoredEvals.length) : null;
      return {
        id: u.id,
        name: u.name,
        position: getPositionLabel(u.position),
        practiceArea: u.practiceArea || '',
        selfScore: selfEval ? Math.round(selfEval.totalScore) : null,
        supervisorScore: avgSup,
        totalScore: avgTotal,
        evalCount: userEvals.length,
      };
    }).sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  }, [groupBy, filteredUsers, periodEvals]);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const scoreColor = scoreColorText;
  const scoreBg = scoreBgClass;

  const totalEvals = periodEvals.filter(e => filteredUsers.some(u => u.id === e.evaluatedId)).length;
  const selfEvalsCount = periodEvals.filter(e => e.type === 'self' && filteredUsers.some(u => u.id === e.evaluatedId)).length;
  const supEvalsCount = periodEvals.filter(e => e.type === 'supervisor' && filteredUsers.some(u => u.id === e.evaluatedId)).length;
  const overallAvg = useMemo(() => {
    const scored = periodEvals.filter(e => filteredUsers.some(u => u.id === e.evaluatedId) && e.totalScore > 0);
    return scored.length > 0 ? Math.round(scored.reduce((s, e) => s + e.totalScore, 0) / scored.length) : null;
  }, [periodEvals, filteredUsers]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-accent" />
            Calificación por Área, Práctica y Puesto
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Promedios de evaluación desglosados por dimensión</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          {periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Filters */}
      <div className="smps-surface-card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-accent" />
          <p className="smps-section-title mb-0">Filtros</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest block mb-1">Agrupar por</label>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {([
                { value: 'area' as GroupBy, label: 'Área' },
                { value: 'practice' as GroupBy, label: 'Práctica' },
                { value: 'position' as GroupBy, label: 'Puesto' },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => { setGroupBy(opt.value); setExpandedRows(new Set()); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-[background-color,color] duration-150 ${groupBy === opt.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-widest block mb-1">Nivel</label>
            <select value={areaFilter} onChange={e => { setAreaFilter(e.target.value); setExpandedRows(new Set()); }}
              className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="all">Todos</option>
              <option value="legal">Legal</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary — featured metric + supporting stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="md:col-span-2 smps-surface-elevated flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Promedio general</p>
            <p className={`font-display text-3xl font-bold tracking-tight ${scoreColor(overallAvg)}`}>
              {overallAvg !== null ? `${overallAvg}%` : '—'}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filteredUsers.length}</span> colaboradores
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{totalEvals}</span> evaluaciones
            </p>
          </div>
        </div>
        <div className="smps-surface-card text-center">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Autoevaluaciones</p>
          <p className="font-display text-xl font-bold">{selfEvalsCount}</p>
          <p className="text-[10px] text-muted-foreground">de {filteredUsers.length}</p>
        </div>
        <div className="smps-surface-card text-center">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Eval. Supervisor</p>
          <p className="font-display text-xl font-bold">{supEvalsCount}</p>
          <p className="text-[10px] text-muted-foreground">recibidas</p>
        </div>
      </div>

      {/* Radar Chart - Competency Overview */}
      {groupedData.length > 0 && (() => {
        // Build radar data: one entry per group, with self/supervisor/total as dimensions
        const radarData = groupedData.filter(r => r.avgTotal !== null).slice(0, 6).map(row => ({
          group: row.name.length > 15 ? row.name.slice(0, 14) + '…' : row.name,
          Autoevaluación: row.avgSelf ?? 0,
          'Eval. Supervisor': row.avgSupervisor ?? 0,
          Promedio: row.avgTotal ?? 0,
        }));
        if (radarData.length < 2) return null;
        const radarKeys = ['Autoevaluación', 'Eval. Supervisor', 'Promedio'];
        return (
          <div className="smps-surface-card">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3">Comparativa Radar</h3>
            <div style={{ height: Math.min(400, 100 + radarData.length * 60), width: '100%' }}>
              <ResponsiveRadar
                data={radarData}
                keys={radarKeys}
                indexBy="group"
                maxValue={100}
                curve="linearClosed"
                borderWidth={2}
                borderColor={{ from: 'color', modifiers: [] }}
                gridLevels={5}
                gridShape="circular"
                gridLabelOffset={12}
                dotSize={6}
                dotColor={{ theme: 'background' }}
                dotBorderWidth={2}
                colors={['hsl(145, 60%, 40%)', 'hsl(210, 60%, 50%)', 'hsl(350, 80%, 42%)']}
                fillOpacity={0.12}
                blendMode="normal"
                enableCrosshair={true}
                crosshairType="intersect"
                axisTop={null}
                axisRight={null}
                axisBottom={null}
                axisLeft={null}
                margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
                theme={{
                  text: { fontSize: 11, fill: 'hsl(var(--foreground))' },
                  grid: { stroke: 'hsl(var(--border))' },
                  dots: { stroke: 'hsl(var(--card))', strokeWidth: 2 },
                }}
                legends={[
                  { anchor: 'bottom', direction: 'row', translateX: 0, translateY: 0, itemWidth: 100, itemHeight: 16, symbolSize: 8, symbolShape: 'circle' }
                ]}
              />
            </div>
          </div>
        );
      })()}

      {/* Grouped rows */}
      {groupedData.length === 0 ? (
        <div className="smps-surface-card text-center py-12">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay datos para los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groupedData.map(row => {
            const isExpanded = expandedRows.has(row.key);
            const individuals = isExpanded ? getIndividualData(row.key) : [];
            return (
              <div key={row.key} className="smps-surface-card">
                <button onClick={() => toggleRow(row.key)}
                  className="w-full flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-[background-color] duration-150 rounded-lg"
                  aria-expanded={isExpanded}
                  aria-controls={`detail-${row.key}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <span className="font-display text-sm font-semibold truncate">{row.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">({row.count})</span>
                  </div>
                  <div className="flex items-center gap-4 md:gap-6 text-sm flex-shrink-0">
                    {row.avgSelf !== null && (
                      <div className="text-center hidden sm:block">
                        <p className="text-[10px] text-muted-foreground uppercase">Auto</p>
                        <p className={`font-semibold ${scoreColor(row.avgSelf)}`}>{row.avgSelf}%</p>
                      </div>
                    )}
                    {row.avgSupervisor !== null && (
                      <div className="text-center hidden sm:block">
                        <p className="text-[10px] text-muted-foreground uppercase">Evaluador</p>
                        <p className={`font-semibold ${scoreColor(row.avgSupervisor)}`}>{row.avgSupervisor}%</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Promedio</p>
                      <p className={`font-display font-bold ${scoreColor(row.avgTotal)}`}>{row.avgTotal !== null ? `${row.avgTotal}%` : '—'}</p>
                    </div>
                  </div>
                </button>
                {isExpanded && individuals.length > 0 && (
                  <div id={`detail-${row.key}`} className="border-t overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">Colaborador</th>
                          <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">Puesto</th>
                          <th className="text-center py-2 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">Auto</th>
                          <th className="text-center py-2 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">Evaluador</th>
                          <th className="text-center py-2 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">Promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {individuals.map(ind => (
                          <tr key={ind.id} className="border-b last:border-0 hover:bg-muted/20 transition-[background-color] duration-150">
                            <td className="py-2 px-4 font-medium whitespace-nowrap">{ind.name}</td>
                            <td className="py-2 px-4 text-muted-foreground text-xs whitespace-nowrap">{ind.position}</td>
                            <td className="py-2 px-4 text-center">
                              <ScoreBadge value={ind.selfScore} size="sm" />
                            </td>
                            <td className="py-2 px-4 text-center">
                              <ScoreBadge value={ind.supervisorScore} size="sm" />
                            </td>
                            <td className="py-2 px-4 text-center">
                              <ScoreBadge value={ind.totalScore} size="sm" className="font-bold" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
