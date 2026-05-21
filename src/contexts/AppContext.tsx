import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Evaluation, SupervisorAssignment, ActionPlan, EvalQuestion, Position, PersonalObjectives, Announcement, VacationRequest, ExtraVacationDays, ModuleConfig, ActivationHistoryEntry, PeriodConfig, LibraryQuestion, CustomPosition, AdminObjectiveStatus } from '@/types';
import { MOCK_USERS, MOCK_ASSIGNMENTS, MOCK_EVALUATIONS } from '@/data/mockData';
import { asCustomPositions } from '@/data/positionCatalog';

export interface SystemStatus {
  status: 'active' | 'inactive';
  activationDate: string;
  paymentPlan: 'monthly' | 'annual';
  maxUsers: number;
  tickets: number;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  assignments: SupervisorAssignment[];
  evaluations: Evaluation[];
  actionPlans: ActionPlan[];
  systemStatus: SystemStatus | null;
  customQuestions: Record<string, EvalQuestion[]>;
  personalObjectives: PersonalObjectives[];
  announcements: Announcement[];
  vacationConfig: Record<string, number>;
  vacationRequests: VacationRequest[];
  extraVacationDays: ExtraVacationDays[];
  moduleConfig: ModuleConfig;
  activationHistory: ActivationHistoryEntry[];
  periodConfigs: PeriodConfig[];
  libraryQuestions: LibraryQuestion[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateUser: (user: User) => void;
  addUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  setManagingPartner: (userId: string) => void;
  addAssignment: (assignment: SupervisorAssignment) => void;
  removeAssignment: (id: string) => void;
  addEvaluation: (evaluation: Evaluation) => void;
  updateEvaluation: (evaluation: Evaluation) => void;
  changePassword: (userId: string, newPassword: string) => void;
  addOrUpdateActionPlan: (plan: ActionPlan) => void;
  updateSystemStatus: (status: SystemStatus) => void;
  setCustomQuestions: (position: Position, questions: EvalQuestion[]) => void;
  addOrUpdateObjectives: (obj: PersonalObjectives) => void;
  addAnnouncement: (ann: Announcement) => void;
  markAnnouncementRead: (annId: string, userId: string) => void;
  updateVacationConfig: (position: string, days: number) => void;
  addVacationRequest: (req: VacationRequest) => void;
  updateVacationRequestStatus: (reqId: string, status: 'approved' | 'rejected', approverId: string, comment?: string) => void;
  addExtraVacationDays: (extra: ExtraVacationDays) => void;
  updateModuleConfig: (config: ModuleConfig) => void;
  updateAnnouncement: (ann: Announcement) => void;
  deleteVacationRequest: (reqId: string) => void;
  setPeriodConfig: (cfg: PeriodConfig) => void;
  approveActionPlan: (planId: string, approverId: string, status: 'approved' | 'rejected', comments: string) => void;
  addLibraryQuestion: (q: LibraryQuestion) => void;
  updateLibraryQuestion: (q: LibraryQuestion) => void;
  deleteLibraryQuestion: (id: string) => void;
  seedOverrides: Record<string, { text?: string; category?: string; weight?: number; hidden?: boolean }>;
  updateSeedQuestion: (id: string, patch: { text?: string; category?: string; weight?: number }) => void;
  hideSeedQuestion: (id: string) => void;
  customPositions: CustomPosition[];
  addCustomPosition: (p: CustomPosition) => void;
  deleteCustomPosition: (id: string) => void;
  reviewAdminObjective: (userId: string, period: string, objectiveId: string, status: AdminObjectiveStatus, comment: string, reviewerId: string) => void;
  submitAdminObjectives: (userId: string, period: string) => void;
}


const defaultContext: AppContextType = {
  currentUser: null, users: [], assignments: [], evaluations: [], actionPlans: [], systemStatus: null,
  customQuestions: {}, personalObjectives: [], announcements: [], vacationConfig: {}, vacationRequests: [],
  extraVacationDays: [], moduleConfig: { evaluations: true, communications: true, vacations: true },
  activationHistory: [], periodConfigs: [], libraryQuestions: [],
  login: () => false, logout: () => {}, updateUser: () => {}, addUser: () => {}, deleteUser: () => {},
  setManagingPartner: () => {},
  addAssignment: () => {}, removeAssignment: () => {},
  addEvaluation: () => {}, updateEvaluation: () => {},
  changePassword: () => {}, addOrUpdateActionPlan: () => {}, updateSystemStatus: () => {},
  setCustomQuestions: () => {}, addOrUpdateObjectives: () => {},
  addAnnouncement: () => {}, markAnnouncementRead: () => {},
  updateVacationConfig: () => {}, addVacationRequest: () => {}, updateVacationRequestStatus: () => {},
  addExtraVacationDays: () => {}, updateModuleConfig: () => {}, updateAnnouncement: () => {},
  deleteVacationRequest: () => {}, setPeriodConfig: () => {}, approveActionPlan: () => {},
  addLibraryQuestion: () => {}, updateLibraryQuestion: () => {}, deleteLibraryQuestion: () => {},
  seedOverrides: {}, updateSeedQuestion: () => {}, hideSeedQuestion: () => {},
  customPositions: [], addCustomPosition: () => {}, deleteCustomPosition: () => {},
  reviewAdminObjective: () => {}, submitAdminObjectives: () => {},

};
const AppContext = createContext<AppContextType>(defaultContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smps_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('smps_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });
  const [assignments, setAssignments] = useState<SupervisorAssignment[]>(() => {
    const saved = localStorage.getItem('smps_assignments');
    return saved ? JSON.parse(saved) : MOCK_ASSIGNMENTS;
  });
  const [evaluations, setEvaluations] = useState<Evaluation[]>(() => {
    const saved = localStorage.getItem('smps_evaluations');
    return saved ? JSON.parse(saved) : MOCK_EVALUATIONS;
  });
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(() => {
    const saved = localStorage.getItem('smps_action_plans');
    return saved ? JSON.parse(saved) : [];
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(() => {
    const saved = localStorage.getItem('smps_system_status');
    return saved ? JSON.parse(saved) : { status: 'active', activationDate: '', paymentPlan: 'monthly', maxUsers: 50, tickets: 0 };
  });
  const [customQuestions, setCustomQuestionsState] = useState<Record<string, EvalQuestion[]>>(() => {
    const saved = localStorage.getItem('smps_custom_questions');
    return saved ? JSON.parse(saved) : {};
  });
  const [personalObjectives, setPersonalObjectives] = useState<PersonalObjectives[]>(() => {
    const saved = localStorage.getItem('smps_personal_objectives');
    return saved ? JSON.parse(saved) : [];
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('smps_announcements');
    return saved ? JSON.parse(saved) : [];
  });
  const [vacationConfig, setVacationConfig] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('smps_vacation_config');
    const defaults = {
      socio: 15, salary_partner: 15, asociado_sr: 15, asociado_mid: 12, asociado_jr: 12,
      pasante_carrera: 6, pasante_corporativo: 6,
      director: 15, gerente: 15, coordinador: 12, analista: 12,
      asistente: 12, archivo_soporte: 12,
      _carryoverExpiryMonths: 12, // vigencia (meses) para días pendientes de años anteriores
    };
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    if (parsed._carryoverExpiryMonths === undefined) parsed._carryoverExpiryMonths = 12;
    return parsed;
  });
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>(() => {
    const saved = localStorage.getItem('smps_vacation_requests');
    return saved ? JSON.parse(saved) : [];
  });
  const [extraVacationDays, setExtraVacationDays] = useState<ExtraVacationDays[]>(() => {
    const saved = localStorage.getItem('smps_extra_vacation_days');
    return saved ? JSON.parse(saved) : [];
  });
  const [moduleConfig, setModuleConfig] = useState<ModuleConfig>(() => {
    const saved = localStorage.getItem('smps_module_config');
    return saved ? JSON.parse(saved) : { evaluations: true, communications: true, vacations: true };
  });
  const [activationHistory, setActivationHistory] = useState<ActivationHistoryEntry[]>(() => {
    const saved = localStorage.getItem('smps_activation_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [periodConfigs, setPeriodConfigs] = useState<PeriodConfig[]>(() => {
    const saved = localStorage.getItem('smps_period_configs');
    return saved ? JSON.parse(saved) : [];
  });
  const [libraryQuestions, setLibraryQuestions] = useState<LibraryQuestion[]>(() => {
    const saved = localStorage.getItem('smps_library_questions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('smps_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('smps_assignments', JSON.stringify(assignments)); }, [assignments]);
  useEffect(() => { localStorage.setItem('smps_evaluations', JSON.stringify(evaluations)); }, [evaluations]);
  useEffect(() => { localStorage.setItem('smps_action_plans', JSON.stringify(actionPlans)); }, [actionPlans]);
  useEffect(() => {
    if (systemStatus) localStorage.setItem('smps_system_status', JSON.stringify(systemStatus));
  }, [systemStatus]);
  useEffect(() => {
    if (currentUser) localStorage.setItem('smps_current_user', JSON.stringify(currentUser));
    else localStorage.removeItem('smps_current_user');
  }, [currentUser]);
  useEffect(() => { localStorage.setItem('smps_custom_questions', JSON.stringify(customQuestions)); }, [customQuestions]);
  useEffect(() => { localStorage.setItem('smps_personal_objectives', JSON.stringify(personalObjectives)); }, [personalObjectives]);
  useEffect(() => { localStorage.setItem('smps_announcements', JSON.stringify(announcements)); }, [announcements]);
  useEffect(() => { localStorage.setItem('smps_vacation_config', JSON.stringify(vacationConfig)); }, [vacationConfig]);
  useEffect(() => { localStorage.setItem('smps_vacation_requests', JSON.stringify(vacationRequests)); }, [vacationRequests]);
  useEffect(() => { localStorage.setItem('smps_extra_vacation_days', JSON.stringify(extraVacationDays)); }, [extraVacationDays]);
  useEffect(() => { localStorage.setItem('smps_module_config', JSON.stringify(moduleConfig)); }, [moduleConfig]);
  useEffect(() => { localStorage.setItem('smps_activation_history', JSON.stringify(activationHistory)); }, [activationHistory]);
  useEffect(() => { localStorage.setItem('smps_period_configs', JSON.stringify(periodConfigs)); }, [periodConfigs]);
  useEffect(() => { localStorage.setItem('smps_library_questions', JSON.stringify(libraryQuestions)); }, [libraryQuestions]);

  useEffect(() => {
    if (!systemStatus || systemStatus.status !== 'active' || systemStatus.paymentPlan !== 'annual' || !systemStatus.activationDate) return;
    const expDate = new Date(systemStatus.activationDate);
    expDate.setMonth(expDate.getMonth() + 12);
    if (new Date() > expDate) {
      setSystemStatus(prev => prev ? { ...prev, status: 'inactive' } : prev);
    }
  }, [systemStatus]);

  // Auto-archive expired announcements
  useEffect(() => {
    const now = new Date().toISOString();
    setAnnouncements(prev => prev.map(a =>
      a.expiresAt && a.expiresAt < now && !a.archived ? { ...a, archived: true } : a
    ));
  }, []);

  const login = useCallback((email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) { setCurrentUser(user); return true; }
    return false;
  }, [users]);

  // Migración: garantizar que exista exactamente un admin principal.
  useEffect(() => {
    const admins = users.filter(u => u.isAdmin && !u.isSuperUser);
    const hasPrimary = admins.some(u => u.isPrimaryAdmin);
    if (admins.length > 0 && !hasPrimary) {
      const first = admins[0];
      setUsers(prev => prev.map(u => u.id === first.id ? { ...u, isPrimaryAdmin: true } : u));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);

  const updateUser = useCallback((user: User) => {
    setUsers(prev => {
      let next = prev.map(u => u.id === user.id ? user : u);
      // Enforce max 2 active admins (no contar superuser)
      const adminCount = next.filter(u => u.isAdmin && !u.isSuperUser).length;
      if (user.isAdmin && adminCount > 2) {
        // revertir
        next = prev;
      }
      return next;
    });
    if (currentUser?.id === user.id) setCurrentUser(user);
  }, [currentUser]);

  const addUser = useCallback((user: User) => {
    setUsers(prev => [...prev, user]);
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    setAssignments(prev => prev.filter(a => a.employeeId !== userId && a.supervisorId !== userId));
  }, []);

  const addAssignment = useCallback((a: SupervisorAssignment) => {
    setAssignments(prev => [...prev, a]);
  }, []);

  const removeAssignment = useCallback((id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  }, []);

  const addEvaluation = useCallback((e: Evaluation) => {
    setEvaluations(prev => [...prev, e]);
  }, []);

  const updateEvaluation = useCallback((e: Evaluation) => {
    setEvaluations(prev => prev.map(ev => ev.id === e.id ? e : ev));
  }, []);

  const changePassword = useCallback((userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
  }, []);

  const addOrUpdateActionPlan = useCallback((plan: ActionPlan) => {
    setActionPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx >= 0) return prev.map(p => p.id === plan.id ? plan : p);
      return [...prev, plan];
    });
  }, []);

  const updateSystemStatus = useCallback((status: SystemStatus) => {
    setSystemStatus(prev => {
      // Track activation history
      if (prev && prev.status !== status.status && currentUser) {
        const entry: ActivationHistoryEntry = {
          action: status.status === 'active' ? 'activated' : 'deactivated',
          date: new Date().toISOString(),
          by: currentUser.id,
        };
        setActivationHistory(h => [...h, entry]);
      }
      return status;
    });
  }, [currentUser]);

  const setCustomQuestions = useCallback((position: Position, questions: EvalQuestion[]) => {
    setCustomQuestionsState(prev => ({ ...prev, [position]: questions }));
  }, []);

  const addOrUpdateObjectives = useCallback((obj: PersonalObjectives) => {
    setPersonalObjectives(prev => {
      const idx = prev.findIndex(p => p.userId === obj.userId && p.period === obj.period);
      if (idx >= 0) return prev.map((p, i) => i === idx ? obj : p);
      return [...prev, obj];
    });
  }, []);

  const addAnnouncement = useCallback((ann: Announcement) => {
    setAnnouncements(prev => [...prev, ann]);
  }, []);

  const markAnnouncementRead = useCallback((annId: string, userId: string) => {
    setAnnouncements(prev => prev.map(a => a.id === annId && !a.readBy.includes(userId)
      ? { ...a, readBy: [...a.readBy, userId] } : a));
  }, []);

  const updateAnnouncement = useCallback((ann: Announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === ann.id ? ann : a));
  }, []);

  const updateVacationConfig = useCallback((position: string, days: number) => {
    setVacationConfig(prev => ({ ...prev, [position]: days }));
  }, []);

  const addVacationRequest = useCallback((req: VacationRequest) => {
    setVacationRequests(prev => [...prev, req]);
  }, []);

  const updateVacationRequestStatus = useCallback((reqId: string, status: 'approved' | 'rejected', approverId: string, comment?: string) => {
    setVacationRequests(prev => prev.map(r => r.id === reqId ? {
      ...r,
      status,
      approvals: [...r.approvals, { approverId, approvedAt: new Date().toISOString(), action: status, comment: comment?.trim() || undefined }],
    } : r));
  }, []);

  const addExtraVacationDays = useCallback((extra: ExtraVacationDays) => {
    setExtraVacationDays(prev => [...prev, extra]);
  }, []);

  const updateModuleConfig = useCallback((config: ModuleConfig) => {
    setModuleConfig(config);
  }, []);

  const deleteVacationRequest = useCallback((reqId: string) => {
    setVacationRequests(prev => prev.filter(r => r.id !== reqId));
  }, []);

  const setPeriodConfig = useCallback((cfg: PeriodConfig) => {
    setPeriodConfigs(prev => {
      const idx = prev.findIndex(p => p.period === cfg.period);
      if (idx >= 0) return prev.map((p, i) => i === idx ? cfg : p);
      return [...prev, cfg];
    });
  }, []);

  const approveActionPlan = useCallback((planId: string, approverId: string, status: 'approved' | 'rejected', comments: string) => {
    setActionPlans(prev => prev.map(p => p.id === planId ? {
      ...p,
      approvalStatus: status,
      approvalComments: comments,
      approvedBy: approverId,
      approvedAt: new Date().toISOString(),
    } : p));
  }, []);

  const setManagingPartner = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => ({
      ...u,
      isManagingPartner: u.id === userId ? true : false,
    })));
  }, []);

  const addLibraryQuestion = useCallback((q: LibraryQuestion) => {
    setLibraryQuestions(prev => [...prev, q]);
  }, []);
  const updateLibraryQuestion = useCallback((q: LibraryQuestion) => {
    setLibraryQuestions(prev => prev.map(x => x.id === q.id ? q : x));
  }, []);
  const deleteLibraryQuestion = useCallback((id: string) => {
    setLibraryQuestions(prev => prev.filter(x => x.id !== id));
  }, []);

  const [seedOverrides, setSeedOverrides] = useState<Record<string, { text?: string; category?: string; weight?: number; hidden?: boolean }>>(() => {
    const saved = localStorage.getItem('smps_seed_overrides');
    return saved ? JSON.parse(saved) : {};
  });
  useEffect(() => { localStorage.setItem('smps_seed_overrides', JSON.stringify(seedOverrides)); }, [seedOverrides]);
  const updateSeedQuestion = useCallback((id: string, patch: { text?: string; category?: string; weight?: number }) => {
    setSeedOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);
  const hideSeedQuestion = useCallback((id: string) => {
    setSeedOverrides(prev => ({ ...prev, [id]: { ...prev[id], hidden: true } }));
  }, []);

  // Custom positions (seed con catálogo SMPS si está vacío)
  const [customPositions, setCustomPositions] = useState<CustomPosition[]>(() => {
    const saved = localStorage.getItem('smps_custom_positions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CustomPosition[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* ignore */ }
    }
    
    return asCustomPositions();
  });
  useEffect(() => { localStorage.setItem('smps_custom_positions', JSON.stringify(customPositions)); }, [customPositions]);
  const addCustomPosition = useCallback((p: CustomPosition) => {
    setCustomPositions(prev => [...prev, p]);
  }, []);
  const deleteCustomPosition = useCallback((id: string) => {
    setCustomPositions(prev => prev.filter(p => p.id !== id));
  }, []);


  // Admin objectives approval flow
  const reviewAdminObjective = useCallback((userId: string, period: string, objectiveId: string, status: AdminObjectiveStatus, comment: string, reviewerId: string) => {
    setPersonalObjectives(prev => prev.map(po => {
      if (po.userId !== userId || po.period !== period) return po;
      return {
        ...po,
        adminObjectives: (po.adminObjectives || []).map(o => o.id === objectiveId
          ? { ...o, status, reviewerComment: comment, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() }
          : o),
      };
    }));
  }, []);
  const submitAdminObjectives = useCallback((userId: string, period: string) => {
    setPersonalObjectives(prev => prev.map(po => {
      if (po.userId !== userId || po.period !== period) return po;
      return {
        ...po,
        adminObjectives: (po.adminObjectives || []).map(o => o.status === 'approved' ? o : { ...o, status: 'pending', submittedAt: new Date().toISOString() }),
      };
    }));
  }, []);



  return (
    <AppContext.Provider value={{
      currentUser, users, assignments, evaluations, actionPlans, systemStatus, customQuestions,
      personalObjectives, announcements, vacationConfig, vacationRequests, extraVacationDays,
      moduleConfig, activationHistory, periodConfigs, libraryQuestions,
      login, logout, updateUser, addUser, deleteUser, setManagingPartner, addAssignment, removeAssignment,
      addEvaluation, updateEvaluation, changePassword, addOrUpdateActionPlan, updateSystemStatus,
      setCustomQuestions, addOrUpdateObjectives, addAnnouncement, markAnnouncementRead, updateAnnouncement,
      updateVacationConfig, addVacationRequest, updateVacationRequestStatus,
      addExtraVacationDays, updateModuleConfig, deleteVacationRequest,
      setPeriodConfig, approveActionPlan,
      addLibraryQuestion, updateLibraryQuestion, deleteLibraryQuestion,
      seedOverrides, updateSeedQuestion, hideSeedQuestion,
      customPositions, addCustomPosition, deleteCustomPosition,
      reviewAdminObjective, submitAdminObjectives,

    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
