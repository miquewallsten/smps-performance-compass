import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTimeline, useUsers, useCreateTimelineEvent, useDeleteTimelineEvent } from '@/api/queries';
import { POSITION_LABELS } from '@/types';
import {
  ArrowRight, UserPlus, UserMinus, BarChart3, Shield, UserCheck,
  UserX, Calendar, CheckCircle, Key, MessageSquare, ChevronLeft,
  Plus, Trash2, Clock, SlidersHorizontal, X
} from 'lucide-react';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════════════════════
   TIME MACHINE — Apple-inspired career timeline
   Dark depth viewport · Vertical mini-viewer · Sleek glass panels
   ═════════════════════════════════════════════════════════════════════════════ */

const EVT: Record<string, { icon: typeof ArrowRight; accent: string; label: string }> = {
  position_change:      { icon: ArrowRight,    accent: 'hsl(40 60% 50%)',   label: 'Posición' },
  hire:                  { icon: UserPlus,      accent: 'hsl(145 60% 40%)',  label: 'Ingreso' },
  termination:           { icon: UserMinus,     accent: 'hsl(350 80% 42%)',  label: 'Baja' },
  reactivation:          { icon: UserCheck,     accent: 'hsl(145 60% 40%)',  label: 'Reactivación' },
  evaluation_completed:  { icon: BarChart3,     accent: 'hsl(350 70% 50%)',  label: 'Evaluación' },
  role_change:           { icon: Shield,        accent: 'hsl(215 50% 40%)',  label: 'Rol' },
  supervisor_assigned:   { icon: UserCheck,     accent: 'hsl(225 50% 50%)',  label: 'Supervisor +' },
  supervisor_removed:    { icon: UserX,         accent: 'hsl(225 40% 55%)',  label: 'Supervisor −' },
  period_transition:     { icon: Calendar,      accent: 'hsl(215 15% 50%)',  label: 'Periodo' },
  action_plan_milestone: { icon: CheckCircle,    accent: 'hsl(145 60% 40%)',  label: 'Plan Acción' },
  password_reset:        { icon: Key,           accent: 'hsl(25 80% 50%)',   label: 'Contraseña' },
  note:                  { icon: MessageSquare,  accent: 'hsl(215 15% 55%)',  label: 'Nota' },
};

const CHANGE_LABELS: Record<string, string> = {
  promotion: 'Promoción', demotion: 'Degradación', lateral_move: 'Cambio lateral', lateral: 'Cambio lateral',
};

const FILTERS = [
  { k: 'all', l: 'Todo' },
  { k: 'position_change', l: 'Posición' },
  { k: 'hire', l: 'Ingreso' },
  { k: 'termination', l: 'Baja' },
  { k: 'evaluation_completed', l: 'Evaluación' },
  { k: 'role_change', l: 'Rol' },
  { k: 'supervisor_assigned', l: 'Supervisor' },
  { k: 'action_plan_milestone', l: 'Plan Acción' },
  { k: 'note', l: 'Notas' },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const pd = (s: string) => { if (!s) return new Date(); return new Date(s + (s.length <= 10 ? 'T12:00:00' : '')); };
const fmtDay = (s: string) => pd(s).toLocaleDateString('es-MX', { day: 'numeric' });
const fmtMon = (s: string) => pd(s).toLocaleDateString('es-MX', { month: 'short' });
const fmtFull = (s: string) => pd(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (s: string) => { if (!s) return ''; try { return new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const getYear = (s: string) => pd(s).getFullYear();
const getMonthKey = (s: string) => { const d = pd(s); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const monthLabel = (k: string) => { const [y,m] = k.split('-'); const d = new Date(+y, +m-1, 1); return d.toLocaleDateString('es-MX', { month: 'short' }); };
const changeLabel = (meta: any) => meta?.changeType && CHANGE_LABELS[meta?.changeType] ? CHANGE_LABELS[meta.changeType] : '';

/* ── Score Ring ────────────────────────────────────────────────────────────── */
function Ring({ v, s = 28 }: { v: number; s?: number }) {
  const r = (s - 3) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, v)) / 100;
  const col = v >= 80 ? 'hsl(145 60% 40%)' : v >= 60 ? 'hsl(40 60% 50%)' : 'hsl(350 80% 42%)';
  return (
    <svg width={s} height={s} className="shrink-0">
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="hsl(215 50% 30%)" strokeWidth={2} />
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={col} strokeWidth={2}
        strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round"
        transform={`rotate(-90 ${s/2} ${s/2})`} className="tm-ring-anim" />
      <text x={s/2} y={s/2} textAnchor="middle" dominantBaseline="central"
        fill="hsl(210 20% 90%)" fontSize="8" fontWeight="600" fontFamily="var(--font-body)">{v}</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function UserTimeline() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user: me } = useAuth();
  const { data: users = [] } = useUsers();
  const [filter, setFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);
  const filterRef = useRef<HTMLDivElement>(null);

  const createEvt = useCreateTimelineEvent();
  const delEvt = useDeleteTimelineEvent();
  const target = users.find((u: any) => u.id === id);
  const { data: td, isLoading } = useUserTimeline(id!, filter !== 'all' ? { type: filter } : undefined);

  const events = useMemo(() => {
    const raw = (td as any)?.events || [];
    return raw.sort((a: any, b: any) => { const da = a.event_date || a.created_at || ""; const db = b.event_date || b.created_at || ""; return da.localeCompare(db); });
  }, [(td as any)?.events]);

  const total = (td as any)?.total || 0;
  const canAdmin = me?.isAdmin || me?.isSuperUser;

  // Month groups
  const months = useMemo(() => {
    const g: Record<string, any[]> = {};
    events.forEach((e: any) => { const k = getMonthKey(e.event_date || e.created_at || ""); if (!g[k]) g[k] = []; g[k].push(e); });
    return g;
  }, [events]);
  const sortedMonths = useMemo(() => Object.keys(months).sort(), [months]);
  const years = useMemo(() => [...new Set(sortedMonths.map(m => m.split('-')[0]))].sort(), [sortedMonths]);

  // Scroll tracking
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollPct(el.scrollWidth > el.clientWidth ? el.scrollLeft / (el.scrollWidth - el.clientWidth) : 0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll); ro.observe(el);
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, [onScroll, events]);

  // Close filter on outside click
  useEffect(() => {
    if (!showFilter) return;
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showFilter]);

  const scrollJump = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 500, behavior: 'smooth' });
  const jumpToMonth = (mk: string) => scrollRef.current?.querySelector(`[data-m="${mk}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

  const addNote = async () => {
    if (!noteText.trim()) return;
    try { await createEvt.mutateAsync({ userId: id, eventType: 'note', note: noteText.trim() }); setNoteText(''); setShowNote(false); toast.success('Nota agregada'); }
    catch { toast.error('Error al agregar nota'); }
  };
  const deleteEvent = async (eid: string) => {
    try { await delEvt.mutateAsync({ userId: id!, eventId: eid }); toast.success('Evento eliminado'); }
    catch { toast.error('Error al eliminar'); }
  };

  if (!id) return null;

  /* ── Vertical Mini-Viewer data ──────────────────────────────────────────── */
  const viewerMonths = sortedMonths;

  return (
    <div className="flex h-full -m-4 md:-m-5">
      {/* ══════════════════════════════════════════════════════════════════════
          MAIN VIEWPORT — Dark depth background
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 tm-viewport">

        {/* ── Header bar (dark) ─────────────────────────────────────────────── */}
        <div className="shrink-0 h-10 flex items-center gap-2 px-4 border-b tm-header">
          <button onClick={() => nav(-1)} className="p-1 rounded-md text-[hsl(210,20%,60%)] hover:text-[hsl(210,20%,85%)] transition-[color] 150ms ease-out">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <Clock className="h-3 w-3 text-[hsl(350,80%,42%)]" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xs font-semibold text-[hsl(210,20%,85%)] truncate" style={{ fontFamily: 'var(--font-display)' }}>
              {target ? `Historial — ${target.name}` : 'Historial'}
            </h1>
          </div>
          <span className="text-[10px] text-[hsl(210,15%,45%)] tabular-nums">{total} evento{total!==1?'s':''}</span>

          {/* Filter dropdown */}
          <div ref={filterRef} className="relative">
            <button onClick={() => setShowFilter(!showFilter)}
              className={`h-6 px-1.5 rounded flex items-center gap-1 text-[10px] transition-[background-color,color] 150ms ease-out ${
                filter !== 'all' ? 'bg-[hsl(350,80%,42%)] text-white' : 'text-[hsl(210,15%,50%)] hover:text-[hsl(210,20%,80%)] hover:bg-[hsl(215,50%,18%)]'
              }`}>
              <SlidersHorizontal className="h-3 w-3" />
              {filter !== 'all' && <span>{FILTERS.find(f=>f.k===filter)?.l}</span>}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-8 z-20 w-36 py-1 rounded-md border tm-dropdown tm-scale-in">
                {FILTERS.map(f => (
                  <button key={f.k} onClick={() => { setFilter(f.k); setShowFilter(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-[background-color] 100ms ease-out ${
                      filter === f.k ? 'text-[hsl(350,80%,50%)] bg-[hsl(350,80%,42%,0.08)]' : 'text-[hsl(210,20%,75%)] hover:bg-[hsl(215,50%,18%)]'
                    }`}>
                    {f.l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add note */}
          {canAdmin && !showNote && (
            <button onClick={() => setShowNote(true)}
              className="h-6 px-1.5 rounded flex items-center gap-1 text-[10px] text-[hsl(210,15%,50%)] hover:text-[hsl(210,20%,80%)] hover:bg-[hsl(215,50%,18%)] transition-[background-color,color] 150ms ease-out">
              <Plus className="h-3 w-3" />Nota
            </button>
          )}
        </div>

        {/* ── Inline note input ─────────────────────────────────────────────── */}
        {showNote && (
          <div className="shrink-0 px-4 py-2 border-b tm-note-bar">
            <div className="flex items-center gap-2">
              <input value={noteText} onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Nota para el historial..."
                className="flex-1 min-w-0 h-6 px-2 rounded text-xs bg-[hsl(215,50%,12%)] border-[hsl(215,40%,22%)] text-[hsl(210,20%,85%)] placeholder:text-[hsl(210,15%,40%)] focus:outline-none focus:border-[hsl(350,80%,42%)] transition-[border-color] 150ms ease-out"
                autoFocus />
              <button onClick={addNote} disabled={!noteText.trim()}
                className="h-6 px-2 rounded text-[10px] font-semibold bg-[hsl(350,80%,42%)] text-white hover:opacity-90 disabled:opacity-30 transition-[opacity] 150ms ease-out active:scale-[0.97]">
                Guardar
              </button>
              <button onClick={() => setShowNote(false)} className="p-1 text-[hsl(210,15%,40%)] hover:text-[hsl(210,20%,60%)] transition-[color] 150ms ease-out">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── Year quick-nav ────────────────────────────────────────────────── */}
        {years.length > 1 && (
          <div className="shrink-0 h-7 px-4 flex items-center gap-1 border-b tm-year-bar">
            {years.map(y => (
              <button key={y} onClick={() => { const fm = sortedMonths.find(m => m.startsWith(y)); if (fm) jumpToMonth(fm); }}
                className="px-2 py-0.5 rounded text-[10px] font-semibold text-[hsl(210,20%,55%)] hover:text-[hsl(210,20%,85%)] hover:bg-[hsl(215,50%,18%)] transition-[background-color,color] 150ms ease-out active:scale-[0.97]"
                style={{ fontFamily: 'var(--font-display)' }}>
                {y}
              </button>
            ))}
          </div>
        )}

        {/* ── Scroll progress ──────────────────────────────────────────────── */}
        <div className="shrink-0 h-px bg-[hsl(215,40%,18%)]">
          <div className="h-full bg-[hsl(350,80%,42%,0.5)] transition-[width] 200ms ease-out" style={{ width: `${scrollPct * 100}%` }} />
        </div>

        {/* ── Main scrollable area ──────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden">
          {/* Left/right scroll arrows */}
          {scrollPct > 0.02 && (
            <button onClick={() => scrollJump(-1)}
              className="absolute left-0 top-0 bottom-8 w-8 z-10 flex items-center justify-center tm-arrow-l">
              <ChevronLeft className="h-4 w-4 text-[hsl(210,20%,60%)]" />
            </button>
          )}
          {scrollPct < 0.98 && events.length > 0 && (
            <button onClick={() => scrollJump(1)}
              className="absolute right-8 top-0 bottom-8 w-8 z-10 flex items-center justify-center tm-arrow-r">
              {/* using right-8 to not overlap the mini-viewer */}
              <ChevronLeft className="h-4 w-4 text-[hsl(210,20%,60%)] rotate-180" />
            </button>
          )}

          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="h-4 w-4 border-2 border-[hsl(350,80%,42%)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Clock className="h-6 w-6 mx-auto text-[hsl(210,15%,30%)] mb-1" />
                <p className="text-xs text-[hsl(210,15%,45%)]">Sin eventos en el historial</p>
                {filter !== 'all' && (
                  <button onClick={() => setFilter('all')} className="mt-1.5 text-[10px] text-[hsl(350,80%,50%)] hover:underline">Ver todo</button>
                )}
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-hidden tm-scroll">
              <div className="flex items-center min-h-full pt-6 pb-10 px-6">
                {/* Origin dot */}
                <div className="shrink-0 w-6 flex flex-col items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(350,80%,42%)] tm-origin-dot" />
                </div>

                {/* Month sections */}
                {sortedMonths.map((mk, mi) => {
                  const me = months[mk];
                  const [ys, ms] = mk.split('-');
                  const isFirstYear = mi === 0 || !sortedMonths[mi-1]?.startsWith(ys);
                  return (
                    <div key={mk} data-m={mk} className="shrink-0 flex flex-col items-center tm-month" style={{ animationDelay: `${mi * 60}ms` }}>
                      {/* Month marker */}
                      <div className="mb-2 text-center h-5">
                        {isFirstYear && <span className="text-xs font-bold text-[hsl(210,20%,55%)] mr-1" style={{ fontFamily: 'var(--font-display)' }}>{ys}</span>}
                        <span className={`text-[9px] uppercase tracking-widest font-semibold ${isFirstYear ? 'text-[hsl(350,80%,50%)]' : 'text-[hsl(210,15%,40%)]'}`} style={{ fontFamily: 'var(--font-display)' }}>
                          {monthLabel(mk)}
                        </span>
                      </div>

                      {/* Rail + events */}
                      <div className="relative flex flex-col items-center">
                        <div className="absolute top-0 bottom-0 w-px bg-[hsl(215,40%,22%)]" />
                        <div className="flex flex-col items-center gap-3 py-2">
                          {me.map((ev: any, ei: number) => {
                            const cfg = EVT[ev.event_type] || EVT.note;
                            const Icon = cfg.icon;
                            const isExp = expanded === ev.id;
                            const meta = ev.metadata ? (typeof ev.metadata === 'string' ? JSON.parse(ev.metadata) : ev.metadata) : {};
                            const cl = changeLabel(meta);
                            const ds = ev.event_date || ev.created_at || "";
                            const above = ei % 2 === 0;

                            return (
                              <div key={ev.id} className="relative tm-node" style={{ animationDelay: `${mi * 60 + ei * 40}ms` }}>
                                {/* Connector */}
                                <div className={`absolute top-1/2 -translate-y-1/2 h-px w-3 ${above ? 'right-1/2' : 'left-1/2'}`}
                                  style={{ backgroundColor: cfg.accent, opacity: 0.3 }} />

                                {/* Rail dot */}
                                <div className="relative z-10 flex items-center justify-center w-5 h-5">
                                  <div className="w-2 h-2 rounded-full tm-dot"
                                    style={{ backgroundColor: cfg.accent, boxShadow: `0 0 6px ${cfg.accent}40` }} />
                                </div>

                                {/* Card */}
                                <div className={`absolute ${above ? 'bottom-5' : 'top-5'} left-1/2 -translate-x-1/2`}>
                                  <div className={`w-44 tm-card rounded-md cursor-pointer overflow-hidden ${isExp ? 'tm-card-exp' : ''}`}
                                    onClick={() => setExpanded(isExp ? null : ev.id)}>
                                    <div className="px-2.5 py-1.5">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <Icon className="h-2.5 w-2.5 shrink-0" style={{ color: cfg.accent }} />
                                        <span className="text-[9px] font-semibold uppercase tracking-wider truncate" style={{ color: cfg.accent }}>{cfg.label}</span>
                                      </div>
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-[11px] font-bold text-[hsl(210,20%,85%)]">{fmtDay(ds)}</span>
                                        <span className="text-[9px] text-[hsl(210,15%,45%)]">{fmtMon(ds)}</span>
                                      </div>
                                      {cl && <span className="inline-block mt-0.5 text-[8px] font-medium px-1 py-px rounded bg-[hsl(350,80%,42%,0.12)] text-[hsl(350,80%,55%)]">{cl}</span>}

                                      {/* Position mini-detail */}
                                      {ev.event_type === 'position_change' && ev.old_value && ev.new_value && !isExp && (
                                        <div className="mt-0.5 flex items-center gap-1 text-[9px]">
                                          <span className="text-[hsl(210,15%,45%)] line-through truncate max-w-[55px]">{POSITION_LABELS[ev.old_value as keyof typeof POSITION_LABELS] || ev.old_value}</span>
                                          <ArrowRight className="h-2 w-2 shrink-0 text-[hsl(210,15%,40%)]" />
                                          <span className="text-[hsl(210,20%,75%)] font-medium truncate max-w-[55px]">{POSITION_LABELS[ev.new_value as keyof typeof POSITION_LABELS] || ev.new_value}</span>
                                        </div>
                                      )}

                                      {/* Score ring compact */}
                                      {ev.event_type === 'evaluation_completed' && meta.score !== undefined && (
                                        <div className="mt-0.5"><Ring v={meta.score} s={24} /></div>
                                      )}
                                    </div>

                                    {/* Expanded detail */}
                                    {isExp && (
                                      <div className="px-2.5 pb-2 border-t border-[hsl(215,40%,22%)] tm-expand">
                                        <div className="mt-1.5 space-y-1">
                                          <p className="text-[9px] text-[hsl(210,15%,45%)]">{fmtFull(ds)} · {fmtTime(ds)}</p>

                                          {ev.event_type === 'position_change' && ev.old_value && ev.new_value && (
                                            <div className="flex items-center gap-1 text-[10px]">
                                              <span className="text-[hsl(210,15%,50%)] line-through">{POSITION_LABELS[ev.old_value as keyof typeof POSITION_LABELS] || ev.old_value}</span>
                                              <ArrowRight className="h-2.5 w-2.5 shrink-0 text-[hsl(210,15%,40%)]" />
                                              <span className="text-[hsl(210,20%,80%)] font-medium">{POSITION_LABELS[ev.new_value as keyof typeof POSITION_LABELS] || ev.new_value}</span>
                                            </div>
                                          )}

                                          {ev.event_type === 'evaluation_completed' && (
                                            <div className="space-y-0.5">
                                              {meta.evalType === 'self' && <p className="text-[9px] text-[hsl(210,15%,50%)]">Autoevaluación</p>}
                                              {meta.evalType === 'supervisor' && <p className="text-[9px] text-[hsl(210,15%,50%)]">Evaluación Supervisor</p>}
                                              {meta.evalType === 'feedback' && <p className="text-[9px] text-[hsl(210,15%,50%)]">Sesión Feedback</p>}
                                              {meta.period && <p className="text-[9px] text-[hsl(210,15%,50%)]">{meta.period}</p>}
                                              {meta.score !== undefined && (
                                                <div className="flex items-center gap-1.5"><Ring v={meta.score} /><span className="text-xs font-bold text-[hsl(350,80%,50%)]">{meta.score}%</span></div>
                                              )}
                                            </div>
                                          )}

                                          {ev.event_type === 'role_change' && meta.changes && (
                                            <div className="flex flex-wrap gap-0.5">
                                              {(meta.changes as string[]).map((c: string, i: number) => (
                                                <span key={i} className="text-[8px] bg-[hsl(215,50%,18%)] text-[hsl(210,20%,70%)] px-1 py-px rounded">{c}</span>
                                              ))}
                                            </div>
                                          )}

                                          {(ev.event_type === 'supervisor_assigned' || ev.event_type === 'supervisor_removed') && meta.supervisorName && (
                                            <p className="text-[10px]"><span className="font-medium text-[hsl(210,20%,80%)]">{meta.supervisorName}</span>
                                            {meta.period && <span className="text-[9px] text-[hsl(210,15%,45%)] ml-1">{meta.period}</span>}</p>
                                          )}

                                          {ev.note && <p className="text-[10px] text-[hsl(210,20%,80%)] leading-relaxed">{ev.note}</p>}

                                          {canAdmin && (
                                            <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar evento?')) deleteEvent(ev.id); }}
                                              className="text-[9px] text-[hsl(210,15%,40%)] hover:text-[hsl(0,84%,60%)] transition-[color] 150ms ease-out">Eliminar</button>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="w-10 shrink-0" />
                    </div>
                  );
                })}

                {/* Terminal dot */}
                <div className="shrink-0 w-6 flex flex-col items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(215,40%,22%)]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VERTICAL MINI-VIEWER — Apple Time Machine ruler
          ══════════════════════════════════════════════════════════════════════ */}
      {events.length > 0 && (
        <div className="shrink-0 w-10 flex flex-col border-l tm-viewer-rail">
          {/* Year markers + month ticks */}
          <div className="flex-1 overflow-y-auto py-2 px-1 flex flex-col">
            {sortedMonths.map((mk, i) => {
              const [y] = mk.split('-');
              const isFirst = i === 0 || !sortedMonths[i-1]?.startsWith(y);
              const hasEvents = (months[mk]?.length || 0) > 0;
              const pct = i / Math.max(1, sortedMonths.length - 1);

              return (
                <div key={mk} className="flex flex-col items-center">
                  {isFirst && (
                    <button onClick={() => jumpToMonth(mk)}
                      className="text-[8px] font-bold text-[hsl(210,20%,55%)] hover:text-[hsl(350,80%,50%)] transition-[color] 100ms ease-out mb-1"
                      style={{ fontFamily: 'var(--font-display)' }}>
                      {y}
                    </button>
                  )}
                  <button onClick={() => jumpToMonth(mk)}
                    className="w-full flex items-center gap-0.5 py-0.5 group">
                    <div className="w-1 h-px bg-[hsl(215,40%,22%)] group-hover:bg-[hsl(350,80%,42%,0.5)] transition-[background-color] 150ms ease-out" />
                    <div className={`w-1 h-1 rounded-full transition-[background-color,transform] 150ms ease-out ${
                      hasEvents ? 'bg-[hsl(350,80%,42%)]' : 'bg-[hsl(215,40%,22%)]'
                    } group-hover:scale-150`}
                      style={{ transformOrigin: 'center' }} />
                    <span className="text-[7px] text-[hsl(210,15%,40%)] group-hover:text-[hsl(210,20%,70%)] transition-[color] 100ms ease-out">
                      {monthLabel(mk)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Scroll position indicator */}
          <div className="shrink-0 h-1 mx-1 mb-1 rounded-full bg-[hsl(215,40%,22%)]">
            <div className="h-full rounded-full bg-[hsl(350,80%,42%,0.6)] transition-[width] 200ms ease-out"
              style={{ width: `${Math.max(10, 100 / Math.max(1, sortedMonths.length))}%`, marginLeft: `${scrollPct * (100 - 100 / Math.max(1, sortedMonths.length))}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
