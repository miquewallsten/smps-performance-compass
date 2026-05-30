import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, Component, ReactNode } from "react";
import { Loader2 } from "lucide-react";

// ── Code-split all page routes ──────────────────────────────────────────
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SelfEvaluation = lazy(() => import("./pages/SelfEvaluation"));
const Evaluations = lazy(() => import("./pages/Evaluations"));
const Reports = lazy(() => import("./pages/Reports"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AssignSupervisors = lazy(() => import("./pages/AssignSupervisors"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const OrgChart = lazy(() => import("./pages/OrgChart"));
const AccessControl = lazy(() => import("./pages/AccessControl"));
const EvaluationTemplates = lazy(() => import("./pages/EvaluationTemplates"));
const PersonalObjectivesPage = lazy(() => import("./pages/PersonalObjectives"));
const Communications = lazy(() => import("./pages/Communications"));
const Vacations = lazy(() => import("./pages/Vacations"));
const PeriodConfig = lazy(() => import("./pages/PeriodConfig"));
const Help = lazy(() => import("./pages/Help"));
const QuestionLibrary = lazy(() => import("./pages/QuestionLibrary"));
const MyActionPlan = lazy(() => import("./pages/MyActionPlan"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const UserTimeline = lazy(() => import("./pages/UserTimeline"));
const CopilotChat = lazy(() => import("./pages/CopilotChat"));
const PositionManagement = lazy(() => import("./pages/PositionManagement"));
const ScoreAnalysis = lazy(() => import("./pages/ScoreAnalysis"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SetupPage = lazy(() => import("./pages/Setup"));
const Login = lazy(() => import("./pages/Login"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

import Layout from "./components/Layout";

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="bg-card rounded-xl border p-8 max-w-lg text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Algo salió mal</h1>
            <p className="text-sm text-muted-foreground mb-4">Ocurrió un error al renderizar esta página.</p>
            <pre className="text-xs bg-muted p-4 rounded-lg text-left overflow-auto max-h-60 mb-4">{this.state.error?.message}</pre>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/login'; }}
              className="px-6 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90">
              Volver al Inicio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  const { user, loading, systemInitialized, moduleConfig, isSuperUser } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (systemInitialized === false) {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>}>
        <SetupPage />
      </React.Suspense>
    );
  }

  if (!user) {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>}>
        <Login />
      </React.Suspense>
    );
  }

  if (user.mustChangePassword) {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>}>
        <ChangePassword />
      </React.Suspense>
    );
  }

  // NOTE: No Suspense wrapper here! The Layout component handles Suspense
  // for lazy pages internally so sidebar/header never unmount on navigation.
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="self-evaluation" element={<SelfEvaluation />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="score-analysis" element={<ScoreAnalysis />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="positions" element={<PositionManagement />} />
        <Route path="assign" element={<AssignSupervisors />} />
        <Route path="orgchart" element={<OrgChart />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="evaluation-templates" element={<EvaluationTemplates />} />
        <Route path="personal-objectives" element={<PersonalObjectivesPage />} />
        <Route path="communications" element={<Communications />} />
        <Route path="vacations" element={<Vacations />} />
        <Route path="access" element={isSuperUser ? <AccessControl /> : <Navigate to="/dashboard" replace />} />
        <Route path="period-config" element={<PeriodConfig />} />
        <Route path="question-library" element={<QuestionLibrary />} />
        <Route path="my-action-plan" element={<MyActionPlan />} />
        <Route path="my-profile" element={<MyProfile />} />
        <Route path="users/:id/timeline" element={<UserTimeline />} />
        <Route path="copilot" element={moduleConfig?.copilot && isSuperUser ? <CopilotChat /> : <Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="/help" element={<Help />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <BrowserRouter>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </ErrorBoundary>
  </BrowserRouter>
);

export default App;
