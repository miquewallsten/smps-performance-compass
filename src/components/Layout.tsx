import { useAuth } from '@/contexts/AuthContext';
import { useAssignments, useEvaluations, useAnnouncements, useVacationRequests, useSystemStatus, useSystemModules } from '@/api/queries';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardCheck, Users, BarChart3, Settings, LogOut,
  UserCheck, ClipboardList, ChevronLeft, ChevronRight, Menu, Map, Shield, FileText, Target, Bot,
  Megaphone, Palmtree, ChevronDown, HelpCircle, BookOpen, Calendar, User as UserIcon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import PeriodEndAlert from '@/components/PeriodEndAlert';
import { CURRENT_PERIOD, POSITION_LEVELS } from '@/types';

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold leading-none px-1">{count}</span>;
}

export default function Layout() {
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

  useEffect(() => { if (!currentUser) navigate('/login'); }, [currentUser, navigate]);
  if (!currentUser) return null;

  if (systemStatus?.status === 'inactive' && !currentUser.isSuperUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="smps-surface-elevated max-w-sm text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold mb-2">Sistema Inactivo</h1>
          <p className="text-sm text-muted-foreground mb-4">El acceso al sistema se encuentra temporalmente suspendido. Contacte al administrador para más información.</p>
          <button onClick={() => { logout(); navigate('/login'); }} className="smps-btn px-5 py-2 bg-accent text-accent-foreground text-sm hover:opacity-90">Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.isAdmin;
  const isSuperUser = currentUser.isSuperUser;
  const isSocio = currentUser.position === 'socio';
  const isAdminOrSuper = isAdmin || isSuperUser;
  const hasTeam = assignments.some(a => a.supervisorId === currentUser.id && a.period === CURRENT_PERIOD);
  const myLevel = POSITION_LEVELS[currentUser.position];

  const pendingEvalCount = (() => {
    if (!modules.evaluations) return 0;
    const myEvaluados = assignments.filter(a => a.supervisorId === currentUser.id && a.period === CURRENT_PERIOD).map(a => a.employeeId);
    const selfDone = evaluations.some(e => e.evaluatedId === currentUser.id && e.type === 'self' && e.period === CURRENT_PERIOD);
    let count = selfDone ? 0 : 1;
    myEvaluados.forEach(eid => { const has = evaluations.some(e => e.evaluatedId === eid && e.type === 'supervisor' && e.period === CURRENT_PERIOD); if (!has) count++; });
    return count;
  })();

  const unreadAnnouncementCount = (() => {
    if (!modules.communications) return 0;
    return announcements.filter(a => { if (a.archived) return false; if (a.readBy.includes(currentUser.id)) return false; if (a.audience === 'all') return true; if (a.audience === myLevel) return true; if (isAdminOrSuper || isSocio) return true; return false; }).length;
  })();

  const pendingVacationCount = (() => {
    if (!modules.vacations) return 0;
    const myEvaluados = assignments.filter(a => a.supervisorId === currentUser.id && a.period === CURRENT_PERIOD).map(a => a.employeeId);
    return vacationRequests.filter(r => { if (r.status !== 'pending') return false; if (isAdmin || isSuperUser) return true; return myEvaluados.includes(r.userId); }).length;
  })();

  const showEvalModule = modules.evaluations || isSuperUser;
  const showCommModule = modules.communications || isSuperUser;
  const showVacModule = modules.vacations || isSuperUser;

  const evalItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Panel', show: true },
    { to: '/my-profile', icon: UserIcon, label: 'Mis Eval.', show: true },
    { to: '/self-evaluation', icon: ClipboardCheck, label: 'Mi Eval.', show: true },
    { to: '/my-action-plan', icon: FileText, label: 'Plan Acción', show: true },
    { to: '/personal-objectives', icon: Target, label: 'Objetivos', show: true },
    { to: '/evaluations', icon: UserCheck, label: 'Evaluar Equipo', show: hasTeam, badge: pendingEvalCount },
    { to: '/org-chart', icon: Map, label: 'Organigrama', show: true },
  ];

  const otherItems = [
    ...(showCommModule ? [{ to: '/communications', icon: Megaphone, label: 'Comunicados', show: true, badge: unreadAnnouncementCount }] : []),
    ...(showVacModule ? [{ to: '/vacations', icon: Palmtree, label: 'Vacaciones', show: true, badge: pendingVacationCount }] : []),
    { to: '/reports', icon: BarChart3, label: 'Reportes', show: isAdminOrSuper },
    { to: '/period-config', icon: Calendar, label: 'Config Periodo', show: isAdminOrSuper },
    { to: '/evaluation-templates', icon: ClipboardList, label: 'Plantillas', show: isSuperUser },
    { to: '/question-library', icon: BookOpen, label: 'Preguntas', show: isSuperUser },
    { to: '/user-management', icon: Users, label: 'Usuarios', show: isAdminOrSuper },
    { to: '/assign-supervisors', icon: UserCheck, label: 'Asignar Sups', show: isAdminOrSuper },
    { to: '/access-control', icon: Shield, label: 'Accesos', show: isSuperUser },
    ...(modules.copilot ? [{ to: '/copilot', icon: Bot, label: 'Copiloto IA', show: isAdminOrSuper }] : []),
    { to: '/setup', icon: Settings, label: 'Configuración', show: isSuperUser },
    { to: '/settings', icon: Settings, label: 'Ajustes', show: true },
  ];

  const renderNavItem = (item: typeof evalItems[0]) => {
    if (!item.show) return null;
    const isActive = location.pathname === item.to;
    return (
      <NavLink to={item.to} className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-[color,background-color] duration-150 ${isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && <Badge count={item.badge} />}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-primary text-primary-foreground flex items-center px-4">
        <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-md hover:bg-sidebar-accent transition-[background-color] duration-150 mr-3 md:block active:scale-95">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
            <span className="text-accent-foreground text-[10px] font-bold font-display leading-none">SM</span>
          </div>
          <span className="font-display font-semibold text-sm hidden sm:block">SMPS Performance</span>
          {isSuperUser && <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-semibold">SUPERUSER</span>}
          {!isSuperUser && isAdmin && <span className="text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full">ADMIN</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-primary-foreground/60 text-xs hidden lg:block">{currentUser.name}</span>
          <a href="/help" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md text-primary-foreground/60 hover:text-primary-foreground hover:bg-sidebar-accent/50 transition-[color,background-color] duration-150 active:scale-95" title="Centro de ayuda">
            <HelpCircle className="h-4 w-4" />
          </a>
          <button onClick={() => { logout(); navigate('/login'); }} className="p-1.5 rounded-md text-primary-foreground/60 hover:text-primary-foreground hover:bg-sidebar-accent/50 transition-[color,background-color] duration-150 active:scale-95" title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Emil: specific transition-[width] not transition-all */}
        <aside className={`${collapsed ? 'w-14' : 'w-52'} bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ease-out flex-shrink-0 hidden md:flex flex-col fixed top-14 left-0 bottom-0 z-40`}>
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {showEvalModule && (
              <>
                {!collapsed && (
                  <button onClick={() => setEvalGroupOpen(!evalGroupOpen)} className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold w-full hover:text-sidebar-foreground/60 transition-[color] duration-150">
                    <span>Evaluación</span>
                    {pendingEvalCount > 0 && <Badge count={pendingEvalCount} />}
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform duration-150 ease-out ${evalGroupOpen ? '' : '-rotate-90'}`} />
                  </button>
                )}
                {(evalGroupOpen || collapsed) && evalItems.map((item, i) => <div key={item.to} className={`smps-fade-up smps-delay-${Math.min(i + 1, 8)}`}>{renderNavItem(item)}</div>)}
                {!collapsed && <div className="border-b border-sidebar-border my-1.5" />}
              </>
            )}
            {otherItems.map((item, i) => <div key={item.to} className={`smps-fade-up smps-delay-${Math.min(i + 1, 8)}`}>{renderNavItem(item)}</div>)}
          </nav>
          <div className="p-2 border-t border-sidebar-border">
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center py-1.5 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-[color] duration-150 active:scale-95">
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
            <NavLink key={item.to} to={item.to} className="flex flex-col items-center py-1 px-2 text-sidebar-foreground/50 transition-[color] duration-150" activeClassName="text-sidebar-primary">
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <main className={`flex-1 overflow-auto pb-16 md:pb-0 ${collapsed ? 'md:ml-14' : 'md:ml-52'} transition-[margin] duration-200 ease-out`}>
          <div className="p-4 md:p-5 max-w-6xl mx-auto smps-fade-in">
            <PeriodEndAlert />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
