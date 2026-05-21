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

export default function Layout() {
  const { user: currentUser, logout } = useAuth();
  const { data: assignments = [] } = useAssignments(CURRENT_PERIOD);
  const { data: systemStatus } = useSystemStatus();
  const { data: evaluations = [] } = useEvaluations({ period: CURRENT_PERIOD });
  const { data: announcements = [] } = useAnnouncements();
  const { data: vacationRequests = [] } = useVacationRequests();
  const { data: moduleConfig } = useSystemModules();
  const modules = moduleConfig || { evaluations: true, communications: true, vacations: true };
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [evalGroupOpen, setEvalGroupOpen] = useState(true);

  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  if (systemStatus?.status === 'inactive' && !currentUser.isSuperUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-card rounded-xl border p-8 max-w-md text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold mb-2">Sistema Inactivo</h1>
          <p className="text-sm text-muted-foreground mb-4">El acceso al sistema se encuentra temporalmente suspendido. Contacte al administrador para más información.</p>
          <button onClick={() => { logout(); navigate('/login'); }} className="px-6 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Cerrar Sesión
          </button>
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

  // Pending counts for badges
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
      if (isAdminOrSuper || isSocio) return true;
      return false;
    }).length;
  })();

  const pendingVacationCount = (() => {
    if (!modules.vacations) return 0;
    const myEvaluados = assignments.filter(a => a.supervisorId === currentUser.id && a.period === CURRENT_PERIOD).map(a => a.employeeId);
    return vacationRequests.filter(r => {
      if (r.status !== 'pending') return false;
      if (isAdmin || isSuperUser) return true;
      return myEvaluados.includes(r.userId);
    }).length;
  })();

  const showEvalModule = modules.evaluations || isSuperUser;
  const showCommModule = modules.communications || isSuperUser;
  const showVacModule = modules.vacations || isSuperUser;

  // Evaluation group items
  const evalItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Panel Principal', show: true },
    { to: '/my-profile', icon: UserIcon, label: 'Mis Evaluaciones', show: true },
    { to: '/self-evaluation', icon: ClipboardCheck, label: 'Mi Evaluación', show: true },
    { to: '/my-action-plan', icon: FileText, label: 'Mi Plan de Acción', show: true },
    { to: '/evaluations', icon: ClipboardList, label: 'Evaluar Equipo', show: hasTeam || isAdminOrSuper || isSocio },
    { to: '/evaluation-templates', icon: FileText, label: 'Evaluaciones', show: isAdminOrSuper || isSocio },
    { to: '/question-library', icon: BookOpen, label: 'Biblioteca Preguntas', show: isAdminOrSuper },
    { to: '/personal-objectives', icon: Target, label: 'Objetivos Personales', show: isAdminOrSuper || isSocio },
    { to: '/period-config', icon: Calendar, label: 'Config. Periodos', show: isAdminOrSuper },
    { to: '/orgchart', icon: Map, label: 'Mapa de Evaluaciones', show: isAdminOrSuper || isSocio },
    { to: '/reports', icon: BarChart3, label: 'Reportes', show: true },
    { to: '/users', icon: Users, label: 'Gestión Usuarios', show: isAdminOrSuper },
    { to: '/assign', icon: UserCheck, label: 'Asignar Evaluadores', show: isAdminOrSuper },
  ].filter(i => i.show);

  const otherItems = [
    { to: '/communications', icon: Megaphone, label: 'Comunicación', show: showCommModule, badge: unreadAnnouncementCount },
    { to: '/vacations', icon: Palmtree, label: 'Vacaciones', show: showVacModule, badge: pendingVacationCount },
    { to: '/settings', icon: Settings, label: 'Mi Perfil', show: true, badge: 0 },
    { to: '/access', icon: Shield, label: 'Acceso', show: !!isSuperUser, badge: 0 },
    { to: '/copilot', icon: Bot, label: 'Copiloto IA', show: !!isAdminOrSuper, badge: 0 },
  ].filter(i => i.show);

  const Badge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
        {count}
      </span>
    );
  };

  const renderNavItem = (item: { to: string; icon: any; label: string; badge?: number }) => (
    <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && <Badge count={item.badge} />}
        </>
      )}
      {collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
          {item.badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 smps-gradient-header border-b border-sidebar-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent transition-colors mr-3">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-accent flex items-center justify-center">
              <span className="text-accent-foreground text-xs font-bold font-display">SM</span>
            </div>
            <div>
              <span className="text-primary-foreground font-display font-semibold text-sm">SMPS Performance</span>
              {isSuperUser && <span className="ml-2 text-[10px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-semibold">SUPERUSER</span>}{!isSuperUser && isAdmin && <span className="ml-2 text-[10px] bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded-full">ADMIN</span>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-primary-foreground/70 text-sm hidden sm:block">{currentUser.name}</span>
            <a href="/help" target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent transition-colors" title="Centro de ayuda">
              <HelpCircle className="h-4 w-4" />
            </a>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-sidebar-accent transition-colors" title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0 hidden md:flex flex-col fixed top-14 left-0 bottom-0 z-40`}>
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {/* Evaluación Group */}
            {showEvalModule && (
              <>
                {!collapsed && (
                  <button
                    onClick={() => setEvalGroupOpen(!evalGroupOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold w-full hover:text-sidebar-foreground/60 transition-colors"
                  >
                    <span>Evaluación</span>
                    {pendingEvalCount > 0 && <Badge count={pendingEvalCount} />}
                    <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${evalGroupOpen ? '' : '-rotate-90'}`} />
                  </button>
                )}
                {(evalGroupOpen || collapsed) && evalItems.map(item => (
                  <div key={item.to} className="relative">
                    {renderNavItem(item)}
                  </div>
                ))}
                {!collapsed && <div className="border-b border-sidebar-border my-2" />}
              </>
            )}

            {/* Other items */}
            {otherItems.map(item => (
              <div key={item.to} className="relative">
                {renderNavItem(item)}
              </div>
            ))}
          </nav>
          <div className="p-2 border-t border-sidebar-border">
            <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center py-2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            {!collapsed && <p className="text-[10px] text-sidebar-foreground/30 text-center mt-1">Powered by Bowdot</p>}
          </div>
        </aside>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border px-2 py-1 flex justify-around">
          {[
            { to: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
            { to: '/self-evaluation', icon: ClipboardCheck, label: 'Evaluar' },
            { to: '/communications', icon: Megaphone, label: 'Comunic.' },
            { to: '/vacations', icon: Palmtree, label: 'Vacaciones' },
            { to: '/settings', icon: Settings, label: 'Perfil' },
          ].map(item => (
            <NavLink key={item.to} to={item.to} className="flex flex-col items-center py-1.5 px-2 text-sidebar-foreground/60 text-[10px]" activeClassName="text-sidebar-primary">
              <item.icon className="h-5 w-5 mb-0.5" />
              <span className="truncate max-w-[60px]">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <main className={`flex-1 overflow-auto pb-20 md:pb-0 ${collapsed ? 'md:ml-16' : 'md:ml-60'} transition-all duration-300`}>
          <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
            <PeriodEndAlert />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
