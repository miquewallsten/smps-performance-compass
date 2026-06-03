import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTemplateQuestions, useLibraryQuestionsConfig, useCreateLibraryQuestionConfig, useUpdateLibraryQuestionConfig, useDeleteLibraryQuestionConfig } from '@/hooks/useEvaluationConfig';
import { SECTION_LABELS, SECTION_ORDER, getSectionByCategory, getPositionLabel, getCategories } from '@/lib/evaluationConfig';
import { QuestionCategory, EvalQuestion, LibraryQuestion, EvalSection, Position } from '@/types';
import { BookOpen, Search, Plus, Pencil, Trash2, Save, X, Download, SlidersHorizontal, ChevronDown, ChevronRight, XCircle, Hash, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function getCategoriesList(): QuestionCategory[] {
  const dbCats = getCategories();
  if (dbCats && dbCats.length > 0) {
    return dbCats.map((c: any) => c.label || c.id);
  }
  return [];
}

const SECTION_COLORS: Record<EvalSection, { border: string; bg: string; text: string; dot: string; bar: string }> = {
  competencias: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  tecnico:      { border: 'border-l-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  blandas:      { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
};

type GroupMode = 'section' | 'category' | 'position' | 'none';
type ViewMode = 'compact' | 'detailed';
type SortMode = 'alpha' | 'positions';

interface FilterChip {
  type: 'section' | 'category' | 'position';
  value: string;
  label: string;
}

interface QuestionItem {
  id: string;
  text: string;
  category: string;
  section: EvalSection;
  positions: string[];
  libraryId?: string;
  libraryQuestionId?: string;
}

export default function QuestionLibrary() {
  const { user: currentUser } = useAuth();
  const { data: templateQuestionsRaw = [] } = useTemplateQuestions();
  const { data: libraryQuestionsRaw = [] } = useLibraryQuestionsConfig();
  const addLibraryQuestion = useCreateLibraryQuestionConfig().mutate;
  const updateLibraryQuestion = useUpdateLibraryQuestionConfig().mutate;
  const deleteLibraryQuestion = useDeleteLibraryQuestionConfig().mutate;

  const canEdit = !!(currentUser?.isAdmin || currentUser?.isSuperUser);

  // Build position map using library_question_id for accurate tracking
  const questionPositionMap = useMemo(() => {
    const map = new Map<string, { positions: string[]; libraryQuestionId?: string }>();
    for (const q of templateQuestionsRaw as any[]) {
      const text = (q.questionText || q.text || '').trim();
      if (!text) continue;
      const pos = q.position;
      if (!pos) continue;
      const libQId = q.libraryQuestionId;

      if (!map.has(text)) {
        map.set(text, { positions: [], libraryQuestionId: libQId || undefined });
      }
      const entry = map.get(text)!;
      if (!entry.positions.includes(pos)) {
        entry.positions.push(pos);
      }
      // Store library_question_id if available
      if (libQId && !entry.libraryQuestionId) {
        entry.libraryQuestionId = libQId;
      }
    }
    return map;
  }, [templateQuestionsRaw]);

  // Build unified question list - FIXED: use library as primary source, merge template data correctly
  const allQuestions: QuestionItem[] = useMemo(() => {
    const questionMap = new Map<string, QuestionItem>();

    // Step 1: Add ALL library questions first (authoritative source)
    for (const q of libraryQuestionsRaw as any[]) {
      const text = (q.text || '').trim();
      if (!text) continue;

      const key = `lib-${q.id}`;
      const templateData = questionPositionMap.get(text);
      const positions = templateData?.positions || [];
      const section = (q.defaultSection as EvalSection) || getSectionByCategory(q.category);

      questionMap.set(key, {
        id: q.id,
        text,
        category: q.category,
        section,
        positions: [...positions],
        libraryId: q.id,
        libraryQuestionId: q.question_id,
      });
    }

    // Step 2: Add template-only questions (not in library) - use question_id to avoid duplicates
    for (const q of templateQuestionsRaw as any[]) {
      const text = (q.questionText || q.text || '').trim();
      if (!text) continue;

      const libQId = q.libraryQuestionId;

      // Skip if this template question already has a library entry
      if (libQId && questionMap.has(`lib-${libQId}`)) {
        continue;
      }

      // Check if we already have this exact text from library
      const existingByLibId = libQId ? questionMap.get(`lib-${libQId}`) : null;
      if (existingByLibId) continue;

      // Check if text already exists in map (avoid duplicates)
      const existingByText = Array.from(questionMap.values()).find(q => q.text === text);
      if (existingByText) {
        // Just add position to existing question
        const pos = q.position;
        if (pos && !existingByText.positions.includes(pos)) {
          existingByText.positions.push(pos);
        }
        continue;
      }

      // This is a template-only question (not in library)
      const key = `tpl-${q.id}`;
      const section = (q.section as EvalSection) || getSectionByCategory(q.category);
      const pos = q.position;

      questionMap.set(key, {
        id: q.id || `tpl-${Date.now()}`,
        text,
        category: q.category,
        section,
        positions: pos ? [pos] : [],
        libraryQuestionId: libQId || undefined,
      });
    }

    return Array.from(questionMap.values());
  }, [libraryQuestionsRaw, templateQuestionsRaw, questionPositionMap]);

  // State
  const [search, setSearch] = useState('');
  const [groupMode, setGroupMode] = useState<GroupMode>('category');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuestionItem | null>(null);
  const [form, setForm] = useState<{ category: string; text: string }>({ category: 'Desempeño', text: '' });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // All available positions from data
  const allPositions = useMemo(() => {
    const positions = new Set<string>();
    allQuestions.forEach(q => q.positions.forEach(p => positions.add(p)));
    return Array.from(positions).sort();
  }, [allQuestions]);

  // All available categories
  const allCategories = useMemo(() => {
    return [...new Set(allQuestions.map(q => q.category))].sort();
  }, [allQuestions]);

  // Filtering
  const filteredQuestions = useMemo(() => {
    let items = allQuestions;
    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter(i => i.text.toLowerCase().includes(s) || i.category.toLowerCase().includes(s));
    }
    for (const f of filters) {
      if (f.type === 'section') items = items.filter(i => i.section === f.value);
      if (f.type === 'category') items = items.filter(i => i.category === f.value);
      if (f.type === 'position') items = items.filter(i => i.positions.includes(f.value));
    }
    return items;
  }, [allQuestions, search, filters]);

  // Sorting
  const sortedQuestions = useMemo(() => {
    const items = [...filteredQuestions];
    if (sortMode === 'alpha') items.sort((a, b) => a.text.localeCompare(b.text, 'es'));
    if (sortMode === 'positions') items.sort((a, b) => b.positions.length - a.positions.length);
    return items;
  }, [filteredQuestions, sortMode]);

  // Grouping
  const grouped = useMemo(() => {
    const groups = new Map<string, QuestionItem[]>();
    if (groupMode === 'none') {
      groups.set('all', sortedQuestions);
    } else if (groupMode === 'section') {
      for (const section of SECTION_ORDER) {
        const items = sortedQuestions.filter(i => i.section === section);
        if (items.length > 0) groups.set(section, items);
      }
    } else if (groupMode === 'category') {
      for (const cat of allCategories) {
        const items = sortedQuestions.filter(i => i.category === cat);
        if (items.length > 0) groups.set(cat, items);
      }
    } else if (groupMode === 'position') {
      for (const pos of allPositions) {
        const items = sortedQuestions.filter(i => i.positions.includes(pos));
        if (items.length > 0) groups.set(pos, items);
      }
    }
    return groups;
  }, [sortedQuestions, groupMode, allCategories, allPositions]);

  // Stats
  const stats = useMemo(() => {
    const bySection: Record<EvalSection, number> = { competencias: 0, tecnico: 0, blandas: 0 };
    allQuestions.forEach(q => bySection[q.section]++);
    return {
      total: allQuestions.length,
      usedInTemplates: allQuestions.filter(q => q.positions.length > 0).length,
      notInTemplates: allQuestions.filter(q => q.positions.length === 0).length,
      bySection,
    };
  }, [allQuestions]);

  // Auto-expand groups
  useEffect(() => {
    setExpandedGroups(new Set(grouped.keys()));
  }, [grouped.size, groupMode]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const addFilter = (type: FilterChip['type'], value: string, label: string) => {
    if (filters.some(f => f.type === type && f.value === value)) return;
    setFilters(prev => [...prev, { type, value, label }]);
  };
  const removeFilter = (type: string, value: string) => setFilters(prev => prev.filter(f => !(f.type === type && f.value === value)));
  const clearFilters = () => setFilters([]);

  const openCreate = () => { setEditing(null); setForm({ category: 'Desempeño', text: '' }); setShowForm(true); };
  const openEdit = (q: QuestionItem) => { setEditing(q); setForm({ category: q.category, text: q.text }); setShowForm(true); };

  const handleSave = () => {
    if (!form.text.trim()) { toast.error('La pregunta no puede estar vacía'); return; }
    if (editing) {
      if (editing.libraryId) {
        updateLibraryQuestion({ id: editing.libraryId, category: form.category, text: form.text.trim() });
        toast.success('Pregunta actualizada');
      }
    } else {
      addLibraryQuestion({ category: form.category, text: form.text.trim() });
      toast.success('Pregunta creada');
    }
    setShowForm(false);
  };

  const handleDelete = (q: QuestionItem) => {
    if (q.positions.length > 0) {
      toast.error(`Esta pregunta se usa en ${q.positions.length} plantilla(s). Remuévala de las plantillas primero.`);
      return;
    }
    if (q.libraryId) {
      deleteLibraryQuestion(q.libraryId);
      toast.success('Pregunta eliminada');
    }
  };

  const getGroupLabel = (key: string) => {
    if (groupMode === 'section') return SECTION_LABELS[key as EvalSection] || key;
    if (groupMode === 'position') return getPositionLabel(key as Position) || key;
    return key;
  };

  const exportCSV = () => {
    const rows = [['Pregunta', 'Categoría', 'Sección', 'Puestos']];
    for (const q of sortedQuestions) {
      rows.push([q.text, q.category, SECTION_LABELS[q.section] || q.section, q.positions.map(p => getPositionLabel(p as Position) || p).join(', ')]);
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `preguntas-biblioteca-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Biblioteca de Preguntas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total} preguntas &middot; {stats.usedInTemplates} en plantillas{stats.notInTemplates > 0 ? ` · ${stats.notInTemplates} sin asignar` : ''}
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Nueva Pregunta
          </button>
        )}
      </div>

      {/* Section composition bar */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Distribución</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{stats.total} preguntas</span>
        </div>
        <div className="flex w-full h-3 rounded-full overflow-hidden bg-muted">
          {SECTION_ORDER.map(sec => {
            const count = stats.bySection[sec] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            const color = SECTION_COLORS[sec];
            if (pct === 0) return null;
            return (
              <button
                key={sec}
                onClick={() => {
                  const existing = filters.find(f => f.type === 'section' && f.value === sec);
                  if (existing) removeFilter('section', sec);
                  else addFilter('section', sec, SECTION_LABELS[sec]);
                }}
                className={`${color.bar} transition-[opacity] duration-150 hover:opacity-80 relative group`}
                style={{ width: `${pct}%` }}
                title={`${SECTION_LABELS[sec]}: ${count} (${Math.round(pct)}%)`}
              >
                {pct > 18 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90">{Math.round(pct)}%</span>}
              </button>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {SECTION_ORDER.map(sec => {
            const count = stats.bySection[sec] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            const color = SECTION_COLORS[sec];
            const isActive = filters.some(f => f.type === 'section' && f.value === sec);
            return (
              <button key={sec} onClick={() => {
                const existing = filters.find(f => f.type === 'section' && f.value === sec);
                if (existing) removeFilter('section', sec);
                else addFilter('section', sec, SECTION_LABELS[sec]);
              }}
                className={`flex items-center gap-1.5 text-xs transition-[opacity] duration-150 ${isActive ? 'opacity-100 font-medium' : 'opacity-60 hover:opacity-80'}`}>
                <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                <span className={isActive ? color.text : 'text-foreground'}>{SECTION_LABELS[sec]}</span>
                <span className="text-muted-foreground tabular-nums">{count}</span>
                <span className="text-muted-foreground/50 tabular-nums">({pct}%)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar preguntas..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters || filters.length > 0 ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-input hover:bg-muted'}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filtros
          {filters.length > 0 && <span className="ml-0.5 text-xs font-bold">{filters.length}</span>}
        </button>

        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-input bg-background">
          <button onClick={() => setGroupMode('section')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'section' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
            Sección
          </button>
          <button onClick={() => setGroupMode('category')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'category' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
            Categoría
          </button>
          <button onClick={() => setGroupMode('position')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'position' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
            Puesto
          </button>
          <button onClick={() => setGroupMode('none')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'none' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
            Lista
          </button>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-input bg-background">
          <button onClick={() => setSortMode('alpha')} className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${sortMode === 'alpha' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} title="Alfabético">
            A-Z
          </button>
          <button onClick={() => setSortMode('positions')} className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${sortMode === 'positions' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} title="Por uso">
            <Hash className="h-3 w-3" />
          </button>
        </div>

        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {/* Active filters */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map(f => (
            <span key={`${f.type}-${f.value}`} className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs">
              {f.label}
              <button onClick={() => removeFilter(f.type, f.value)} className="hover:bg-accent/20 rounded-full p-0.5"><XCircle className="h-3 w-3" /></button>
            </span>
          ))}
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground">Limpiar todo</button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="border rounded-lg p-3 space-y-3 bg-background">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Categoría</p>
            <div className="flex flex-wrap gap-1.5">
              {allCategories.map(cat => (
                <button key={cat} onClick={() => { filters.some(f => f.type === 'category' && f.value === cat) ? removeFilter('category', cat) : addFilter('category', cat, cat); }}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${filters.some(f => f.type === 'category' && f.value === cat) ? 'bg-accent text-accent-foreground border-accent' : 'border-input hover:bg-muted'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Puesto</p>
            <div className="flex flex-wrap gap-1.5">
              {allPositions.map(pos => (
                <button key={pos} onClick={() => { const label = getPositionLabel(pos as Position) || pos; filters.some(f => f.type === 'position' && f.value === pos) ? removeFilter('position', pos) : addFilter('position', pos, label); }}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${filters.some(f => f.type === 'position' && f.value === pos) ? 'bg-accent text-accent-foreground border-accent' : 'border-input hover:bg-muted'}`}>
                  {getPositionLabel(pos as Position) || pos}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count with validation */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {filteredQuestions.length === allQuestions.length ? `${allQuestions.length} preguntas` : `${filteredQuestions.length} de ${allQuestions.length} preguntas`}
        </p>
        {stats.notInTemplates > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            {stats.notInTemplates} sin plantilla
          </span>
        )}
        {stats.total === 144 && (
          <span className="flex items-center gap-1 text-xs text-smps-success">
            <CheckCircle2 className="h-3 w-3" />
            Biblioteca completa
          </span>
        )}
      </div>

      {/* Question groups */}
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([groupKey, items]) => (
          <div key={groupKey} className="border rounded-lg overflow-hidden">
            <button onClick={() => toggleGroup(groupKey)} className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {groupMode !== 'none' && (
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${groupMode === 'section' ? SECTION_COLORS[groupKey as EvalSection]?.dot || 'bg-gray-400' : groupMode === 'position' ? 'bg-blue-500' : 'bg-violet-500'}`} />
                )}
                <span className="text-sm font-medium">{getGroupLabel(groupKey)}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              {expandedGroups.has(groupKey) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expandedGroups.has(groupKey) && (
              <div className="divide-y divide-muted/30">
                {items.map((item, idx) => {
                  const color = SECTION_COLORS[item.section] || SECTION_COLORS.competencias;
                  const isLast = idx === items.length - 1;
                  return viewMode === 'compact' ? (
                    <div key={item.id} className={`px-4 py-2.5 ${!isLast ? 'border-b border-muted/30' : ''} hover:bg-muted/10 transition-colors`}>
                      <div className="flex items-start gap-3">
                        <span className={`w-1 h-8 rounded-full flex-shrink-0 mt-0.5 ${color.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">{item.text}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>{SECTION_LABELS[item.section]}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.category}</span>
                            {item.positions.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {item.positions.length} puesto{item.positions.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {item.positions.length === 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Sin plantilla
                              </span>
                            )}
                          </div>
                          {item.positions.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {item.positions.map(p => (
                                <span key={p} className="text-[9px] bg-muted/60 text-muted-foreground px-1 py-0.5 rounded">
                                  {getPositionLabel(p as Position) || p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className={`px-4 py-3.5 ${!isLast ? 'border-b border-muted/30' : ''} hover:bg-muted/10 transition-colors`}>
                      <div className="flex items-start gap-3">
                        <span className={`w-1 h-full min-h-[3rem] rounded-full flex-shrink-0 ${color.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{item.text}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>{SECTION_LABELS[item.section]}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.category}</span>
                            {item.positions.length > 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                En {item.positions.length} plantilla{item.positions.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Sin plantilla
                              </span>
                            )}
                          </div>
                          {item.positions.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {item.positions.map(p => (
                                <span key={p} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                  {getPositionLabel(p as Position) || p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="smps-surface-elevated w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                {editing ? 'Editar Pregunta' : 'Nueva Pregunta'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Texto de la pregunta</label>
                <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoría</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  {getCategoriesList().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">
                <Save className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
