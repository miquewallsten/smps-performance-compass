import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCopilotConfig,
  useUpdateCopilotConfig,
  useCopilotConversations,
  useCopilotConversation,
  useDeleteCopilotConversation,
  useClearAllCopilotConversations,
  useCopilotChat,
} from '@/api/queries';
import { api } from '@/api/client';
import { Bot, Send, Plus, Trash2, Settings, MessageSquare, Loader2, Sparkles, X, Check, Shield, Users, ClipboardList, Megaphone, Palmtree, BarChart3, Wrench, AlertTriangle, Paperclip, FileText, Brain, Zap, Target, Eye, EyeOff, Menu, PanelLeftClose } from 'lucide-react';
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
  createdAt: string;
  fileName?: string;
}

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Config Panel ────────────────────────────────────────────────────────────
function CopilotConfigPanel({ config, onSave }: { config: any; onSave: (data: any) => void }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [form, setForm] = useState({
    apiProvider: config?.apiProvider ?? config?.api_provider ?? 'ollama',
    model: config?.model || 'qwen3.5:397b',
    apiBaseUrl: config?.apiBaseUrl ?? config?.api_base_url ?? '',
    apiKey: '',
    canManageUsers: config?.canManageUsers ?? config?.can_manage_users ?? true,
    canManageEvaluations: config?.canManageEvaluations ?? config?.can_manage_evaluations ?? true,
    canManageVacations: config?.canManageVacations ?? config?.can_manage_vacations ?? true,
    canManageAnnouncements: config?.canManageAnnouncements ?? config?.can_manage_announcements ?? true,
    canManagePeriods: config?.canManagePeriods ?? config?.can_manage_periods ?? false,
    canManageSystem: config?.canManageSystem ?? config?.can_manage_system ?? false,
    canViewReports: config?.canViewReports ?? config?.can_view_reports ?? true,
    maxTokens: config?.maxTokens ?? config?.max_tokens ?? 4096,
    temperature: config?.temperature ?? 0.3,
  });

  const handleSave = () => {
    const payload: any = { ...form };
    // Don't send empty apiBaseUrl
    if (!payload.apiBaseUrl) delete payload.apiBaseUrl;
    // Don't send empty apiKey (keep existing)
    if (!payload.apiKey) delete payload.apiKey;
    onSave(payload);
    toast.success('Configuración guardada');
  };

  const providers = [
    { value: 'ollama', label: 'Ollama Cloud ⭐', models: [
      { value: 'qwen3.5:397b', label: 'Qwen3.5 397B ⭐ Recomendado' },
      { value: 'qwen3-next:80b', label: 'Qwen3 Next 80B' },
      { value: 'deepseek-v3.2', label: 'DeepSeek V3.2' },
      { value: 'llama3.3:70b', label: 'Llama 3.3 70B' },
      { value: 'gemma3:27b', label: 'Gemma 3 27B' },
      { value: 'mistral:7b', label: 'Mistral 7B' },
    ]},
    { value: 'custom', label: 'Personalizado (OpenAI-compatible)', models: [] },
  ];

  const currentProvider = providers.find(p => p.value === form.apiProvider) || providers[0];
  const models = currentProvider.models.length > 0 ? currentProvider.models : [
    { value: form.model, label: 'Modelo personalizado' },
  ];
  const needsBaseUrl = form.apiProvider === 'custom';

  const permissions = [
    { key: 'canManageUsers' as const, label: 'Gestionar Usuarios', icon: Users, desc: 'Crear, buscar, cambiar roles' },
    { key: 'canManageEvaluations' as const, label: 'Gestionar Evaluaciones', icon: ClipboardList, desc: 'Ver evaluaciones, preguntas, análisis' },
    { key: 'canManageVacations' as const, label: 'Gestionar Vacaciones', icon: Palmtree, desc: 'Ver y aprobar solicitudes' },
    { key: 'canManageAnnouncements' as const, label: 'Gestionar Anuncios', icon: Megaphone, desc: 'Crear y listar comunicados' },
    { key: 'canManagePeriods' as const, label: 'Gestionar Periodos', icon: BarChart3, desc: 'Crear periodos de evaluación' },
    { key: 'canManageSystem' as const, label: 'Gestionar Sistema', icon: Shield, desc: 'Activar/desactivar sistema y módulos' },
    { key: 'canViewReports' as const, label: 'Ver Reportes', icon: BarChart3, desc: 'Ver estadísticas generales' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> Proveedor y Modelo de IA
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Proveedor</label>
            <select
              value={form.apiProvider}
              onChange={(e) => {
                const newProvider = e.target.value;
                const p = providers.find(pr => pr.value === newProvider);
                const defaultModel = p?.models?.[0]?.value || form.model;
                setForm({ ...form, apiProvider: newProvider, model: defaultModel });
              }}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            >
              {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Modelo</label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
            >
              {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">API Key</label>
            <div className="flex items-center gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={config?.apiKey ? 'Clave configurada (déjalo vacío para mantener)' : 'Ingresa tu API key'}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-2 py-2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {config?.apiKey ? 'Ya hay una clave configurada. Déjalo vacío para mantener la actual.' : 'Se requiere una clave de API para el proveedor seleccionado.'}
            </p>
          </div>
          {needsBaseUrl && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">URL base de API</label>
              <input
                type="text"
                value={form.apiBaseUrl}
                onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
                placeholder='https://ollama.com/v1/chat/completions'
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL del endpoint compatible con OpenAI Chat Completions API.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Tokens: {form.maxTokens}</label>
              <input type="range" min={512} max={8192} step={256} value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Temperatura: {form.temperature}</label>
              <input type="range" min={0} max={1} step={0.05} value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} className="w-full" />
            </div>
          </div>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" /> Permisos del Copiloto
        </h3>
        <div className="space-y-3">
          {permissions.map(p => (
            <div key={p.key} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <p.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </div>
              <Switch checked={form[p.key] as boolean}
                onCheckedChange={(v) => setForm({ ...form, [p.key]: v })} />
            </div>
          ))}
        </div>
      </div>
      <Button onClick={handleSave} className="w-full">Guardar Configuración</Button>
    </div>
  );
}

// ─── Main Copilot Chat ───────────────────────────────────────────────────────
export default function CopilotChat() {
  const { user: currentUser } = useAuth();
  const { data: config } = useCopilotConfig();
  const updateConfig = useUpdateCopilotConfig();
  const { data: conversations = [], isLoading: convsLoading } = useCopilotConversations();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const { data: selectedConv, isLoading: convLoading } = useCopilotConversation(selectedConvId || '');
  const deleteConv = useDeleteCopilotConversation();
  const clearAllConvs = useClearAllCopilotConversations();
  const chatMutation = useCopilotChat();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [localMessages, isStreaming, scrollToBottom]);

  useEffect(() => {
    if (selectedConv?.messages) {
      setLocalMessages(selectedConv.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        fileName: m.fileName,
      })));
    } else {
      setLocalMessages([]);
    }
  }, [selectedConv]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    e.target.value = '';
  };

  const handleSend = async () => {
    const content = messageInput.trim();
    if (!content && !attachedFile) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      fileName: attachedFile?.name,
    };

    setLocalMessages(prev => [...prev, userMsg]);
    setMessageInput('');
    setIsStreaming(true);

    try {
      let result;
      if (attachedFile) {
        const formData = new FormData();
        formData.append('message', content);
        formData.append('file', attachedFile);
        if (selectedConvId) formData.append('conversationId', selectedConvId);
        result = await api.upload('/api/copilot/chat', formData);
      } else {
        result = await chatMutation.mutateAsync({ message: content, conversationId: selectedConvId });
      }
      if (!selectedConvId && result.conversationId) {
        setSelectedConvId(result.conversationId);
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.message?.content || result.message || 'No pude procesar tu solicitud.',
        createdAt: new Date().toISOString(),
      };

      setLocalMessages(prev => [...prev, assistantMsg]);
      setAttachedFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar mensaje');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setSelectedConvId(null);
    setLocalMessages([]);
    setMessageInput('');
    setAttachedFile(null);
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await deleteConv.mutateAsync(convId);
      if (selectedConvId === convId) {
        setSelectedConvId(null);
        setLocalMessages([]);
      }
      toast.success('Conversación eliminada');
    } catch {
      toast.error('Error al eliminar conversación');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Eliminar todas las conversaciones? Esta acción no se puede deshacer.')) return;
    try {
      await clearAllConvs.mutateAsync();
      setSelectedConvId(null);
      setLocalMessages([]);
      toast.success('Todas las conversaciones eliminadas');
    } catch {
      toast.error('Error al eliminar conversaciones');
    }
  };

  // ─── Smart suggestions that demonstrate agentic capabilities ──────────
  const smartSuggestions = [
    { text: 'Resumen de evaluaciones pendientes', icon: Target },
    { text: 'Analizar calificaciones del periodo', icon: BarChart3 },
    { text: 'Buscar usuario por nombre', icon: Users },
    { text: 'Vacaciones pendientes de aprobar', icon: Palmtree },
  ];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar — conversations list */}
      {sidebarOpen && (
        <div className="w-56 lg:w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-3 border-b space-y-2">
          <Button onClick={handleNewConversation} variant="outline" className="w-full justify-start gap-2 text-sm">
            <Plus className="h-4 w-4" /> Nueva conversación
          </Button>
          {conversations.length > 0 && (
            <Button onClick={handleClearAll} variant="ghost" className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Borrar todo
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {convsLoading ? (
              <div className="p-3 text-xs text-muted-foreground text-center">Cargando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">Sin conversaciones</div>
            ) : (
              conversations.map((conv: Conversation) => (
                <div key={conv.id} className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-[background-color,color] duration-150 ${
                  selectedConvId === conv.id ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-muted text-foreground'
                }`} onClick={() => setSelectedConvId(conv.id)}>
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{conv.title || 'Sin título'}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-[opacity,color] duration-150">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-12 border-b flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title={sidebarOpen ? 'Ocultar historial' : 'Mostrar historial'}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4 text-muted-foreground" /> : <Menu className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center">
              <Brain className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">Copiloto SMPS</h2>
              <p className="text-[10px] text-muted-foreground">Asistente agéntico de evaluación</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4" /></Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Configuración del Copiloto</DialogTitle>
                </DialogHeader>
                {config && <CopilotConfigPanel config={config} onSave={(data: any) => updateConfig.mutate(data)} />}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {localMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 smps-scale-in">
                <Zap className="h-8 w-8 text-accent" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1 smps-fade-up smps-delay-1">Copiloto SMPS</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-6 smps-fade-up smps-delay-2">
                Asistente inteligente para gestión de evaluaciones. Analiza datos, busca información y ejecuta acciones.
              </p>
              <div className="flex flex-wrap gap-2 mt-2 justify-center smps-fade-up smps-delay-3">
                {smartSuggestions.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => { setMessageInput(s.text); inputRef.current?.focus(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs hover:bg-accent/10 hover:border-accent transition-[background-color,border-color,color] duration-150 active:scale-[0.97]"
                  >
                    <s.icon className="h-3 w-3" />
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {localMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} smps-fade-up`}>
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Brain className="h-4 w-4 text-accent" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.fileName && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs opacity-70">
                    <FileText className="h-3 w-3" />
                    <span>{msg.fileName}</span>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-bold text-primary">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex gap-3 justify-start smps-fade-in">
              <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Brain className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analizando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File attachment preview */}
        {attachedFile && (
          <div className="px-6 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-2 text-xs">
              <FileText className="h-4 w-4 text-accent" />
              <span className="flex-1 truncate">{attachedFile.name}</span>
              <span className="text-muted-foreground">{(attachedFile.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-destructive transition-[color] duration-150">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 py-4 border-t">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".csv,.xlsx,.xls,.json,.txt,.md"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 active:scale-95"
              title="Adjuntar archivo"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              disabled={isStreaming}
              className="flex-1 rounded-xl"
            />
            <Button
              onClick={handleSend}
              disabled={isStreaming || (!messageInput.trim() && !attachedFile)}
              size="icon"
              className="flex-shrink-0 rounded-xl active:scale-95"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            El Copiloto puede cometer errores. Verifica la información importante.
          </p>
        </div>
      </div>
    </div>
  );
}
