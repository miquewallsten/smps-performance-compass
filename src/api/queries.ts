import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getToken, normalizeEvaluations, normalizeEvaluation, apiBase } from './client';
import { toast } from 'sonner';

// ── Users ──
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<any[]>('/api/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario creado exitosamente'); },
    onError: (err: Error) => toast.error(err.message || 'Error al crear usuario'),
  });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario actualizado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar'),
  });
}
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario eliminado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al eliminar'),
  });
}
export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => api.post<{ message: string; resetLink?: string }>(`/api/users/${id}/reset-password`, {}),
    onSuccess: (data) => {
      if (!data?.resetLink) {
        toast.success('Correo de restablecimiento enviado al usuario');
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Error al restablecer contraseña'),
  });
}
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/users/${id}/role`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Rol actualizado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar rol'),
  });
}

// ── Assignments ──
export function useAssignments(period?: string) {
  return useQuery({
    queryKey: ['assignments', period],
    queryFn: () => api.get<any[]>(`/api/assignments${period ? `?period=${period}` : ''}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/assignments', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Asignación creada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al crear asignación'),
  });
}
export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/assignments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Asignación eliminada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al eliminar asignación'),
  });
}

// ── Evaluations ──
export function useEvaluations(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({
    queryKey: ['evaluations', filters],
    queryFn: async () => {
      const data = await api.get<any[]>(`/api/evaluations${params}`);
      return normalizeEvaluations(data);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - evaluations change more frequently
    gcTime: 10 * 60 * 1000,
  });
}
export function useEvaluation(id: string) {
  return useQuery({
    queryKey: ['evaluation', id],
    queryFn: async () => {
      const data = await api.get<any>(`/api/evaluations/${id}`);
      return normalizeEvaluation(data);
    },
    enabled: !!id
  });
}
export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const result = await api.post('/api/evaluations', data);
      return normalizeEvaluation(result);
    },
    onMutate: async (newEval) => {
      await qc.cancelQueries({ queryKey: ['evaluations'] });
      const prev = qc.getQueryData(['evaluations']);
      qc.setQueryData(['evaluations'], (old: any[]) => old ? [...old, { ...newEval, id: 'temp-' + Date.now(), totalScore: 0 }] : [{ ...newEval, id: 'temp-' + Date.now(), totalScore: 0 }]);
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); qc.invalidateQueries({ queryKey: ['analyticsOverview'] }); qc.invalidateQueries({ queryKey: ['analyticsEvaluations'] }); toast.success('Evaluación enviada'); },
    onError: (err: Error, _vars, context: any) => { if (context?.prev) qc.setQueryData(['evaluations'], context.prev); toast.error(err.message || 'Error al enviar evaluación'); },
  });
}
export function useUpdateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const result = await api.patch(`/api/evaluations/${id}`, data);
      return normalizeEvaluation(result);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); qc.invalidateQueries({ queryKey: ['analyticsOverview'] }); qc.invalidateQueries({ queryKey: ['analyticsEvaluations'] }); toast.success('Evaluación actualizada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar evaluación'),
  });
}
export function useCompleteFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/evaluations/${id}/feedback`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); qc.invalidateQueries({ queryKey: ['analyticsOverview'] }); qc.invalidateQueries({ queryKey: ['analyticsEvaluations'] }); toast.success('Feedback marcado como completado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al completar feedback'),
  });
}
export function useApproveNA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, questionId, approved }: any) => api.patch(`/api/evaluations/${id}/na-approval`, { questionId, approved }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evaluations'] }); qc.invalidateQueries({ queryKey: ['analyticsOverview'] }); qc.invalidateQueries({ queryKey: ['analyticsEvaluations'] }); toast.success('Decisión N/A guardada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al procesar N/A'),
  });
}


export function useExportEvaluationsCSV() {
  return useMutation({
    mutationFn: async ({ period }: { period: string }) => {
      const token = getToken();
      const res = await fetch(`${apiBase}/api/evaluations/export/csv?period=${encodeURIComponent(period)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluaciones-${period}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Archivo CSV descargado'),
    onError: () => toast.error('Error al exportar CSV'),
  });
}
// ── Action Plans ──
export function useActionPlans(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({
    queryKey: ['actionPlans', filters],
    queryFn: () => api.get<any[]>(`/api/action-plans${params}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
export function useCreateActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/action-plans', data),
    onMutate: async (newPlan) => {
      await qc.cancelQueries({ queryKey: ['actionPlans'] });
      const prev = qc.getQueryData(['actionPlans']);
      qc.setQueryData(['actionPlans'], (old: any[]) => old ? [...old, { ...newPlan, id: 'temp-' + Date.now() }] : [{ ...newPlan, id: 'temp-' + Date.now() }]);
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['actionPlans'] }); qc.invalidateQueries({ queryKey: ['analyticsOverview'] }); qc.invalidateQueries({ queryKey: ['analyticsEvaluations'] }); toast.success('Plan de acción guardado'); },
    onError: (err: Error, _vars, context: any) => { if (context?.prev) qc.setQueryData(['actionPlans'], context.prev); toast.error(err.message || 'Error al guardar plan'); },
  });
}
export function useApproveActionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, comments }: any) => api.post(`/api/action-plans/${id}/approve`, { status, comments }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['actionPlans'] }); qc.invalidateQueries({ queryKey: ['analyticsOverview'] }); qc.invalidateQueries({ queryKey: ['analyticsEvaluations'] }); toast.success('Plan de acción procesado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al procesar plan'),
  });
}

// ── Objectives ──
export function useObjectives(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({ queryKey: ['objectives', filters], queryFn: () => api.get<any[]>(`/api/objectives${params}`) });
}
export function useCreateObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/objectives', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['objectives'] }); toast.success('Objetivo creado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al crear objetivo'),
  });
}
export function useSubmitObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/objectives/${id}/submit`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['objectives'] }); toast.success('Objetivo enviado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al enviar objetivo'),
  });
}
export function useReviewObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, objectiveId, status, comment }: any) => api.post(`/api/objectives/${id}/review`, { objectiveId, status, comment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['objectives'] }); toast.success('Objetivo revisado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al revisar objetivo'),
  });
}

// ── Announcements ──
export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get<any[]>('/api/announcements'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000,
  });
}
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/announcements', data),
    onMutate: async (newAnn) => {
      await qc.cancelQueries({ queryKey: ['announcements'] });
      const prev = qc.getQueryData(['announcements']);
      qc.setQueryData(['announcements'], (old: any[]) => old ? [newAnn, ...old] : [newAnn]);
      return { prev };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Comunicado publicado'); },
    onError: (err: Error, _vars, context: any) => { if (context?.prev) qc.setQueryData(['announcements'], context.prev); toast.error(err.message || 'Error al publicar comunicado'); },
  });
}
export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/announcements/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Comunicado actualizado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar comunicado'),
  });
}
export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/api/announcements/${id}/read`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
}

// ── Vacations ──
export function useVacationRequests() {
  return useQuery({
    queryKey: ['vacationRequests'],
    queryFn: () => api.get<any[]>('/api/vacations/requests'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
export function useVacationConfig() {
  return useQuery({ queryKey: ['vacationConfig'], queryFn: () => api.get<any>('/api/vacations/config') });
}
export function useCreateVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/vacations/requests', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacationRequests'] }); toast.success('Solicitud de vacaciones enviada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al enviar solicitud'),
  });
}
export function useUpdateVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/vacations/requests/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacationRequests'] }); toast.success('Solicitud actualizada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar solicitud'),
  });
}
export function useApproveVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, comment }: any) => api.post(`/api/vacations/requests/${id}/approve`, { action, comment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacationRequests'] }); toast.success('Solicitud procesada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al procesar solicitud'),
  });
}
export function useCancelVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/vacations/requests/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacationRequests'] }); toast.success('Solicitud cancelada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al cancelar solicitud'),
  });
}
export function useUpdateVacationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (positions: any[]) => api.patch('/api/vacations/config', { positions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacationConfig'] }); toast.success('Configuración de vacaciones guardada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al guardar configuración'),
  });
}
// ── Extra Vacation Days ──
export function useExtraVacationDays(userId?: string, period?: string) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (period) params.set('period', period);
  const qs = params.toString();
  return useQuery({ queryKey: ['extraVacationDays', userId, period], queryFn: () => api.get<any[]>(`/api/vacations/extra-days${qs ? `?${qs}` : ''}`) });
}


export function useAddExtraVacationDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/vacations/extra-days', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacationRequests'] }); toast.success('Días extra agregados'); },
    onError: (err: Error) => toast.error(err.message || 'Error al agregar días extra'),
  });
}

// ── Locations ──
export function useLocations() {
  return useQuery({ queryKey: ['locations'], queryFn: () => api.get<any[]>('/api/locations') });
}
export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/locations', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Ubicación creada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al crear ubicación'),
  });
}
export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/locations/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Ubicación actualizada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar ubicación'),
  });
}
export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/locations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Ubicación eliminada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al eliminar ubicación'),
  });
}

// ── Positions & Work Areas ──
export function usePositions() {
  return useQuery({ queryKey: ['positions'], queryFn: () => api.get<any[]>('/api/positions') });
}
export function useWorkAreas() {
  return useQuery({ queryKey: ['workAreas'], queryFn: () => api.get<any[]>('/api/work-areas') });
}
export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/positions', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['workAreas'] }); toast.success('Puesto creado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al crear puesto'),
  });
}
export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/positions/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['workAreas'] }); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Puesto actualizado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar puesto'),
  });
}
export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/positions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['workAreas'] }); toast.success('Puesto eliminado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al eliminar puesto'),
  });
}
export function useCreateWorkArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/work-areas', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workAreas'] }); toast.success('Área de práctica creada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al crear área'),
  });
}
export function useUpdateWorkArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/work-areas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workAreas'] }); toast.success('Área de práctica actualizada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar área'),
  });
}
export function useDeleteWorkArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/work-areas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workAreas'] }); toast.success('Área de práctica eliminada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al eliminar área'),
  });
}

// ── Periods ──
export function usePeriods() {
  return useQuery({ queryKey: ['periods'], queryFn: () => api.get<any[]>('/api/periods') });
}
export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/api/periods', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['periods'] }); toast.success('Periodo creado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al crear periodo'),
  });
}

// ── System ──
export function useSystemStatus() {
  return useQuery({ queryKey: ['systemStatus'], queryFn: () => api.get<any>('/api/system/status') });
}
export function useSystemModules() {
  return useQuery({ queryKey: ['systemModules'], queryFn: () => api.get<any>('/api/system/modules') });
}
export function useSystemInitialized() {
  return useQuery({ queryKey: ['systemInitialized'], queryFn: () => api.get<{ initialized: boolean }>('/api/system/initialized') });
}
export function useUpdateSystemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch('/api/system/status', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['systemStatus'] }); toast.success('Estado del sistema actualizado'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar estado del sistema'),
  });
}
export function useUpdateSystemModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch('/api/system/modules', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['systemModules'] }); toast.success('Módulos actualizados'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar módulos'),
  });
}
export function useActivationHistory() {
  return useQuery({ queryKey: ['activationHistory'], queryFn: () => api.get<any[]>('/api/system/activation-history') });
}

// ── Copilot ──
export function useCopilotConfig() {
  return useQuery({ queryKey: ['copilotConfig'], queryFn: () => api.get<any>('/api/copilot/config') });
}
export function useUpdateCopilotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch('/api/copilot/config', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['copilotConfig'] }); toast.success('Configuración guardada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al guardar configuración'),
  });
}
export function useCopilotConversations() {
  return useQuery({ queryKey: ['copilotConversations'], queryFn: () => api.get<any[]>('/api/copilot/conversations') });
}
export function useCopilotConversation(id: string) {
  return useQuery({ queryKey: ['copilotConversation', id], queryFn: () => api.get<any>(`/api/copilot/conversations/${id}`), enabled: !!id });
}
export function useCreateCopilotConversation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data?: { title?: string }) => api.post<any>('/api/copilot/conversations', data || {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['copilotConversations'] }) });
}
export function useDeleteCopilotConversation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/copilot/conversations/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['copilotConversations'] }) });
}

// ── SMTP Config ──
export function useSmtpConfig() {
  return useQuery({ queryKey: ['smtpConfig'], queryFn: () => api.get<any>('/api/system/smtp-config') });
}
export function useUpdateSmtpConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch('/api/system/smtp-config', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['smtpConfig'] }); toast.success('Configuración de correo guardada'); },
    onError: (err: Error) => toast.error(err.message || 'Error al guardar configuración'),
  });
}
export function useClearAllCopilotConversations() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.delete<any>('/api/copilot/conversations'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['copilotConversations'] }); qc.invalidateQueries({ queryKey: ['copilotConversation'] }); } });
}
export function useCopilotChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { conversationId?: string; message: string }) => api.post<any>('/api/copilot/chat', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['copilotConversations'] });
      qc.invalidateQueries({ queryKey: ['copilotConversation'] });
    },
  });
}

// ── Timeline ──
export function useUserTimeline(userId: string, params?: Record<string, string>) {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  return useQuery({ queryKey: ['timeline', userId, params], queryFn: async () => {
    const res = await api.get<{ events: any[]; total: number; hasMore: boolean }>(`/api/users/${userId}/timeline${queryString}`);
    return res.events ?? [];
  } });
}

export function useCreateTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }: any) => api.post(`/api/users/${userId}/timeline`, data),
    onSuccess: (_data: any, variables: any) => qc.invalidateQueries({ queryKey: ['timeline', variables.userId] }),
  });
}

export function useUpdateTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, eventId, ...data }: any) => api.patch(`/api/users/${userId}/timeline/${eventId}`, data),
    onSuccess: (_data: any, variables: any) => qc.invalidateQueries({ queryKey: ['timeline', variables.userId] }),
  });
}

export function useDeleteTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, eventId }: any) => api.delete(`/api/users/${userId}/timeline/${eventId}`),
    onSuccess: (_data: any, variables: any) => qc.invalidateQueries({ queryKey: ['timeline', variables.userId] }),
  });
}

// ── Analytics ──
export function useAnalyticsOverview(period: string) {
  return useQuery({
    queryKey: ['analyticsOverview', period],
    queryFn: () => api.get<any>(`/api/analytics/overview?period=${period}`),
    enabled: !!period,
  });
}

export function useAnalyticsEvaluations(period: string) {
  return useQuery({
    queryKey: ['analyticsEvaluations', period],
    queryFn: () => api.get<any>(`/api/analytics/evaluations?period=${period}`),
    enabled: !!period,
  });
}

export function useAnalyticsTrends() {
  return useQuery({
    queryKey: ['analyticsTrends'],
    queryFn: () => api.get<any>('/api/analytics/trends'),
  });
}

export function useAnalyticsObjectives(period?: string) {
  const params = period ? `?period=${period}` : '';
  return useQuery({
    queryKey: ['analyticsObjectives', period],
    queryFn: () => api.get<any>(`/api/analytics/objectives${params}`),
  });
}

export function useAnalyticsVacations() {
  return useQuery({
    queryKey: ['analyticsVacations'],
    queryFn: () => api.get<any>('/api/analytics/vacations'),
  });
}

export function useAnalyticsActionPlans(period?: string) {
  const params = period ? `?period=${period}` : '';
  return useQuery({
    queryKey: ['analyticsActionPlans', period],
    queryFn: () => api.get<any>(`/api/analytics/action-plans${params}`),
  });
}

// ── Notifications ──
export function useNotifications(options?: { limit?: number; offset?: number; unread?: boolean }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.unread) params.set('unread', 'true');
  const qs = params.toString();
  return useQuery({
    queryKey: ['notifications', options],
    queryFn: () => api.get<any>(`/api/notifications${qs ? `?${qs}` : ''}`),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: () => api.get<{ unread: number }>('/api/notifications/count'),
    refetchInterval: 5 * 60 * 1000, // Poll every 5 minutes (was 1 minute)
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unreadNotificationCount'] }); },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/notifications/read-all', {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unreadNotificationCount'] }); },
  });
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: ['notificationPreferences'], queryFn: () => api.get<any[]>('/api/notifications/preferences') });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch('/api/notifications/preferences', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notificationPreferences'] }); toast.success('Preferencias actualizadas'); },
    onError: (err: Error) => toast.error(err.message || 'Error al actualizar preferencias'),
  });
}

export function usePendingActions(period?: string) {
  return useQuery({
    queryKey: ['pendingActions', period],
    queryFn: () => api.get<any>(`/api/notifications/pending-actions${period ? `?period=${period}` : ''}`),
    enabled: !!period,
  });
}
