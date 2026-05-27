import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTimeline, useUsers, useCreateTimelineEvent, useDeleteTimelineEvent } from '@/api/queries';
import { POSITION_LABELS } from '@/types';
import {
  ArrowUp, ArrowDown, ArrowRight, UserPlus, UserMinus, BarChart3, Shield, UserCheck,
  UserX, Calendar, CheckCircle, Key, MessageSquare, ChevronLeft, ChevronRight,
  Plus, Trash2, Clock, Filter, X, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';

// ─── EVENT CONFIG ────────────────────────────────────────────────────────────
const EVENT_CONFIG: Record<string, {
  icon: typeof ArrowUp;
  color: string;
  bg: string;
  border: string;
  label: string;
  railColor: string;
}> = {
  position_change:   { icon: ArrowUp,      color: 'text-amber-700',   bg: 'bg-amber-50/80',    border: 'border-amber-200/60',  label: 'Cambio de Posición',  railColor: 'hsl(40 60% 50%)' },
  hire:               { icon: UserPlus,      color: 'text-emerald-700', bg: 'bg-emerald-50/80',  border: 'border-emerald-200/60', label: 'Ingreso',             railColor: 'hsl(145 60% 40%)' },
  termination:        { icon: UserMinus,     color: 'text-red-700',     bg: 'bg-red-50/80',      border: 'border-red-200/60',    label: 'Baja',               railColor: 'hsl(350 80% 42%)' },
  reactivation:       { icon: UserCheck,     color: 'text-emerald-700', bg: 'bg-emerald-50/80',  border: 'border-emerald-200/60', label: 'Reactivación',       railColor: 'hsl(145 60% 40%)' },
  evaluation_completed: { icon: BarChart3,  color: 'text-rose-700',    bg: 'bg-rose-50/80',     border: 'border-rose-200/60',   label: 'Evaluación',         railColor: 'hsl(350 70% 45%)' },
  role_change:        { icon: Shield,        color: 'text-blue-700',    bg: 'bg-blue-50/80',     border: 'border-blue-200/60',   label: 'Cambio de Rol',      railColor: 'hsl(215 50% 35%)' },
  supervisor_assigned: { icon: UserCheck,   color: 'text-indigo-700',  bg: 'bg-indigo-50/80',   border: 'border-indigo-200/60', label: 'Supervisor Asignado', railColor: 'hsl(225 50% 42%)' },
  supervisor_removed: { icon: UserX,         color: 'text-indigo-700', bg: 'bg-indigo-50/80',   border: 'border-indigo-200/60', label: 'Supervisor Removido', railColor: 'hsl(225 40% 55%)' },
  period_transition:  { icon: Calendar,     color: 'text-slate-700',  bg: 'bg-slate-50/80',    border: 'border-slate-200/60',  label: 'Periodo',            railColor: 'hsl(215 15% 45%)' },
  action_plan_milestone: { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50/80',   border: 'border-green-200/60', label: 'Plan de Acción',     railColor: 'hsl(145 60% 40%)' },
  password_reset:     { icon: Key,          color: 'text-orange-700',  bg: 'bg-orange-50/80',   border: 'border-orange-200/60', label: 'Contraseña',         railColor: 'hsl(25 80% 50%)' },
  note:               { icon: MessageSquare, color: 'text-slate-600',  bg: 'bg-slate-50/80',    border: 'border-slate-200/60',  label: 'Nota',              railColor: 'hsl(215 15% 55%)' },
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  promotion: 'Promoción',
  demotion: 'Degradación',
  lateral_move: 'Cambio lateral',
  lateral: 'Cambio lateral',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todo' },
  { key: 'position_change', label: 'Posición' },
  { key: 'hire', label: 'Ingreso' },
  { key: 'termination', label: 'Baja' },
  { key: 'evaluation_completed', label: 'Evaluación' },
  { key: 'role_change', label: 'Rol' },
  { key: 'supervisor_assigned', label: 'Supervisor' },
  { key: 'action_plan_milestone', label: 'Plan de Acción' },
  { key: 'note', label: 'Notas' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function parseEventDate(dateStr: string): Date {
  return new Date(dateStr + (dateStr.length <= 10 ? 'T12:00:00' : ''));
}

function formatDay(dateStr: string): string {
  const d = parseEventDate(dateStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric' });
}

function formatMonthYear(dateStr: string): string {
  const d = parseEventDate(dateStr);
  return d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  const d = parseEventDate(dateStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function getChangeTypeLabel(metadata: any): string {
  if (metadata?.changeType && CHANGE_TYPE_LABELS[metadata.changeType]) {
    return CHANGE_TYPE_LABELS[metadata.changeType];
  }
  return '';
}

function getYear(dateStr: string): number {
  return parseEventDate(dateStr).getFullYear();
}

function getMonth(dateStr: string): string {
  const d = parseEventDate(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 80 ? 'hsl(145 60% 40%)' : score >= 60 ? 'hsl(40 60% 50%)' : 'hsl(350 80% 42%)';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={2.5} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        className="tm-score-ring"
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        className="fill-foreground text-[9px] font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
        {score}
      </text>
    </svg>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function UserTimeline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const [filter, setFilter] = useState<string>('all');
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);

  const createEvent = useCreateTimelineEvent();
  const deleteEvent = useDeleteTimelineEvent();

  const targetUser = users.find((u: any) => u.id === id);
  const { data: timelineData, isLoading } = useUserTimeline(id!, filter !== 'all' ? { type: filter } : undefined);

  const events = useMemo(() => {
    const raw = (timelineData as any)?.events || [];
    return raw.sort((a: any, b: any) => {
      const da = a.event_date || a.created_at;
      const db = b.event_date || b.created_at;
      return da.localeCompare(db);
    });
  }, [(timelineData as any)?.events]);

  const total = (timelineData as any)?.total || 0;

  const canAddNote = currentUser?.isAdmin || currentUser?.isSuperUser;
  const canDelete = currentUser?.isAdmin || currentUser?.isSuperUser;

  // Group events by month for the rail
  const monthGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    events.forEach((e: any) => {
      const key = getMonth(e.event_date || e.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [events]);

  const sortedMonths = useMemo(() => Object.keys(monthGroups).sort(), [monthGroups]);

  // Year markers
  const yearMarkers = useMemo(() => {
    const years = new Set<string>();
    sortedMonths.forEach(m => {
      const [y] = m.split('-');
      years.add(y);
    });
    return Array.from(years).sort();
  }, [sortedMonths]);

  // Scroll management
  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    setScrollPct(el.scrollWidth > el.clientWidth ? el.scrollLeft / (el.scrollWidth - el.clientWidth) : 0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener('scroll', updateScroll, { passive: true });
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScroll); ro.disconnect(); };
  }, [updateScroll, events]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  const scrollToMonth = (monthKey: string) => {
    const el = scrollRef.current?.querySelector(`[data-month="${monthKey}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  // Add note
  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await createEvent.mutateAsync({ userId: id, eventType: 'note', note: noteText.trim() });
      setNoteText('');
      setShowAddNote(false);
      toast.success('Nota agregada al historial');
    } catch {
      toast.error('Error al agregar nota');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent.mutateAsync({ userId: id!, eventId });
      toast.success('Evento eliminado del historial');
    } catch {
      toast.error('Error al eliminar evento');
    }
  };

  if (!id) return null;

  return (
    <div className="flex flex-col h-full -m-4 md:-m-5">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 smps-gradient-header px-4 md:px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 transition-[color,background-color] 150ms ease-out">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Clock className="h-4 w-4 text-primary-foreground/50" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-primary-foreground truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {targetUser ? `Historial — ${targetUser.name}` : 'Historial'}
          </h1>
          <p className="text-[11px] text-primary-foreground/50">
            {total} evento{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-md transition-[color,background-color] 150ms ease-out ${
            filter !== 'all' ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10'
          }`}
        >
          <Filter className="h-4 w-4" />
        </button>

        {/* Add note */}
        {canAddNote && (
          <button
            onClick={() => setShowAddNote(true)}
            className="p-1.5 rounded-md text-primary-foreground/50 hover:text-primary-foreground hover:bg-white/10 transition-[color,background-color] 150ms ease-out"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="shrink-0 border-b bg-muted/30 px-4 py-2 flex gap-1.5 overflow-x-auto tm-filters-bar">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-[background-color,color] 150ms ease-out ${
                filter === opt.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ── ADD NOTE MODAL ──────────────────────────────────────────────────── */}
      {showAddNote && (
        <div className="shrink-0 border-b bg-card px-4 py-3 tm-slide-down">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Agregar Nota
            </span>
            <button onClick={() => setShowAddNote(false)} className="ml-auto p-1 rounded hover:bg-muted transition-[background-color] 150ms ease-out">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              placeholder="Escribe una nota para el historial..."
              className="flex-1 min-w-0 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-accent transition-[border-color,box-shadow] 150ms ease-out"
              autoFocus
            />
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim()}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-40 transition-[opacity] 150ms ease-out active:scale-[0.97]"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* ── YEAR NAVIGATOR ──────────────────────────────────────────────────── */}
      {yearMarkers.length > 1 && (
        <div className="shrink-0 px-4 py-2 border-b bg-background flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mr-2" style={{ fontFamily: 'var(--font-display)' }}>
            Años
          </span>
          {yearMarkers.map(y => (
            <button
              key={y}
              onClick={() => {
                const firstMonth = sortedMonths.find(m => m.startsWith(y));
                if (firstMonth) scrollToMonth(firstMonth);
              }}
              className="px-2 py-0.5 rounded text-xs font-semibold hover:bg-muted transition-[background-color] 150ms ease-out active:scale-[0.97]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ── TIMELINE VIEWPORT ───────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {/* Scroll arrows */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center bg-gradient-to-r from-background to-transparent tm-arrow-left"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center bg-gradient-to-l from-background to-transparent tm-arrow-right"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        {/* Scroll progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted/50 z-10">
          <div className="h-full bg-accent/60 transition-[width] 200ms ease-out" style={{ width: `${scrollPct * 100}%` }} />
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando historial...</span>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Sin eventos en el historial</p>
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="mt-2 text-xs text-accent hover:underline">
                  Ver todo el historial
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── HORIZONTAL TIMELINE ──────────────────────────────────────────── */
          <div
            ref={scrollRef}
            className="h-full overflow-x-auto overflow-y-hidden tm-scroll-container"
          >
            <div className="flex items-stretch min-h-full pt-10 pb-14 px-8">
              {/* Origin marker */}
              <div className="shrink-0 flex flex-col items-center justify-center w-8">
                <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_hsl(350_80%_42%/0.4)]" />
              </div>

              {/* Month sections */}
              {sortedMonths.map((monthKey, mi) => {
                const monthEvents = monthGroups[monthKey];
                const [yStr, mStr] = monthKey.split('-');
                const isFirstOfYear = mi === 0 || !sortedMonths[mi - 1]?.startsWith(yStr);

                return (
                  <div
                    key={monthKey}
                    data-month={monthKey}
                    className="shrink-0 flex flex-col items-center tm-month-section"
                    style={{ animationDelay: `${mi * 80}ms` }}
                  >
                    {/* Month label */}
                    <div className="mb-3 text-center">
                      {isFirstOfYear && (
                        <span className="block text-lg font-bold text-foreground/25" style={{ fontFamily: 'var(--font-display)' }}>
                          {yStr}
                        </span>
                      )}
                      <span className={`text-[10px] uppercase tracking-widest font-semibold ${isFirstOfYear ? 'text-accent' : 'text-muted-foreground'}`} style={{ fontFamily: 'var(--font-display)' }}>
                        {monthLabel(monthKey).replace(/ \d{4}$/, '')}
                      </span>
                    </div>

                    {/* Events column with rail */}
                    <div className="flex-1 relative flex flex-col items-center">
                      {/* Vertical rail segment */}
                      <div className="absolute top-0 bottom-0 w-px bg-border" />

                      {/* Event nodes */}
                      <div className="relative flex flex-col items-center gap-4 py-4">
                        {monthEvents.map((event: any, ei: number) => {
                          const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.note;
                          const Icon = config.icon;
                          const isExpanded = expandedEvent === event.id;
                          const metadata = event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : {};
                          const changeLabel = getChangeTypeLabel(metadata);
                          const isAbove = ei % 2 === 0;
                          const dateStr = event.event_date || event.created_at;

                          return (
                            <div
                              key={event.id}
                              className="relative tm-event-node"
                              style={{ animationDelay: `${mi * 80 + ei * 60}ms` }}
                            >
                              {/* Connector line */}
                              <div className="absolute top-1/2 -translate-y-1/2 h-px w-4"
                                style={{ left: isAbove ? '50%' : undefined, right: isAbove ? undefined : '50%', backgroundColor: config.railColor, opacity: 0.4 }}
                              />

                              {/* Rail node dot */}
                              <div className="relative z-10 flex items-center justify-center">
                                <div className="w-3 h-3 rounded-full border-2 bg-background tm-rail-dot"
                                  style={{ borderColor: config.railColor, boxShadow: `0 0 0 3px ${config.railColor}15` }}
                                />
                              </div>

                              {/* Event card — positioned above or below */}
                              <div className={`absolute ${isAbove ? 'bottom-6' : 'top-6'} left-1/2 -translate-x-1/2`}>
                                <div
                                  className={`tm-event-card w-52 rounded-lg border ${config.border} ${config.bg} backdrop-blur-sm cursor-pointer overflow-hidden`}
                                  onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                                >
                                  {/* Compact view */}
                                  <div className="px-3 py-2">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Icon className="h-3 w-3 shrink-0" style={{ color: config.railColor }} />
                                      <span className={`text-[10px] font-semibold uppercase tracking-wide truncate ${config.color}`}>
                                        {config.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-foreground">{formatDay(dateStr)}</span>
                                      <span className="text-[10px] text-muted-foreground">{formatMonthYear(dateStr).replace(/ \d{4}$/, '')}</span>
                                    </div>
                                    {changeLabel && (
                                      <span className="inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                                        {changeLabel}
                                      </span>
                                    )}

                                    {/* Score ring for evaluations */}
                                    {event.event_type === 'evaluation_completed' && metadata.score !== undefined && (
                                      <div className="mt-1.5">
                                        <ScoreRing score={metadata.score} size={32} />
                                      </div>
                                    )}

                                    {/* Position change mini-detail */}
                                    {event.event_type === 'position_change' && event.old_value && event.new_value && !isExpanded && (
                                      <div className="mt-1 flex items-center gap-1 text-[10px]">
                                        <span className="text-muted-foreground line-through truncate max-w-[70px]">
                                          {POSITION_LABELS[event.old_value as keyof typeof POSITION_LABELS] || event.old_value}
                                        </span>
                                        <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                        <span className="font-medium truncate max-w-[70px]">
                                          {POSITION_LABELS[event.new_value as keyof typeof POSITION_LABELS] || event.new_value}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Expanded detail */}
                                  {isExpanded && (
                                    <div className="px-3 pb-2.5 border-t border-border/30 tm-expand-section">
                                      <div className="mt-2 space-y-1.5">
                                        {/* Full date */}
                                        <p className="text-[10px] text-muted-foreground">
                                          {formatFullDate(dateStr)} · {formatTime(dateStr)}
                                        </p>

                                        {/* Position change detail */}
                                        {event.event_type === 'position_change' && event.old_value && event.new_value && (
                                          <div className="flex items-center gap-1.5 text-xs">
                                            <span className="text-muted-foreground line-through">
                                              {POSITION_LABELS[event.old_value as keyof typeof POSITION_LABELS] || event.old_value}
                                            </span>
                                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                            <span className="font-medium">
                                              {POSITION_LABELS[event.new_value as keyof typeof POSITION_LABELS] || event.new_value}
                                            </span>
                                          </div>
                                        )}

                                        {/* Evaluation detail */}
                                        {event.event_type === 'evaluation_completed' && (
                                          <div className="space-y-1">
                                            {metadata.evalType === 'self' && <p className="text-[10px] text-muted-foreground">Autoevaluación</p>}
                                            {metadata.evalType === 'supervisor' && <p className="text-[10px] text-muted-foreground">Evaluación de Supervisor</p>}
                                            {metadata.evalType === 'feedback' && <p className="text-[10px] text-muted-foreground">Sesión de Feedback</p>}
                                            {metadata.period && <p className="text-[10px] text-muted-foreground">Periodo: {metadata.period}</p>}
                                            {metadata.score !== undefined && (
                                              <div className="flex items-center gap-2">
                                                <ScoreRing score={metadata.score} />
                                                <span className="text-sm font-bold text-accent">{metadata.score}%</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Role change */}
                                        {event.event_type === 'role_change' && metadata.changes && (
                                          <div className="flex flex-wrap gap-1">
                                            {(metadata.changes as string[]).map((c: string, i: number) => (
                                              <span key={i} className="text-[9px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-medium">{c}</span>
                                            ))}
                                          </div>
                                        )}

                                        {/* Supervisor */}
                                        {(event.event_type === 'supervisor_assigned' || event.event_type === 'supervisor_removed') && metadata.supervisorName && (
                                          <p className="text-xs">
                                            <span className="font-medium">{metadata.supervisorName}</span>
                                            {metadata.period && <span className="text-muted-foreground text-[10px] ml-1.5">{metadata.period}</span>}
                                          </p>
                                        )}

                                        {/* Note */}
                                        {event.note && (
                                          <p className="text-xs text-foreground leading-relaxed">{event.note}</p>
                                        )}

                                        {/* Delete button for admins */}
                                        {canDelete && (
                                          <button
                                            onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar este evento del historial?')) handleDeleteEvent(event.id); }}
                                            className="mt-1 text-[10px] text-muted-foreground hover:text-destructive transition-[color] 150ms ease-out"
                                          >
                                            Eliminar evento
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

                    {/* Month width: enough for events */}
                    <div className="w-14 shrink-0" />
                  </div>
                );
              })}

              {/* Terminal marker */}
              <div className="shrink-0 flex flex-col items-center justify-center w-8">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
              </div>
            </div>
          </div>
        )}

        {/* Mini-map / scroll indicator */}
        {events.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-6 px-8 flex items-center gap-0.5 bg-gradient-to-t from-background to-transparent">
            {sortedMonths.map((m, i) => {
              const isActive = scrollPct >= i / sortedMonths.length && scrollPct < (i + 1) / sortedMonths.length;
              return (
                <button
                  key={m}
                  onClick={() => scrollToMonth(m)}
                  className={`h-1 rounded-full flex-1 min-w-[4px] transition-[background-color] 150ms ease-out ${
                    isActive ? 'bg-accent' : 'bg-border'
                  }`}
                  title={monthLabel(m)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
