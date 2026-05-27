import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// ── Users ──
export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.get<any[]>('/api/users') });
}
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/users', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/users/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
}
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/users/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
}
export function useResetUserPassword() {
  return useMutation({ mutationFn: ({ id, newPassword }: any) => api.post(`/api/users/${id}/reset-password`, { newPassword }) });
}
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/users/${id}/role`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
}

// ── Assignments ──
export function useAssignments(period?: string) {
  return useQuery({ queryKey: ['assignments', period], queryFn: () => api.get<any[]>(`/api/assignments${period ? `?period=${period}` : ''}`) });
}
export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/assignments', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }) });
}
export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/assignments/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }) });
}

// ── Evaluations ──
export function useEvaluations(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({ queryKey: ['evaluations', filters], queryFn: () => api.get<any[]>(`/api/evaluations${params}`) });
}
export function useEvaluation(id: string) {
  return useQuery({ queryKey: ['evaluation', id], queryFn: () => api.get<any>(`/api/evaluations/${id}`), enabled: !!id });
}
export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/evaluations', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }) });
}
export function useUpdateEvaluation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/evaluations/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }) });
}
export function useCompleteFeedback() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.patch(`/api/evaluations/${id}/feedback`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }) });
}
export function useApproveNA() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, questionId, approved }: any) => api.patch(`/api/evaluations/${id}/na-approval`, { questionId, approved }), onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }) });
}

// ── Action Plans ──
export function useActionPlans(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({ queryKey: ['actionPlans', filters], queryFn: () => api.get<any[]>(`/api/action-plans${params}`) });
}
export function useCreateActionPlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/action-plans', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['actionPlans'] }) });
}
export function useUpdateActionPlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/action-plans/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['actionPlans'] }) });
}
export function useApproveActionPlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, status, comments }: any) => api.post(`/api/action-plans/${id}/approve`, { status, comments }), onSuccess: () => qc.invalidateQueries({ queryKey: ['actionPlans'] }) });
}

// ── Objectives ──
export function useObjectives(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({ queryKey: ['objectives', filters], queryFn: () => api.get<any[]>(`/api/objectives${params}`) });
}
export function useCreateObjectives() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/objectives', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }) });
}
export function useSubmitObjectives() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/api/objectives/${id}/submit`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }) });
}
export function useReviewObjective() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, objectiveId, status, comment }: any) => api.post(`/api/objectives/${id}/review`, { objectiveId, status, comment }), onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }) });
}

// ── Announcements ──
export function useAnnouncements() {
  return useQuery({ queryKey: ['announcements'], queryFn: () => api.get<any[]>('/api/announcements') });
}
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/announcements', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
}
export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/announcements/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
}
export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/api/announcements/${id}/read`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }) });
}

// ── Vacations ──
export function useVacationRequests(filters?: Record<string, string>) {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return useQuery({ queryKey: ['vacationRequests', filters], queryFn: () => api.get<any[]>(`/api/vacations/requests${params}`) });
}
export function useCreateVacationRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/vacations/requests', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['vacationRequests'] }) });
}
export function useUpdateVacationRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/vacations/requests/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['vacationRequests'] }) });
}
export function useApproveVacationRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, action, comment }: any) => api.post(`/api/vacations/requests/${id}/approve`, { action, comment }), onSuccess: () => qc.invalidateQueries({ queryKey: ['vacationRequests'] }) });
}
export function useDeleteVacationRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/vacations/requests/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['vacationRequests'] }) });
}
export function useVacationConfig() {
  return useQuery({ queryKey: ['vacationConfig'], queryFn: () => api.get<any[]>('/api/vacations/config') });
}
export function useUpdateVacationConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (positions: any[]) => api.patch('/api/vacations/config', { positions }), onSuccess: () => qc.invalidateQueries({ queryKey: ['vacationConfig'] }) });
}
export function useAddExtraVacationDays() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/vacations/extra-days', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['vacationRequests'] }) });
}

// ── Questions ──
export function useLibraryQuestions() {
  return useQuery({ queryKey: ['libraryQuestions'], queryFn: () => api.get<any[]>('/api/questions/library') });
}
export function useCreateLibraryQuestion() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/questions/library', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['libraryQuestions'] }) });
}
export function useUpdateLibraryQuestion() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/questions/library/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['libraryQuestions'] }) });
}
export function useDeleteLibraryQuestion() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/questions/library/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['libraryQuestions'] }) });
}
export function useCustomQuestions(position?: string) {
  return useQuery({ queryKey: ['customQuestions', position], queryFn: () => api.get<any[]>(`/api/questions/custom${position ? `?position=${position}` : ''}`) });
}
export function useSetCustomQuestions() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/questions/custom', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['customQuestions'] }) });
}
export function useSeedOverrides() {
  return useQuery({ queryKey: ['seedOverrides'], queryFn: () => api.get<any[]>('/api/questions/overrides') });
}
export function useUpdateSeedOverride() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/questions/overrides/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['seedOverrides'] }) });
}

// ── Positions ──
export function usePositions(workAreaId?: string) {
  return useQuery({ queryKey: ['positions', workAreaId], queryFn: () => api.get<any[]>(workAreaId ? `/api/positions?work_area_id=${workAreaId}` : '/api/positions') });
}
export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/positions', data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['workAreas'] }); } });
}
export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/positions/${id}`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['workAreas'] }); qc.invalidateQueries({ queryKey: ['users'] }); } });
}
export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/positions/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['workAreas'] }); } });
}

// ── Work Areas ──
export function useWorkAreas() {
  return useQuery({ queryKey: ['workAreas'], queryFn: () => api.get<any[]>('/api/work-areas') });
}
export function useCreateWorkArea() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/work-areas', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['workAreas'] }) });
}
export function useUpdateWorkArea() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/work-areas/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['workAreas'] }) });
}
export function useDeleteWorkArea() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/work-areas/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['workAreas'] }) });
}

// ── Locations ──
export function useLocations() {
  return useQuery({ queryKey: ['locations'], queryFn: () => api.get<any[]>('/api/locations') });
}
export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/locations', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }) });
}
export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.patch(`/api/locations/${id}`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }) });
}
export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/locations/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }) });
}

// ── Periods ──
export function usePeriods() {
  return useQuery({ queryKey: ['periods'], queryFn: () => api.get<any[]>('/api/periods') });
}
export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/periods', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['periods'] }) });
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
  return useMutation({ mutationFn: (data: any) => api.patch('/api/system/status', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['systemStatus'] }) });
}
export function useUpdateSystemModules() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.patch('/api/system/modules', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['systemModules'] }) });
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
  return useMutation({ mutationFn: (data: any) => api.patch('/api/copilot/config', data), onSuccess: () => qc.invalidateQueries({ queryKey: ['copilotConfig'] }) });
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
