import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useSystemStatus, useUpdateSystemStatus, useSystemModules, useUpdateSystemModules, useFeatureVisibility, useUpdateFeatureVisibility, useActivationHistory, useCopilotConfig, useUpdateCopilotConfig, useSmtpConfig, useUpdateSmtpConfig, useTestEmail } from "@/api/queries";
import { Shield, Calendar, CreditCard, Power, Users, Ticket, Clock, ToggleLeft, ToggleRight, History, Bot, Eye, EyeOff, Save, Mail, Server, Key, Lock, TestTube, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import FeatureVisibility from '@/components/FeatureVisibility';
import { hasRole } from '@/middleware/permissions';

export default function AccessControl() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: systemStatus } = useSystemStatus();
  const updateSystemStatus = useUpdateSystemStatus().mutate;
  const { data: moduleConfig } = useSystemModules();
  const modules = moduleConfig || { evaluations: true, communications: true, vacations: true, copilot: true };
  const updateModuleConfig = useUpdateSystemModules().mutate;
  const { data: activationHistory = [] } = useActivationHistory();
  const { data: copilotConfig } = useCopilotConfig();
  const updateCopilotConfig = useUpdateCopilotConfig().mutate;
  const { data: smtpConfig } = useSmtpConfig();
  const updateSmtpConfig = useUpdateSmtpConfig().mutate;
  const testEmailMutation = useTestEmail();
  const status = systemStatus || { status: 'active' as const, activationDate: '', paymentPlan: 'monthly' as const, maxUsers: 50, maxAdminUsers: 3, tickets: 0 };

  const [activationDate, setActivationDate] = useState(status.activationDate || '');
  const [paymentPlan, setPaymentPlan] = useState<'monthly' | 'annual'>(status.paymentPlan || 'monthly');
  const [maxUsers, setMaxUsers] = useState(status.maxUsers || 50);
  const [tickets, setTickets] = useState(status.tickets || 0);
  const [maxAdminUsers, setMaxAdminUsers] = useState((status as any).maxAdminUsers || 3);

  // AI Config state
  const [aiProvider, setAiProvider] = useState(copilotConfig?.apiProvider || 'ollama');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState(copilotConfig?.model || 'qwen3.5:397b');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiBaseUrl, setAiBaseUrl] = useState(copilotConfig?.apiBaseUrl || '');

  // SMTP Config state
  const [smtpHost, setSmtpHost] = useState(smtpConfig?.smtp_host || '');
  const [smtpPort, setSmtpPort] = useState(smtpConfig?.smtp_port || 587);
  const [smtpSecure, setSmtpSecure] = useState(smtpConfig?.smtp_secure || false);
  const [smtpUser, setSmtpUser] = useState(smtpConfig?.smtp_user || '');
  const [smtpPass, setSmtpPass] = useState('');
  // Default to Hostinger sendmail configuration
  const [smtpFrom, setSmtpFrom] = useState(smtpConfig?.smtp_from || 'SMPS Performance <notificaciones@bowdot.online>');
  const [mailTransport, setMailTransport] = useState(smtpConfig?.mail_transport || 'auto');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  useEffect(() => {
    if (systemStatus) {
      setMaxAdminUsers((systemStatus as any).maxAdminUsers || 3);
    }
  }, [systemStatus]);

  useEffect(() => {
    if (copilotConfig) {
      setAiProvider(copilotConfig.apiProvider || 'ollama');
      setAiModel(copilotConfig.model || 'qwen3.5:397b');
      setAiBaseUrl(copilotConfig.apiBaseUrl || '');
    }
  }, [copilotConfig]);

  useEffect(() => {
    if (smtpConfig) {
      setSmtpHost(smtpConfig.smtp_host || '');
      setSmtpPort(smtpConfig.smtp_port || 587);
      setSmtpSecure(smtpConfig.smtp_secure || false);
      setSmtpUser(smtpConfig.smtp_user || '');
      setSmtpFrom(smtpConfig.smtp_from || 'SMPS Performance <notificaciones@bowdot.online>');
      setMailTransport(smtpConfig.mail_transport || 'auto');
    }
  }, [smtpConfig]);

  const handleSaveAiConfig = () => {
    const updates: Record<string, unknown> = { apiProvider: aiProvider, model: aiModel };
    if (aiApiKey) updates.apiKey = aiApiKey;
    if (aiBaseUrl) updates.apiBaseUrl = aiBaseUrl;
    updateCopilotConfig(updates);
    setAiApiKey('');
    toast.success('Configuración de IA guardada correctamente');
  };

  const handleSaveSmtpConfig = async () => {
    // Validate configuration based on transport mode
    const testRecipient = currentUser?.email || 'admin@smps.bowdot.online';

    // Check transport mode
    if (mailTransport === 'stub') {
      toast.warning('⚠️ Modo stub activo: Los correos no se enviarán. Guarda solo para desarrollo.');
      // Continue to save even in stub mode
    } else if (mailTransport === 'sendmail') {
      // Sendmail mode - no credentials needed, save directly
      toast.info('ℹ️ Modo sendmail: No se requiere configuración SMTP');
    } else if (mailTransport === 'smtp') {
      // SMTP mode - must have complete credentials
      if (!smtpHost || !smtpUser || (!smtpPass && !smtpConfig?.smtp_pass)) {
        toast.error('❌ Faltan credenciales SMTP. Requiere: Servidor, Usuario y Contraseña');
        return;
      }
      // Verify SMTP connection
      const verifyResponse = await fetch('/api/system/smtp-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_secure: smtpSecure,
          smtp_user: smtpUser,
          smtp_pass: smtpPass || undefined,
        }),
      });
      const verifyResult = await verifyResponse.json();
      if (!verifyResult.ok) {
        toast.error('❌ Configuración SMTP inválida. Corrige las credenciales antes de guardar.');
        toast.error(`Error: ${verifyResult.message}`);
        return;
      }
    } else if (mailTransport === 'auto') {
      // Auto mode - in production uses Hostinger sendmail, in dev uses SMTP if configured
      if (process.env.NODE_ENV === 'production') {
        toast.info('ℹ️ Modo automático en producción: usa Hostinger sendmail sin credenciales');
      } else {
        // In development, check if SMTP is configured
        if (!smtpHost || !smtpUser) {
          toast.warning('⚠️ Modo automático en desarrollo requiere configuración SMTP para pruebas');
        }
      }
    }

    // Now save the configuration
    const updates: Record<string, unknown> = {
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_secure: smtpSecure,
      smtp_user: smtpUser,
      smtp_from: smtpFrom,
      mail_transport: mailTransport,
    };
    if (smtpPass) updates.smtp_pass = smtpPass;

    updateSmtpConfig(updates);
    setSmtpPass('');
    toast.success('✅ Configuración de correo guardada correctamente');
  };

  // Test SMTP connection (only verifies SMTP connection, not email sending)
  const handleTestSmtpConnection = async () => {
    setTestingSmtp(true);
    try {
      const response = await fetch('/api/system/smtp-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_secure: smtpSecure,
          smtp_user: smtpUser,
          smtp_pass: smtpPass || undefined,
        }),
      });
      const result = await response.json();
      if (result.ok) {
        toast.success('✅ ' + result.message);
      } else {
        toast.error('❌ ' + result.message);
      }
    } catch (err: any) {
      toast.error('Error de conexión: ' + (err.message || 'No se pudo conectar'));
    } finally {
      setTestingSmtp(false);
    }
  };

  // Send a test email to verify actual email delivery
  const handleTestSendEmail = useCallback(async (recipient: string) => {
    if (!recipient.trim()) {
      toast.error('Ingresa un correo de destino');
      return;
    }
    setTestingSmtp(true);
    try {
      testEmailMutation.mutate(recipient);
    } catch (err: any) {
      toast.error('Error al enviar correo: ' + (err.message || 'Desconocido'));
    } finally {
      setTestingSmtp(false);
    }
  }, [testEmailMutation]);

  if (!currentUser?.isSuperUser) return <p className="text-center py-12 text-muted-foreground">Acceso restringido.</p>;

  const activeUserCount = users.filter(u => u.isActive && !u.isSuperUser && !u.isDummy).length;

  const monthsSinceActivation = (() => {
    if (!activationDate) return null;
    const start = new Date(activationDate);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
  })();

  const handleSave = () => {
    updateSystemStatus({ status: status.status, activationDate, paymentPlan, maxUsers, maxAdminUsers, tickets });
    toast.success('Configuración guardada correctamente');
  };

  const toggleStatus = () => {
    updateSystemStatus({ ...status, activationDate, paymentPlan, maxUsers, maxAdminUsers, tickets, status: status.status === 'active' ? 'inactive' : 'active' });
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

  const toggleModule = (mod: string) => {
    updateModuleConfig({ ...modules, [mod]: !modules[mod as keyof typeof modules] });
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Acceso al Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">Configuración de activación, módulos y forma de pago</p>
      </div>

      {/* Status Card */}
      <div className="smps-surface-elevated">
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
      <div className="smps-surface-elevated">
        <h3 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-accent" /> Módulos del Sistema
        </h3>
        <div className="space-y-3">
          {([
            { key: 'evaluations' as const, label: 'Evaluaciones', desc: 'Autoevaluación, evaluaciones de equipo, plantillas y reportes' },
            { key: 'communications' as const, label: 'Comunicación', desc: 'Tablón de anuncios y comunicados internos' },
            { key: 'vacations' as const, label: 'Vacaciones', desc: 'Solicitudes y gestión de vacaciones' },
            { key: 'copilot' as const, label: 'Copiloto IA', desc: 'Asistente inteligente para administración del sistema' },
          ]).map(mod => (
            <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{mod.label}</p>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
              </div>
              <button onClick={() => toggleModule(mod.key)} className="flex items-center gap-2">
                {modules[mod.key] ? (
                  <ToggleRight className="h-8 w-8 text-smps-success" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                )}
                <span className={`text-xs font-medium ${modules[mod.key] ? 'text-smps-success' : 'text-muted-foreground'}`}>
                  {modules[mod.key] ? 'Activo' : 'Inactivo'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Users & Limit */}
      <div className="smps-surface-elevated">
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
      <div className="smps-surface-elevated">
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


      {/* Max Admin Users */}
      <div className="smps-surface-elevated">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Usuarios Administrador</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">Admins activos (excl. SuperUser)</p>
            <p className={`text-3xl font-bold font-display ${users.filter((u: any) => u.isAdmin && !u.isSuperUser && u.isActive).length > maxAdminUsers ? 'text-destructive' : 'text-foreground'}`}>
              {users.filter((u: any) => u.isAdmin && !u.isSuperUser && u.isActive).length}
            </p>
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground block mb-1">Límite máximo de admins</label>
            <select value={maxAdminUsers} onChange={e => setMaxAdminUsers(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} admins</option>
              ))}
            </select>
          </div>
        </div>
        {users.filter((u: any) => u.isAdmin && !u.isSuperUser && u.isActive).length > maxAdminUsers && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-sm text-destructive mt-4">
            ⚠️ Se ha excedido el límite de usuarios administrador.
          </div>
        )}
      </div>

      {/* Activation Date */}
      <div className="smps-surface-elevated">
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
      <div className="smps-surface-elevated">
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

      {/* AI Configuration - SuperAdmin Only */}
      {modules?.copilot && (
        <div className="smps-surface-elevated">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" /> Configuración de IA
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Proveedor de API</label>
              <select value={aiProvider} onChange={e => { setAiProvider(e.target.value); setAiModel(e.target.value === 'ollama' ? 'qwen3.5:397b' : 'qwen3.5:397b'); }}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="ollama">Ollama Cloud ⭐</option>
                <option value="custom">Personalizado (OpenAI-compatible)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">API Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={aiApiKey}
                    onChange={e => setAiApiKey(e.target.value)}
                    placeholder={copilotConfig?.apiKey ? 'Clave configurada (••••••••' + (copilotConfig.apiKey.length > 8 ? copilotConfig.apiKey.slice(-8) : '') + ')' : 'Ingresa tu API key'}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {copilotConfig?.apiKey ? 'Ya hay una clave configurada. Déjalo vacío para mantener la actual.' : 'Se usará la clave del archivo .env si no se configura aquí.'}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Modelo</label>
              <select value={aiModel} onChange={e => setAiModel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                {aiProvider === 'ollama' && (
                  <>
                    <option value="qwen3.5:397b">Qwen3 235B ⭐ Recomendado</option>
                    <option value="qwen3:30b">Qwen3 30B (Rápido)</option>
                    <option value="qwen3:14b">Qwen3 14B</option>
                    <option value="llama3.3:70b">Llama 3.3 70B</option>
                    <option value="gemma3:27b">Gemma 3 27B</option>
                    <option value="mistral:7b">Mistral 7B</option>
                  </>
                )}
                {aiProvider === 'ollama' && (
                  <>
                    <option value="llama3.3:70b">Llama 3.3 70B</option>
                    <option value="qwen2.5:72b">Qwen 2.5 72B</option>
                    <option value="mistral:7b">Mistral 7B</option>
                  </>
                )}
                {aiProvider === 'custom' && (
                  <option value={aiModel}>Modelo personalizado</option>
                )}
              </select>
            </div>
            {(aiProvider === 'custom') && (
              <div>
                <label className="text-sm text-muted-foreground block mb-1">URL base de API</label>
                <input
                  type="text"
                  value={aiBaseUrl}
                  onChange={e => setAiBaseUrl(e.target.value)}
                  placeholder='https://ollama.com/v1/chat/completions'
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground mt-1">URL del endpoint compatible con OpenAI Chat Completions API.</p>
              </div>
            )}
            <button onClick={handleSaveAiConfig}
              className="w-full py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> Guardar Configuración de IA
            </button>
          </div>
        </div>
      )}

      {/* Email/SMTP Configuration - SuperAdmin Only */}
      <div className="smps-surface-elevated">
        <h3 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
          <Mail className="h-5 w-5 text-accent" /> Configuración de Correo Electrónico
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Transporte de Correo</label>
            <select value={mailTransport} onChange={e => setMailTransport(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="auto">Automático (Sendmail en producción) ⭐</option>
              <option value="sendmail">Sendmail (/usr/sbin/sendmail)</option>
              <option value="smtp">SMTP con credenciales</option>
              <option value="stub">Stub (solo logs, no envía)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {mailTransport === 'auto' && 'En producción usa Hostinger sendmail, en desarrollo usa SMTP si está configurado.'}
              {mailTransport === 'sendmail' && 'Usa el binario sendmail de Hostinger - ideal para hosting compartido.'}
              {mailTransport === 'smtp' && 'Requiere credenciales SMTP completas.'}
              {mailTransport === 'stub' && 'Los correos se registran en consola pero no se envían - útil para desarrollo.'}
            </p>
          </div>

          {(mailTransport === 'smtp' || mailTransport === 'auto') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Servidor SMTP</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Puerto</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={e => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={e => setSmtpSecure(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-muted-foreground">Usar SSL/TLS</span>
                </label>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Usuario SMTP</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  placeholder="tu-cuenta@gmail.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Contraseña / App Password</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpPass}
                      onChange={e => setSmtpPass(e.target.value)}
                      placeholder={smtpConfig?.smtp_pass && smtpConfig.smtp_pass !== '••••' ? '••••••••' : 'Ingresa tu contraseña'}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {smtpConfig?.smtp_pass && !smtpPass ? 'Ya hay una contraseña configurada. Ingresa una nueva para cambiarla.' : 'Para Gmail/Outlook, usa un "App Password", no tu contraseña normal.'}
                </p>
              </div>
            </>
          )}

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Remitente (From)</label>
            <input
              type="text"
              value={smtpFrom}
              onChange={e => setSmtpFrom(e.target.value)}
              placeholder="SMPS Performance <noreply@smps.bowdot.online>"
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato: "Nombre del Sistema &lt;correo@dominio.com&gt;"
            </p>
          </div>

          {/* Email Test Section */}
          <div className="bg-muted/30 rounded-lg p-4 border border-muted">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TestTube className="h-4 w-4 text-accent" /> Probar Configuración de Correo
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Envía un correo de prueba para verificar que la configuración funciona correctamente.
            </p>

            {/* Test to SuperAdmin (current user) */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1.5">Prueba a tu correo (SuperAdmin)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentUser?.email || ''}
                  disabled
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-muted text-muted-foreground text-sm"
                />
                <button
                  onClick={() => handleTestSendEmail(currentUser?.email || '')}
                  disabled={testingSmtp || !currentUser?.email || mailTransport === 'stub'}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <Send className="h-4 w-4" /> {testingSmtp ? 'Enviando...' : 'Probar Envío'}
                </button>
              </div>
            </div>

            {/* Test to custom email */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-1.5">Prueba a otro correo</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={e => setTestEmailRecipient(e.target.value)}
                  placeholder="destinatario@ejemplo.com"
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  onClick={() => handleTestSendEmail(testEmailRecipient)}
                  disabled={testingSmtp || !testEmailRecipient.trim() || mailTransport === 'stub'}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <Send className="h-4 w-4" /> {testingSmtp ? 'Enviando...' : 'Probar Envío'}
                </button>
              </div>
            </div>

            {/* Test SMTP Connection only */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-muted">
              <button
                onClick={handleTestSmtpConnection}
                disabled={testingSmtp || mailTransport === 'stub'}
                className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1 disabled:opacity-50">
                <TestTube className="h-3 w-3" /> Probar solo conexión SMTP
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSaveSmtpConfig}
              className="flex-1 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Save className="h-4 w-4" /> Guardar Configuración
            </button>
          </div>
        </div>
      </div>

      {/* Feature Visibility Configuration - Admin and Super Admin Only */}
      {hasRole(currentUser, ['super_user', 'admin']) && (
        <div className="smps-surface-elevated">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5 text-accent" /> Visibilidad de Funcionalidades
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Controla qué funcionalidades pueden ver los usuarios según su rol. Los cambios se aplican automáticamente al guardar.
          </p>
          <FeatureVisibility />
        </div>
      )}

      {/* Activation History */}
      {activationHistory.length > 0 && (
        <div className="smps-surface-elevated">
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
                <span className="text-xs ml-auto">{getUser(entry.byUserId)?.name || 'Sistema'}</span>
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
