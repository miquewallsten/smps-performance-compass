import { useAuth } from '@/contexts/AuthContext';
import { useAssignments, useEvaluations, useAnnouncements, useVacationRequests, useSystemStatus, useSystemModules } from '@/api/queries';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Clock,
  ClipboardList,
  LayoutDashboard, ClipboardCheck, Users, BarChart3, Settings, LogOut,
  UserCheck, ChevronLeft, ChevronRight, Menu, Shield, FileText, Target, Bot,
  Megaphone, Palmtree, ChevronDown, HelpCircle, BookOpen, Calendar, User as UserIcon, Briefcase, TrendingUp
} from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import PeriodEndAlert from '@/components/PeriodEndAlert';
import { getPositionLevel } from '@/lib/evaluationConfig';
import { useEvalConfigInit } from '@/hooks/useEvalConfigInit';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';

/** Spinner shown inside the content area while a lazy page chunk loads */
function ContentLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-5 w-5 animate-spin text-accent" />
    </div>
  );
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold leading-none px-1">{count}</span>;
}

export default function Layout() {
  useEvalConfigInit();
  const currentPeriod = useCurrentPeriod();
  const { user: currentUser, logout } = useAuth();
  const { data: assignmentsData } = useAssignments(currentPeriod);
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
  const { data: systemStatus } = useSystemStatus();
  const { data: evaluationsData } = useEvaluations({ period: currentPeriod });
  const evaluations = Array.isArray(evaluationsData) ? evaluationsData : [];
  const { data: announcementsData } = useAnnouncements();
  const announcements = Array.isArray(announcementsData) ? announcementsData : [];
  const { data: vacationRequestsData } = useVacationRequests();
  const vacationRequests = Array.isArray(vacationRequestsData) ? vacationRequestsData : [];
  const { data: moduleConfig } = useSystemModules();
  const modules = moduleConfig || { evaluations: true, communications: true, vacations: true, copilot: true };
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [evalGroupOpen, setEvalGroupOpen] = useState(true);
  const [userGroupOpen, setUserGroupOpen] = useState(true);

  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  if (systemStatus?.status === 'inactive' && !currentUser.isSuperUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="smps-surface-elevated max-w-sm text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold mb-2">Sistema Inactivo</h1>
          <p className="text-sm text-muted-foreground mb-4">El acceso al sistema se encuentra temporalmente suspendido. Contacte al administrador para más información.</p>
          <button onClick={() => { logout(); navigate('/login'); }} className="px-5 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98]">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.isAdmin;
  const isSuperUser = currentUser.isSuperUser;
  const isSocio = currentUser.position === 'socio';
  const isManagingPartner = !!currentUser.isManagingPartner;
  const isAdminOrSuper = isAdmin || isSuperUser;
  const canViewAll = isAdmin || isSuperUser || isManagingPartner;

  const hasTeam = assignments.some(a => a.supervisorId === currentUser.id && a.period === currentPeriod);
  const myLevel = getPositionLevel(currentUser.position);

  const pendingEvalCount = (() => {
    if (!modules.evaluations) return 0;
    const myEvaluados = assignments.filter(a => a.supervisorId === currentUser.id && a.period === currentPeriod).map(a => a.employeeId);
    const selfDone = evaluations.some(e => e.evaluatedId === currentUser.id && e.type === 'self' && e.period === currentPeriod);
    let count = selfDone ? 0 : 1;
    myEvaluados.forEach(eid => {
      const hasSupervisorEval = evaluations.some(e => e.evaluatedId === eid && e.type === 'supervisor' && e.period === currentPeriod);
      if (!hasSupervisorEval) count++;
    });
    return count;
  })();

  const unreadAnnouncementCount = (() => {
    if (!modules.communications) return 0;
    return announcements.filter(a => {
      if (a.archived) return false;
      if (a.readBy && a.readBy.includes(currentUser.id)) return false;
      if (a.audience === 'all') return true;
      if (a.audience === myLevel) return true;
      if (isAdminOrSuper || isManagingPartner || isSocio) return true;
      return false;
    }).length;
  })();

  const pendingVacationCount = canViewAll
    ? vacationRequests.filter((r: any) => r.status === 'pending').length
    : 0;

  // ─── NAV ITEMS ──────────────────────────────────────────────────────────────
  const evalItems = [
    { to: '/self-evaluation', icon: ClipboardCheck, label: 'Autoevaluación', show: !!modules.evaluations },
    { to: '/evaluations', icon: ClipboardList, label: 'Evaluaciones', show: !!modules.evaluations && (hasTeam || isAdminOrSuper) },
    { to: '/my-action-plan', icon: Target, label: 'Mi Plan de Acción', show: !!modules.evaluations },
  ];

  const userGroupItems = [
    { to: '/users', icon: Users, label: 'Usuarios', show: canViewAll },
    { to: '/positions', icon: Briefcase, label: 'Puestos', show: canViewAll },
    { to: '/assign', icon: UserCheck, label: 'Asignar Supervisores', show: canViewAll },
    { to: '/orgchart', icon: BarChart3, label: 'Organigrama', show: canViewAll },
  ];

  const otherItems = [
    { to: '/communications', icon: Megaphone, label: 'Comunicados', show: !!modules.communications, badge: unreadAnnouncementCount },
    { to: '/vacations', icon: Palmtree, label: 'Vacaciones', show: !!modules.vacations, badge: canViewAll ? pendingVacationCount : 0 },
    { to: '/my-profile', icon: UserIcon, label: 'Mi Perfil', show: true },
    { to: '/reports', icon: BarChart3, label: 'Reportes', show: canViewAll },
    { to: '/score-analysis', icon: TrendingUp, label: 'Análisis de Calificaciones', show: canViewAll },
    { to: '/settings', icon: Settings, label: 'Configuración', show: true },
    { to: '/copilot', icon: Bot, label: 'Copiloto IA', show: !!modules.copilot && isSuperUser },
  ];

  const renderNavItem = (item: { to: string; icon: any; label: string; show: boolean; badge?: number }) => {
    if (!item.show) return null;
    return (
      <NavLink key={item.to} to={item.to}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-[background-color,color] duration-150 text-sm"
        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {item.badge && item.badge > 0 ? <Badge count={item.badge} /> : null}
        {item.to === '/self-evaluation' && pendingEvalCount > 0 && !collapsed ? <Badge count={pendingEvalCount} /> : null}
      </NavLink>
    );
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="hidden md:flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors">
            <Menu className="h-4 w-4" />
          </button>
          <h1 className="font-display text-sm font-bold tracking-tight">SMPS</h1>
          {currentPeriod && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{currentPeriod}</span>}
        </div>
        <div className="flex items-center gap-2">
          <PeriodEndAlert />
          <span className="text-xs text-muted-foreground hidden sm:inline">{currentUser.name}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden md:inline">{currentUser.position}</span>
          <button onClick={logout} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground/70 hover:text-foreground/10 transition-[background-color,color] duration-150" title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'w-14' : 'w-52'} bg-sidebar border-r border-sidebar-border transition-[width] duration-200 flex-shrink-0 hidden md:flex flex-col`}>
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {showEvalModule && (
              <>
                {!collapsed && (
                  <button
                    onClick={() => setEvalGroupOpen(!evalGroupOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold w-full hover:text-sidebar-foreground/60 transition-colors"
                  >
                    <span>Evaluación</span>
                    {pendingEvalCount > 0 && <Badge count={pendingEvalCount} />}
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-200 ${evalGroupOpen ? '' : '-rotate-90'}`} />
                  </button>
                )}
                {(evalGroupOpen || collapsed) && evalItems.filter(item => item.show).map(item => (
                  <div key={item.to} className="relative">
                    {renderNavItem(item)}
                  </div>
                ))}
                {!collapsed && <div className="border-b border-sidebar-border my-1.5" />}
              </>
            )}
            {userGroupItems.some(item => item.show) && (
              <>
                {!collapsed && (
                  <button
                    onClick={() => setUserGroupOpen(!userGroupOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold w-full hover:text-sidebar-foreground/60 transition-colors"
                  >
                    <span>Usuarios</span>
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-200 ${userGroupOpen ? '' : '-rotate-90'}`} />
                  </button>
                )}
                {(userGroupOpen || collapsed) && userGroupItems.filter(item => item.show).map(item => (
                  <div key={item.to} className="relative">
                    {renderNavItem(item)}
                  </div>
                ))}
                {!collapsed && <div className="border-b border-sidebar-border my-1.5" />}
              </>
            )}
            {otherItems.filter(item => item.show).map(item => (
              <div key={item.to} className="relative">
                {renderNavItem(item)}
              </div>
            ))}
          </nav>
          <div className="p-2 border-t border-sidebar-border">
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center py-1.5 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            {!collapsed && <p className="text-[10px] text-sidebar-foreground/25 text-center mt-0.5">Bowdot</p>}
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-sidebar-border mobile-bottom-nav flex justify-around px-1 py-0.5">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
            { to: '/self-evaluation', icon: ClipboardCheck, label: 'Evaluar' },
            { to: '/communications', icon: Megaphone, label: 'Avisos' },
            { to: '/vacations', icon: Palmtree, label: 'Vacaciones' },
            { to: '/settings', icon: Settings, label: 'Más' },
          ].map(item => (
            <NavLink key={item.to} to={item.to} className="flex flex-col items-center py-1 px-2 text-sidebar-foreground/50 transition-[color] duration-150" activeClassName="text-sidebar-primary">
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Main content — Suspense wraps ONLY the Outlet so sidebar/header never unmount */}
        {location.pathname === '/copilot' ? (
          <div className="flex-1 min-h-0">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </div>
        ) : location.pathname.includes('/timeline') ? (
          <main className="flex-1 min-h-0 overflow-hidden pb-16 md:pb-0">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </main>
        ) : (
          <main className="flex-1 min-h-0 overflow-auto pb-16 md:pb-0">
            <div className="p-4 md:p-5 max-w-6xl mx-auto">
              <PeriodEndAlert />
              <Suspense fallback={<ContentLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
