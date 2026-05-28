import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTimeline, useUsers, useCreateTimelineEvent, useDeleteTimelineEvent } from '@/api/queries';
import { POSITION_LABELS } from '@/types';
import {
  ArrowRight, UserPlus, UserMinus, BarChart3, Shield, UserCheck,
  UserX, Calendar, CheckCircle, Key, MessageSquare, ChevronLeft,
  ChevronRight, Plus, Trash2, Clock, X
} from 'lucide-react';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════════════════════
   TIME MACHINE — Career Timeline
   Apple-inspired, light-theme, horizontal scroll with vertical mini-map
   ═════════════════════════════════════════════════════════════════════════════ */

const EVT: Record<string, { icon: typeof ArrowRight; accent: string; label: string }> = {
  position_change:      { icon: ArrowRight,    accent: '#f59e0b', label: 'Posición' },
  hire:                  { icon: UserPlus,      accent: '#10b981', label: 'Ingreso' },
  termination:           { icon: UserMinus,     accent: '#ef4444', label: 'Baja' },
  reactivation:          { icon: UserCheck,     accent: '#10b981', label: 'Reactivación' },
  evaluation_completed:  { icon: BarChart3,     accent: '#8b5cf6', label: 'Evaluación' },
  role_change:           { icon: Shield,        accent: '#3b82f6', label: 'Rol' },
  supervisor_assigned:   { icon: UserCheck,     accent: '#6366f1', label: 'Supervisor +' },
  supervisor_removed:    { icon: UserX,         accent: '#6366f1', label: 'Supervisor −' },
  period_transition:     { icon: Calendar,      accent: '#94a3b8', label: 'Periodo' },
  action_plan_milestone: { icon: CheckCircle,   accent: '#10b981', label: 'Plan Acción' },
  password_reset:        { icon: Key,           accent: '#f97316', label: 'Contraseña' },
  note:                  { icon: MessageSquare, accent: '#94a3b8', label: 'Nota' },
};

const CHANGE_LABELS: Record<string, string> = {
  promotion: 'Promoción', demotion: 'Degradación', lateral_move: 'Cambio lateral', lateral: 'Cambio lateral',
};

const FILTER_OPTIONS = [
  { k: 'all', l: 'Todo', c: '#6366f1' },
  { k: 'position_change', l: 'Posición', c: '#f59e0b' },
  { k: 'hire', l: 'Ingreso', c: '#10b981' },
  { k: 'termination', l: 'Baja', c: '#ef4444' },
  { k: 'evaluation_completed', l: 'Evaluación', c: '#8b5cf6' },
  { k: 'role_change', l: 'Rol', c: '#3b82f6' },
  { k: 'supervisor_assigned', l: 'Supervisor', c: '#6366f1' },
  { k: 'action_plan_milestone', l: 'Plan Acción', c: '#10b981' },
  { k: 'note', l: 'Notas', c: '#94a3b8' },
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

function Ring({ v, s = 36 }: { v: number; s?: number }) {
  const r = (s-4)/2, c = 2*Math.PI*r, pct = Math.max(0,Math.min(100,v))/100;
  const col = v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={s} height={s} className="shrink-0">
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={3} />
      <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={col} strokeWidth={3}
        strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round"
        transform={`rotate(-90 ${s/2} ${s/2})`} className="tm-ring-anim" />
      <text x={s/2} y={s/2} textAnchor="middle" dominantBaseline="central"
        fill="hsl(var(--foreground))" fontSize="10" fontWeight="700" fontFamily="var(--font-body)">{v}</text>
    </svg>
  );
}

export default function UserTimeline() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user: me } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: rawData, isLoading } = useUserTimeline(id!);
  const events = Array.isArray(rawData) ? rawData : (rawData?.events ?? []);
  const createMut = useCreateTimelineEvent();
  const deleteMut = useDeleteTimelineEvent();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  const emp = users.find(u => u.id === id);
  const canAdmin = me?.isSuperUser || me?.isAdmin;

  // Filter
  const filtered = useMemo(() => {
    if (!Array.isArray(events)) return [];
    if (filter === 'all') return events;
    return events.filter(e => e.event_type === filter);
  }, [events, filter]);

  // Group by month
  const months = useMemo(() => {
    const m: Record<string, typeof filtered> = {};
    filtered.forEach(e => { const k = getMonthKey(e.event_date || e.created_at || ""); if (!m[k]) m[k] = []; m[k].push(e); });
    Object.values(m).forEach(arr => arr.sort((a,b) => String(b.event_date||b.created_at||"").localeCompare(String(a.event_date||a.created_at||""))));
    return m;
  }, [filtered]);

  const sortedMonths = useMemo(() => Object.keys(months).sort(), [months]);

  // Scroll
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollPct(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth));
  }, []);

  const scrollBy = useCallback((dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' }), []);
  const jumpToMonth = useCallback((mk: string) => {
    const el = document.getElementById(`tm-m-${mk}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  // Auto-populate history
  useEffect(() => {
    if (!emp || !id || events.length > 0) return;
    const evts: any[] = [];
    if (emp.createdAt) evts.push({ userId: id, event_type: 'hire', event_date: emp.createdAt.slice(0,10), meta: { position: emp.position } });
    if (emp.position) evts.push({ userId: id, event_type: 'position_change', event_date: emp.createdAt?.slice(0,10) || new Date().toISOString().slice(0,10), meta: { changeType: 'lateral', newPosition: emp.position, label: POSITION_LABELS[emp.position] || emp.position } });
    evts.forEach(e => createMut.mutate(e));
  }, [emp?.id, events.length]);

  // Delete
  const deleteEvent = (eid: string) => deleteMut.mutate(eid);

  // Add form state
  const [addType, setAddType] = useState('note');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0,10));
  const [addNote, setAddNote] = useState('');

  const handleAdd = () => {
    if (!addNote.trim()) { toast.error('Escribe una nota'); return; }
    createMut.mutate({ userId: id!, event_type: addType, event_date: addDate, note: addNote }, {
      onSuccess: () => { setShowAdd(false); setAddNote(''); toast.success('Evento agregado'); }
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-[80vh]"><div className="tm-loader" /></div>;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* ── HEADER BAR ── */}
      <div className="shrink-0 px-5 pt-5 pb-3 flex items-center gap-3 flex-wrap">
        <button onClick={() => nav(-1)} className="tm-back-btn">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight truncate">
            {emp ? `${emp.name} ${emp.lastName||''}`.trim() : 'Timeline'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {emp && POSITION_LABELS[emp.position]} · Time Machine
          </p>
        </div>
        {canAdmin && (
          <button onClick={() => setShowAdd(!showAdd)} className="tm-add-btn">
            <Plus className="h-3.5 w-3.5" />
            <span>Evento</span>
          </button>
        )}
      </div>

      {/* ── FILTER PILLS ── */}
      <div className="shrink-0 px-5 pb-3">
        <div className="flex gap-1.5 overflow-x-auto tm-scroll pb-1">
          {FILTER_OPTIONS.map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`tm-pill ${filter === f.k ? 'tm-pill-active' : ''}`}
              style={filter === f.k ? { background: f.c, color: '#fff' } : undefined}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── ADD EVENT PANEL ── */}
      {showAdd && (
        <div className="shrink-0 mx-5 mb-3 tm-add-panel tm-scale-in">
          <div className="flex items-center gap-2 mb-2">
            <select value={addType} onChange={e => setAddType(e.target.value)}
              className="tm-select flex-1">
              {Object.entries(EVT).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
              className="tm-select w-36" />
          </div>
          <div className="flex gap-2">
            <input value={addNote} onChange={e => setAddNote(e.target.value)}
              placeholder="Nota del evento..." className="tm-input flex-1" />
            <button onClick={handleAdd} className="tm-confirm-btn">Agregar</button>
            <button onClick={() => setShowAdd(false)} className="tm-cancel-btn">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 min-h-0 flex">
        {filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sin eventos en la línea del tiempo</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── HORIZONTAL TIMELINE ── */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Scroll controls */}
              <div className="shrink-0 px-5 flex items-center gap-2 mb-2">
                <button onClick={() => scrollBy(-300)} className="tm-nav-btn"><ChevronLeft className="h-4 w-4" /></button>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-accent/40 transition-[width,margin] duration-300 ease-out"
                    style={{ width: `${100/Math.max(1,sortedMonths.length)}%`, marginLeft: `${scrollPct*(100-100/Math.max(1,sortedMonths.length))}%` }} />
                </div>
                <button onClick={() => scrollBy(300)} className="tm-nav-btn"><ChevronRight className="h-4 w-4" /></button>
              </div>

              {/* Scrollable timeline */}
              <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-x-auto overflow-y-auto tm-scroll px-5 pb-4">
                <div className="flex gap-6 items-start min-h-full pt-2">
                  {/* Origin dot */}
                  <div className="shrink-0 flex flex-col items-center pt-3">
                    <div className="tm-origin-dot tm-glow-dot" />
                    <div className="w-px h-4 bg-border" />
                  </div>

                  {sortedMonths.map(mk => {
                    const evts = months[mk] || [];
                    const [y, m] = mk.split('-');
                    return (
                      <div key={mk} id={`tm-m-${mk}`} className="shrink-0 tm-month" style={{ animationDelay: `${sortedMonths.indexOf(mk)*60}ms` }}>
                        {/* Month header */}
                        <div className="tm-month-header mb-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{monthLabel(mk)}</span>
                          <span className="text-lg font-display font-bold tracking-tight">{y}</span>
                          <span className="tm-event-count">{evts.length}</span>
                        </div>

                        {/* Events */}
                        <div className="flex flex-col gap-2">
                          {evts.map((ev, i) => {
                            const cfg = EVT[ev.event_type] || EVT.note;
                            const Icon = cfg.icon;
                            const isExp = expanded === ev.id;
                            return (
                              <div key={ev.id} className="tm-node" style={{ animationDelay: `${i*50}ms` }}>
                                <div className="tm-timeline-line" style={{ borderColor: cfg.accent }} />
                                <div className="tm-dot-wrapper">
                                  <div className="tm-dot" style={{ background: cfg.accent, animationDelay: `${i*80}ms` }} />
                                </div>

                                <div
                                  className={`tm-card ${isExp ? 'tm-card-exp' : ''}`}
                                  onClick={() => setExpanded(isExp ? null : ev.id)}
                                  style={{ borderLeftColor: cfg.accent }}
                                >
                                  {/* Card header */}
                                  <div className="tm-card-header">
                                    <div className="tm-icon-badge" style={{ background: `${cfg.accent}15`, color: cfg.accent }}>
                                      <Icon className="h-3 w-3" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-semibold truncate">{cfg.label}</span>
                                        {changeLabel(ev.meta) && (
                                          <span className="tm-change-badge" style={{ background: `${cfg.accent}15`, color: cfg.accent }}>
                                            {changeLabel(ev.meta)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-muted-foreground">{fmtDay(ev.event_date||ev.created_at||"")} {fmtMon(ev.event_date||ev.created_at||"")}</span>
                                        {fmtTime(ev.created_at) && <span className="text-[10px] text-muted-foreground/60">{fmtTime(ev.created_at)}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded details */}
                                  {isExp && (
                                    <div className="tm-expand mt-2 pt-2 border-t border-border/50">
                                      <p className="text-[11px] text-muted-foreground mb-1.5">{fmtFull(ev.event_date||ev.created_at||"")}</p>
                                      {ev.meta?.newPosition && (
                                        <p className="text-xs">
                                          <span className="text-muted-foreground">Nuevo puesto: </span>
                                          <span className="font-medium">{POSITION_LABELS[ev.meta.newPosition]||ev.meta.newPosition}</span>
                                        </p>
                                      )}
                                      {ev.meta?.oldPosition && (
                                        <p className="text-xs">
                                          <span className="text-muted-foreground">Puesto anterior: </span>
                                          <span className="font-medium">{POSITION_LABELS[ev.meta.oldPosition]||ev.meta.oldPosition}</span>
                                        </p>
                                      )}
                                      {ev.meta?.feedbackSession && <p className="text-xs text-muted-foreground">Sesión de Feedback</p>}
                                      {ev.meta?.period && <p className="text-[11px] text-muted-foreground">{ev.meta.period}</p>}
                                      {ev.meta?.score !== undefined && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <Ring v={ev.meta.score} />
                                          <span className="text-sm font-bold" style={{ color: ev.meta.score >= 80 ? '#10b981' : ev.meta.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                                            {ev.meta.score}%
                                          </span>
                                        </div>
                                      )}
                                      {ev.event_type === 'role_change' && ev.meta?.changes && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(ev.meta.changes as string[]).map((c:string,i:number) => (
                                            <span key={i} className="tm-role-tag">{c}</span>
                                          ))}
                                        </div>
                                      )}
                                      {(ev.event_type==='supervisor_assigned'||ev.event_type==='supervisor_removed') && ev.meta?.supervisorName && (
                                        <p className="text-xs mt-1">
                                          <span className="font-medium">{ev.meta.supervisorName}</span>
                                          {ev.meta.period && <span className="text-muted-foreground text-[11px] ml-1">{ev.meta.period}</span>}
                                        </p>
                                      )}
                                      {ev.note && <p className="text-xs text-foreground leading-relaxed mt-1.5">{ev.note}</p>}
                                      {canAdmin && (
                                        <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar evento?')) deleteEvent(ev.id); }}
                                          className="tm-delete-btn mt-2">
                                          <Trash2 className="h-2.5 w-2.5" />Eliminar
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="shrink-0 w-8" />
                      </div>
                    );
                  })}
                  <div className="shrink-0 flex flex-col items-center pt-3">
                    <div className="w-2 h-2 rounded-full bg-border" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── VERTICAL MINI-MAP ── */}
            <div className="shrink-0 w-14 border-l border-border/60 bg-muted/20 flex flex-col">
              <div className="shrink-0 h-8 flex items-center justify-center border-b border-border/40">
                <Clock className="h-3 w-3 text-muted-foreground/30" />
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-1 flex flex-col gap-0.5">
                {sortedMonths.map((mk, i) => {
                  const [y] = mk.split('-');
                  const isFirst = i === 0 || !sortedMonths[i-1]?.startsWith(y);
                  const hasEvts = (months[mk]?.length || 0) > 0;
                  return (
                    <div key={mk} className="flex flex-col items-center">
                      {isFirst && (
                        <button onClick={() => jumpToMonth(mk)}
                          className="text-[8px] font-bold text-muted-foreground/50 hover:text-accent transition-colors mb-0.5"
                          style={{ fontFamily: 'var(--font-display)' }}>{y}</button>
                      )}
                      <button onClick={() => jumpToMonth(mk)} className="tm-minimap-btn group">
                        <div className={`tm-minimap-dot ${hasEvts ? 'bg-accent' : 'bg-border'}`} />
                        <span className="text-[7px] text-muted-foreground/40 group-hover:text-foreground transition-colors leading-none">
                          {monthLabel(mk)}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0 mx-1.5 mb-1.5 h-1 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-accent/50 transition-[width,margin] duration-300 ease-out"
                  style={{ width: `${Math.max(20, 100/Math.max(1,sortedMonths.length))}%`, marginLeft: `${scrollPct*(100-100/Math.max(1,sortedMonths.length))}%` }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
