import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HelpCircle, ClipboardCheck, ClipboardList, FileText, Target, Map, BarChart3, Users, UserCheck, Megaphone, Settings, BookOpen, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useSystemModules, useSystemStatus, usePeriods, useAnnouncements, useVacationRequests } from '@/api/queries';
import { CURRENT_PERIOD } from '@/types';
import { POSITION_LABELS, POSITION_LEVELS, Position, LEGAL_HIERARCHY, ADMIN_HIERARCHY } from '@/types';
import { COMPETENCIES_BY_POSITION } from '@/data/competencyDictionary';

type Audience = 'all' | 'admin' | 'evaluator' | 'staff';
type Module = 'communications' | 'vacations';

interface SmartItem {
  letter: string;
  title: string;
  detail: string;
}

interface Section {
  icon: any;
  title: string;
  desc: string;
  audiences: Audience[];
  module?: Module; // si el módulo está desactivado, no se muestra
  smartDesc?: SmartItem[];
}

const sections: Section[] = [
  { icon: ClipboardCheck, title: 'Mi Evaluación (Autoevaluación)', audiences: ['all'],
    desc: 'Cada colaborador completa su autoevaluación al inicio del periodo. Selecciona la opción que mejor describe tu desempeño en cada pregunta. Puedes marcar "Sin Elementos" o "No Aplica" si la pregunta no es relevante. Los comentarios son obligatorios.' },
  { icon: ClipboardList, title: 'Evaluar Equipo', audiences: ['evaluator', 'admin'],
    desc: 'Los evaluadores asignados completan la evaluación de cada miembro de su equipo. Una vez enviada, la evaluación no puede modificarse. Tras todas las evaluaciones, debe celebrarse la sesión de feedback y aprobarse el plan de acción.' },
  { icon: FileText, title: 'Evaluaciones (Plantillas)', audiences: ['admin'],
    desc: 'Solo Administradores pueden modificar plantillas. Cada nivel tiene preguntas configurables, máximo 20, y la suma de pesos debe ser exactamente 100%.' },
  { icon: Target, title: 'Plan de Acción', audiences: ['all'],
    desc: 'En función de los resultados de la Evaluación de Desempeño, en conjunto con el colaborador establezcan entre 1 a 3 objetivos de trabajo para mejorar su desempeño. Redacta objetivos que cumplan con las características S.M.A.R.T. y estén enfocados a las competencias.',
    smartDesc: [
      { letter: 'S', title: 'Específico (Specific)', detail: 'Acciones requeridas lo más detallado posible.' },
      { letter: 'M', title: 'Medible (Mensurable)', detail: 'Puntos de referencia para medir el progreso y eficacia (índices, frecuencia, cantidad, porcentaje, etc.).' },
      { letter: 'A', title: 'Alcanzable (Achievable)', detail: 'Que exista la posibilidad de llegar a las proyecciones.' },
      { letter: 'R', title: 'Orientado hacia los resultados (Result-oriented)', detail: 'Enfocados en lo que se quiere, no en lo que NO se quiere.' },
      { letter: 'T', title: 'Con tiempo determinado (Time-limited)', detail: 'Con un tiempo definido para lograrlo.' },
    ]
  },
  { icon: BookOpen, title: 'Biblioteca de Preguntas', audiences: ['admin'],
    desc: 'Catálogo de preguntas existentes agrupadas por categoría. Puedes agregar, editar o eliminar preguntas personalizadas, e importarlas al crear una plantilla.' },
  { icon: Target, title: 'Objetivos Personales', audiences: ['admin', 'evaluator'],
    desc: 'Cada empleado tiene objetivos del periodo. Personal Legal: 15 metas numéricas. Personal Administrativo: hasta 5 objetivos cualitativos con % de avance. Se pueden cargar masivamente vía CSV/Excel.' },
  { icon: Map, title: 'Mapa de Evaluaciones', audiences: ['admin', 'evaluator'],
    desc: 'Vista jerárquica del organigrama y las relaciones evaluador → evaluado del periodo.' },
  { icon: BarChart3, title: 'Reportes', audiences: ['all'],
    desc: 'Métricas gráficas: avance por etapa, autoevaluaciones por nivel, evaluaciones realizadas, promedios. Filtrable por Todos / Legal / Administrativo.' },
  { icon: Users, title: 'Gestión de Usuarios', audiences: ['admin'],
    desc: 'Alta, baja y modificación de usuarios. Solo administradores pueden crear o desactivar. Las contraseñas se administran centralmente. Pueden coexistir hasta dos administradores; solo el principal designa al segundo.' },
  { icon: UserCheck, title: 'Asignar Evaluadores', audiences: ['admin'],
    desc: 'Designa quién evalúa a quién por periodo. Un colaborador puede tener varios evaluadores y su calificación se promediará.' },
  { icon: Calendar, title: 'Configuración de Periodos', audiences: ['admin'],
    desc: 'Solo administradores. Define fechas de inicio y fin de cada etapa. Los usuarios reciben una alerta dos meses antes del cierre del periodo.' },
  { icon: Megaphone, title: 'Comunicación', audiences: ['all'], module: 'communications',
    desc: 'Tablón de anuncios. Administradores y Socios publican; el resto solo ve "General" y los de su área. Cada comunicado tiene vigencia y luego pasa al histórico. Los usuarios deben marcar como leído.' },
  { icon: Settings, title: 'Mi Perfil', audiences: ['all'],
    desc: 'Consulta tus datos, evaluaciones recibidas por periodo, comparativo vs. periodo anterior, y completa tu plan de acción.' },
];

export default function Help() {
  const { user: currentUser } = useAuth();
  const { data: assignments = [] } = useAssignments(CURRENT_PERIOD);
  const { data: moduleConfig } = useSystemModules();
  const [searchParams] = useSearchParams();
  const competenciesRef = useRef<HTMLDivElement | null>(null);

  const userDefaultPos: Position = (currentUser && currentUser.position !== 'dummy')
    ? currentUser.position
    : 'asociado_jr';
  const paramPos = searchParams.get('position') as Position | null;
  const [selectedPos, setSelectedPos] = useState<Position>(paramPos || userDefaultPos);
  const autoOpenComp = searchParams.get('open') === 'competencias';

  // Si cambia el usuario o el query param, re-sincroniza el selector.
  useEffect(() => {
    setSelectedPos(paramPos || userDefaultPos);
  }, [paramPos, userDefaultPos]);

  useEffect(() => {
    if (autoOpenComp && competenciesRef.current) {
      competenciesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [autoOpenComp]);

  const audience: Audience = useMemo(() => {
    if (!currentUser) return 'staff';
    if (currentUser.isAdmin || currentUser.isSuperUser) return 'admin';
    const isEvaluator = assignments.some(a => a.supervisorId === currentUser.id);
    if (currentUser.position === 'socio' || currentUser.position === 'salary_partner' || isEvaluator) return 'evaluator';
    return 'staff';
  }, [currentUser, assignments]);

  const visible = sections.filter(s => {
    if (s.module && !moduleConfig?.[s.module]) return false;
    return s.audiences.includes('all') || s.audiences.includes(audience);
  });

  const levelLabel = currentUser ? (POSITION_LEVELS[currentUser.position] === 'legal' ? 'Legal' : 'Administrativo') : '';
  const competencies = COMPETENCIES_BY_POSITION[selectedPos] || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <HelpCircle className="h-10 w-10" />
          <div>
            <h1 className="font-display text-3xl font-bold">Centro de Ayuda</h1>
            <p className="text-sm opacity-80 mt-1">
              Guía personalizada según tu perfil{levelLabel ? ` · ${levelLabel}` : ''}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
          <p className="text-sm">
            <strong>Bienvenido.</strong> A continuación encontrarás solo las secciones relevantes para tu perfil.
            Si tienes dudas adicionales, contacta al administrador.
          </p>
        </div>

        {/* Diccionario de Competencias */}
        <section ref={competenciesRef} className={`smps-surface-card ${autoOpenComp ? 'ring-2 ring-accent' : ''}`}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-base font-semibold mb-1">Diccionario de Competencias</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Define lo que se espera en cada posición. Selecciona una posición para ver las competencias que aplican y su definición.
              </p>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-muted-foreground">Posición</label>
            <select value={selectedPos} onChange={e => setSelectedPos(e.target.value as Position)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <optgroup label="Legal">
                {LEGAL_HIERARCHY.map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
              </optgroup>
              <optgroup label="Administrativo">
                {ADMIN_HIERARCHY.map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
              </optgroup>
            </select>
          </div>
          {competencies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin competencias definidas para esta posición.</p>
          ) : (
            <div className="space-y-3">
              {competencies.map((c, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-accent mb-1">{c.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.definition}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {visible.map((s, i) => (
          <section key={i} className="smps-surface-card hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-base font-semibold mb-1">{s.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                {s.smartDesc && (
                  <div className="mt-3 space-y-2">
                    {s.smartDesc.map((item, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">{item.letter}</span>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}

        <div className="text-center text-xs text-muted-foreground pt-6 pb-4">
          Powered by Bowdot
        </div>
      </main>
    </div>
  );
}
