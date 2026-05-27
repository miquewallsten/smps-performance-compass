import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useAnnouncements, useCreateAnnouncement, useMarkAnnouncementRead, useUpdateAnnouncement } from '@/api/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Plus, Eye, Users, Megaphone, CheckCircle2, Clock, Archive } from 'lucide-react';
import { POSITION_LABELS, POSITION_LEVELS } from '@/types';

export default function Communications() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: announcements = [] } = useAnnouncements();
  const addAnnouncement = useCreateAnnouncement().mutate;
  const markAnnouncementRead = useMarkAnnouncementRead().mutate;
  const updateAnnouncement = useUpdateAnnouncement().mutate;
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>('all');
  const [expiresAt, setExpiresAt] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [showReaders, setShowReaders] = useState<string | null>(null);

  if (!currentUser) return null;

  const isAdmin = currentUser.isAdmin || currentUser.isSuperUser;
  const isSocio = currentUser.position === 'socio';
  const isManagingPartner = !!currentUser.isManagingPartner;
  const canPublish = isAdmin || isSocio || isManagingPartner;
  const isSuperUser = !!currentUser.isSuperUser;

  const myLevel = POSITION_LEVELS[currentUser.position];

  // Filter announcements based on audience visibility
  const visibleAnnouncements = announcements.filter(a => {
    // Admins, socios, superusers see ALL announcements including audience-specific
    if (canPublish) return true;
    // Regular users only see 'all' or their own area
    if (a.audience === 'all') return true;
    if (a.audience === myLevel) return true;
    return false;
  });

  const activeAnnouncements = visibleAnnouncements
    .filter(a => !a.archived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const archivedAnnouncements = visibleAnnouncements
    .filter(a => a.archived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handlePublish = () => {
    if (!title.trim() || !body.trim()) return;
    addAnnouncement({
      title: title.trim(),
      body: body.trim(),
      audience: audience as 'all' | 'legal' | 'administrativo',
      expiresAt: expiresAt || undefined,
    });
    setTitle('');
    setBody('');
    setAudience('all');
    setExpiresAt('');
    setShowNew(false);
  };

  const handleArchive = (annId: string) => {
    const ann = announcements.find(a => a.id === annId);
    if (ann) updateAnnouncement({ id: annId, archived: true });
  };

  const getAuthor = (id: string) => users.find(u => u.id === id);
  const activeUsers = users.filter(u => u.isActive && !u.isSuperUser && !u.isDummy);

  const getReadCount = (ann: typeof announcements[0]) => {
    // Exclude superuser from read counts
    const readByVisible = ann.readBy.filter(uid => {
      const u = users.find(us => us.id === uid);
      return u && !u.isSuperUser;
    });
    const targetUsers = ann.audience === 'all'
      ? activeUsers
      : activeUsers.filter(u => POSITION_LEVELS[u.position] === ann.audience);
    return { read: readByVisible.length, total: targetUsers.length };
  };

  const getReaders = (ann: typeof announcements[0]) => {
    return ann.readBy
      .map(uid => users.find(u => u.id === uid))
      .filter(u => u && !u.isSuperUser); // hide superuser reads
  };

  const audienceLabels: Record<string, string> = {
    all: 'General',
    legal: 'Legal',
    administrativo: 'Administrativo',
  };

  const audienceColors: Record<string, string> = {
    all: 'bg-primary/10 text-primary',
    legal: 'bg-blue-100 text-blue-700',
    administrativo: 'bg-amber-100 text-amber-700',
  };

  const renderAnnouncement = (ann: typeof announcements[0]) => {
    const author = getAuthor(ann.authorId);
    const isRead = ann.readBy.includes(currentUser.id);
    const { read, total } = getReadCount(ann);
    const readers = getReaders(ann);

    return (
      <Card key={ann.id} className={`transition-[border-color,box-shadow,opacity] ${!isRead ? 'border-accent/40 shadow-md' : 'opacity-90'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Only show audience badge to admin/socios/super */}
                {canPublish && (
                  <Badge variant="outline" className={audienceColors[ann.audience]}>
                    {audienceLabels[ann.audience]}
                  </Badge>
                )}
                {!isRead && (
                  <Badge className="bg-accent text-accent-foreground text-[10px]">Nuevo</Badge>
                )}
                {ann.expiresAt && (
                  <span className="text-[10px] text-muted-foreground">
                    Vigente hasta: {new Date(ann.expiresAt).toLocaleDateString('es-MX')}
                  </span>
                )}
              </div>
              <CardTitle className="text-base">{ann.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Por: <span className="font-medium">{author?.name || 'Sistema'}</span>
                {author && !author.isSuperUser && <span> · {POSITION_LABELS[author.position]}</span>}
                <span> · {new Date(ann.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canPublish && (
                <>
                  <Dialog open={showReaders === ann.id} onOpenChange={(open) => setShowReaders(open ? ann.id : null)}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Ver quién ha leído">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{read}/{total}</span>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="text-sm">Lecturas — {ann.title}</DialogTitle>
                      </DialogHeader>
                      <div className="max-h-60 overflow-y-auto space-y-1 pt-2">
                        {readers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Nadie ha leído este comunicado aún.</p>
                        ) : (
                          readers.map(u => u && (
                            <div key={u.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/50">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{u.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{POSITION_LABELS[u.position]}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  {!ann.archived && (
                    <button onClick={() => handleArchive(ann.id)} className="text-muted-foreground hover:text-foreground transition-colors" title="Archivar">
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
              {isRead ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">{ann.body}</p>
          {!isRead && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs border-accent text-accent hover:bg-accent hover:text-white transition-colors"
              onClick={() => markAnnouncementRead(ann.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Marcar como leído
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-accent" />
            Comunicación Interna
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tablón de anuncios y comunicados oficiales</p>
        </div>
        {canPublish && (
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Comunicado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Publicar Comunicado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Título</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Asunto del comunicado" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Audiencia</label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">General (Todos)</SelectItem>
                      <SelectItem value="legal">Solo Legal</SelectItem>
                      <SelectItem value="administrativo">Solo Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Vigencia (opcional)</label>
                  <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Mensaje</label>
                  <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Escribe el comunicado..." rows={5} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
                  <Button onClick={handlePublish} disabled={!title.trim() || !body.trim()}>Publicar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1"><Users className="h-3.5 w-3.5" /> Vigentes</TabsTrigger>
          <TabsTrigger value="historic" className="gap-1"><Archive className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {activeAnnouncements.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No hay comunicados vigentes.</p>
              </CardContent>
            </Card>
          )}
          {activeAnnouncements.map(renderAnnouncement)}
        </TabsContent>

        <TabsContent value="historic" className="mt-4 space-y-4">
          {archivedAnnouncements.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Archive className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No hay comunicados en el histórico.</p>
              </CardContent>
            </Card>
          )}
          {archivedAnnouncements.map(renderAnnouncement)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
