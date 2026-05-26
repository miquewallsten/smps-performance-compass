import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomQuestions, useLibraryQuestions, useCreateLibraryQuestion, useUpdateLibraryQuestion, useDeleteLibraryQuestion, useSeedOverrides, useUpdateSeedOverride } from '@/api/queries';
import { QUESTIONS_BY_POSITION, getSectionByCategory, SECTION_LABELS } from '@/data/questions';
import { POSITION_LABELS, QuestionCategory, EvalQuestion, LibraryQuestion, EvalSection } from '@/types';
import { BookOpen, Search, Plus, Pencil, Trash2, Save, X, Download } from 'lucide-react';
import { toast } from 'sonner';

const ALL_CATEGORIES: QuestionCategory[] = [
  'Criterio Técnico', 'Desempeño', 'Liderazgo', 'Cumplimiento', 'Habilidades Blandas',
  'Trabajo en Equipo', 'Actitud', 'Disponibilidad', 'Desarrollo',
];

type SeedItem = EvalQuestion & { positions: string[]; isSeed: true; section: EvalSection };
type CustomItem = LibraryQuestion & { isSeed: false };

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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{ kind: 'lib'; q: LibraryQuestion } | { kind: 'seed'; q: SeedItem } | null>(null);
  const [form, setForm] = useState<{ category: QuestionCategory; text: string; defaultWeight: number }>({
    category: 'Desempeño', text: '', defaultWeight: 5,
  });

  const canEdit = !!(currentUser?.isAdmin || currentUser?.isSuperUser);
  const isSuperUser = !!currentUser?.isSuperUser;

  // Seed questions deduped, with overrides and section computation
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

  const openCreate = () => {
    setEditing(null);
    setForm({ category: 'Desempeño', text: '', defaultWeight: 5 });
    setShowForm(true);
  };

  const openEdit = (q: LibraryQuestion | SeedItem) => {
    if ('isSeed' in q && q.isSeed) {
      setEditing({ kind: 'seed', q });
      setForm({ category: q.category, text: q.text, defaultWeight: q.weight });
    } else {
      const lq = q as LibraryQuestion;
      setEditing({ kind: 'lib', q: lq });
      setForm({ category: lq.category, text: lq.text, defaultWeight: lq.defaultWeight });
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

  const handleDelete = (q: LibraryQuestion | SeedItem) => {
    if (!confirm(`¿Eliminar la pregunta "${q.text}"?`)) return;
    if ('isSeed' in q && q.isSeed) {
      hideSeedQuestion(q.id);
      toast.success('Pregunta base ocultada');
    } else {
      deleteLibraryQuestion((q as LibraryQuestion).id);
      toast.success('Pregunta eliminada');
    }
  };

  const seedCategories = Object.keys(seedByCategory).sort() as QuestionCategory[];
  const allCats = Array.from(new Set([...seedCategories, ...libraryQuestions.map(q => q.category)])).sort();
  const visibleCats = categoryFilter === 'all' ? allCats : allCats.filter(c => c === categoryFilter);

  const matchesSearch = (text: string) => !search.trim() || text.toLowerCase().includes(search.toLowerCase());
  const matchesSection = (section: EvalSection) => sectionFilter === 'all' || section === sectionFilter;
  const matchesCustomSection = (cat: QuestionCategory) => sectionFilter === 'all' || getSectionByCategory(cat) === sectionFilter;

  const totalCustom = libraryQuestions.length;
  const totalSeed = Object.values(seedByCategory).reduce((s, l) => s + l.length, 0);

  const sectionBadgeColor: Record<EvalSection, string> = {
    competencias: 'bg-blue-100 text-blue-800',
    tecnico: 'bg-purple-100 text-purple-800',
    blandas: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-accent" /> Biblioteca de Preguntas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalSeed} preguntas base · {totalCustom} preguntas personalizadas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <button onClick={() => {
              const rows: string[] = ['Tipo,Sección,Categoría,Peso,Posiciones,Texto'];
              Object.entries(seedByCategory).forEach(([cat, list]) => list.forEach(q => {
                const positions = q.positions.join('|');
                const text = `"${q.text.replace(/"/g, '""')}"`;
                rows.push(`Base,${SECTION_LABELS[q.section]},${cat},${q.weight},${positions},${text}`);
              }));
              libraryQuestions.forEach(q => {
                const text = `"${q.text.replace(/"/g, '""')}"`;
                rows.push(`Personalizada,${SECTION_LABELS[getSectionByCategory(q.category)]},${q.category},${q.defaultWeight},,${text}`);
              });
              const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `biblioteca-preguntas-${new Date().toISOString().split('T')[0]}.csv`;
              a.click(); URL.revokeObjectURL(url);
              toast.success('Biblioteca descargada (CSV)');
            }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted">
              <Download className="h-4 w-4" /> Descargar
            </button>
          )}
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Nueva Pregunta
          </button>
        </div>

      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pregunta..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="all">Todas las secciones</option>
          <option value="competencias">{SECTION_LABELS.competencias}</option>
          <option value="tecnico">{SECTION_LABELS.tecnico}</option>
          <option value="blandas">{SECTION_LABELS.blandas}</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="all">Todas las categorías</option>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {visibleCats.map(cat => {
        const seedItems = (seedByCategory[cat] || []).filter(q => matchesSearch(q.text) && matchesSection(q.section));
        const customItems = libraryQuestions.filter(q => q.category === cat && matchesSearch(q.text) && matchesCustomSection(q.category));
        if (seedItems.length === 0 && customItems.length === 0) return null;
        return (
          <div key={cat} className="bg-card rounded-xl border overflow-hidden">
            <div className="px-5 py-3 bg-accent/5 border-b border-accent/20 flex items-center justify-between">
              <h2 className="font-display font-semibold text-accent">{cat}</h2>
              <span className="text-xs text-muted-foreground">{seedItems.length + customItems.length} pregunta(s)</span>
            </div>
            <div className="divide-y">
              {customItems.map(q => (
                <div key={q.id} className="px-5 py-3 hover:bg-muted/30 transition-colors flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">Personalizada</span>
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Peso ref: {q.defaultWeight}%</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-muted" title="Editar">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(q)} className="p-1.5 rounded hover:bg-destructive/10" title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
              {seedItems.map(q => (
                <div key={q.id} className="px-5 py-3 hover:bg-muted/30 transition-colors flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Base · Peso ref: {q.weight}%</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${sectionBadgeColor[q.section]}`}>{SECTION_LABELS[q.section]}</span>
                      {q.positions.slice(0, 5).map(p => (
                        <span key={p} className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {POSITION_LABELS[p as keyof typeof POSITION_LABELS]}
                        </span>
                      ))}
                      {q.positions.length > 5 && (
                        <span className="text-[10px] text-muted-foreground">+{q.positions.length - 5} más</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 rounded hover:bg-muted" title="Editar">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(q)} className="p-1.5 rounded hover:bg-destructive/10" title="Ocultar">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

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
