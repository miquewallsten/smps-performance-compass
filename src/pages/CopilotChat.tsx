import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCopilotConfig,
  useUpdateCopilotConfig,
  useCopilotConversations,
  useCopilotConversation,
  useCreateCopilotConversation,
  useDeleteCopilotConversation,
  useCopilotChat,
} from '@/api/queries';
import { api } from '@/api/client';
import { Bot, Send, Plus, Trash2, Settings, MessageSquare, Loader2, Sparkles, X, Check, Shield, Users, ClipboardList, Megaphone, Palmtree, BarChart3, Wrench, ChevronDown, AlertTriangle, Paperclip, FileText, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  hasFile?: boolean;
  fileName?: string;
  createdAt: string;
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  canManageUsers: 'Gestionar Usuarios',
  canManageEvaluations: 'Gestionar Evaluaciones',
  canManageVacations: 'Gestionar Vacaciones',
  canManageAnnouncements: 'Gestionar Anuncios',
  canManagePeriods: 'Gestionar Periodos',
  canManageSystem: 'Gestionar Sistema',
  canViewReports: 'Ver Reportes',
};

const TOOL_NAMES: Record<string, string> = {
  list_users: '👥 Listar Usuarios',
  get_user: '👤 Obtener Usuario',
  search_users: '🔍 Buscar Usuarios',
  create_user: '➕ Crear Usuario',
  create_users_batch: '📋 Crear Usuarios en Lote',
  update_user_role: '✏️ Actualizar Rol',
  deactivate_user: '🚫 Desactivar Usuario',
  activate_user: '✅ Activar Usuario',
  get_supervisor_assignments: '📋 Asignaciones de Supervisor',
  assign_supervisor: '🔗 Asignar Supervisor',
  get_evaluation_summary: '📊 Resumen de Evaluaciones',
  get_user_evaluations: '📝 Evaluaciones de Usuario',
  get_user_improvement_suggestions: '💡 Sugerencias de Mejora',
  get_period_config: '📅 Configuración de Periodos',
  get_evaluation_questions: '❓ Preguntas de Evaluación',
  create_library_question: '➕ Crear Pregunta',
  create_questions_batch: '📋 Crear Preguntas en Lote',
  list_vacation_requests: '🏖️ Solicitudes de Vacaciones',
  approve_vacation: '✅ Aprobar Vacaciones',
  list_announcements: '📢 Listar Anuncios',
  create_announcement: '📢 Crear Anuncio',
  create_period: '📅 Crear Periodo',
  get_system_status: '⚙️ Estado del Sistema',
  toggle_system_status: '🔄 Cambiar Estado',
  toggle_module: '🔧 Cambiar Módulo',
  get_dashboard_stats: '📊 Estadísticas',
};

function ToolCallBadge({ name, result }: { name: string; result?: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
      >
        <Wrench className="h-3 w-3" />
        <span>{TOOL_NAMES[name] || name}</span>
        {result && <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
      </button>
      {expanded && result && (
        <pre className="mt-1.5 p-3 rounded-lg bg-muted/70 text-xs overflow-x-auto max-h-48 overflow-y-auto border border-border/50">
          {(() => {
            try {
              const parsed = JSON.parse(result);
              return JSON.stringify(parsed, null, 2);
            } catch {
              return result;
            }
          })()}
        </pre>
      )}
    </div>
  );
}

export default function CopilotChat() {
  const { user: currentUser } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: config } = useCopilotConfig();
  const { data: conversations = [] } = useCopilotConversations();
  const { data: conversationDetail } = useCopilotConversation(activeConversationId || '');
  const createConversation = useCreateCopilotConversation();
  const deleteConversation = useDeleteCopilotConversation();
  const chatMutation = useCopilotChat();
  const updateConfig = useUpdateCopilotConfig();

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationDetail?.messages) {
      setLocalMessages(
        (conversationDetail.messages as any[]).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls ? (typeof m.toolCalls === 'string' ? JSON.parse(m.toolCalls) : m.toolCalls) : undefined,
          toolResults: m.toolResults ? (typeof m.toolResults === 'string' ? JSON.parse(m.toolResults) : m.toolResults) : undefined,
          createdAt: m.createdAt,
        }))
      );
    }
  }, [conversationDetail]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('El archivo no puede ser mayor a 10MB');
      return;
    }
    setAttachedFile(file);
    // Create preview for text files
    if (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsText(file);
    } else {
      setFilePreview(`Archivo binario: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if ((!messageInput.trim() && !attachedFile) || isStreaming) return;

    const userMessage = messageInput.trim();
    const file = attachedFile;
    setMessageInput('');
    setAttachedFile(null);
    setFilePreview(null);
    setIsStreaming(true);

    // Add optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage + (file ? `\n📎 Archivo: ${file.name}` : ''),
      hasFile: !!file,
      fileName: file?.name,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, tempUserMsg]);

    try {
      // If there's a file, upload it first
      let fileContent: string | null = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadResult = await api.upload<{ filename: string; content: string }>('/api/copilot/upload', formData);
        fileContent = uploadResult.content;
      }

      // Send chat message
      const fullMessage = userMessage + (fileContent ? `\n\n📎 Archivo adjunto: "${file?.name}"\nContenido:\n\`\`\`\n${fileContent}\n\`\`\`` : '');

      const result = await chatMutation.mutateAsync({
        conversationId: activeConversationId || undefined,
        message: fullMessage,
      });

      if (!activeConversationId) {
        setActiveConversationId(result.conversationId);
      }

      // Add assistant response
      const assistantMsg: Message = {
        id: result.message.id,
        role: 'assistant',
        content: result.message.content,
        toolCalls: result.message.toolCalls || undefined,
        toolResults: result.message.toolResults || undefined,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      toast.error(error.message || 'Error al comunicarse con el copiloto');
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [messageInput, attachedFile, activeConversationId, isStreaming, chatMutation]);

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setLocalMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    if (confirm('¿Eliminar esta conversación?')) {
      await deleteConversation.mutateAsync(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setLocalMessages([]);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentUser?.isAdmin && !currentUser?.isSuperUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Acceso Restringido</h2>
          <p className="text-muted-foreground mt-2">Solo administradores y superusuarios pueden acceder al Copiloto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Sidebar - Conversations */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Bot className="h-5 w-5 text-accent" />
                Copiloto SMPS
              </CardTitle>
              <div className="flex gap-1">
                <Dialog open={showConfig} onOpenChange={setShowConfig}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Configuración del Agente">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="font-display flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Configuración del Agente IA
                      </DialogTitle>
                    </DialogHeader>
                    <AgentConfigForm config={config} onSave={(data) => updateConfig.mutate(data)} />
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewConversation} title="Nueva conversación">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {config && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {String(config.model || 'llama-3.3-70b-versatile').includes('llama-3.3') ? 'Llama 3.3 70B' : String(config.model)}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">
                  ● En línea
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2 pt-0">
            <div className="space-y-1">
              {(conversations as Conversation[]).map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeConversationId === conv.id ? 'bg-accent/10 text-accent' : 'hover:bg-muted'
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No hay conversaciones aún.
                  <br />¡Envía un mensaje para empezar!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agent Permissions Summary */}
        {config && (
          <Card className="flex-shrink-0">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5" /> Permisos del Agente
              </p>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                  const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                  const isEnabled = config[dbKey as keyof typeof config];
                  return (
                    <div key={key} className="flex items-center gap-1.5 text-xs">
                      {isEnabled ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className={isEnabled ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        {!activeConversationId && localMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-lg">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
                <Bot className="h-10 w-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold font-display mb-2">Copiloto SMPS</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Tu asistente de IA con memoria. Puedo gestionar todo el sistema y entender archivos.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                {[
                  { icon: Users, label: 'Gestionar usuarios', desc: 'Crear, buscar, cambiar roles' },
                  { icon: ClipboardList, label: 'Evaluaciones', desc: 'Ver resultados y sugerir mejoras' },
                  { icon: Palmtree, label: 'Vacaciones', desc: 'Aprobar solicitudes' },
                  { icon: Megaphone, label: 'Comunicados', desc: 'Crear anuncios' },
                  { icon: FileText, label: 'Subir archivos', desc: 'CSV, Excel, JSON, TXT' },
                  { icon: Brain, label: 'Memoria', desc: 'Recuerdo conversaciones previas' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="p-3 rounded-lg bg-muted/50 text-left">
                    <Icon className="h-4 w-4 mb-1 text-accent" />
                    <p className="font-medium text-xs">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Nota importante</p>
                  <p>El agente ejecuta acciones reales en el sistema según los permisos configurados. Para acciones destructivas, pedirá confirmación.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {localMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                          <Bot className="h-3 w-3 text-accent" />
                        </div>
                        <span className="text-xs text-muted-foreground">Copiloto</span>
                      </div>
                    )}
                    {/* Tool calls */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {msg.toolCalls.map((tc, i) => (
                          <ToolCallBadge
                            key={tc.id || i}
                            name={tc.function?.name || ''}
                            result={msg.toolResults?.find(r => r.tool_call_id === tc.id)?.content}
                          />
                        ))}
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.hasFile && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="h-3 w-3" />
                        <span>{msg.fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-muted">
                    <Bot className="h-4 w-4 text-accent animate-pulse" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        <Separator />

        {/* Input Area */}
        <div className="p-4">
          {/* File attachment preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-muted/50 border border-border">
              <Paperclip className="h-4 w-4 text-accent" />
              <span className="text-sm flex-1 truncate">{attachedFile.name}</span>
              <span className="text-xs text-muted-foreground">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
              <button onClick={() => { setAttachedFile(null); setFilePreview(null); }} className="p-1 hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json,.txt,.md"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              title="Adjuntar archivo (CSV, Excel, JSON, TXT)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? `Describe qué quieres hacer con "${attachedFile.name}"...` : 'Escribe un mensaje al copiloto...'}
              disabled={isStreaming}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!messageInput.trim() && !attachedFile) || isStreaming}
              size="icon"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Puedes adjuntar archivos CSV, Excel, JSON o TXT. El copiloto los analizará y te ayudará a procesarlos.
          </p>
        </div>
      </Card>
    </div>
  );
}

function AgentConfigForm({ config, onSave }: { config: any; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    canManageUsers: true,
    canManageEvaluations: true,
    canManageVacations: true,
    canManageAnnouncements: true,
    canManagePeriods: false,
    canManageSystem: false,
    canViewReports: true,
    model: 'llama-3.3-70b-versatile',
    maxTokens: 4096,
    temperature: 0.3,
    ...config,
  });

  useEffect(() => {
    if (config) setForm(prev => ({ ...prev, ...config }));
  }, [config]);

  const handleSave = () => {
    onSave(form);
    toast.success('Configuración guardada');
  };

  const models = [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recomendado — Más inteligente)' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Más rápido)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K contexto)' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ];

  const permissions = [
    { key: 'canManageUsers', label: 'Gestionar Usuarios', icon: Users, desc: 'Crear, buscar, cambiar roles, activar/desactivar' },
    { key: 'canManageEvaluations', label: 'Gestionar Evaluaciones', icon: ClipboardList, desc: 'Ver evaluaciones, crear preguntas, sugerencias de mejora' },
    { key: 'canManageVacations', label: 'Gestionar Vacaciones', icon: Palmtree, desc: 'Ver y aprobar solicitudes de vacaciones' },
    { key: 'canManageAnnouncements', label: 'Gestionar Anuncios', icon: Megaphone, desc: 'Crear y listar comunicados' },
    { key: 'canManagePeriods', label: 'Gestionar Periodos', icon: BarChart3, desc: 'Crear periodos de evaluación' },
    { key: 'canManageSystem', label: 'Gestionar Sistema', icon: Shield, desc: 'Activar/desactivar sistema y módulos' },
    { key: 'canViewReports', label: 'Ver Reportes', icon: BarChart3, desc: 'Ver estadísticas generales del sistema' },
  ];

  return (
    <div className="space-y-6">
      {/* Model Configuration */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Modelo de IA
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Modelo</label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            >
              {models.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Tokens: {form.maxTokens}</label>
              <input
                type="range"
                min={512}
                max={8192}
                step={256}
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Temperatura: {form.temperature}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Permissions */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          Permisos del Agente IA
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Configura qué acciones puede realizar el agente. Solo actuará dentro de los permisos habilitados.
        </p>
        <div className="space-y-3">
          {permissions.map(({ key, label, icon: Icon, desc }) => (
            <div key={key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Switch
                checked={!!form[key as keyof typeof form]}
                onCheckedChange={(checked) => setForm({ ...form, [key]: checked })}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Seguridad</p>
          <p>Permisos como "Gestionar Sistema" permiten al agente activar/desactivar módulos y el sistema completo. Úsalos con precaución.</p>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        <Check className="h-4 w-4 mr-2" />
        Guardar Configuración
      </Button>
    </div>
  );
}
