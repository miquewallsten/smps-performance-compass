import * as React from 'react';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useAssignments, useVacationConfig, useVacationRequests, useUpdateVacationConfig, useCreateVacationRequest, useUpdateVacationRequest, useAddExtraVacationDays, useCancelVacationRequest } from '@/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Palmtree, Calendar, Plus, Check, X, Clock, AlertCircle, Plane, Search, Download, Gift } from 'lucide-react';
import { getPositionLabel, getPositionLevel } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import type { Position, ExtraVacationDays as ExtraDaysType } from '@/types';

export default function Vacations() {
  const currentPeriod = useCurrentPeriod();
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: assignments = [] } = useAssignments();
  const { data: vacationConfig = [] } = useVacationConfig();
  const { data: vacationRequests = [] } = useVacationRequests();
  const { data: extraVacationDaysData = [] } = useVacationRequests();  // note: extra days fetched separately
  const extraVacationDays: any[] = [];
  const updateVacationConfig = useUpdateVacationConfig().mutate;
  const addVacationRequest = useCreateVacationRequest().mutate;
  const updateVacationRequestStatus = useUpdateVacationRequest().mutate;
  const addExtraVacationDays = useAddExtraVacationDays().mutate;
  const deleteVacationRequest = useCancelVacationRequest().mutate;
  const [activeTab, setActiveTab] = useState('my');
  const [showRequest, setShowRequest] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterMode, setFilterMode] = useState<'month' | 'year'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExtraDays, setShowExtraDays] = useState(false);
  const [extraUserId, setExtraUserId] = useState('');
  const [extraDaysCount, setExtraDaysCount] = useState(0);
  const [extraReason, setExtraReason] = useState('');
  const [decision, setDecision] = useState<{ reqId: string; action: 'approved' | 'rejected' } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');

  if (!currentUser) return null;

  const isAdmin = currentUser.isAdmin || currentUser.isSuperUser || !!currentUser.isManagingPartner;
  const isSocio = currentUser.position === 'socio';
  const canApprove = isAdmin || isSocio;

  const myEvaluados = assignments
    .filter(a => a.supervisorId === currentUser.id && a.period === currentPeriod)
    .map(a => a.employeeId);

  const activeUsers = (Array.isArray(users) ? users : []).filter(u => u.isActive && !u.isSuperUser);

  // Calculate vacation days for a user (cumulative with previous years extra days)
  // Vacation config is now from API as array {position, days}
  const vacConfigMap: Record<string, number> = {};
  if (Array.isArray(vacationConfig)) {
    vacationConfig.forEach((c: any) => { vacConfigMap[c.position] = c.days; });
  }
  const carryoverExpiryMonths = 12;
  const isPasante = (pos: Position) => pos === 'pasante_carrera' || pos === 'pasante' || pos === 'pasante_corporativo';

  const getUserVacationSummary = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return { allowed: 0, used: 0, pending: 0, extra: 0, previousYears: 0, total: 0, available: 0, carryoverExpired: false };

    const configured = vacConfigMap[user.position] || 0;
    // Mínimo 12 días para no-pasantes (a partir del primer año de contratación)
    const baseDays = isPasante(user.position) ? configured : Math.max(configured, 12);
    const userExtraDays = extraVacationDays.filter(e => e.userId === userId);
    const currentYear = new Date().getFullYear().toString();
    const currentExtra = userExtraDays.filter(e => e.period === currentYear).reduce((s, e) => s + e.days, 0);
    let previousExtra = userExtraDays.filter(e => e.period !== currentYear).reduce((s, e) => s + e.days, 0);

    // Vigencia de días anteriores: caducan tras N meses del inicio del año en curso
    const carryoverDeadline = new Date(parseInt(currentYear), 0, 1);
    carryoverDeadline.setMonth(carryoverDeadline.getMonth() + carryoverExpiryMonths);
    const carryoverExpired = new Date() > carryoverDeadline;
    if (carryoverExpired) previousExtra = 0;

    const userRequests = (Array.isArray(vacationRequests) ? vacationRequests : []).filter(r => r.userId === userId);
    const used = userRequests.filter(r => r.status === 'approved').reduce((s, r) => s + r.days, 0);
    const pending = userRequests.filter(r => r.status === 'pending').reduce((s, r) => s + r.days, 0);

    const totalAllowed = baseDays + currentExtra + previousExtra;
    return {
      allowed: baseDays,
      used,
      pending,
      extra: currentExtra,
      previousYears: previousExtra,
      total: totalAllowed,
      available: totalAllowed - used,
      carryoverExpired,
    };
  };

  const mySummary = getUserVacationSummary(currentUser.id);

  const matchesFilter = (r: { startDate: string; endDate: string }) => {
    if (!filterDate) return true;
    const len = filterMode === 'year' ? 4 : 7;
    const key = filterDate.substring(0, len);
    return r.startDate.startsWith(key) || r.endDate.startsWith(key);
  };

  const myRequests = vacationRequests
    .filter(r => r.userId === currentUser.id)
    .filter(matchesFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingApprovals = (Array.isArray(vacationRequests) ? vacationRequests : []).filter(r => {
    if (r.status !== 'pending') return false;
    if (isAdmin) return true;
    return myEvaluados.includes(r.userId);
  });

  const allRequests = isAdmin
    ? vacationRequests
    : (Array.isArray(vacationRequests) ? vacationRequests : []).filter(r => r.userId === currentUser.id || myEvaluados.includes(r.userId));

  const filteredAllRequests = allRequests
    .filter(matchesFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const calcDays = (s: string, e: string) => {
    if (!s || !e) return 0;
    return Math.max(0, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = () => {
    const days = calcDays(startDate, endDate);
    if (days <= 0 || days > mySummary.available) return;
    addVacationRequest({
      userId: currentUser.id,
      startDate,
      endDate,
      days,
      reason: reason.trim(),
      period: new Date().getFullYear().toString(),
    });
    setStartDate('');
    setEndDate('');
    setReason('');
    setShowRequest(false);
  };

  const handleAddExtraDays = () => {
    if (!extraUserId || extraDaysCount <= 0) return;
    addExtraVacationDays({
      id: `evd-${Date.now()}`,
      userId: extraUserId,
      days: extraDaysCount,
      reason: extraReason.trim(),
      addedBy: currentUser.id,
      addedAt: new Date().toISOString(),
      period: new Date().getFullYear().toString(),
    });
    setExtraUserId('');
    setExtraDaysCount(0);
    setExtraReason('');
    setShowExtraDays(false);
  };

  const getUser = (id: string) => users.find(u => u.id === id);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const statusLabels: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3.5 w-3.5" />,
    approved: <Check className="h-3.5 w-3.5" />,
    rejected: <X className="h-3.5 w-3.5" />,
  };

  const positionsToConfig: Position[] = [
    'socio', 'asociado_sr', 'asociado_mid', 'asociado_jr', 'pasante_carrera', 'pasante_corporativo', 'pasante',
    'director', 'gerente', 'coordinador', 'analista', 'asistente', 'archivo_soporte', 'soporte', 'archivista',
  ];

  // Admin employee list for download
  const employeeVacationList = useMemo(() => {
    return activeUsers.map(u => {
      const summary = getUserVacationSummary(u.id);
      return { ...u, ...summary };
    }).filter(u => !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeUsers, searchQuery, vacationRequests, extraVacationDays, vacationConfig]);

  const downloadCSV = () => {
    const headers = ['Nombre', 'Posición', 'Días Periodo', 'Días Extra', 'Días Anteriores', 'Total Disponible', 'Ejercidos', 'Remanente'];
    const rows = employeeVacationList.map(u => [
      u.name, getPositionLabel(u.position), u.allowed, u.extra, u.previousYears, u.total, u.used, u.available,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vacaciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Palmtree className="h-6 w-6 text-accent" />
            Vacaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de días y solicitudes de vacaciones</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Dialog open={showExtraDays} onOpenChange={setShowExtraDays}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Gift className="h-4 w-4" /> Días Adicionales
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Asignar Días Adicionales</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Empleado</label>
                      <Select value={extraUserId} onValueChange={setExtraUserId}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
                        <SelectContent>
                          {activeUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name} — {getPositionLabel(u.position)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Días adicionales</label>
                      <Input type="number" min={1} value={extraDaysCount || ''} onChange={e => setExtraDaysCount(parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Razón</label>
                      <Input value={extraReason} onChange={e => setExtraReason(e.target.value)} placeholder="Motivo de los días adicionales" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowExtraDays(false)}>Cancelar</Button>
                      <Button onClick={handleAddExtraDays} disabled={!extraUserId || extraDaysCount <= 0}>Asignar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={showConfig} onOpenChange={setShowConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Calendar className="h-4 w-4" /> Configurar Días
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Días de Vacaciones por Posición</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    {(['legal', 'administrativo'] as const).map(level => (
                      <div key={level}>
                        <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">
                          {level === 'legal' ? 'Legal' : 'Administrativo'}
                        </h3>
                        <div className="space-y-2">
                          {positionsToConfig.filter(p => getPositionLevel(p) === level).map(pos => {
                            const minDays = isPasante(pos) ? 0 : 12;
                            return (
                              <div key={pos} className="flex items-center justify-between gap-3">
                                <span className="text-sm text-foreground">{getPositionLabel(pos)}{!isPasante(pos) && <span className="text-[10px] text-muted-foreground ml-1">(mín. 12)</span>}</span>
                                <Input type="number" min={minDays} max={365} className="w-20 text-center"
                                  value={vacationConfig[pos] || 0}
                                  onChange={e => updateVacationConfig([{ position: pos, days: Math.max(minDays, parseInt(e.target.value) || 0) }])} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      <h3 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">Vigencia días anteriores</h3>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">Meses de vigencia desde el inicio del año</span>
                        <Input type="number" min={1} max={36} className="w-20 text-center"
                          value={12}
                          onChange={e => updateVacationConfig([{ position: '_carryoverExpiryMonths', days: Math.max(1, parseInt(e.target.value) || 12) }])} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Los días pendientes del año anterior caducan al cumplirse este plazo.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Dialog open={showRequest} onOpenChange={setShowRequest}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Solicitar Vacaciones</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nueva Solicitud de Vacaciones</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{mySummary.available}</p>
                    <p className="text-[10px] text-muted-foreground">Disponibles</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-muted-foreground">{mySummary.used}</p>
                    <p className="text-[10px] text-muted-foreground">Usados</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-amber-600">{mySummary.pending}</p>
                    <p className="text-[10px] text-muted-foreground">Pendientes</p>
                  </div>
                  {mySummary.previousYears > 0 && (
                    <>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-lg font-semibold text-accent">{mySummary.previousYears}</p>
                        <p className="text-[10px] text-muted-foreground">Anteriores</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fecha Inicio</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fecha Fin</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                  </div>
                </div>
                {startDate && endDate && (
                  <p className="text-sm text-muted-foreground">
                    Días solicitados: <span className={`font-semibold ${calcDays(startDate, endDate) > mySummary.available ? 'text-destructive' : 'text-foreground'}`}>{calcDays(startDate, endDate)}</span>
                    {calcDays(startDate, endDate) > mySummary.available && (
                      <span className="text-destructive ml-2 inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Excede los días disponibles</span>
                    )}
                  </p>
                )}
                <div>
                  <label className="text-sm font-medium mb-1 block">Motivo (opcional)</label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Motivo de la solicitud..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowRequest(false)}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={calcDays(startDate, endDate) <= 0 || calcDays(startDate, endDate) > mySummary.available}>
                    Enviar Solicitud
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Palmtree className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-foreground">{mySummary.allowed}</p>
            <p className="text-xs text-muted-foreground">Días Periodo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Gift className="h-5 w-5 mx-auto mb-1 text-accent" />
            <p className="text-2xl font-bold text-foreground">{mySummary.extra + mySummary.previousYears}</p>
            <p className="text-xs text-muted-foreground">Días Extra + Anteriores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Check className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-foreground">{mySummary.used}</p>
            <p className="text-xs text-muted-foreground">Días Ejercidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold text-foreground">{mySummary.pending}</p>
            <p className="text-xs text-muted-foreground">Días Pendientes</p>
          </CardContent>
        </Card>
        <Card className={mySummary.available <= 2 ? 'border-destructive/40' : ''}>
          <CardContent className="pt-4 pb-4 text-center">
            <Plane className="h-5 w-5 mx-auto mb-1 text-accent" />
            <p className={`text-2xl font-bold ${mySummary.available <= 2 ? 'text-destructive' : 'text-foreground'}`}>{mySummary.total}</p>
            <p className="text-xs text-muted-foreground">Total Disponible</p>
          </CardContent>
        </Card>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterMode} onValueChange={v => { setFilterMode(v as 'month' | 'year'); setFilterDate(''); }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Por mes</SelectItem>
            <SelectItem value="year">Por año</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {filterMode === 'month' ? (
            <Input type="month" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="pl-9" />
          ) : (
            <Input type="number" min={2000} max={2100} placeholder="Año (ej. 2026)" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="pl-9" />
          )}
        </div>
        {filterDate && (
          <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>Limpiar filtro</Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my">Mis Solicitudes</TabsTrigger>
          {(canApprove || myEvaluados.length > 0) && (
            <TabsTrigger value="approve" className="gap-1">
              Aprobaciones
              {pendingApprovals.length > 0 && (
                <Badge className="bg-accent text-accent-foreground text-[10px] ml-1 px-1.5">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {isAdmin && <TabsTrigger value="all">Todas</TabsTrigger>}
          {isAdmin && <TabsTrigger value="employees">Listado Empleados</TabsTrigger>}
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {myRequests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Palmtree className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No tienes solicitudes de vacaciones registradas.</p>
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Fin</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Aprobado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{new Date(r.startDate).toLocaleDateString('es-MX')}</TableCell>
                      <TableCell className="text-sm">{new Date(r.endDate).toLocaleDateString('es-MX')}</TableCell>
                      <TableCell className="text-sm font-medium">{r.days}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.reason || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${statusColors[r.status]}`}>
                          {statusIcons[r.status]} {statusLabels[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.approvals.length === 0 ? '—' : (
                          <div className="space-y-1">
                            {r.approvals.map((a, i) => {
                              const u = getUser(a.approverId);
                              return (
                                <div key={i} className="text-xs">
                                  <span className="font-medium">{u?.name || 'Evaluador'}</span>
                                  <span className={a.action === 'approved' ? 'text-green-700 ml-1' : 'text-destructive ml-1'}>
                                    · {a.action === 'approved' ? 'Aprobó' : 'Rechazó'}
                                  </span>
                                  {a.comment && <p className="text-muted-foreground italic">"{a.comment}"</p>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approve" className="mt-4 space-y-3">
          {pendingApprovals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Check className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No hay solicitudes pendientes de aprobación.</p>
            </CardContent></Card>
          ) : (
            pendingApprovals.map(r => {
              const user = getUser(r.userId);
              const alreadyApproved = r.approvals.some(a => a.approverId === currentUser.id);
              return (
                <Card key={r.id} className="border-amber-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">{user?.name}</CardTitle>
                        <CardDescription>{user ? getPositionLabel(user.position) : ''}</CardDescription>
                      </div>
                      <Badge variant="outline" className={statusColors.pending}>{statusLabels.pending}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span><span className="text-muted-foreground">Desde:</span> {new Date(r.startDate).toLocaleDateString('es-MX')}</span>
                      <span><span className="text-muted-foreground">Hasta:</span> {new Date(r.endDate).toLocaleDateString('es-MX')}</span>
                      <span className="font-medium">{r.days} días</span>
                    </div>
                    {r.reason && <p className="text-sm text-muted-foreground mb-3">{r.reason}</p>}
                    {!alreadyApproved && (
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1" onClick={() => { setDecision({ reqId: r.id, action: 'approved' }); setDecisionComment(''); }}>
                          <Check className="h-3.5 w-3.5" /> Aprobar
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setDecision({ reqId: r.id, action: 'rejected' }); setDecisionComment(''); }}>
                          <X className="h-3.5 w-3.5" /> Rechazar
                        </Button>
                      </div>
                    )}
                    {alreadyApproved && (
                      <p className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Ya aprobaste esta solicitud</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="all" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Posición</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllRequests.map(r => {
                    const user = getUser(r.userId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">{user?.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user ? getPositionLabel(user.position) : ''}</TableCell>
                        <TableCell className="text-sm">{new Date(r.startDate).toLocaleDateString('es-MX')}</TableCell>
                        <TableCell className="text-sm">{new Date(r.endDate).toLocaleDateString('es-MX')}</TableCell>
                        <TableCell className="text-sm font-medium">{r.days}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${statusColors[r.status]}`}>
                            {statusIcons[r.status]} {statusLabels[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => { setDecision({ reqId: r.id, action: 'approved' }); setDecisionComment(''); }}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { setDecision({ reqId: r.id, action: 'rejected' }); setDecisionComment(''); }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteVacationRequest(r.id)} title="Eliminar">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="employees" className="mt-4">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar empleado..." className="pl-9" />
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={downloadCSV}>
                <Download className="h-4 w-4" /> Descargar CSV
              </Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Posición</TableHead>
                    <TableHead className="text-center">Días Periodo</TableHead>
                    <TableHead className="text-center">Extra</TableHead>
                    <TableHead className="text-center">Anteriores</TableHead>
                    <TableHead className="text-center">Ejercidos</TableHead>
                    <TableHead className="text-center">Remanente</TableHead>
                    <TableHead className="text-center">Total Disponible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeVacationList.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getPositionLabel(u.position)}</TableCell>
                      <TableCell className="text-center text-sm">{u.allowed}</TableCell>
                      <TableCell className="text-center text-sm">{u.extra}</TableCell>
                      <TableCell className="text-center text-sm">{u.previousYears}</TableCell>
                      <TableCell className="text-center text-sm">{u.used}</TableCell>
                      <TableCell className="text-center text-sm">{u.total - u.used}</TableCell>
                      <TableCell className="text-center text-sm font-bold">{u.available}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!decision} onOpenChange={(o) => { if (!o) setDecision(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision?.action === 'approved' ? 'Aprobar solicitud' : 'Rechazar solicitud'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Comentario {decision?.action === 'rejected' ? '(recomendado)' : '(opcional)'}
              </label>
              <Textarea rows={3} value={decisionComment} onChange={e => setDecisionComment(e.target.value)}
                placeholder="Este comentario será visible para el solicitante..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDecision(null)}>Cancelar</Button>
              <Button
                variant={decision?.action === 'rejected' ? 'destructive' : 'default'}
                onClick={() => {
                  if (!decision) return;
                  updateVacationRequestStatus({ id: decision.reqId, status: decision.action });
                  setDecision(null);
                  setDecisionComment('');
                }}
              >
                {decision?.action === 'approved' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
