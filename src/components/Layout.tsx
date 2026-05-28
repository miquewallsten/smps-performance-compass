import { useAuth } from '@/contexts/AuthContext';
import { useAssignments, useEvaluations, useAnnouncements, useVacationRequests, useSystemStatus, useSystemModules } from '@/api/queries';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Clock,
  LayoutDashboard, ClipboardCheck, Users, BarChart3, Settings, LogOut,
  UserCheck, ClipboardList, ChevronLeft, ChevronRight, Menu, Map, Shield, FileText, Target, Bot,
  Megaphone, Palmtree, ChevronDown, HelpCircle, BookOpen, Calendar, User as UserIcon, Briefcase
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import PeriodEndAlert from '@/components/PeriodEndAlert';
import { CURRENT_PERIOD, getPositionLevel } from '@/lib/evaluationConfig';
import { useEvalConfigInit } from '@/hooks/useEvalConfigInit';

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold leading-none px-1">{count}</span>;
}

export default function Layout() {
  useEvalConfigInit();
  const { user: currentUser, logout } = useAuth();
  const { data: assignments = [] } = useAssignments(CURRENT_PERIOD);
  const { data: systemStatus } = useSystemStatus();
  const { data: evaluations = [] } = useEvaluations({ period: CURRENT_PERIOD });
  const { data: announcements = [] } = useAnnouncements();
  const { data: vacationRequests = [] } = useVacationRequests();
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
          <button onClick={() => { logout(); navigate('/login'); }} className="px-5 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98]">
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

  const hasTeam = assignments.some(a => a.supervisorId === currentUser.id && a.period === CURRENT_PERIOD);
  const myLevel = getPositionLevel(currentUser.position);

  const pendingEvalCount = (() => {
    if (!modules.evaluations) return 0;
    const myEvaluados = assignments.filter(a => a.supervisorId === currentUser.id && a.period === CURRENT_PERIOD).map(a => a.employeeId);
    const selfDone = evaluations.some(e => e.evaluatedId === currentUser.id && e.type === 'self' && e.period === CURRENT_PERIOD);
    let count = selfDone ? 0 : 1;
    myEvaluados.forEach(eid => {
      const hasSupervisorEval = evaluations.some(e => e.evaluatedId === eid && e.type === 'supervisor' && e.period === CURRENT_PERIOD);
      if (!hasSupervisorEval) count++;
    });
    return count;
  })();

  const unreadAnnouncementCount = (() => {
    if (!modules.communications) return 0;
    return announcements.filter(a => {
      if (a.archived) return false;
      if (a.readBy.includes(currentUser.id)) return false;
      if (a.audience === 'all') return true;
      if (a.audience === myLevel) return true;
      if (isAdminOrSuper || isManagingPartner || isSocio) return true;
      return false;
    }).length;
  })();

  const pendingVacationCount = (() => {
    if (!modules.vacations) return 0;
    const myEvaluados = assignments.filter(a => a.supervisorId === currentUser.id && a.period === CURRENT_PERIOD).map(a => a.employeeId);
    return vacationRequests.filter(r => {
      if (r.status !== 'pending') return false;
      if (isAdmin || isSuperUser || isManagingPartner) return true;
      return myEvaluados.includes(r.userId);
    }).length;
  })();

  const showEvalModule = modules.evaluations || isSuperUser;
  const showCommModule = modules.communications || isSuperUser;
  const showVacModule = modules.vacations || isSuperUser;

  const evalItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Panel', show: true },
    { to: '/my-profile', icon: UserIcon, label: 'Mis Eval.', show: true },
    { to: `/users/${currentUser.id}/timeline`, icon: Clock, label: 'Mi Historial', show: true },
    { to: '/self-evaluation', icon: ClipboardCheck, label: 'Mi Eval.', show: true, badge: pendingEvalCount > 0 ? 1 : 0 },
    { to: '/my-action-plan', icon: FileText, label: 'Plan Acción', show: true },
    { to: '/evaluations', icon: ClipboardList, label: 'Evaluar', show: hasTeam || isAdminOrSuper || isManagingPartner, badge: pendingEvalCount > 1 ? pendingEvalCount - (evaluations.some(e => e.evaluatedId === currentUser.id && e.type === 'self' && e.period === CURRENT_PERIOD) ? 0 : 0) : 0 },
  ];

  const userGroupItems = [
    { to: '/users', icon: Users, label: 'Usuarios', show: isAdminOrSuper },
    { to: '/positions', icon: Briefcase, label: 'Áreas y Puestos', show: isAdminOrSuper },
  ];

  const otherItems = [
    { to: '/reports', icon: BarChart3, label: 'Reportes', show: isAdminOrSuper || isManagingPartner },
    { to: '/orgchart', icon: Map, label: 'Organigrama', show: isAdminOrSuper || isManagingPartner || isSocio },
    { to: '/assign', icon: UserCheck, label: 'Asignar', show: isAdminOrSuper },
    { to: '/evaluation-templates', icon: BookOpen, label: 'Plantillas', show: isAdminOrSuper },
    { to: '/question-library', icon: BookOpen, label: 'Preguntas', show: isAdminOrSuper },
    { to: '/personal-objectives', icon: Target, label: 'Objetivos', show: showEvalModule && (isAdminOrSuper || isManagingPartner || isSocio || hasTeam) },
    { to: '/communications', icon: Megaphone, label: 'Comunicación', show: showCommModule, badge: unreadAnnouncementCount },
    { to: '/vacations', icon: Palmtree, label: 'Vacaciones', show: showVacModule, badge: pendingVacationCount },
    { to: '/period-config', icon: Calendar, label: 'Periodos', show: isAdminOrSuper },
    { to: '/access', icon: Shield, label: 'Acceso Sistema', show: isSuperUser },
    { to: '/copilot', icon: Bot, label: 'Copilot', show: modules.copilot && isSuperUser },
    { to: '/settings', icon: Settings, label: 'Perfil', show: true },
  ];

  const renderNavItem = (item: { to: string; icon: React.ElementType; label: string; badge?: number }) => {
    const isActive = location.pathname === item.to;
    return (
      <NavLink to={item.to} className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.badge && item.badge > 0 && <Badge count={item.badge} />}
      </NavLink>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-primary text-primary-foreground flex items-center px-4">
        <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-md hover:bg-sidebar-accent transition-colors mr-3 md:block">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
            <span className="text-accent-foreground text-[10px] font-bold font-display leading-none">SM</span>
          </div>
          <span className="font-display font-semibold text-sm hidden sm:block">SMPS Performance</span>
          {isSuperUser && <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-semibold">SUPERUSER</span>}
          {!isSuperUser && isManagingPartner && <span className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full">SOCIO ADM</span>}
          {!isSuperUser && !isManagingPartner && isAdmin && <span className="text-[10px] bg-yellow-400/10 text-yellow-600 px-1.5 py-0.5 rounded-full">ADMIN</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-primary-foreground/60 text-xs hidden lg:block">{currentUser.name}</span>
          <a href="/help" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-primary-foreground/60 hover:text-primary-foreground hover:bg-sidebar-accent/50 transition-colors" title="Centro de ayuda">
            <HelpCircle className="h-4 w-4" />
          </a>
          <button onClick={() => { logout(); navigate('/login'); }} className="p-1.5 rounded-md text-primary-foreground/60 hover:text-primary-foreground hover:bg-sidebar-accent/50 transition-colors" title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-14 min-h-0 overflow-hidden">
        <aside className={`${collapsed ? 'w-14' : 'w-52'} bg-sidebar border-r border-sidebar-border transition-all duration-200 flex-shrink-0 hidden md:flex flex-col sticky top-14 self-stretch`}>
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
            {/* Usuarios Group */}
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

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex justify-around px-1 py-0.5">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
            { to: '/self-evaluation', icon: ClipboardCheck, label: 'Evaluar' },
            { to: '/communications', icon: Megaphone, label: 'Avisos' },
            { to: '/vacations', icon: Palmtree, label: 'Vacaciones' },
            { to: '/settings', icon: Settings, label: 'Más' },
          ].map(item => (
            <NavLink key={item.to} to={item.to} className="flex flex-col items-center py-1 px-2 text-sidebar-foreground/50 transition-colors" activeClassName="text-sidebar-primary">
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {location.pathname === '/copilot' ? (
          <div
            className="flex-1 min-h-0 smps-fade-in transition-all duration-200"
          >
            <Outlet />
          </div>
        ) : location.pathname.includes('/timeline') ? (
          <main className={`flex-1 min-h-0 overflow-hidden pb-16 md:pb-0 transition-all duration-200`}>
            <Outlet />
          </main>
        ) : (
          <main className={`flex-1 min-h-0 overflow-auto pb-16 md:pb-0 transition-all duration-200`}>
            <div className="p-4 md:p-5 max-w-6xl mx-auto smps-fade-in">
              <PeriodEndAlert />
              <Outlet />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
