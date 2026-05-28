import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFullTemplate, useSectionWeights, usePutTemplateQuestions, usePositionConfig, useScoreLabels, useLibraryQuestionsConfig, useCategories } from '@/hooks/useEvaluationConfig';
import {
  getPositionLabel, getLegalHierarchy, getAdminHierarchy, getPositionLevel,
  SECTION_LABELS, SECTION_ORDER, normalizePosition,
} from '@/lib/evaluationConfig';
import { Position, QuestionCategory, EvalQuestion } from '@/types';
import { ChevronDown, ChevronRight, FileText, Plus, Trash2, AlertCircle, Save, BookOpen, Search, Pencil } from 'lucide-react';
import { ALL_CATEGORIES } from './QuestionLibrary';

const MAX_QUESTIONS = 20;

export default function EvaluationTemplates() {
  const { user: currentUser } = useAuth();
  const { data: posConfig } = usePositionConfig();
  const { data: scoreLabelsData } = useScoreLabels();
  const { data: libQuestions = [] } = useLibraryQuestionsConfig();

  const [expandedPosition, setExpandedPosition] = useState<Position | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editQuestions, setEditQuestions] = useState<EvalQuestion[]>([]);
  const [newCategory, setNewCategory] = useState<QuestionCategory>('Desempeño');
  const [newText, setNewText] = useState('');
  const [newWeight, setNewWeight] = useState(5);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

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

  const toggle = (pos: Position) => {
    if (editingPosition) return;
    setExpandedPosition(prev => (prev === pos ? null : pos));
  };

  // Fetch full template when viewing a position
  const { data: templateData } = useFullTemplate(expandedPosition || 'socio', currentUser?.practiceArea || 'corporativo');

  const getQuestions = (pos: Position): EvalQuestion[] => {
    // Use the full template from API if available
    if (templateData && templateData.questions && expandedPosition === pos) {
      return templateData.questions.map((q: any) => ({
        id: q.question_id || q.id,
        category: q.category,
        text: q.question_text || q.text,
        weight: q.weight,
        section: q.section,
        practiceArea: q.practice_area,
      }));
    }
    return [];
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
    if (!editingPosition || !isValid) return;
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
      }
    });
  };

  const handleAddQuestion = () => {
    if (!newText.trim() || editQuestions.length >= MAX_QUESTIONS) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEditQuestions(prev => [...prev, { id, category: newCategory, text: newText.trim(), weight: newWeight }]);
    setNewText('');
    setNewWeight(5);
  };

  const handleRemoveQuestion = (id: string) => {
    setEditQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleWeightChange = (id: string, weight: number) => {
    setEditQuestions(prev => prev.map(q => q.id === id ? { ...q, weight: Math.max(1, Math.min(100, weight)) } : q));
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
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="font-display font-semibold">{getPositionLabel(pos)}</span>
            <span className="text-xs text-muted-foreground">{questions.length} preguntas</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium ${tw === 100 ? 'text-smps-success' : 'text-smps-warning'}`}>
              Σ {tw}%
            </span>
            {questions.length > 0 && categories.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{categories.length} categorías</span>
            )}
          </div>
        </button>

        {isOpen && (
          <div className="px-5 pb-4 space-y-4">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay preguntas configuradas para esta posición.</p>
            ) : (
              categories.map(cat => {
                const catQuestions = questions.filter(q => q.category === cat);
                const catWeight = catQuestions.reduce((s, q) => s + q.weight, 0);
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">{cat}</span>
                      <span className="text-[10px] text-muted-foreground">{catWeight}%</span>
                    </div>
                    <div className="space-y-1.5">
                      {catQuestions.map(q => (
                        <div key={q.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/30">
                          <span className="flex-1">{q.text}</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input type="number" min={1} max={100} value={q.weight}
                                onChange={e => handleWeightChange(q.id, parseInt(e.target.value) || 1)}
                                className="w-14 px-1.5 py-0.5 text-xs rounded border border-input bg-background text-center" />
                              <button onClick={() => handleRemoveQuestion(q.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground w-10 text-right">{Math.round(q.weight)}%</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {isEditing && (
              <div className="pt-3 border-t space-y-2">
                <div className="flex gap-2">
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value as QuestionCategory)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-sm">
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" value={newText} onChange={e => setNewText(e.target.value)}
                    placeholder="Nueva pregunta..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm" />
                  <input type="number" min={1} max={100} value={newWeight} onChange={e => setNewWeight(parseInt(e.target.value) || 5)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-center" />
                  <button onClick={handleAddQuestion} disabled={!newText.trim() || editQuestions.length >= MAX_QUESTIONS}
                    className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </button>
                </div>
                {editQuestions.length >= MAX_QUESTIONS && (
                  <p className="text-xs text-smps-warning flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Máximo {MAX_QUESTIONS} preguntas</p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs font-medium ${isValid ? 'text-smps-success' : 'text-smps-warning'}`}>
                    Peso total: {totalWeight}% {isValid ? '✓' : `(debe ser 100%)`}
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

  // Need Pencil from lucide

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Evaluaciones</h1>
        <p className="text-muted-foreground text-sm">
          Configuración de evaluaciones por nivel y posición
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

      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={() => setShowLibrary(false)}>
          <div className="bg-card rounded-xl border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="font-display font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Importar de Biblioteca</h3>
              <button onClick={() => { setShowLibrary(false); setLibrarySearch(''); }} className="text-sm text-muted-foreground hover:text-foreground">Cerrar</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {libQuestions.length > 0 && (
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                      placeholder="Buscar por texto o categoría..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                </div>
              )}
              {libQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay preguntas personalizadas en la biblioteca. Agrégalas desde "Biblioteca Preguntas".
                </p>
              )}
              {libQuestions.filter(q => !librarySearch || q.text.toLowerCase().includes(librarySearch.toLowerCase()) || q.category.toLowerCase().includes(librarySearch.toLowerCase())).map(q => {
                const already = editQuestions.some(e => e.text.trim().toLowerCase() === q.text.trim().toLowerCase());
                return (
                  <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30">
                    <div className="flex-1">
                      <p className="text-sm">{q.text}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">{q.category}</span>
                      </div>
                    </div>
                    <button
                      disabled={already || editQuestions.length >= MAX_QUESTIONS}
                      onClick={() => {
                        const id = `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                        setEditQuestions(prev => [...prev, { id, category: q.category, text: q.text, weight: 5 }]);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-40"
                    >
                      {already ? 'Ya añadida' : 'Agregar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
