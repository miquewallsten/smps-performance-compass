import { useState, useMemo } from 'react';
import { QUESTIONS_BY_POSITION } from '@/data/questions';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomQuestions, useSetCustomQuestions, useLibraryQuestions } from '@/api/queries';
import {
  POSITION_LABELS, LEGAL_HIERARCHY, ADMIN_HIERARCHY, Position, SCORE_LABELS,
  EvalQuestion, QuestionCategory, normalizePosition,
} from '@/types';
import { ChevronDown, ChevronRight, FileText, Plus, Trash2, AlertCircle, Save, BookOpen, Search } from 'lucide-react';

import { ALL_CATEGORIES } from './QuestionLibrary';

const MAX_QUESTIONS = 20;

export default function EvaluationTemplates() {
  const { user: currentUser } = useAuth();
  const { data: customQuestionsRaw } = useCustomQuestions();
  const customQuestions = useMemo(() => {
    if (!customQuestionsRaw || !Array.isArray(customQuestionsRaw)) return {} as Record<string, EvalQuestion[]>;
    const grouped: Record<string, EvalQuestion[]> = {};
    for (const q of customQuestionsRaw) {
      const pos = q.position || q.practiceArea;
      if (pos) { if (!grouped[pos]) grouped[pos] = []; grouped[pos].push(q); }
    }
    return grouped;
  }, [customQuestionsRaw]);
  const setCustomQuestions = useSetCustomQuestions().mutate;
  const { data: libraryQuestions = [] } = useLibraryQuestions();
  const [expandedPosition, setExpandedPosition] = useState<Position | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editQuestions, setEditQuestions] = useState<EvalQuestion[]>([]);
  const [newCategory, setNewCategory] = useState<QuestionCategory>('Desempeño');
  const [newText, setNewText] = useState('');
  const [newWeight, setNewWeight] = useState(5);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  const canEdit = currentUser?.isAdmin || currentUser?.isSuperUser;

  const toggle = (pos: Position) => {
    if (editingPosition) return;
    setExpandedPosition(prev => (prev === pos ? null : pos));
  };

  const getQuestions = (pos: Position): EvalQuestion[] => {
    const normalized = normalizePosition(pos);
    return customQuestions[normalized] || customQuestions[pos] || QUESTIONS_BY_POSITION[normalized] || QUESTIONS_BY_POSITION[pos] || [];
  };

  const startEditing = (pos: Position) => {
    setEditQuestions([...getQuestions(pos)]);
    setEditingPosition(pos);
    setExpandedPosition(pos);
  };

  const cancelEditing = () => {
    setEditingPosition(null);
    setEditQuestions([]);
  };

  const totalWeight = editQuestions.reduce((s, q) => s + q.weight, 0);
  const isValid = totalWeight === 100;

  const handleSave = () => {
    if (!editingPosition || !isValid) return;
    setCustomQuestions({ position: editingPosition, questions: editQuestions });
    setEditingPosition(null);
    setEditQuestions([]);
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
            <FileText className="h-5 w-5 text-accent flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold">{POSITION_LABELS[pos]}</p>
              <p className="text-xs text-muted-foreground">
                {questions.length} preguntas · {categories.length} categorías · Peso total: {tw}%
                {tw !== 100 && <span className="text-destructive ml-1">(debe ser 100%)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && !editingPosition && (
              <span
                onClick={e => { e.stopPropagation(); startEditing(pos); }}
                className="text-xs px-3 py-1 rounded-lg bg-accent text-accent-foreground hover:opacity-90 cursor-pointer"
              >
                Editar
              </span>
            )}
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="border-t px-5 py-4 space-y-5">
            {isEditing && (
              <div className={`p-3 rounded-lg border ${isValid ? 'bg-smps-success/10 border-smps-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {isValid ? (
                    <span className="text-smps-success">✓ Peso total: {totalWeight}% — Válido</span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> Peso total: {totalWeight}% — Debe ser exactamente 100%
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">{editQuestions.length}/{MAX_QUESTIONS} preguntas</span>
                </div>
              </div>
            )}

            {categories.map(cat => (
              <div key={cat}>
                <h4 className="text-sm font-semibold text-accent mb-2">{cat}</h4>
                <div className="space-y-2">
                  {questions
                    .filter(q => q.category === cat)
                    .map(q => (
                      <div
                        key={q.id}
                        className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg bg-muted/30"
                      >
                        <p className="text-sm text-foreground flex-1">{q.text}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {isEditing ? (
                            <>
                              <input
                                type="number"
                                value={q.weight}
                                onChange={e => handleWeightChange(q.id, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 rounded border border-input bg-background text-sm text-center"
                                min={1}
                                max={100}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                              <button onClick={() => handleRemoveQuestion(q.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {Math.round(q.weight)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {isEditing && editQuestions.length < MAX_QUESTIONS && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Agregar Pregunta
                  </h4>
                  <button onClick={() => setShowLibrary(true)}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input hover:bg-muted">
                    <BookOpen className="h-3.5 w-3.5" /> Importar de Biblioteca
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">Pregunta</label>
                    <input
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      placeholder="Texto de la pregunta..."
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Categoría</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as QuestionCategory)}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    >
                      {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Peso %</label>
                    <input
                      type="number"
                      value={newWeight}
                      onChange={e => setNewWeight(parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 rounded-lg border border-input bg-background text-sm text-center"
                      min={1} max={100}
                    />
                  </div>
                  <button
                    onClick={handleAddQuestion}
                    disabled={!newText.trim()}
                    className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}

            {isEditing && (
              <div className="border-t pt-4 flex gap-3">
                <button onClick={cancelEditing} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={!isValid}
                  className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" /> Guardar Cambios
                </button>
              </div>
            )}

            {!isEditing && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground font-medium">Escala de calificación:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground"
                    >
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
              {libraryQuestions.length > 0 && (
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                      placeholder="Buscar por texto o categoría..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                </div>
              )}
              {libraryQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay preguntas personalizadas en la biblioteca. Agrégalas desde "Biblioteca Preguntas".
                </p>
              )}
              {libraryQuestions.filter(q => !librarySearch || q.text.toLowerCase().includes(librarySearch.toLowerCase()) || q.category.toLowerCase().includes(librarySearch.toLowerCase())).map(q => {
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
