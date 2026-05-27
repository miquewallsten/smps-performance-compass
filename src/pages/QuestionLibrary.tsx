import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomQuestions, useLibraryQuestions, useCreateLibraryQuestion, useUpdateLibraryQuestion, useDeleteLibraryQuestion, useSeedOverrides, useUpdateSeedOverride } from '@/api/queries';
import { QUESTIONS_BY_POSITION, getSectionByCategory, SECTION_LABELS, SECTION_ORDER } from '@/data/questions';
import { POSITION_LABELS, QuestionCategory, EvalQuestion, LibraryQuestion, EvalSection, POSITION_LEVELS, Position } from '@/types';
import { BookOpen, Search, Plus, Pencil, Trash2, Save, X, Download, SlidersHorizontal, Layers, ChevronDown, ChevronRight, XCircle, LayoutList, LayoutGrid, Hash } from 'lucide-react';
import { toast } from 'sonner';

const ALL_CATEGORIES: QuestionCategory[] = [
  'Criterio Técnico', 'Desempeño', 'Liderazgo', 'Cumplimiento', 'Habilidades Blandas',
  'Trabajo en Equipo', 'Actitud', 'Disponibilidad', 'Desarrollo',
];

type SeedItem = EvalQuestion & { positions: string[]; isSeed: true; section: EvalSection };
type CustomItem = LibraryQuestion & { isSeed: false };
type GroupMode = 'section' | 'category' | 'position' | 'none';
type ViewMode = 'compact' | 'detailed';
type SortMode = 'weight' | 'alpha' | 'positions';

const SECTION_COLORS: Record<EvalSection, { border: string; bg: string; text: string; dot: string }> = {
  competencias: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  tecnico:      { border: 'border-l-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  blandas:      { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

interface FilterChip {
  type: 'section' | 'category' | 'position' | 'type';
  value: string;
  label: string;
}

export default function QuestionLibrary() {
  const { user: currentUser } = useAuth();
  const { data: customQuestions = [] } = useCustomQuestions();
  const { data: libraryQuestions = [] } = useLibraryQuestions();
  const addLibraryQuestion = useCreateLibraryQuestion().mutate;
  const updateLibraryQuestion = useUpdateLibraryQuestion().mutate;
  const deleteLibraryQuestion = useDeleteLibraryQuestion().mutate;
  const { data: seedOverrides = [] } = useSeedOverrides();
  const updateSeedQuestion = useUpdateSeedOverride().mutate;
  const hideSeedQuestion = (id: string) => updateSeedQuestion({ id, hidden: true });

  const [search, setSearch] = useState('');
  const [groupMode, setGroupMode] = useState<GroupMode>('section');
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [sortMode, setSortMode] = useState<SortMode>('weight');
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ kind: 'lib'; q: LibraryQuestion } | { kind: 'seed'; q: SeedItem } | null>(null);
  const [form, setForm] = useState<{ category: QuestionCategory; text: string; defaultWeight: number }>({
    category: 'Desempeño', text: '', defaultWeight: 5,
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');

  const canEdit = !!(currentUser?.isAdmin || currentUser?.isSuperUser);
  const isSuperUser = !!currentUser?.isSuperUser;

  // Build seed questions with overrides
  const seedByCategory = useMemo(() => {
    const seen = new Map<string, SeedItem>();
    const map: Record<string, SeedItem[]> = {};
    Object.entries(QUESTIONS_BY_POSITION).forEach(([pos, questions]) => {
      if (pos === 'dummy' && !isSuperUser) return;
      const effective = customQuestions[pos] || questions;
      effective.forEach(q => {
        const ov = seedOverrides[q.id];
        if (ov?.hidden) return;
        const text = (ov?.text ?? q.text).trim();
        const category = (ov?.category as QuestionCategory) ?? q.category;
        const weight = ov?.weight ?? q.weight;
        const key = `${category}::${text.toLowerCase()}`;
        const section = getSectionByCategory(category);
        if (seen.has(key)) {
          const found = seen.get(key)!;
          if (!found.positions.includes(pos)) found.positions.push(pos);
          return;
        }
        const item: SeedItem = { ...q, text, category, weight, positions: [pos], isSeed: true, section };
        seen.set(key, item);
        if (!map[category]) map[category] = [];
        map[category].push(item);
      });
    });
    return map;
  }, [customQuestions, isSuperUser, seedOverrides]);

  if (!canEdit) {
    return <p className="text-center py-12 text-muted-foreground">Acceso restringido al administrador.</p>;
  }

  // All unique seed items
  const allSeedItems = useMemo(() => {
    const items: SeedItem[] = [];
    const seen = new Set<string>();
    for (const list of Object.values(seedByCategory)) {
      for (const q of list) {
        if (!seen.has(q.id)) { seen.add(q.id); items.push(q); }
      }
    }
    return items;
  }, [seedByCategory]);

  // Combined items for rendering
  type DisplayItem = { id: string; text: string; category: QuestionCategory; section: EvalSection; weight: number; isSeed: boolean; positions: string[]; rawQuestion: SeedItem | LibraryQuestion };
  const allItems: DisplayItem[] = useMemo(() => {
    const seedItems: DisplayItem[] = allSeedItems.map(q => ({
      id: q.id, text: q.text, category: q.category, section: q.section, weight: q.weight, isSeed: true, positions: q.positions, rawQuestion: q,
    }));
    const customItems: DisplayItem[] = libraryQuestions.map(q => ({
      id: q.id, text: q.text, category: q.category, section: getSectionByCategory(q.category), weight: q.defaultWeight, isSeed: false, positions: [], rawQuestion: q,
    }));
    return [...seedItems, ...customItems];
  }, [allSeedItems, libraryQuestions]);

  // Apply filters and search
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter(i => i.text.toLowerCase().includes(s) || i.category.toLowerCase().includes(s));
    }
    for (const f of filters) {
      if (f.type === 'section') items = items.filter(i => i.section === f.value);
      if (f.type === 'category') items = items.filter(i => i.category === f.value);
      if (f.type === 'position') items = items.filter(i => i.positions.includes(f.value));
      if (f.type === 'type') items = items.filter(i => (f.value === 'seed') === i.isSeed);
    }
    return items;
  }, [allItems, search, filters]);

  // Apply sort
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    if (sortMode === 'weight') items.sort((a, b) => b.weight - a.weight);
    if (sortMode === 'alpha') items.sort((a, b) => a.text.localeCompare(b.text, 'es'));
    if (sortMode === 'positions') items.sort((a, b) => b.positions.length - a.positions.length);
    return items;
  }, [filteredItems, sortMode]);

  // Group items
  const grouped = useMemo(() => {
    const groups: Map<string, DisplayItem[]> = new Map();
    if (groupMode === 'none') {
      groups.set('all', sortedItems);
    } else if (groupMode === 'section') {
      for (const section of SECTION_ORDER) {
        const items = sortedItems.filter(i => i.section === section);
        if (items.length > 0) groups.set(section, items);
      }
    } else if (groupMode === 'category') {
      const cats = [...new Set(sortedItems.map(i => i.category))].sort();
      for (const cat of cats) {
        groups.set(cat, sortedItems.filter(i => i.category === cat));
      }
    } else if (groupMode === 'position') {
      groups.set('Sin puesto', sortedItems.filter(i => i.positions.length === 0));
      const allPositions = [...new Set(sortedItems.flatMap(i => i.positions))].sort();
      for (const pos of allPositions) {
        groups.set(pos, sortedItems.filter(i => i.positions.includes(pos)));
      }
    }
    return groups;
  }, [sortedItems, groupMode]);

  // Stats
  const stats = useMemo(() => {
    const bySection: Record<EvalSection, number> = { competencias: 0, tecnico: 0, blandas: 0 };
    allItems.forEach(i => bySection[i.section]++);
    return {
      total: allItems.length,
      seed: allSeedItems.length,
      custom: libraryQuestions.length,
      bySection,
    };
  }, [allItems, allSeedItems, libraryQuestions]);

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

  const removeFilter = (type: string, value: string) => {
    setFilters(prev => prev.filter(f => !(f.type === type && f.value === value)));
  };

  const clearFilters = () => setFilters([]);

  const openCreate = () => {
    setEditing(null);
    setForm({ category: 'Desempeño', text: '', defaultWeight: 5 });
    setShowForm(true);
  };

  const openEdit = (q: DisplayItem) => {
    if (q.isSeed) {
      const seed = q.rawQuestion as SeedItem;
      setEditing({ kind: 'seed', q: seed });
      setForm({ category: seed.category, text: seed.text, defaultWeight: seed.weight });
    } else {
      const lib = q.rawQuestion as LibraryQuestion;
      setEditing({ kind: 'lib', q: lib });
      setForm({ category: lib.category, text: lib.text, defaultWeight: lib.defaultWeight });
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.text.trim()) { toast.error('La pregunta no puede estar vacía'); return; }
    if (editing?.kind === 'lib') {
      updateLibraryQuestion({ ...editing.q, ...form, text: form.text.trim() });
      toast.success('Pregunta actualizada');
    } else if (editing?.kind === 'seed') {
      updateSeedQuestion(editing.q.id, { text: form.text.trim(), category: form.category, weight: form.defaultWeight });
      toast.success('Pregunta base actualizada');
    } else {
      addLibraryQuestion({
        id: `lib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: form.category, text: form.text.trim(), defaultWeight: form.defaultWeight,
        createdAt: new Date().toISOString(), createdBy: currentUser?.id,
      });
      toast.success('Pregunta agregada a la biblioteca');
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = (item: DisplayItem) => {
    if (!confirm(`¿Eliminar "${item.text.slice(0, 60)}..."?`)) return;
    if (item.isSeed) {
      hideSeedQuestion(item.id);
      toast.success('Pregunta base ocultada');
    } else {
      deleteLibraryQuestion(item.id);
      toast.success('Pregunta eliminada');
    }
  };

  const handleInlineWeightSave = (item: DisplayItem) => {
    const newWeight = parseInt(weightInput) || 0;
    if (newWeight < 1 || newWeight > 100) { toast.error('Peso debe ser 1-100'); return; }
    if (item.isSeed) {
      updateSeedQuestion(item.id, { weight: newWeight });
    } else {
      updateLibraryQuestion({ id: item.id, defaultWeight: newWeight } as any);
    }
    setEditingWeight(null);
    toast.success('Peso actualizado');
  };

  const getGroupLabel = (key: string): string => {
    if (groupMode === 'section') return SECTION_LABELS[key as EvalSection] || key;
    if (groupMode === 'position') return POSITION_LABELS[key as Position] || key;
    return key;
  };

  const getGroupCount = (key: string) => grouped.get(key)?.length || 0;

  // Auto-expand groups that have filtered items
  useMemo(() => {
    const autoExpand = new Set<string>();
    for (const key of grouped.keys()) autoExpand.add(key);
    setExpandedGroups(autoExpand);
  }, [groupMode]);

  const exportCSV = () => {
    const rows: string[] = ['Sección,Categoría,Peso,Posiciones,Texto'];
    allItems.forEach(i => {
      const positions = i.positions.map(p => POSITION_LABELS[p as Position] || p).join('; ');
      const text = `"${i.text.replace(/"/g, '""')}"`;
      rows.push(`${SECTION_LABELS[i.section]},${i.category},${i.weight},"${positions}",${text}`);
    });
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `biblioteca-preguntas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Biblioteca descargada (CSV)');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Biblioteca de Preguntas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} preguntas &middot; {stats.seed} base &middot; {stats.custom} personalizadas
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Nueva Pregunta
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {SECTION_ORDER.map(sec => {
          const c = SECTION_COLORS[sec];
          const count = stats.bySection[sec] || 0;
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          return (
            <div key={sec} className={`rounded-lg border ${c.border} border-l-4 p-3.5 cursor-pointer hover:bg-muted/30 transition-colors`}
              onClick={() => {
                if (filters.some(f => f.type === 'section' && f.value === sec)) {
                  removeFilter('section', sec);
                } else {
                  addFilter('section', sec, SECTION_LABELS[sec]);
                }
              }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>{SECTION_LABELS[sec]}</span>
                <span className={`text-lg font-bold ${c.text}`}>{count}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${c.dot} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{pct}% del total</p>
            </div>
          );
        })}
      </div>

      {/* Search + controls bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar preguntas..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters || filters.length > 0 ? 'bg-accent text-accent-foreground border-accent' : 'bg-background border-input hover:bg-muted'}`}>
          <SlidersHorizontal className="h-4 w-4" /> Filtros
          {filters.length > 0 && <span className="ml-0.5 text-xs font-bold">{filters.length}</span>}
        </button>

        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <button onClick={() => setGroupMode('section')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'section' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} title="Agrupar por sección">
            <Layers className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setGroupMode('category')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'category' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} title="Agrupar por categoría">
            <BookOpen className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setGroupMode('position')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'position' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} title="Agrupar por puesto">
            <Hash className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setGroupMode('none')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${groupMode === 'none' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`} title="Sin agrupar">
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>

        <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
          <option value="weight">Peso (mayor primero)</option>
          <option value="alpha">Alfabético</option>
          <option value="positions">Puestos que la usan</option>
        </select>

        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <button onClick={() => setViewMode('compact')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'compact' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode('detailed')} className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'detailed' ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map(f => (
            <span key={`${f.type}-${f.value}`} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium">
              {f.label}
              <button onClick={() => removeFilter(f.type, f.value)} className="hover:text-destructive transition-colors"><XCircle className="h-3 w-3" /></button>
            </span>
          ))}
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">Limpiar todo</button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-card rounded-xl border p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tipo</p>
            <div className="flex gap-2">
              <button onClick={() => addFilter('type', 'seed', 'Base')} className="text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors">Base</button>
              <button onClick={() => addFilter('type', 'custom', 'Personalizada')} className="text-xs px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors">Personalizada</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categoría</p>
            <div className="flex gap-1.5 flex-wrap">
              {ALL_CATEGORIES.map(c => (
                <button key={c} onClick={() => addFilter('category', c, c)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-input bg-background hover:bg-muted transition-colors">{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Puesto</p>
            <div className="flex gap-1.5 flex-wrap">
              {[...POSITION_LABELS.socio ? ['socio'] : [], 'salary_partner', 'counsel', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante', 'director', 'gerente', 'coordinador', 'analista', 'asistente', 'soporte', 'archivista'].map(p => (
                <button key={p} onClick={() => addFilter('position', p, POSITION_LABELS[p as Position] || p)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-input bg-background hover:bg-muted transition-colors">
                  {POSITION_LABELS[p as Position] || p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filteredItems.length === allItems.length ? `${allItems.length} preguntas` : `${filteredItems.length} de ${allItems.length} preguntas`}
      </p>

      {/* Grouped question lists */}
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([groupKey, items]) => {
          const isExpanded = expandedGroups.has(groupKey);
          const groupColor = groupMode === 'section' ? SECTION_COLORS[groupKey as EvalSection] : null;
          const label = getGroupLabel(groupKey);

          return (
            <div key={groupKey} className="bg-card rounded-xl border overflow-hidden">
              <button onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  {groupColor && <span className={`w-2.5 h-2.5 rounded-full ${groupColor.dot}`} />}
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="border-t">
                  {items.map((item, idx) => {
                    const color = SECTION_COLORS[item.section];
                    const isLast = idx === items.length - 1;

                    return viewMode === 'compact' ? (
                      /* COMPACT ROW */
                      <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 ${!isLast ? 'border-b border-muted/50' : ''} hover:bg-muted/20 transition-colors`}>
                        <span className={`w-1 h-8 rounded-full flex-shrink-0 ${color.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug truncate">{item.text}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{item.category}</span>
                            {item.isSeed && item.positions.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {item.positions.length} puesto{item.positions.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {editingWeight === item.id ? (
                            <div className="flex items-center gap-1">
                              <input type="number" min={1} max={100} value={weightInput}
                                onChange={e => setWeightInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleInlineWeightSave(item); if (e.key === 'Escape') setEditingWeight(null); }}
                                onBlur={() => handleInlineWeightSave(item)}
                                className="w-12 px-1.5 py-0.5 text-xs border rounded text-center focus:outline-none focus:ring-1 focus:ring-accent"
                                autoFocus />
                              <span className="text-[10px] text-muted-foreground">%</span>
                            </div>
                          ) : (
                            <button onClick={() => { if (canEdit) { setEditingWeight(item.id); setWeightInput(String(item.weight)); }}}
                              className="text-xs font-medium tabular-nums text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors min-w-[2rem] text-right"
                              title="Click para editar peso">
                              {item.weight}%
                            </button>
                          )}
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.isSeed ? 'bg-foreground/30' : 'bg-accent'}`} title={item.isSeed ? 'Base' : 'Personalizada'} />
                          <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDelete(item)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={item.isSeed ? 'Ocultar' : 'Eliminar'}>
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* DETAILED CARD */
                      <div key={item.id} className={`px-4 py-3.5 ${!isLast ? 'border-b border-muted/50' : ''} hover:bg-muted/20 transition-colors`}>
                        <div className="flex items-start gap-3">
                          <span className={`w-1 h-full min-h-[3rem] rounded-full flex-shrink-0 ${color.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">{item.text}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>{SECTION_LABELS[item.section]}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.category}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium tabular-nums">{item.weight}%</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.isSeed ? 'bg-foreground/5 text-foreground/50' : 'bg-accent/10 text-accent'}`}>
                                {item.isSeed ? 'Base' : 'Personalizada'}
                              </span>
                            </div>
                            {item.isSeed && item.positions.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                {item.positions.map(p => (
                                  <span key={p} className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">
                                    {POSITION_LABELS[p as Position] || p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={item.isSeed ? 'Ocultar' : 'Eliminar'}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="smps-surface-elevated w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                {editing ? (editing.kind === 'seed' ? 'Editar Pregunta Base' : 'Editar Pregunta') : 'Nueva Pregunta'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Texto de la pregunta</label>
                <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={3}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Categoría</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as QuestionCategory })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Peso ref. %</label>
                  <input type="number" min={1} max={100} value={form.defaultWeight}
                    onChange={e => setForm({ ...form, defaultWeight: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
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
