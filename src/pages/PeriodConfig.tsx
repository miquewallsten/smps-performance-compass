import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { PERIODS, PeriodConfig } from '@/types';
import { Calendar, Save } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Default dates by convention:
 *  - H1 (e.g. 2026-H1): Dec 1 (prev year) – May 31
 *  - H2 (e.g. 2026-H2): Jun 1 – Nov 30
 * Stages are spread evenly: self → supervisor → feedback → action plan.
 */
function defaultsFor(period: string): PeriodConfig {
  const m = period.match(/^(\d{4})-(H1|H2)$/);
  if (!m) {
    return { period, selfStart: '', selfEnd: '', supervisorStart: '', supervisorEnd: '', feedbackStart: '', feedbackEnd: '', actionPlanStart: '', actionPlanEnd: '' };
  }
  const year = parseInt(m[1], 10);
  const half = m[2];
  const iso = (y: number, mo: number, d: number) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  if (half === 'H1') {
    // Dec 1 (year-1) -> May 31 (year)  → 6 months / 4 stages ≈ 1.5 mo each
    return {
      period,
      selfStart: iso(year - 1, 12, 1),
      selfEnd: iso(year, 1, 15),
      supervisorStart: iso(year, 1, 16),
      supervisorEnd: iso(year, 3, 1),
      feedbackStart: iso(year, 3, 2),
      feedbackEnd: iso(year, 4, 15),
      actionPlanStart: iso(year, 4, 16),
      actionPlanEnd: iso(year, 5, 31),
    };
  }
  // H2: Jun 1 - Nov 30
  return {
    period,
    selfStart: iso(year, 6, 1),
    selfEnd: iso(year, 7, 15),
    supervisorStart: iso(year, 7, 16),
    supervisorEnd: iso(year, 9, 1),
    feedbackStart: iso(year, 9, 2),
    feedbackEnd: iso(year, 10, 15),
    actionPlanStart: iso(year, 10, 16),
    actionPlanEnd: iso(year, 11, 30),
  };
}

export default function PeriodConfigPage() {
  const { currentUser, periodConfigs, setPeriodConfig } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  const existing = periodConfigs.find(c => c.period === selectedPeriod);
  const [cfg, setCfg] = useState<PeriodConfig>(existing || defaultsFor(selectedPeriod));

  // Seed defaults for any missing period configs on first render
  useEffect(() => {
    PERIODS.forEach(p => {
      if (!periodConfigs.find(c => c.period === p)) {
        setPeriodConfig(defaultsFor(p));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser?.isAdmin && !currentUser?.isSuperUser) {
    return <p className="text-center py-12 text-muted-foreground">Acceso restringido al administrador.</p>;
  }

  const handlePeriodChange = (p: string) => {
    setSelectedPeriod(p);
    const found = periodConfigs.find(c => c.period === p);
    setCfg(found || defaultsFor(p));
  };

  const handleSave = () => {
    setPeriodConfig(cfg);
    toast.success(`Configuración del periodo ${cfg.period} guardada`);
  };

  const handleResetDefaults = () => {
    const def = defaultsFor(selectedPeriod);
    setCfg(def);
    toast.info('Valores predeterminados cargados (sin guardar)');
  };

  const stages: { startKey: keyof PeriodConfig; endKey: keyof PeriodConfig; label: string; color: string }[] = [
    { startKey: 'selfStart', endKey: 'selfEnd', label: 'Autoevaluación', color: 'border-l-blue-500' },
    { startKey: 'supervisorStart', endKey: 'supervisorEnd', label: 'Evaluación de Evaluadores', color: 'border-l-purple-500' },
    { startKey: 'feedbackStart', endKey: 'feedbackEnd', label: 'Sesión de Feedback', color: 'border-l-amber-500' },
    { startKey: 'actionPlanStart', endKey: 'actionPlanEnd', label: 'Plan de Acción', color: 'border-l-green-500' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Configuración de Periodos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Periodos por defecto: H1 = Diciembre–Mayo · H2 = Junio–Noviembre. Los usuarios reciben una alerta dos meses antes del cierre.
          </p>
        </div>
        <select value={selectedPeriod} onChange={e => handlePeriodChange(e.target.value)}
          className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg font-semibold">Etapas del Periodo {cfg.period}</h3>
          </div>
          <button onClick={handleResetDefaults}
            className="text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-muted">
            Restablecer predeterminados
          </button>
        </div>

        <div className="space-y-4">
          {stages.map(stage => (
            <div key={stage.label} className={`pl-4 border-l-4 ${stage.color}`}>
              <p className="text-sm font-semibold mb-2">{stage.label}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Inicio</label>
                  <input type="date" value={cfg[stage.startKey] as string}
                    onChange={e => setCfg({ ...cfg, [stage.startKey]: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fin</label>
                  <input type="date" value={cfg[stage.endKey] as string}
                    onChange={e => setCfg({ ...cfg, [stage.endKey]: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSave}
          className="mt-6 w-full py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2">
          <Save className="h-4 w-4" /> Guardar Configuración
        </button>
      </div>
    </div>
  );
}
