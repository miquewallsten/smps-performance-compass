import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCopilotConfig,
  useUpdateCopilotConfig,
  useCopilotConversations,
  useCopilotConversation,
  useDeleteCopilotConversation,
  useCopilotChat,
} from '@/api/queries';
import { api } from '@/api/client';
import { Bot, Send, Plus, Trash2, Settings, MessageSquare, Loader2, Sparkles, X, Check, Shield, Users, ClipboardList, Megaphone, Palmtree, BarChart3, Wrench, AlertTriangle, Paperclip, FileText } from 'lucide-react';
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
  const [form, setForm] = useState({
    model: config?.model || 'llama-3.3-70b-versatile',
    canManageUsers: config?.canManageUsers ?? true,
    canManageEvaluations: config?.canManageEvaluations ?? true,
    canManageVacations: config?.canManageVacations ?? true,
    canManageAnnouncements: config?.canManageAnnouncements ?? true,
    canManagePeriods: config?.canManagePeriods ?? false,
    canManageSystem: config?.canManageSystem ?? false,
    canViewReports: config?.canViewReports ?? true,
    maxTokens: config?.maxTokens ?? 2048,
    temperature: config?.temperature ?? 0.3,
  });

  const handleSave = () => {
    onSave(form);
    toast.success('Configuración guardada');
  };

  const models = [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recomendado)' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Más rápido)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ];

  const permissions = [
    { key: 'canManageUsers', label: 'Gestionar Usuarios', icon: Users, desc: 'Crear, buscar, cambiar roles' },
    { key: 'canManageEvaluations', label: 'Gestionar Evaluaciones', icon: ClipboardList, desc: 'Ver evaluaciones, preguntas, análisis' },
    { key: 'canManageVacations', label: 'Gestionar Vacaciones', icon: Palmtree, desc: 'Ver y aprobar solicitudes' },
    { key: 'canManageAnnouncements', label: 'Gestionar Anuncios', icon: Megaphone, desc: 'Crear y listar comunicados' },
    { key: 'canManagePeriods', label: 'Gestionar Periodos', icon: BarChart3, desc: 'Crear periodos de evaluación' },
    { key: 'canManageSystem', label: 'Gestionar Sistema', icon: Shield, desc: 'Activar/desactivar sistema y módulos' },
    { key: 'canViewReports', label: 'Ver Reportes', icon: BarChart3, desc: 'Ver estadísticas generales' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> Modelo de IA
        </h3>
        <div className="space-y-3">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Tokens: {form.maxTokens}</label>
              <input type="range" min={512} max={4096} step={256} value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Temperatura: {form.temperature}</label>
              <input type="range" min={0} max={1} step={0.1} value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} className="w-full" />
            </div>
          </div>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" /> Permisos del Agente
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Define qué acciones puede realizar el agente IA.
        </p>
        <div className="space-y-3">
          {permissions.map(({ key, label, icon: Icon, desc }) => (
            <div key={key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Switch
                checked={!!(form as any)[key]}
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
          <p>Permisos como "Gestionar Sistema" permiten al agente activar/desactivar módulos. Úsalos con precaución.</p>
        </div>
      </div>
      <Button onClick={handleSave} className="w-full">
        <Check className="h-4 w-4 mr-2" /> Guardar Configuración
      </Button>
    </div>
  );
}

// ─── Main Chat Component ─────────────────────────────────────────────────────
export default function CopilotChat() {
  const { user: currentUser } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: config } = useCopilotConfig();
  const updateConfig = useUpdateCopilotConfig();
  const { data: conversations } = useCopilotConversations();
  const { data: conversationDetail } = useCopilotConversation(activeConversationId || '');
  const deleteConversation = useDeleteCopilotConversation();
  const chatMutation = useCopilotChat();

  // Load messages when switching conversations
  useEffect(() => {
    if (conversationDetail?.messages) {
      const msgs = conversationDetail.messages.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt || m.created_at,
      }));
      setLocalMessages(msgs);
    } else if (!activeConversationId) {
      setLocalMessages([]);
    }
  }, [conversationDetail, activeConversationId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const handleSend = useCallback(async () => {
    const trimmed = messageInput.trim();
    if (!trimmed && !attachedFile) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      fileName: attachedFile?.name,
    };

    setLocalMessages(prev => [...prev, userMessage]);
    setMessageInput('');
    const fileToUpload = attachedFile;
    setAttachedFile(null);
    setIsStreaming(true);

    try {
      let result: any;
      if (fileToUpload) {
        const formData = new FormData();
        if (trimmed) formData.append('message', trimmed);
        if (activeConversationId) formData.append('conversationId', activeConversationId);
        formData.append('file', fileToUpload);
        result = await api.upload<{ conversationId: string; message: any }>('/api/copilot/chat', formData);
      } else {
        result = await new Promise<any>((resolve, reject) => {
          chatMutation.mutate(
            { conversationId: activeConversationId || undefined, message: trimmed },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });
      }

      const assistantMessage: Message = {
        id: result.message.id,
        role: 'assistant',
        content: result.message.content,
        createdAt: new Date().toISOString(),
      };

      setLocalMessages(prev => [...prev, assistantMessage]);
      if (!activeConversationId && result.conversationId) {
        setActiveConversationId(result.conversationId);
      }
    } catch (error: any) {
      const errMsg = error?.message || '';
      let friendlyMsg = 'Lo siento, hubo un error al procesar tu mensaje.';
      if (errMsg.includes('429') || errMsg.includes('saturado') || errMsg.includes('rate')) {
        friendlyMsg = 'El servicio de IA está temporalmente saturado. Por favor espera unos segundos e intenta de nuevo. 🕐';
      } else if (errMsg.includes('Cannot connect')) {
        friendlyMsg = 'No pude conectar con el servidor. ¿Está corriendo el servidor?';
      }
      toast.error(friendlyMsg);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: friendlyMsg,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  }, [messageInput, attachedFile, activeConversationId, chatMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setLocalMessages([]);
    setMessageInput('');
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setLocalMessages([]);
        }
        toast.success('Conversación eliminada');
      },
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!['.csv', '.xlsx', '.xls', '.json', '.txt', '.md'].includes(ext)) {
        toast.error('Formato no soportado. Usa CSV, Excel, JSON, TXT o MD.');
        return;
      }
      setAttachedFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* ─── Sidebar ──────────────────────────────────────────── */}
      <div className="w-72 border-r flex flex-col bg-muted/30">
        <div className="p-3 border-b">
          <Button onClick={handleNewConversation} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nueva conversación
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations?.map((conv: Conversation) => (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  activeConversationId === conv.id
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'hover:bg-muted'
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-50" />
                <span className="flex-1 truncate">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {(!conversations || conversations.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sin conversaciones aún
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Config button */}
        <div className="p-3 border-t">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="h-4 w-4 mr-2" /> Configurar Agente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configuración del Copiloto</DialogTitle>
              </DialogHeader>
              {config && <CopilotConfigPanel config={config} onSave={(data) => updateConfig.mutate(data)} />}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ─── Chat Area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Copiloto SMPS</h2>
            <p className="text-xs text-muted-foreground">Asistente inteligente del sistema</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            <Sparkles className="h-3 w-3 mr-1" /> IA Activa
          </Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {localMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-1">¡Hola, {currentUser?.name?.split(' ')[0] || 'Admin'}!</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Soy tu Copiloto SMPS. Puedo ayudarte con usuarios, evaluaciones, periodos, vacaciones y más.
                ¿En qué te puedo ayudar hoy?
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {[
                  '¿Cuántos usuarios activos hay?',
                  '¿Qué periodos de evaluación existen?',
                  'Crear un nuevo usuario',
                  'Vacaciones pendientes',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setMessageInput(suggestion); inputRef.current?.focus(); }}
                    className="px-3 py-1.5 rounded-full border text-xs hover:bg-accent/10 hover:border-accent transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {localMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-accent" />
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
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Pensando...</span>
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
              <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-destructive">
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
              className="flex-shrink-0"
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
              className="flex-shrink-0 rounded-xl"
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
