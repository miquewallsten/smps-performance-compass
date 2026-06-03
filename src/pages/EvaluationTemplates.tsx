import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTemplateQuestions, useSectionWeights, usePutTemplateQuestions, usePositionConfig, useScoreLabels, useLibraryQuestionsConfig, useCategories } from '@/hooks/useEvaluationConfig';
import {
  getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionLevel,
  SECTION_LABELS, SECTION_ORDER, getSectionWeights, getSectionByCategory,
} from '@/lib/evaluationConfig';
import { Position, QuestionCategory, EvalQuestion, EvalSection } from '@/types';
import { ChevronDown, ChevronRight, Trash2, AlertCircle, Save, BookOpen, Search, Pencil, Plus, CircleX } from 'lucide-react';
import { getCategoriesList } from './QuestionLibrary';
import { toast } from 'sonner';

const MAX_QUESTIONS = 20;

function rescale(questions: EvalQuestion[], sectionWeights: { tecnico: number; competencias: number; blandas: number }): EvalQuestion[] {
  const tecnico = questions.filter(q => q.section === 'tecnico');
  const competencias = questions.filter(q => q.section === 'competencias');
  const blandas = questions.filter(q => q.section === 'blandas');
  const doRescale = (qs: EvalQuestion[], target: number): EvalQuestion[] => {
    if (qs.length === 0 || target <= 0) return [];
    const sum = qs.reduce((s, q) => s + (q.weight || 1), 0) || qs.length;
    return qs.map(q => ({ ...q, weight: Math.round(((q.weight || 1) / sum) * target * 100) / 100 }));
  };
  return [
    ...doRescale(tecnico, sectionWeights.tecnico),
    ...doRescale(competencias, sectionWeights.competencias),
    ...doRescale(blandas, sectionWeights.blandas),
  ];
}

export default function EvaluationTemplates() {
  const { user: currentUser } = useAuth();
  const { data: posConfig } = usePositionConfig();
  const { data: scoreLabelsData } = useScoreLabels();
  const { data: libQuestions = [] } = useLibraryQuestionsConfig();
  const { data: allQuestions = [] } = useTemplateQuestions();
  const { data: sectionWeightsData = [] } = useSectionWeights();

  const [expandedPosition, setExpandedPosition] = useState<Position | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editQuestions, setEditQuestions] = useState<EvalQuestion[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedPracticeArea, setSelectedPracticeArea] = useState<Record<string, string>>({});

  const PRACTICE_AREAS = [
    { key: 'corporativo', label: 'Corporativo' },
    { key: 'consultoria_fiscal', label: 'Consultoría Fiscal' },
    { key: 'litigio_fiscal', label: 'Litigio Fiscal' },
  ];

  const canEdit = currentUser?.isAdmin || currentUser?.isSuperUser;

  const SCORE_LABELS = useMemo(() => {
    if (scoreLabelsData && scoreLabelsData.length > 0) {
      const m: Record<number, string> = {};
      for (const s of scoreLabelsData) m[s.score] = s.label;
      return m;
    }
    return { 1: 'Deficiente', 2: 'Necesita Mejorar', 3: 'Satisfactorio', 4: 'Bueno', 5: 'Excelente' };
  }, [scoreLabelsData]);

  const LEGAL_HIERARCHY = getLegalHierarchy();
  const ADMIN_HIERARCHY = getAdminHierarchy();

  // Build section weights lookup
  const sectionWeightsMap = useMemo(() => {
    const map: Record<string, { tecnico: number; competencias: number; blandas: number }> = {};
    for (const sw of sectionWeightsData) {
      map[sw.position] = { tecnico: sw.tecnico, competencias: sw.competencias, blandas: sw.blandas };
    }
    return map;
  }, [sectionWeightsData]);

  // Legal positions (have técnico section with practice area variants)
  const LEGAL_POSITIONS = new Set(['socio', 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante', 'pasante_corporativo']);

  // Group all questions by position, filtered by practice area for legal positions
  const templatesByPosition = useMemo(() => {
    const grouped: Record<string, EvalQuestion[]> = {};
    for (const q of allQuestions) {
      if (!q.isActive && q.isActive !== undefined) continue;
      const pos = q.position;
      if (!grouped[pos]) grouped[pos] = [];
      grouped[pos].push({
        id: q.questionId || q.question_id || q.id,
        category: q.category,
        text: q.questionText || q.text || q.question_text || '',
        weight: q.weight || 1,
        section: q.section,
        practiceArea: q.practiceArea || q.practice_area,
      });
    }
    // For legal positions, filter técnico questions by selected practice area
    const filtered: Record<string, EvalQuestion[]> = {};
    for (const [pos, qs] of Object.entries(grouped)) {
      if (LEGAL_POSITIONS.has(pos)) {
        const pa = selectedPracticeArea[pos] || 'corporativo';
        const tecnicoForArea = qs.filter(q => q.section === 'tecnico' && (q.practiceArea === pa || (!q.practiceArea && pa === 'corporativo')));
        const nonTecnico = qs.filter(q => q.section !== 'tecnico');
        filtered[pos] = [...tecnicoForArea, ...nonTecnico];
      } else {
        filtered[pos] = qs;
      }
    }
    // Rescale each position's questions using section weights
    const rescaled: Record<string, EvalQuestion[]> = {};
    for (const [pos, qs] of Object.entries(filtered)) {
      const sw = sectionWeightsMap[pos] || { tecnico: 0, competencias: 80, blandas: 20 };
      rescaled[pos] = rescale(qs, sw);
    }
    return rescaled;
  }, [allQuestions, sectionWeightsMap, selectedPracticeArea]);

  // Filtered library questions for inline picker
  const filteredLibQuestions = useMemo(() => {
    const search = librarySearch.toLowerCase();
    return (libQuestions as any[]).filter(q => {
      if (!search) return true;
      return (q.text || '').toLowerCase().includes(search) || (q.category || '').toLowerCase().includes(search);
    });
  }, [libQuestions, librarySearch]);

  const toggle = (pos: Position) => {
    if (editingPosition) return;
    setExpandedPosition(prev => (prev === pos ? null : pos));
  };

  const getQuestions = (pos: Position): EvalQuestion[] => {
    return templatesByPosition[pos] || [];
  };

  const startEditing = (pos: Position) => {
    const questions = getQuestions(pos);
    setEditQuestions([...questions]);
    setEditingPosition(pos);
    setExpandedPosition(pos);
  };

  const cancelEditing = () => {
    setEditingPosition(null);
    setEditQuestions([]);
  };

  const putTemplate = usePutTemplateQuestions();

  const totalWeight = editQuestions.reduce((s, q) => s + q.weight, 0);
  const isValid = totalWeight === 100;

  const handleSave = () => {
    if (!editingPosition) return;
    if (!isValid) {
      const diff = totalWeight - 100;
      toast.error(
        `Peso inválido: ${totalWeight}% (debe ser 100%). ${diff > 0 ? 'Reduce' : 'Aumenta'} ${Math.abs(diff)}%.`,
        { icon: <CircleX className="h-4 w-4 text-red-500" /> }
      );
      return;
    }
    const questions = editQuestions.map((q, i) => ({
      id: q.id,
      questionId: q.id,
      position: editingPosition,
      practiceArea: q.practiceArea || 'corporativo',
      section: q.section || 'competencias',
      category: q.category,
      questionText: q.text,
      weight: q.weight,
      sortOrder: i + 1,
    }));
    putTemplate.mutate({ position: editingPosition, questions }, {
      onSuccess: () => {
        setEditingPosition(null);
        setEditQuestions([]);
        toast.success('Plantilla guardada correctamente');
      }
    });
  };

  const handleRemoveQuestion = (id: string) => {
    setEditQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleWeightChange = (id: string, weight: number) => {
    setEditQuestions(prev => prev.map(q => q.id === id ? { ...q, weight: Math.max(1, Math.min(100, weight)) } : q));
  };

  const handleAddFromLibrary = (q: any) => {
    if (editQuestions.length >= MAX_QUESTIONS) return;
    const already = editQuestions.some(e => e.text.trim().toLowerCase() === (q.text || '').trim().toLowerCase());
    if (already) return;
    const id = `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const section = (q.defaultSection as EvalSection) || getSectionByCategory(q.category);
    setEditQuestions(prev => [...prev, { id, category: q.category, text: q.text, weight: q.defaultWeight || 5, section, practiceArea: q.practiceArea }]);
  };

  const renderPositionCard = (pos: Position) => {
    const questions = editingPosition === pos ? editQuestions : getQuestions(pos);
    const categories = [...new Set(questions.map(q => q.category))];
    const isOpen = expandedPosition === pos;
    const tw = questions.reduce((s, q) => s + q.weight, 0);
    const isEditing = editingPosition === pos;

    return (
      <div key={pos} className="bg-card rounded-xl border overflow-hidden">
        <button
          onClick={() => toggle(pos)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          disabled={!!editingPosition && editingPosition !== pos}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-display font-semibold">{getPositionLabel(pos)}</span>
            <span className="text-xs text-muted-foreground">{questions.length} pregunta{questions.length !== 1 ? 's' : ''}</span><span className="text-xs text-muted-foreground"> · {tw}%</span>
          </div>
          <div className="flex items-center gap-2">
            {posConfig && <span className="text-xs text-muted-foreground">{getPositionLevel(pos) === 'legal' ? '⚖️ Legal' : '📊 Administrativo'}</span>}
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {isOpen && (
          <div className="px-5 pb-5 border-t">
            {/* Practice area tabs for legal positions */}
            {LEGAL_POSITIONS.has(pos) && !isEditing && (
              <div className="flex gap-2 mb-4">
                {PRACTICE_AREAS.map(pa => (
                  <button
                    key={pa.key}
                    onClick={() => setSelectedPracticeArea(prev => ({ ...prev, [pos]: pa.key }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      (selectedPracticeArea[pos] || 'corporativo') === pa.key
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {pa.label}
                  </button>
                ))}
              </div>
            )}
            {questions.length === 0 && !isEditing && (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin preguntas configuradas</p>
            )}

            {categories.map(cat => {
              const catQs = questions.filter(q => q.category === cat);
              if (catQs.length === 0) return null;
              return (
                <div key={cat} className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat}</p>
                  <div className="space-y-1.5">
                    {catQs.map(q => (
                      <div key={q.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/40">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleWeightChange(q.id, q.weight - 1)} className="text-xs text-muted-foreground hover:text-foreground px-0.5">−</button>
                            <span className="text-xs font-medium w-8 text-center tabular-nums">{Math.round(q.weight)}%</span>
                            <button onClick={() => handleWeightChange(q.id, q.weight + 1)} className="text-xs text-muted-foreground hover:text-foreground px-0.5">+</button>
                            <span className="text-sm flex-1">{q.text}</span>
                            <button onClick={() => handleRemoveQuestion(q.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(q.weight)}%</span>
                        )}
                        {!isEditing && <span className="text-sm">{q.text}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {isEditing && (
              <div className="pt-3 border-t space-y-3">
                {/* Inline Library Picker — only way to add questions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Agregar desde Biblioteca
                    </p>
                    {editQuestions.length >= MAX_QUESTIONS && (
                      <p className="text-xs text-smps-warning flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Máximo {MAX_QUESTIONS} preguntas</p>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                      placeholder="Buscar pregunta en la biblioteca..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {filteredLibQuestions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {librarySearch ? 'Sin resultados para esta búsqueda' : 'No hay preguntas en la biblioteca. Agrega preguntas desde "Biblioteca de Preguntas".'}
                      </p>
                    )}
                    {filteredLibQuestions.map((q: any) => {
                      const already = editQuestions.some(e => e.text.trim().toLowerCase() === (q.text || '').trim().toLowerCase());
                      return (
                        <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg border hover:bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-tight">{q.text}</p>
                            <div className="flex gap-1.5 mt-0.5">
                              <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{q.category}</span>
                              {q.defaultSection && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{q.defaultSection === 'tecnico' ? 'Técnico' : q.defaultSection === 'blandas' ? 'Blandas' : 'Competencias'}</span>}
                            </div>
                          </div>
                          <button
                            disabled={already || editQuestions.length >= MAX_QUESTIONS}
                            onClick={() => handleAddFromLibrary(q)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-40 whitespace-nowrap shrink-0"
                          >
                            {already ? '✓ Añadida' : '+ Agregar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {!isValid && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">
                        Peso total: {totalWeight}% — {totalWeight > 100 ? 'excede' : 'faltan'} {Math.abs(totalWeight - 100)}% para completar 100%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isValid ? 'text-smps-success' : 'text-smps-warning'}`}>
                      {isValid ? '✓ Peso correcto' : `Peso: ${totalWeight}% (debe ser 100%)`}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={cancelEditing} className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted">Cancelar</button>
                      <button onClick={handleSave} disabled={!isValid || putTemplate.isPending}
                        className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
                        <Save className="h-3.5 w-3.5" /> {putTemplate.isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isEditing && canEdit && (
              <div className="flex gap-2 pt-2">
                <button onClick={() => startEditing(pos)} className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 flex items-center gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
              </div>
            )}

            {!isEditing && questions.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground font-medium">Escala de calificación:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground">
                      {s} — {SCORE_LABELS[s]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Evaluaciones</h1>
        <p className="text-muted-foreground text-sm">
          Configuración de evaluaciones por nivel y posición. Las preguntas se agregan desde la Biblioteca de Preguntas.
          {!canEdit && ' (solo lectura)'}
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Nivel Legal
          </h2>
          <div className="space-y-2">
            {LEGAL_HIERARCHY.map(pos => renderPositionCard(pos))}
          </div>
        </div>

        <div>
          <h2 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Nivel Administrativo
          </h2>
          <div className="space-y-2">
            {ADMIN_HIERARCHY.map(pos => renderPositionCard(pos))}
          </div>
        </div>
      </div>
    </div>
  );
}
