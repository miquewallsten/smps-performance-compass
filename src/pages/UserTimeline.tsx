import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTimeline, useUsers, useCreateTimelineEvent, useDeleteTimelineEvent } from '@/api/queries';
import { POSITION_LABELS } from '@/types';
import {
  ArrowRight, UserPlus, UserMinus, BarChart3, Shield, UserCheck,
  UserX, Calendar, CheckCircle, Key, MessageSquare, ChevronLeft,
  ChevronRight, Plus, Trash2, Clock, SlidersHorizontal, X
} from 'lucide-react';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════════════════════
   TIME MACHINE — Career Timeline
   Full-page layout within normal Layout container
   ═════════════════════════════════════════════════════════════════════════════ */

const EVT: Record<string, { icon: typeof ArrowRight; accent: string; label: string }> = {
  position_change:      { icon: ArrowRight,    accent: 'hsl(40 60% 50%)',   label: 'Posición' },
  hire:                  { icon: UserPlus,      accent: 'hsl(145 60% 40%)',  label: 'Ingreso' },
  termination:           { icon: UserMinus,     accent: 'hsl(350 80% 42%)', label: 'Baja' },
  reactivation:          { icon: UserCheck,     accent: 'hsl(145 60% 40%)',  label: 'Reactivación' },
  evaluation_completed:  { icon: BarChart3,     accent: 'hsl(350 70% 50%)', label: 'Evaluación' },
  role_change:           { icon: Shield,        accent: 'hsl(215 50% 40%)', label: 'Rol' },
  supervisor_assigned:   { icon: UserCheck,     accent: 'hsl(225 50% 50%)',  label: 'Supervisor +' },
  supervisor_removed:    { icon: UserX,         accent: 'hsl(225 40% 55%)',  label: 'Supervisor −' },
  period_transition:     { icon: Calendar,      accent: 'hsl(215 15% 50%)', label: 'Periodo' },
  action_plan_milestone: { icon: CheckCircle,    accent: 'hsl(145 60% 40%)', label: 'Plan Acción' },
  password_reset:        { icon: Key,           accent: 'hsl(25 80% 50%)',  label: 'Contraseña' },
  note:                  { icon: MessageSquare,  accent: 'hsl(215 15% 55%)', label: 'Nota' },
};

const CHANGE_LABELS: Record<string, string> = {
  promotion: 'Promoción', demotion: 'Degradación', lateral_move: 'Cambio lateral', lateral: 'Cambio lateral',
};

const FILTERS = [
  { k: 'all', l: 'Todo' }, { k: 'position_change', l: 'Posición' },
  { k: 'hire', l: 'Ingreso' }, { k: 'termination', l: 'Baja' },
  { k: 'evaluation_completed', l: 'Evaluación' }, { k: 'role_change', l: 'Rol' },
  { k: 'supervisor_assigned', l: 'Supervisor' }, { k: 'action_plan_milestone', l: 'Plan Acción' },
  { k: 'note', l: 'Notas' },
];

const pd = (s: string) => { if (!s) return new Date(); return new Date(s + (s.length <= 10 ? 'T12:00:00' : '')); };
const fmtDay = (s: string) => pd(s).toLocaleDateString('es-MX', { day: 'numeric' });
const fmtMon = (s: string) => pd(s).toLocaleDateString('es-MX', { month: 'short' });
const fmtYear = (s: string) => pd(s).getFullYear().toString();
const fmtFull = (s: string) => pd(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (s: string) => { if (!s) return ''; try { return new Date(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const getMonthKey = (s: string) => { const d = pd(s); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const monthLabel = (k: string) => { const [y,m] = k.split('-'); return new Date(+y,+m-1,1).toLocaleDateString('es-MX',{month:'short'}); };
const changeLabel = (meta: any) => meta?.changeType && CHANGE_LABELS[meta?.changeType] ? CHANGE_LABELS[meta.changeType] : '';

function Ring({ v, s = 32 }: { v: number; s?: number }) {
  const r = (s-3)/2, c = 2*Math.PI*r, pct = Math.max(0,Math.min(100,v))/100;
  const col = v >= 80 ? 'hsl(145 60% 40%)' : v >= 60 ? 'hsl(40 60% 50%)' : 'hsl(350 80% 42%)';
  return (
    <svg width={s} height={s} className="shrink-0">
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={2.5} />
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={col} strokeWidth={2.5}
        strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round"
        transform={`rotate(-90 ${s/2} ${s/2})`} className="tm-ring-anim" />
      <text x={s/2} y={s/2} textAnchor="middle" dominantBaseline="central"
        fill="hsl(var(--foreground))" fontSize="9" fontWeight="600" fontFamily="var(--font-body)">{v}</text>
    </svg>
  );
}

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
    return raw.sort((a: any, b: any) => {
      const da = a.event_date || a.created_at || '';
      const db = b.event_date || b.created_at || '';
      return da.localeCompare(db);
    });
  }, [(td as any)?.events]);
  const total = (td as any)?.total || 0;
  const canAdmin = me?.isAdmin || me?.isSuperUser;

  const months = useMemo(() => {
    const g: Record<string, any[]> = {};
    events.forEach((e: any) => { const k = getMonthKey(e.event_date||e.created_at||''); if (!g[k]) g[k]=[]; g[k].push(e); });
    return g;
  }, [events]);
  const sortedMonths = useMemo(() => Object.keys(months).sort(), [months]);
  const years = useMemo(() => [...new Set(sortedMonths.map(m=>m.split('-')[0]))].sort(), [sortedMonths]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current; if (!el) return;
    setScrollPct(el.scrollWidth > el.clientWidth ? el.scrollLeft/(el.scrollWidth-el.clientWidth) : 0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll); ro.observe(el);
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, [onScroll, events]);

  useEffect(() => {
    if (!showFilter) return;
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showFilter]);

  const scrollJump = (dir: number) => scrollRef.current?.scrollBy({ left: dir*600, behavior: 'smooth' });
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

  return (
    /* Negative margins to fill the Layout container padding */
    <div className="-m-4 md:-m-5 flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b bg-background px-4 py-2.5 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="p-1 rounded-md hover:bg-muted transition-[background-color] 150ms ease-out text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Clock className="h-4 w-4 text-accent" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {target ? `Historial — ${target.name}` : 'Historial'}
          </h1>
          <p className="text-[11px] text-muted-foreground">{total} evento{total!==1?'s':''}</p>
        </div>

        {/* Filter */}
        <div ref={filterRef} className="relative">
          <button onClick={() => setShowFilter(!showFilter)}
            className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-[background-color,color] 150ms ease-out ${
              filter !== 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}>
            <SlidersHorizontal className="h-3 w-3" />
            <span>{filter === 'all' ? 'Filtrar' : FILTERS.find(f=>f.k===filter)?.l}</span>
          </button>
          {showFilter && (
            <div className="absolute right-0 top-9 z-20 w-40 py-1 rounded-lg border bg-popover shadow-lg tm-scale-in">
              {FILTERS.map(f => (
                <button key={f.k} onClick={() => { setFilter(f.k); setShowFilter(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-[background-color] 100ms ease-out ${
                    filter === f.k ? 'text-accent bg-accent/5 font-medium' : 'text-foreground hover:bg-muted'
                  }`}>{f.l}</button>
              ))}
            </div>
          )}
        </div>

        {canAdmin && !showNote && (
          <button onClick={() => setShowNote(true)}
            className="h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-[background-color,color] 150ms ease-out">
            <Plus className="h-3 w-3" /><span>Nota</span>
          </button>
        )}
      </div>

      {/* ── NOTE INPUT ──────────────────────────────────────────────────────── */}
      {showNote && (
        <div className="shrink-0 border-b px-4 py-2 bg-muted/30 tm-slide-down">
          <div className="flex items-center gap-2">
            <input value={noteText} onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Nota para el historial..."
              className="flex-1 min-w-0 h-7 px-2.5 rounded-md text-xs border bg-background focus:outline-none focus:ring-1 focus:ring-accent transition-[border-color,box-shadow] 150ms ease-out" autoFocus />
            <button onClick={addNote} disabled={!noteText.trim()}
              className="h-7 px-3 rounded-md text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-30 transition-[opacity] 150ms ease-out active:scale-[0.97]">Guardar</button>
            <button onClick={() => setShowNote(false)} className="p-1 text-muted-foreground hover:text-foreground transition-[color] 150ms ease-out"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      {/* ── YEAR NAV ─────────────────────────────────────────────────────────── */}
      {years.length > 1 && (
        <div className="shrink-0 border-b px-4 py-1.5 flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mr-1" style={{ fontFamily: 'var(--font-display)' }}>Años</span>
          {years.map(y => (
            <button key={y} onClick={() => { const fm = sortedMonths.find(m=>m.startsWith(y)); if (fm) jumpToMonth(fm); }}
              className="h-6 px-2 rounded text-xs font-semibold text-muted-foreground hover:text-accent hover:bg-accent/5 transition-[background-color,color] 150ms ease-out active:scale-[0.97]"
              style={{ fontFamily: 'var(--font-display)' }}>{y}</button>
          ))}
        </div>
      )}

      {/* ── PROGRESS BAR ────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-px bg-border"><div className="h-full bg-accent/50 transition-[width] 200ms ease-out" style={{ width: `${scrollPct*100}%` }} /></div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        {/* ── Horizontal Timeline ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 relative overflow-hidden">
          {scrollPct > 0.02 && (
            <button onClick={() => scrollJump(-1)} className="absolute left-0 top-0 bottom-0 w-8 z-10 flex items-center justify-center bg-gradient-to-r from-background via-background/80 to-transparent tm-arr">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {scrollPct < 0.98 && events.length > 3 && (
            <button onClick={() => scrollJump(1)} className="absolute right-0 top-0 bottom-8 w-8 z-10 flex items-center justify-center bg-gradient-to-l from-background via-background/80 to-transparent tm-arr">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {isLoading ? (
            <div className="h-full flex items-center justify-center"><div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
          ) : events.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground/25 mb-2" />
                <p className="text-sm text-muted-foreground">Sin eventos en el historial</p>
                {filter !== 'all' && <button onClick={() => setFilter('all')} className="mt-2 text-xs text-accent hover:underline">Ver todo</button>}
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-hidden tm-scroll">
              <div className="flex items-stretch min-h-full pt-6 pb-10 px-6">
                <div className="shrink-0 w-6 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-accent tm-glow-dot" /></div>

                {sortedMonths.map((mk, mi) => {
                  const me = months[mk];
                  const [ys] = mk.split('-');
                  const isFirstYear = mi === 0 || !sortedMonths[mi-1]?.startsWith(ys);
                  return (
                    <div key={mk} data-m={mk} className="shrink-0 flex flex-col items-center tm-month" style={{ animationDelay: `${mi*60}ms` }}>
                      <div className="shrink-0 mb-3 text-center h-6 flex items-end">
                        {isFirstYear && <span className="text-lg font-bold text-foreground/15 mr-1.5 leading-none" style={{ fontFamily: 'var(--font-display)' }}>{ys}</span>}
                        <span className={`text-[10px] uppercase tracking-widest font-semibold ${isFirstYear ? 'text-accent' : 'text-muted-foreground'}`} style={{ fontFamily: 'var(--font-display)' }}>{monthLabel(mk)}</span>
                      </div>

                      <div className="flex-1 relative flex flex-col items-center min-h-[200px]">
                        <div className="absolute top-0 bottom-0 w-px bg-border" />
                        <div className="flex flex-col items-center gap-5 py-3">
                          {me.map((ev: any, ei: number) => {
                            const cfg = EVT[ev.event_type] || EVT.note;
                            const Icon = cfg.icon;
                            const isExp = expanded === ev.id;
                            const meta = ev.metadata ? (typeof ev.metadata === 'string' ? JSON.parse(ev.metadata) : ev.metadata) : {};
                            const cl = changeLabel(meta);
                            const ds = ev.event_date || ev.created_at || '';
                            const above = ei % 2 === 0;
                            return (
                              <div key={ev.id} className="relative tm-node" style={{ animationDelay: `${mi*60+ei*40}ms` }}>
                                <div className={`absolute top-1/2 -translate-y-1/2 h-px w-4 ${above?'right-1/2':'left-1/2'}`} style={{ backgroundColor: cfg.accent, opacity: 0.25 }} />
                                <div className="relative z-10 flex items-center justify-center w-6 h-6">
                                  <div className="w-2.5 h-2.5 rounded-full border-2 bg-background tm-dot" style={{ borderColor: cfg.accent, boxShadow: `0 0 0 3px ${cfg.accent}12` }} />
                                </div>
                                <div className={`absolute ${above?'bottom-7':'top-7'} left-1/2 -translate-x-1/2`}>
                                  <div className={`w-56 rounded-lg border bg-card cursor-pointer overflow-hidden tm-card ${isExp?'tm-card-exp':''}`}
                                    onClick={() => setExpanded(isExp?null:ev.id)}>
                                    <div className="px-3 py-2">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Icon className="h-3 w-3 shrink-0" style={{ color: cfg.accent }} />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: cfg.accent }}>{cfg.label}</span>
                                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{fmtDay(ds)}</span>
                                      </div>
                                      <div className="flex items-baseline gap-1.5 mb-0.5">
                                        <span className="text-sm font-bold">{fmtMon(ds)}</span>
                                        <span className="text-[11px] text-muted-foreground">{fmtYear(ds)}</span>
                                      </div>
                                      {cl && <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded bg-accent/8 text-accent">{cl}</span>}
                                      {ev.event_type === 'position_change' && ev.old_value && ev.new_value && !isExp && (
                                        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                                          <span className="text-muted-foreground line-through truncate max-w-[75px]">{POSITION_LABELS[ev.old_value as keyof typeof POSITION_LABELS]||ev.old_value}</span>
                                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                          <span className="font-medium truncate max-w-[75px]">{POSITION_LABELS[ev.new_value as keyof typeof POSITION_LABELS]||ev.new_value}</span>
                                        </div>
                                      )}
                                      {ev.event_type === 'evaluation_completed' && meta.score !== undefined && (
                                        <div className="mt-1"><Ring v={meta.score} s={28} /></div>
                                      )}
                                    </div>
                                    {isExp && (
                                      <div className="px-3 pb-2.5 border-t tm-expand">
                                        <div className="mt-2 space-y-1.5">
                                          <p className="text-[10px] text-muted-foreground">{fmtFull(ds)} · {fmtTime(ds)}</p>
                                          {ev.event_type === 'position_change' && ev.old_value && ev.new_value && (
                                            <div className="flex items-center gap-1.5 text-xs">
                                              <span className="text-muted-foreground line-through">{POSITION_LABELS[ev.old_value as keyof typeof POSITION_LABELS]||ev.old_value}</span>
                                              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                              <span className="font-medium">{POSITION_LABELS[ev.new_value as keyof typeof POSITION_LABELS]||ev.new_value}</span>
                                            </div>
                                          )}
                                          {ev.event_type === 'evaluation_completed' && (
                                            <div className="space-y-1">
                                              {meta.evalType === 'self' && <p className="text-[11px] text-muted-foreground">Autoevaluación</p>}
                                              {meta.evalType === 'supervisor' && <p className="text-[11px] text-muted-foreground">Evaluación de Supervisor</p>}
                                              {meta.evalType === 'feedback' && <p className="text-[11px] text-muted-foreground">Sesión de Feedback</p>}
                                              {meta.period && <p className="text-[11px] text-muted-foreground">{meta.period}</p>}
                                              {meta.score !== undefined && <div className="flex items-center gap-2"><Ring v={meta.score} /><span className="text-sm font-bold text-accent">{meta.score}%</span></div>}
                                            </div>
                                          )}
                                          {ev.event_type === 'role_change' && meta.changes && (
                                            <div className="flex flex-wrap gap-1">{(meta.changes as string[]).map((c:string,i:number) => <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-medium">{c}</span>)}</div>
                                          )}
                                          {(ev.event_type==='supervisor_assigned'||ev.event_type==='supervisor_removed') && meta.supervisorName && (
                                            <p className="text-xs"><span className="font-medium">{meta.supervisorName}</span>{meta.period && <span className="text-muted-foreground text-[11px] ml-1">{meta.period}</span>}</p>
                                          )}
                                          {ev.note && <p className="text-xs text-foreground leading-relaxed">{ev.note}</p>}
                                          {canAdmin && (
                                            <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar evento?')) deleteEvent(ev.id); }}
                                              className="text-[10px] text-muted-foreground hover:text-destructive transition-[color] 150ms ease-out flex items-center gap-1">
                                              <Trash2 className="h-2.5 w-2.5" />Eliminar
                                            </button>
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
                      <div className="shrink-0 w-12" />
                    </div>
                  );
                })}
                <div className="shrink-0 w-6 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-border" /></div>
              </div>
            </div>
          )}
        </div>

        {/* ── VERTICAL MINI-VIEWER ──────────────────────────────────────────── */}
        {events.length > 0 && (
          <div className="shrink-0 w-12 border-l bg-muted/30 flex flex-col">
            <div className="shrink-0 h-6 flex items-center justify-center border-b">
              <Clock className="h-2.5 w-2.5 text-muted-foreground/40" />
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-1.5 flex flex-col gap-0">
              {sortedMonths.map((mk, i) => {
                const [y] = mk.split('-');
                const isFirst = i === 0 || !sortedMonths[i-1]?.startsWith(y);
                const hasEvts = (months[mk]?.length || 0) > 0;
                return (
                  <div key={mk} className="flex flex-col items-center">
                    {isFirst && (
                      <button onClick={() => jumpToMonth(mk)}
                        className="text-[8px] font-bold text-muted-foreground hover:text-accent transition-[color] 100ms ease-out mb-1"
                        style={{ fontFamily: 'var(--font-display)' }}>{y}</button>
                    )}
                    <button onClick={() => jumpToMonth(mk)}
                      className="w-full flex items-center gap-1 py-0.5 group">
                      <div className={`w-1.5 h-1.5 rounded-full transition-[background-color,transform] 150ms ease-out ${
                        hasEvts ? 'bg-accent' : 'bg-border'
                      } group-hover:scale-150`} style={{ transformOrigin: 'center' }} />
                      <span className="text-[8px] text-muted-foreground/60 group-hover:text-foreground transition-[color] 100ms ease-out leading-none">{monthLabel(mk)}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 mx-1.5 mb-1.5 h-1 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-accent/60 transition-[width,margin] 200ms ease-out"
                style={{ width: `${Math.max(15, 100/Math.max(1,sortedMonths.length))}%`, marginLeft: `${scrollPct*(100-100/Math.max(1,sortedMonths.length))}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
