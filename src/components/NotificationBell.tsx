import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useUnreadNotificationCount, useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/api/queries';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

const TYPE_ICONS: Record<string, string> = {
  info: 'ℹ️',
  reminder: '⏰',
  warning: '⚠️',
  approval_required: '✅',
  escalation: '🔴',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: countData } = useUnreadNotificationCount();
  const { data: notifData, isLoading } = useNotifications({ limit: 20, unread: false });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unread = countData?.unread || 0;
  const notifications = notifData?.notifications || [];

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleNotifClick = (notif: any) => {
    if (!notif.isRead) markRead.mutate(notif.id);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
      setOpen(false);
    }
  };

  const handleMarkAll = () => {
    markAllRead.mutate(undefined);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted/40 transition-colors"
      >
        <Bell className="h-4.5 w-4.5 text-sidebar-foreground/70" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 max-h-[60vh] bg-card border rounded-lg shadow-lg z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
            <span className="text-xs font-semibold">Notificaciones</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-[10px] text-accent hover:underline px-1.5 py-0.5">
                  Marcar todo leído
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted/40 rounded">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-xs text-muted-foreground">Cargando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((notif: any) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/20 transition-colors ${!notif.isRead ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm shrink-0 mt-0.5">{TYPE_ICONS[notif.type] || 'ℹ️'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${!notif.isRead ? 'font-semibold' : 'text-muted-foreground'}`}>{notif.title}</p>
                      {notif.body && (
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5 line-clamp-2">{notif.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/40 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t bg-muted/10">
            <button onClick={() => { navigate('/notifications'); setOpen(false); }} className="text-[10px] text-accent hover:underline">
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
