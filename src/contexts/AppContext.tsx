import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, Evaluation, SupervisorAssignment, ActionPlan, EvalQuestion, Position, PersonalObjectives, Announcement, VacationRequest, ExtraVacationDays, ModuleConfig, ActivationHistoryEntry, PeriodConfig, LibraryQuestion, CustomPosition, AdminObjectiveStatus } from '@/types';
import { MOCK_USERS, MOCK_ASSIGNMENTS, MOCK_EVALUATIONS } from '@/data/mockData';

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
      pasante_carrera: 6, pasante: 6,
      director: 15, gerente: 15, coordinador: 12, analista: 12,
      asistente: 12, soporte: 12,
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

}
