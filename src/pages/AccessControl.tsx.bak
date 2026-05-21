import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useSystemStatus, useUpdateSystemStatus, useSystemModules, useUpdateSystemModules, useActivationHistory } from "@/api/queries";
import { Shield, Calendar, CreditCard, Power, Users, Ticket, Clock, ToggleLeft, ToggleRight, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AccessControl() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: systemStatus } = useSystemStatus();
  const updateSystemStatus = useUpdateSystemStatus().mutate;
  const { data: moduleConfig } = useSystemModules();
  const updateModuleConfig = useUpdateSystemModules().mutate;
  const { data: activationHistory = [] } = useActivationHistory();
  const status = systemStatus || { status: 'active' as const, activationDate: '', paymentPlan: 'monthly' as const, maxUsers: 50, tickets: 0 };

  const [activationDate, setActivationDate] = useState(status.activationDate || '');
  const [paymentPlan, setPaymentPlan] = useState<'monthly' | 'annual'>(status.paymentPlan || 'monthly');
  const [maxUsers, setMaxUsers] = useState(status.maxUsers || 50);
  const [tickets, setTickets] = useState(status.tickets || 0);

  if (!currentUser?.isSuperUser) return <p className="text-center py-12 text-muted-foreground">Acceso restringido.</p>;

  const activeUserCount = users.filter(u => u.isActive && !u.isSuperUser && !u.isDummy).length;

  const monthsSinceActivation = (() => {
    if (!activationDate) return null;
    const start = new Date(activationDate);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  })();

  const handleSave = () => {
    updateSystemStatus({ status: status.status, activationDate, paymentPlan, maxUsers, tickets });
    toast.success('Configuración guardada correctamente');
  };

  const toggleStatus = () => {
    updateSystemStatus({ ...status, activationDate, paymentPlan, maxUsers, tickets, status: status.status === 'active' ? 'inactive' : 'active' });
  };

  const getExpirationDate = () => {
    if (!activationDate || paymentPlan !== 'annual') return null;
    const date = new Date(activationDate);
    date.setMonth(date.getMonth() + 12);
    return date.toISOString().split('T')[0];
  };

  const expiration = getExpirationDate();
  const isExpired = expiration ? new Date(expiration) < new Date() : false;

  const lastActivation = activationHistory.filter(h => h.action === 'activated').slice(-1)[0];

  const toggleModule = (mod: keyof typeof moduleConfig) => {
    updateModuleConfig({ ...moduleConfig, [mod]: !moduleConfig[mod] });
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Acceso al Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">Configuración de activación, módulos y forma de pago</p>
      </div>

      {/* Status Card */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${status.status === 'active' ? 'bg-smps-success/10' : 'bg-destructive/10'}`}>
              <Power className={`h-6 w-6 ${status.status === 'active' ? 'text-smps-success' : 'text-destructive'}`} />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Estatus del Sistema</h3>
              <p className={`text-sm font-medium ${status.status === 'active' ? 'text-smps-success' : 'text-destructive'}`}>
                {status.status === 'active' ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>
          <button onClick={toggleStatus}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 ${status.status === 'active' ? 'bg-destructive text-destructive-foreground' : 'bg-smps-success text-primary-foreground'}`}>
            {status.status === 'active' ? 'Desactivar' : 'Activar'}
          </button>
        </div>

        {status.status === 'inactive' && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
            <Shield className="h-4 w-4 inline mr-2" />
            El sistema está inactivo. Todos los usuarios (excepto el superusuario) tienen el acceso bloqueado.
          </div>
        )}

        {isExpired && status.status === 'active' && (
          <div className="bg-smps-warning/10 border border-smps-warning/20 rounded-lg p-4 text-sm text-smps-warning mt-4">
            <Shield className="h-4 w-4 inline mr-2" />
            El periodo anual ha expirado.
          </div>
        )}
      </div>

      {/* Module Toggles */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-accent" /> Módulos del Sistema
        </h3>
        <div className="space-y-3">
          {([
            { key: 'evaluations' as const, label: 'Evaluaciones', desc: 'Autoevaluación, evaluaciones de equipo, plantillas y reportes' },
            { key: 'communications' as const, label: 'Comunicación', desc: 'Tablón de anuncios y comunicados internos' },
            { key: 'vacations' as const, label: 'Vacaciones', desc: 'Solicitudes y gestión de vacaciones' },
          ]).map(mod => (
            <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{mod.label}</p>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
              </div>
              <button onClick={() => toggleModule(mod.key)} className="flex items-center gap-2">
                {moduleConfig[mod.key] ? (
                  <ToggleRight className="h-8 w-8 text-smps-success" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                )}
                <span className={`text-xs font-medium ${moduleConfig[mod.key] ? 'text-smps-success' : 'text-muted-foreground'}`}>
                  {moduleConfig[mod.key] ? 'Activo' : 'Inactivo'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Users & Limit */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Usuarios Activos</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">Activos actualmente</p>
            <p className={`text-3xl font-bold font-display ${activeUserCount > maxUsers ? 'text-destructive' : 'text-foreground'}`}>
              {activeUserCount}
            </p>
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground block mb-1">Límite máximo</label>
            <select value={maxUsers} onChange={e => setMaxUsers(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              {[5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200].map(n => (
                <option key={n} value={n}>{n} usuarios</option>
              ))}
            </select>
          </div>
        </div>
        {activeUserCount > maxUsers && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-sm text-destructive mt-4">
            ⚠️ Se ha excedido el límite de usuarios activos ({activeUserCount}/{maxUsers}).
          </div>
        )}
      </div>

      {/* Tickets */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Ticket className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Tickets</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">Total de tickets</p>
            <p className="text-3xl font-bold font-display">{tickets}</p>
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground block mb-1">Contabilizar</label>
            <select value={tickets} onChange={e => setTickets(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              {Array.from({ length: 101 }, (_, i) => i).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activation Date */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Activación</h3>
        </div>
        <label className="text-sm text-muted-foreground block mb-2">Fecha de activación</label>
        <input type="date" value={activationDate} onChange={e => setActivationDate(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        {activationDate && (
          <div className="flex items-center gap-4 mt-3">
            <p className="text-xs text-muted-foreground">Activado desde: {activationDate}</p>
            {monthsSinceActivation !== null && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {monthsSinceActivation} {monthsSinceActivation === 1 ? 'mes' : 'meses'} transcurridos
              </p>
            )}
          </div>
        )}
      </div>

      {/* Payment Plan */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Forma de Pago</h3>
        </div>
        <select value={paymentPlan} onChange={e => setPaymentPlan(e.target.value as 'monthly' | 'annual')}
          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="monthly">Mensual</option>
          <option value="annual">Anual</option>
        </select>

        {paymentPlan === 'annual' && activationDate && (
          <div className="mt-4 bg-muted/50 rounded-lg p-4">
            <p className="text-sm"><span className="text-muted-foreground">Periodo:</span> <span className="font-medium">{activationDate}</span> → <span className="font-medium">{expiration}</span></p>
            <p className={`text-xs mt-1 ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {isExpired ? '⚠️ Periodo expirado' : `Quedan ${Math.ceil((new Date(expiration!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días`}
            </p>
          </div>
        )}
      </div>

      {/* Activation History */}
      {activationHistory.length > 0 && (
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg font-semibold">Histórico de Activación</h3>
          </div>
          {lastActivation && (
            <p className="text-sm text-muted-foreground mb-3">
              Última activación: <span className="font-medium text-foreground">{new Date(lastActivation.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          )}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {[...activationHistory].reverse().map((entry, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 rounded text-sm ${entry.action === 'activated' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <Badge variant="outline" className={entry.action === 'activated' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {entry.action === 'activated' ? 'Activado' : 'Desactivado'}
                </Badge>
                <span>{new Date(entry.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-xs ml-auto">{getUser(entry.by)?.name || 'Sistema'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSave}
        className="w-full py-3 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
        Guardar Configuración
      </button>
    </div>
  );
}
