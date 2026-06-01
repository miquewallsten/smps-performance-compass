import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/api/queries';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES: { key: string; label: string; description: string }[] = [
  { key: 'evaluation', label: 'Evaluaciones', description: 'Recordatorios de autoevaluación, evaluaciones de supervisor y sesiones de feedback' },
  { key: 'objective', label: 'Objetivos', description: 'Creación, envío y aprobación de objetivos' },
  { key: 'action_plan', label: 'Planes de Acción', description: 'Creación, aprobación y vencimiento de planes de acción' },
  { key: 'vacation', label: 'Vacaciones', description: 'Solicitudes, aprobaciones y recordatorios de vacaciones' },
  { key: 'system', label: 'Sistema', description: 'Resúmenes diarios y alertas del sistema' },
];

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePref = useUpdateNotificationPreferences();

  if (isLoading) return <div className="flex items-center justify-center py-12"><span className="text-sm text-muted-foreground">Cargando...</span></div>;

  const prefsMap = new Map<string, any>();
  for (const p of preferences || []) {
    prefsMap.set(p.category, p);
  }

  const toggle = (category: string, field: string, value: boolean) => {
    updatePref.mutate({ category, [field]: value });
  };

  const changeFrequency = (category: string, reminderFrequency: string) => {
    updatePref.mutate({ category, reminderFrequency });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-muted/40 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="font-display text-lg font-bold">Preferencias de Notificaciones</h1>
          <p className="text-xs text-muted-foreground">Configura qué notificaciones deseas recibir</p>
        </div>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map(cat => {
          const pref = prefsMap.get(cat.key);
          return (
            <div key={cat.key} className="rounded-lg border bg-card p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{cat.label}</h3>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* In-app */}
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">En la app</span>
                  <ToggleSwitch
                    checked={pref?.inAppEnabled ?? true}
                    onChange={(v) => toggle(cat.key, 'inAppEnabled', v)}
                  />
                </div>

                {/* Email */}
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Correo</span>
                  <ToggleSwitch
                    checked={pref?.emailEnabled ?? true}
                    onChange={(v) => toggle(cat.key, 'emailEnabled', v)}
                  />
                </div>

                {/* Digest */}
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Resumen diario</span>
                  <ToggleSwitch
                    checked={pref?.digestEnabled ?? true}
                    onChange={(v) => toggle(cat.key, 'digestEnabled', v)}
                  />
                </div>
              </div>

              {/* Reminder frequency */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Frecuencia de recordatorios:</span>
                <div className="flex gap-1">
                  {[
                    { value: 'none', label: 'Ninguna' },
                    { value: 'daily', label: 'Diario' },
                    { value: '3days', label: '3 días' },
                    { value: 'weekly', label: 'Semanal' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => changeFrequency(cat.key, opt.value)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        (pref?.reminderFrequency || '3days') === opt.value
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-muted'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4.5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
