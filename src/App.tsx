import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import SelfEvaluation from "./pages/SelfEvaluation";
import Evaluations from "./pages/Evaluations";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import AssignSupervisors from "./pages/AssignSupervisors";
import SettingsPage from "./pages/Settings";
import OrgChart from "./pages/OrgChart";
import AccessControl from "./pages/AccessControl";
import EvaluationTemplates from "./pages/EvaluationTemplates";
import PersonalObjectivesPage from "./pages/PersonalObjectives";
import Communications from "./pages/Communications";
import Vacations from "./pages/Vacations";
import PeriodConfig from "./pages/PeriodConfig";
import Help from "./pages/Help";
import QuestionLibrary from "./pages/QuestionLibrary";
import MyActionPlan from "./pages/MyActionPlan";
import MyProfile from "./pages/MyProfile";
import CopilotChat from "./pages/CopilotChat";
import PositionManagement from "./pages/PositionManagement";
import NotFound from "./pages/NotFound";
import SetupPage from "./pages/Setup";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";

import { Component, ReactNode } from 'react';

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
    return <SetupPage />;
  }

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="self-evaluation" element={<SelfEvaluation />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="reports" element={<Reports />} />
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
