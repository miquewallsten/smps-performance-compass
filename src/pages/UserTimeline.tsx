import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTimeline, useUsers, useCreateTimelineEvent, useDeleteTimelineEvent } from '@/api/queries';
import { POSITION_LABELS, PRACTICE_AREA_LABELS } from '@/types';
import {
  ArrowUp, ArrowDown, ArrowRight, UserPlus, UserMinus, BarChart3, Shield, UserCheck,
  UserX, Calendar, CheckCircle, Key, MessageSquare, ChevronLeft, Filter, Plus, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const EVENT_CONFIG: Record<string, { icon: typeof ArrowUp; color: string; bg: string; label: string }> = {
  position_change: { icon: ArrowUp, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Cambio de Posición' },
  hire: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Ingreso' },
  termination: { icon: UserMinus, color: 'text-red-600', bg: 'bg-red-50', label: 'Baja' },
  reactivation: { icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Reactivación' },
  evaluation_completed: { icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Evaluación' },
  role_change: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Cambio de Rol' },
  supervisor_assigned: { icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Supervisor Asignado' },
  supervisor_removed: { icon: UserX, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Supervisor Removido' },
  period_transition: { icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Periodo' },
  action_plan_milestone: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Plan de Acción' },
  password_reset: { icon: Key, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Contraseña' },
  note: { icon: MessageSquare, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Nota' },
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  promotion: 'Promoción',
  demotion: 'Degradación',
  lateral_move: 'Cambio lateral',
  lateral: 'Cambio lateral',
};

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function getChangeTypeLabel(metadata: any, oldValue?: string, newValue?: string): string {
  if (metadata?.changeType && CHANGE_TYPE_LABELS[metadata.changeType]) {
    return CHANGE_TYPE_LABELS[metadata.changeType];
  }
  return '';
}

export default function UserTimeline() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const [filter, setFilter] = useState<string>('all');
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const createEvent = useCreateTimelineEvent();
  const deleteEvent = useDeleteTimelineEvent();

  const targetUser = users.find((u: any) => u.id === id);

  const { data: timelineData, isLoading } = useUserTimeline(id!, filter !== 'all' ? { type: filter } : undefined);

  const events = (timelineData as any)?.events || [];
  const total = (timelineData as any)?.total || 0;

  // Can add notes if admin/superuser
  const canAddNote = currentUser?.isAdmin || currentUser?.isSuperUser;
  const canDelete = currentUser?.isAdmin || currentUser?.isSuperUser;

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
      toast.success("Evento eliminado del historial");
    } catch {
      toast.error("Error al eliminar evento");
    }
  };

  if (!id) return null;

  // Group events by date
  const groupedEvents = events.reduce((groups: Record<string, any[]>, event: any) => {
    const date = event.event_date?.split(' ')[0] || event.created_at?.split(' ')[0] || 'Sin fecha';
    if (!groups[date]) groups[date] = [];
    groups[date].push(event);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">Historial del Usuario</h1>
          {targetUser && (
            <p className="text-muted-foreground text-sm mt-0.5">
              {targetUser.name} — {POSITION_LABELS[targetUser.position as keyof typeof POSITION_LABELS] || targetUser.position}
            </p>
          )}
        </div>
        {canAddNote && (
          <button onClick={() => setShowAddNote(!showAddNote)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Agregar Nota
          </button>
        )}
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <div className="smps-surface-elevated space-y-3">
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escribe una nota sobre este usuario..." className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-accent" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAddNote(false); setNoteText(''); }} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button onClick={handleAddNote} disabled={!noteText.trim()} className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">Guardar</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {['all', 'position_change', 'hire', 'termination', 'reactivation', 'evaluation_completed', 'role_change', 'supervisor_assigned', 'supervisor_removed', 'action_plan_milestone', 'note'].map((type) => {
          const config = type === 'all' ? { icon: null, color: '', bg: '', label: 'Todos' } : EVENT_CONFIG[type];
          if (!config && type !== 'all') return null;
          return (
            <button key={type} onClick={() => setFilter(type)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === type ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {config?.label || 'Todos'}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando historial...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Sin eventos en el historial</p>
          <p className="text-sm mt-1">Los eventos se registrarán automáticamente a medida que el usuario interactúe con el sistema.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Center line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {sortedDates.map((date) => (
              <div key={date}>
                {/* Date marker */}
                <div className="relative flex items-center py-4">
                  <div className="absolute left-6 w-3 h-3 rounded-full bg-border -translate-x-1/2 border-2 border-background" />
                  <span className="ml-14 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {formatEventDate(date)}
                  </span>
                </div>

                {/* Events for this date */}
                {groupedEvents[date].map((event: any) => {
                  const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.note;
                  const Icon = config.icon;
                  let metadata: Record<string, unknown> = {};
                  try { metadata = event.metadata ? JSON.parse(event.metadata) : {}; } catch {}

                  return (
                    <div key={event.id} className="relative flex items-start gap-4 pb-6 group">
                      {/* Icon on timeline */}
                      <div className={`relative z-10 w-12 h-12 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>

                      {/* Event card */}
                      <div className="flex-1 smps-surface-elevated p-4 group-hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                              {getChangeTypeLabel(metadata) && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{getChangeTypeLabel(metadata)}</span>
                              )}
                              <span className="text-xs text-muted-foreground">{formatEventTime(event.event_date || event.created_at)}</span>
                              {canDelete && (
                                <button
                                  onClick={() => { if (confirm('¿Eliminar este evento del historial?')) handleDeleteEvent(event.id); }}
                                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                  title="Eliminar evento"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Position change detail */}
                            {event.event_type === 'position_change' && event.old_value && event.new_value && (
                              <div className="mt-1.5 flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground line-through">{POSITION_LABELS[event.old_value as keyof typeof POSITION_LABELS] || event.old_value}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{POSITION_LABELS[event.new_value as keyof typeof POSITION_LABELS] || event.new_value}</span>
                              </div>
                            )}

                            {/* Evaluation detail */}
                            {event.event_type === 'evaluation_completed' && (
                              <div className="mt-1.5 text-sm">
                                {(metadata as any).evalType === 'self' && <span className="text-muted-foreground">Autoevaluación</span>}
                                {(metadata as any).evalType === 'supervisor' && <span className="text-muted-foreground">Evaluación de Supervisor</span>}
                                {(metadata as any).evalType === 'feedback' && <span className="text-muted-foreground">Sesión de Feedback</span>}
                                {(metadata as any).score !== undefined && (
                                  <span className="ml-2 font-medium text-accent">{(metadata as any).score}%</span>
                                )}
                                {(metadata as any).period && <span className="ml-2 text-muted-foreground text-xs">{(metadata as any).period}</span>}
                              </div>
                            )}

                            {/* Role change detail */}
                            {event.event_type === 'role_change' && (metadata as any).changes && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {((metadata as any).changes as string[]).map((c: string, i: number) => (
                                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{c}</span>
                                ))}
                              </div>
                            )}

                            {/* Supervisor detail */}
                            {(event.event_type === 'supervisor_assigned' || event.event_type === 'supervisor_removed') && (metadata as any).supervisorName && (
                              <div className="mt-1.5 text-sm">
                                <span className="font-medium">{(metadata as any).supervisorName}</span>
                                {(metadata as any).period && <span className="text-muted-foreground text-xs ml-2">{(metadata as any).period}</span>}
                              </div>
                            )}

                            {/* Note */}
                            {event.note && event.event_type !== 'position_change' && event.event_type !== 'evaluation_completed' && (
                              <p className="mt-1.5 text-sm text-foreground">{event.note}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="text-center text-xs text-muted-foreground pb-8">
        {total > 0 ? `${total} evento${total !== 1 ? 's' : ''} en el historial` : 'Sin eventos'}
      </div>
    </div>
  );
}
