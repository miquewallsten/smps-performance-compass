import { useState } from 'react';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/api/queries';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS: Record<string, string> = {
  info: 'ℹ️',
  reminder: '⏰',
  warning: '⚠️',
  approval_required: '✅',
  escalation: '🔴',
};

const TYPE_LABELS: Record<string, string> = {
  info: 'Información',
  reminder: 'Recordatorio',
  warning: 'Advertencia',
  approval_required: 'Aprobación Requerida',
  escalation: 'Escalación',
};

export default function NotificationsPage() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications({ limit: 100, unread: showUnreadOnly });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications || [];
  const total = data?.total || 0;

  const handleNotifClick = (notif: any) => {
    if (!notif.isRead) markRead.mutate(notif.id);
    if (notif.actionUrl) navigate(notif.actionUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold">Notificaciones</h1>
          <p className="text-xs text-muted-foreground">{total} notificación(es)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showUnreadOnly ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {showUnreadOnly ? 'Sin leer' : 'Todas'}
          </button>
          <button
            onClick={() => markAllRead.mutate(undefined)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todo leído
          </button>
          <button
            onClick={() => navigate('/notification-preferences')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Preferencias
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No hay notificaciones</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {showUnreadOnly ? 'No tienes notificaciones sin leer' : 'Aún no se han generado notificaciones'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => (
            <button
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className={`w-full text-left rounded-lg border p-3 hover:bg-muted/20 transition-colors ${
                !notif.isRead ? 'bg-accent/5 border-accent/20' : 'bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">{TYPE_ICONS[notif.type] || 'ℹ️'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase">{TYPE_LABELS[notif.type] || notif.type}</span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {new Date(notif.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-sm ${!notif.isRead ? 'font-semibold' : ''}`}>{notif.title}</p>
                  {notif.body && <p className="text-xs text-muted-foreground mt-1">{notif.body}</p>}
                </div>
                {!notif.isRead && <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-2" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
