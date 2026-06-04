import { useState, useEffect } from 'react';
import { useFeatureVisibility, useUpdateFeatureVisibility } from '@/api/queries';
import { Shield, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FeatureVisibility {
  id: number;
  role: string;
  feature: string;
  visible: number;
  created_at: string;
  updated_at: string;
}

const FEATURES = [
  { id: 'objectives', label: 'Objetivos Personales' },
  { id: 'evaluations', label: 'Evaluaciones' },
  { id: 'communications', label: 'Comunicación' },
  { id: 'vacations', label: 'Vacaciones' },
  { id: 'reports', label: 'Reportes' },
  { id: 'user_management', label: 'Gestión de Usuarios' },
  { id: 'position_management', label: 'Áreas y Puestos' },
  { id: 'evaluation_templates', label: 'Plantillas de Evaluación' },
  { id: 'question_library', label: 'Biblioteca de Preguntas' },
];

const ROLES = [
  { id: 'admin', label: 'Administrador', color: 'bg-blue-100 text-blue-800' },
  { id: 'socio', label: 'Socio', color: 'bg-purple-100 text-purple-800' },
  { id: 'evaluator', label: 'Evaluador', color: 'bg-green-100 text-green-800' },
  { id: 'staff', label: 'Personal', color: 'bg-gray-100 text-gray-800' },
];

export default function FeatureVisibility() {
  const { data: visibilityData, isLoading, refetch } = useFeatureVisibility();
  const updateFeatureVisibility = useUpdateFeatureVisibility();
  const [settings, setSettings] = useState<Record<string, Record<string, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visibilityData?.settings) {
      const newSettings: Record<string, Record<string, boolean>> = {};
      visibilityData.settings.forEach((s: FeatureVisibility) => {
        if (!newSettings[s.role]) newSettings[s.role] = {};
        newSettings[s.role][s.feature] = !!s.visible;
      });
      setSettings(newSettings);
    }
  }, [visibilityData]);

  const toggleFeature = (role: string, feature: string, visible: boolean) => {
    setSettings(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [feature]: !visible,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const settingsArray = Object.entries(settings).flatMap(([role, features]) =>
      Object.entries(features).map(([feature, visible]) => ({
        role,
        feature,
        visible: visible ? 1 : 0,
      }))
    );
    try {
      await updateFeatureVisibility.mutateAsync({ settings: settingsArray });
      toast.success('Configuración de visibilidad guardada');
    } catch (err) {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            Configuración de Visibilidad
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Controla qué funcionalidades puede ver cada rol en el sistema
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Cambios
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="py-3 px-4 font-semibold text-left">Rol</th>
              {FEATURES.map(f => (
                <th key={f.id} className="py-3 px-2 font-semibold text-center min-w-[100px]">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {ROLES.map(role => (
              <tr key={role.id} className="hover:bg-muted/30">
                <td className="py-3 px-4">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${role.color}`}>
                    {role.label}
                  </div>
                </td>
                {FEATURES.map(feature => (
                  <td key={feature.id} className="py-2 px-2 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings[role.id]?.[feature.id] ?? true}
                        onChange={() => toggleFeature(role.id, feature.id, settings[role.id]?.[feature.id] ?? true)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        <p className="font-semibold mb-1">Leyenda:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Activado (✅) = La funcionalidad está visible para este rol</li>
          <li>Desactivado (❌) = La funcionalidad está oculta para este rol</li>
          <li>Los cambios se guardan automáticamente al hacer clic en "Guardar Cambios"</li>
        </ul>
      </div>
    </div>
  );
}
