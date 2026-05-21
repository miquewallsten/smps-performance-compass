import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import Login from "./pages/Login";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="self-evaluation" element={<SelfEvaluation />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="assign" element={<AssignSupervisors />} />
              <Route path="orgchart" element={<OrgChart />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="evaluation-templates" element={<EvaluationTemplates />} />
              <Route path="personal-objectives" element={<PersonalObjectivesPage />} />
              <Route path="communications" element={<Communications />} />
              <Route path="vacations" element={<Vacations />} />
              <Route path="access" element={<AccessControl />} />
              <Route path="period-config" element={<PeriodConfig />} />
              <Route path="question-library" element={<QuestionLibrary />} />
              <Route path="my-action-plan" element={<MyActionPlan />} />
              <Route path="my-profile" element={<MyProfile />} />
            </Route>
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
