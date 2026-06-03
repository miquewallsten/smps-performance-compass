import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useCreateEvaluation, useUpdateEvaluation, useCompleteFeedback, useApproveNA, useActionPlans, useCreateActionPlan, useExportEvaluationsCSV , usePeriods } from '@/api/queries';
import { calculateScore, getSectionForQuestion, SECTION_LABELS, SECTION_ORDER } from '@/lib/evaluationConfig';

import { User, EvalQuestion, ActionPlan } from '@/types';
import { getSectionWeights, getPositionLabel, getScoreLabels, getLegalHierarchy, getAdminHierarchy } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { useDisplayPeriod } from '@/hooks/useDisplayPeriod';
import { useFullTemplate, usePositionConfig, useTemplateQuestions } from '@/hooks/useEvaluationConfig';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Eye, ArrowLeft, Ban, ShieldCheck, ShieldX, FileText, MessageSquare, MinusCircle, ClipboardCheck } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import EvaluationViewer from '@/components/EvaluationViewer';
import HierarchyFilters, { filterByHierarchy } from '@/components/HierarchyFilters';
import { canViewUserEvaluations } from '@/lib/visibility';

// Helper to normalize naApprovals from API array format to Record<string, boolean>
function normalizeNA(naApprovals: any): Record<string, boolean> {
  if (!naApprovals) return {};
  if (Array.isArray(naApprovals)) {
    const result: Record<string, boolean> = {};
    for (const item of naApprovals as any[]) {
      if (item && item.questionId) {
        result[item.questionId] = !!item.approved;
      }
    }
    return result;
  }
  return naApprovals as Record<string, boolean>;
}

export default function Evaluations() {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations();
  const { data: assignments = [] } = useAssignments();
  const createEvaluationMut = useCreateEvaluation();
  const addEvaluation = createEvaluationMut.mutate;
  const updateEvaluation = useUpdateEvaluation().mutate;
  const completeFeedback = useCompleteFeedback().mutate;
  const approveNA = useApproveNA().mutate;
  const { data: actionPlans = [] } = useActionPlans();
  const addOrUpdateActionPlan = useCreateActionPlan().mutate;
  const { data: allTemplateQuestions = [] } = useTemplateQuestions();
  const customQuestions = useMemo(() => {
    const grouped: Record<string, EvalQuestion[]> = {};
    for (const q of allTemplateQuestions) {
      const pos = q.position;
      if (pos) { if (!grouped[pos]) grouped[pos] = []; grouped[pos].push({ id: q.questionId || q.question_id || q.id, category: q.category, text: q.questionText || q.text || q.question_text, weight: q.weight, section: q.section, practiceArea: q.practiceArea || q.practice_area }); }
    }
    return grouped;
  }, [allTemplateQuestions]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(searchParams.get('evaluate'));
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [naQuestions, setNaQuestions] = useState<Record<string, boolean>>({});
  const [noElementsQuestions, setNoElementsQuestions] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState('');
  const [supervisorComments, setSupervisorComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [viewingEval, setViewingEval] = useState<string | null>(null);
  const currentPeriod = useCurrentPeriod();
  const displayPeriod = useDisplayPeriod();
  const { data: periodsData = [] } = usePeriods();
  const periods = periodsData.map((p: any) => p.period).sort();
  const [viewPeriod, setViewPeriod] = useState(displayPeriod);
  const [actionPlanEmployee, setActionPlanEmployee] = useState<string | null>(null);
  const [actionPlanContent, setActionPlanContent] = useState('');

  const exportEvaluationsCSV = useExportEvaluationsCSV().mutate;
  const handleExportCSV = () => {
    exportEvaluationsCSV({ period: viewPeriod }, {
      onSuccess: () => toast.success(`Evaluaciones ${viewPeriod} exportadas`),
      onError: () => toast.error("Error al exportar evaluaciones"),
    });
  };

  // History filters
  const [histLevelFilter, setHistLevelFilter] = useState('all');
  const [histPosFilter, setHistPosFilter] = useState('all');

  if (!currentUser) return null;

  const isAdmin = currentUser.isAdmin;
  const isSocio = currentUser.position === 'socio';
  const isSuperUser = currentUser.isSuperUser;
  const isAdminOrSocio = isAdmin || isSocio || !!currentUser.isManagingPartner;
  const canViewAllDetails = isAdmin || isSocio || isSuperUser || !!currentUser.isManagingPartner;
  const isSupervisor = (employeeId: string) => assignments.some(a => a.supervisorId === currentUser.id && a.employeeId === employeeId);

  const myAssignments = assignments.filter(a => a.supervisorId === currentUser.id && a.period === currentPeriod);
  const myCompletedEvals = evaluations.filter(e => e.type === 'supervisor' && e.evaluatorId === currentUser.id && e.period === currentPeriod);

  const sortByName = (a: User, b: User) => a.name.localeCompare(b.name, 'es');

  const pendingEmployees = myAssignments
    .filter(a => !myCompletedEvals.find(e => e.evaluatedId === a.employeeId))
    .map(a => users.find(u => u.id === a.employeeId))
    .filter(Boolean) as User[];
  pendingEmployees.sort(sortByName);

  const completedEmployees = myCompletedEvals
    .map(e => ({ user: users.find(u => u.id === e.evaluatedId)!, eval: e }))
    .filter(e => e.user);
  completedEmployees.sort((a, b) => a.user.name.localeCompare(b.user.name, 'es'));

  // All roles can see evaluations they're involved in: their own + their team's
  // Admin/socio/superuser see all (filtered by visibility rules)
  // Supervisors see their team + their own
  // Regular employees see their own evaluations
  const viewableUsers = (isAdminOrSocio
    ? (Array.isArray(users) ? users : []).filter(u => u.isActive && !u.isSuperUser).filter(u => canViewUserEvaluations(currentUser as any, u))
    : (Array.isArray(users) ? users : []).filter(u =>
        u.isActive && !u.isSuperUser && !u.isDummy && (
          u.id === currentUser.id ||  // own evaluations
          myAssignments.some(a => a.employeeId === u.id)  // team members
        )
      )
  ).sort(sortByName);

  const viewableEvals = evaluations.filter(e =>
    e.period === viewPeriod && viewableUsers.some(u => u.id === e.evaluatedId)
  );

  // Apply history filters
  const filteredViewableEvals = viewableEvals.filter(ev => {
    const evaluated = users.find(u => u.id === ev.evaluatedId);
    return evaluated ? filterByHierarchy([evaluated], histLevelFilter, histPosFilter).length > 0 : false;
  });

  const evalToView = viewingEval ? evaluations.find(e => e.id === viewingEval) : null;

  const handleSaveActionPlan = () => {
    if (!actionPlanEmployee || !actionPlanContent.trim()) return;
    const existing = actionPlans.find(p => p.employeeId === actionPlanEmployee && p.period === currentPeriod && p.supervisorId === currentUser.id);
    const now = new Date().toISOString().split('T')[0];
    addOrUpdateActionPlan({
      id: existing?.id || `ap-${Date.now()}`,
      employeeId: actionPlanEmployee,
      supervisorId: currentUser.id,
      period: currentPeriod,
      content: actionPlanContent,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    setActionPlanEmployee(null);
    setActionPlanContent('');
  };

  const handleMarkFeedback = (evalId: string) => {
    // Use the dedicated feedback endpoint instead of the general update
    completeFeedback(evalId);
  };

  if (selectedEmployee && !submitted) {
    const emp = users.find(u => u.id === selectedEmployee);
    if (!emp) {
      return (
        <div>
          <button onClick={() => { setSelectedEmployee(null); setResponses({}); setNaQuestions({}); setNoElementsQuestions({}); setComments(''); setSupervisorComments(''); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Volver a la lista
          </button>
          <div className="text-center py-8 text-muted-foreground">
            <p>No se encontró la información del evaluado. Intente recargar la página.</p>
          </div>
        </div>
      );
    }
    const empPos = emp.position;
    const empQuestions = customQuestions[empPos] || [];
    const sectionWeightsMap = getSectionWeights(empPos);
    const questions = (() => {
      const empPracticeArea = emp.practiceArea || 'corporativo';
      const tecnicas = empQuestions.filter(q => q.section === 'tecnico' && (!q.practiceArea || q.practiceArea === empPracticeArea || q.practiceArea === 'general'));
      // Fallback: if no tecnico questions match the practice area, use corporativo
      const tecnicasForArea = tecnicas.length > 0 ? tecnicas : empQuestions.filter(q => q.section === 'tecnico' && (!q.practiceArea || q.practiceArea === 'corporativo'));
      const competencias = empQuestions.filter(q => q.section === 'competencias');
      const blandas = empQuestions.filter(q => q.section === 'blandas');
      const rescale = (qs: EvalQuestion[], target: number) => {
        if (qs.length === 0 || target <= 0) return [];
        const sum = qs.reduce((s, q) => s + (q.weight || 1), 0) || qs.length;
        return qs.map(q => ({ ...q, weight: Math.round(((q.weight || 1) / sum) * target * 100) / 100 }));
      };
      return [
        ...rescale(tecnicasForArea, sectionWeightsMap.tecnico),
        ...rescale(competencias, sectionWeightsMap.competencias),
        ...rescale(blandas, sectionWeightsMap.blandas),
      ];
    })();

    const totalResponded = Object.keys(responses).length + Object.keys(naQuestions).length + Object.keys(noElementsQuestions).length;
    const allAnswered = totalResponded === questions.length;
    const wordCount = comments.trim().split(/\s+/).filter(Boolean).length;
    const commentsValid = comments.trim().length > 0;
    const canSubmit = allAnswered && commentsValid && wordCount <= 300;
    const sectioned = questions.map(q => ({ q, section: getSectionForQuestion(q.category, emp.position) }));
    const sectionsPresent = SECTION_ORDER.filter(s => sectioned.some(x => x.section === s));

    const clearQuestion = (questionId: string) => {
      const newR = { ...responses }; delete newR[questionId];
      const newNA = { ...naQuestions }; delete newNA[questionId];
      const newNE = { ...noElementsQuestions }; delete newNE[questionId];
      setResponses(newR);
      setNaQuestions(newNA);
      setNoElementsQuestions(newNE);
    };

    const handleSubmit = () => {
      if (!canSubmit) return;
      const evalResponses = [
        ...Object.entries(responses).map(([questionId, score]) => ({ questionId, score, notApplicable: false, noElements: false, weight: questions.find(q => q.id === questionId)?.weight || 1 })),
        ...Object.keys(naQuestions).map(questionId => ({ questionId, score: 0, notApplicable: true, noElements: false, weight: questions.find(q => q.id === questionId)?.weight || 1 })),
        ...Object.keys(noElementsQuestions).map(questionId => ({ questionId, score: 0, notApplicable: false, noElements: true, weight: questions.find(q => q.id === questionId)?.weight || 1 })),
      ];
      const totalScore = calculateScore(questions, evalResponses);
      createEvaluationMut.mutate(
        {
          id: `eval-${Date.now()}`,
          evaluatorId: currentUser.id,
          evaluatedId: selectedEmployee,
          period: currentPeriod,
          type: 'supervisor',
          responses: evalResponses,
          comments,
          supervisorComments: (isSocio || isSupervisor(selectedEmployee)) ? supervisorComments : undefined,
          completedAt: new Date().toISOString().split('T')[0],
          totalScore,
        },
        {
          onSuccess: () => {
            setSubmitted(true);
            setShowConfirm(false);
            toast.success('Evaluación guardada correctamente');
          },
          onError: (err: Error) => {
            const msg = err.message || '';
            if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('ER_DUP_ENTRY')) {
              toast.error('Ya existe una evaluación para este empleado y periodo. Recargue la página.');
            } else {
              toast.error('Error al guardar la evaluación: ' + (msg || 'Intente de nuevo'));
            }
          },
        }
      );
    };

    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setSelectedEmployee(null); setResponses({}); setNaQuestions({}); setNoElementsQuestions({}); setComments(''); setSupervisorComments(''); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver a la lista
        </button>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Evaluación de {emp.name} <span className="text-lg font-normal text-muted-foreground">— {getPositionLabel(emp.position)}</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Periodo {currentPeriod}</p>
        </div>

        <div className="smps-surface-card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso: {totalResponded}/{questions.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round((totalResponded / questions.length) * 100)}%</span>
          </div>
          <div className="smps-progress-bar"><div className="fill" style={{ width: `${(totalResponded / questions.length) * 100}%` }} /></div>
        </div>

        <div className="space-y-8">
          {sectionsPresent.map(section => {
            const sectionQs = sectioned.filter(x => x.section === section).map(x => x.q);
            const sectionGlobalWeight = getSectionWeights(emp.position)[section];
            const cats: string[] = [...new Set(sectionQs.map(q => q.category as string))];
            return (
              <section key={section} className="smps-accent-bar pl-5">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display text-xl font-bold text-primary">{SECTION_LABELS[section]}</h2>
                  <span className="text-xs font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full">Peso de sección: {sectionGlobalWeight}%</span>
                </div>

                <div className="space-y-6">
                  {cats.map(cat => (
                    <div key={cat}>
                      <h3 className="font-display text-sm font-semibold text-accent mb-3 uppercase tracking-wide">{cat}</h3>
                      <div className="space-y-4">
                        {sectionQs.filter(q => q.category === cat).map(q => {
                          const isNA = naQuestions[q.id];
                          const isNE = noElementsQuestions[q.id];
                          return (
                            <div key={q.id} className="bg-card rounded-lg border p-4">
                              <div className="flex items-start justify-between mb-3">
                                <p className="text-sm font-medium text-foreground pr-4">{q.text}</p>
                                <span className="smps-badge bg-muted text-muted-foreground whitespace-nowrap">Peso: {Math.round(q.weight)}%</span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <button onClick={() => { clearQuestion(q.id); setNoElementsQuestions(prev => ({ ...prev, [q.id]: true })); }}
                                  className={`min-w-[70px] py-2 px-2 rounded-lg text-xs font-medium border transition-[background-color,border-color,transform] duration-150 flex items-center justify-center gap-1 ${isNE ? 'bg-smps-warning/20 text-smps-warning border-smps-warning/30' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                  <MinusCircle className="h-3 w-3" /> Sin Elementos
                                </button>
                                <button onClick={() => { clearQuestion(q.id); setNaQuestions(prev => ({ ...prev, [q.id]: true })); }}
                                  className={`min-w-[70px] py-2 px-2 rounded-lg text-xs font-medium border transition-[background-color,border-color,transform] duration-150 flex items-center justify-center gap-1 ${isNA ? 'bg-muted text-foreground border-foreground/30' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                  <Ban className="h-3 w-3" /> No Aplica
                                </button>
                                {[1, 2, 3, 4, 5].map(score => (
                                  <button key={score} onClick={() => { clearQuestion(q.id); setResponses(prev => ({ ...prev, [q.id]: score })); }}
                                    className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-xs font-medium border transition-[background-color,border-color,transform] duration-150 ${!isNA && !isNE && responses[q.id] === score ? 'bg-accent text-accent-foreground border-accent' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                    {getScoreLabels()[score]}
                                  </button>
                                ))}
                              </div>
                              {isNA && <p className="text-xs text-muted-foreground mt-2">No aplica — se excluye directamente de la evaluación sin requerir aprobación.</p>}
                              {isNE && <p className="text-xs text-smps-warning mt-2">Sin elementos — se eliminará de la evaluación y se ajustará la ponderación.</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-6 smps-surface-card">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3">Comentarios <span className="text-accent text-sm font-normal">(requerido)</span></h3>
          <textarea value={comments} onChange={e => setComments(e.target.value)}
            placeholder="Observaciones sobre el desempeño del colaborador..."
            className="w-full h-32 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm"
            maxLength={2000} />
          <p className={`text-xs mt-1 ${wordCount > 300 ? 'text-accent' : 'text-muted-foreground'}`}>{wordCount}/300 palabras</p>
          {!commentsValid && <p className="text-xs text-smps-warning mt-1">Debe agregar comentarios para poder enviar la evaluación.</p>}
        </div>

        {(isSocio || isSupervisor(selectedEmployee)) && (
          <div className="mt-4 smps-surface-card border-accent/30">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3 text-accent">Comentarios del Evaluador</h3>
            <p className="text-xs text-muted-foreground mb-2">Visible y editable únicamente para socios y evaluadores asignados.</p>
            <textarea value={supervisorComments} onChange={e => setSupervisorComments(e.target.value)}
              placeholder="Comentarios confidenciales del evaluador..."
              className="w-full h-24 px-4 py-3 rounded-lg border border-accent/30 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm"
              maxLength={2000} />
          </div>
        )}

        <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
          {!allAnswered && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" />Responda todas las preguntas</div>}
          {allAnswered && !commentsValid && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" />Agregue comentarios</div>}
          <button onClick={() => setShowConfirm(true)} disabled={!canSubmit}
            className="ml-auto px-6 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
            Guardar Evaluación
          </button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
            <div className="smps-surface-card w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="smps-section-title font-display text-base font-semibold mb-2">Confirmar Envío</h3>
              <p className="text-sm text-muted-foreground mb-4">Una vez enviada la evaluación, <strong>no será posible modificarla</strong>. ¿Desea continuar?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button onClick={handleSubmit} className="flex-1 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98]">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <CheckCircle className="h-16 w-16 text-smps-success mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Evaluación Guardada</h1>
        <button onClick={() => { setSubmitted(false); setSelectedEmployee(null); setResponses({}); setNaQuestions({}); setNoElementsQuestions({}); setComments(''); setSupervisorComments(''); }}
          className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Evaluar otro colaborador
        </button>
      </div>
    );
  }

  const groupUsers = (userList: User[]) => {
    const legal = userList.filter(u => getLegalHierarchy().includes(u.position)).sort((a, b) => {
      const pi = getLegalHierarchy().indexOf(a.position) - getLegalHierarchy().indexOf(b.position);
      return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
    });
    const admin = userList.filter(u => getAdminHierarchy().includes(u.position)).sort((a, b) => {
      const pi = getAdminHierarchy().indexOf(a.position) - getAdminHierarchy().indexOf(b.position);
      return pi !== 0 ? pi : a.name.localeCompare(b.name, 'es');
    });
    return { legal, admin };
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Evaluar Equipo</h1>
          <p className="text-muted-foreground text-sm">Periodo: {currentPeriod}</p>
        </div>
      </div>

      {pendingEmployees.length > 0 && (
        <div className="mb-6">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3 text-smps-warning">Pendientes ({pendingEmployees.length})</h3>
          <div className="space-y-2">
            {pendingEmployees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-card border">
                <div>
                  <p className="text-sm font-medium">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{getPositionLabel(emp.position)}</p>
                </div>
                <button onClick={() => setSelectedEmployee(emp.id)}
                  className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                  Evaluar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedEmployees.length > 0 && (
        <div className="mb-6">
          <h3 className="smps-section-title font-display text-base font-semibold mb-3 text-smps-success">Completadas ({completedEmployees.length})</h3>
          <div className="space-y-2">
            {completedEmployees.map(({ user: emp, eval: ev }) => {
              const hasActionPlan = actionPlans.some(p => p.employeeId === emp.id && p.period === currentPeriod && p.supervisorId === currentUser.id);
              return (
                <div key={emp.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-card border">
                  <div>
                    <p className="text-sm font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{getPositionLabel(emp.position)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBadge value={Math.round(ev.totalScore)} size="sm" />
                    <button onClick={() => setViewingEval(ev.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Ver evaluación">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {!ev.feedbackCompleted ? (
                      <button onClick={() => handleMarkFeedback(ev.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Marcar sesión de feedback como realizada">
                        <MessageSquare className="h-4 w-4 text-smps-warning" />
                      </button>
                    ) : (
                      <span className="p-1.5" title={`Feedback realizado el ${ev.feedbackCompletedAt}`}>
                        <MessageSquare className="h-4 w-4 text-smps-success" />
                      </span>
                    )}
                    <button onClick={() => { setActionPlanEmployee(emp.id); const existing = actionPlans.find(p => p.employeeId === emp.id && p.period === currentPeriod && p.supervisorId === currentUser.id); setActionPlanContent(existing?.content || ''); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Plan de acción">
                      <FileText className={`h-4 w-4 ${hasActionPlan ? 'text-smps-success' : 'text-accent'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NA Approval Section */}
      {(() => {
        const evalsWithPendingNA = evaluations.filter(ev => {
          if (ev.period !== viewPeriod) return false;
          if (ev.type !== 'self') return false;
          if (!isSupervisor(ev.evaluatedId) && !isAdminOrSocio) return false;
          return (ev.responses || []).some(r => r.notApplicable && !normalizeNA(ev.naApprovals)[r.questionId]);
        });
        if (evalsWithPendingNA.length === 0) return null;
        return (
          <div className="mb-6">
            <h3 className="smps-section-title font-display text-base font-semibold mb-3 text-smps-warning">Pendientes de Aprobación "No Aplica"</h3>
            <div className="space-y-3">
              {evalsWithPendingNA.map(ev => {
                const evaluated = users.find(u => u.id === ev.evaluatedId);
                const evalPos = evaluated?.position || '';
                const evalPracticeArea = evaluated?.practiceArea || 'corporativo';
                const evalQuestions = customQuestions[evalPos] || [];
                const sectionWeightsMap2 = getSectionWeights(evalPos);
                const questions = (() => {
                  const tecnicasRaw = evalQuestions.filter(q => q.section === 'tecnico');
                  const tecnicas = tecnicasRaw.filter(q => !q.practiceArea || q.practiceArea === evalPracticeArea || q.practiceArea === 'general').length > 0
                    ? tecnicasRaw.filter(q => !q.practiceArea || q.practiceArea === evalPracticeArea || q.practiceArea === 'general')
                    : tecnicasRaw.filter(q => !q.practiceArea || q.practiceArea === 'corporativo');
                  const competencias = evalQuestions.filter(q => q.section === 'competencias');
                  const blandas = evalQuestions.filter(q => q.section === 'blandas');
                  const rescale = (qs: EvalQuestion[], target: number) => {
                    if (qs.length === 0 || target <= 0) return [];
                    const sum = qs.reduce((s, q) => s + (q.weight || 1), 0) || qs.length;
                    return qs.map(q => ({ ...q, weight: Math.round(((q.weight || 1) / sum) * target * 100) / 100 }));
                  };
                  return [
                    ...rescale(tecnicas, sectionWeightsMap2.tecnico),
                    ...rescale(competencias, sectionWeightsMap2.competencias),
                    ...rescale(blandas, sectionWeightsMap2.blandas),
                  ];
                })();
                const pendingNAResponses = (ev.responses || []).filter(r => r.notApplicable && !normalizeNA(ev.naApprovals)[r.questionId]);
                return (
                  <div key={ev.id} className="smps-surface-card">
                    <p className="text-sm font-medium mb-1">{evaluated?.name} <span className="text-xs text-muted-foreground">({evaluated ? getPositionLabel(evaluated.position) : ''})</span></p>
                    <p className="text-xs text-muted-foreground mb-3">Autoevaluación</p>
                    {pendingNAResponses.map(r => {
                      const q = questions.find(q => q.id === r.questionId);
                      if (!q) return null;
                      return (
                        <div key={r.questionId} className="flex items-center justify-between py-2 px-3 rounded bg-muted/50 mb-1">
                          <span className="text-xs pr-3">{q.text}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => {
                              approveNA({ id: ev.id, questionId: r.questionId, approved: true });
                            }} className="p-1 rounded hover:bg-accent/10 text-smps-success" title="Aprobar">
                              <ShieldCheck className="h-4 w-4" />
                            </button>
                            <button onClick={() => {
                              approveNA({ id: ev.id, questionId: r.questionId, approved: false });
                            }} className="p-1 rounded hover:bg-accent/10 text-smps-warning" title="Rechazar">
                              <ShieldX className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {(viewableEvals.length > 0 || isAdminOrSocio || myAssignments.length > 0) && (
        <div className="mt-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="smps-section-title font-display text-base font-semibold">Historial de Evaluaciones</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors" title="Exportar evaluaciones a CSV (pesos desde la base de datos)">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <HierarchyFilters levelFilter={histLevelFilter} setLevelFilter={setHistLevelFilter} positionFilter={histPosFilter} setPositionFilter={setHistPosFilter} />
              <select value={viewPeriod} onChange={e => setViewPeriod(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                {periods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Evaluado</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Evaluador</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Calificación</th>
                  {canViewAllDetails && <th className="text-left py-3 px-4 font-medium text-muted-foreground">Comentarios</th>}
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ver</th>
                </tr>
              </thead>
              <tbody>
                {filteredViewableEvals.map(ev => {
                  const evaluated = users.find(u => u.id === ev.evaluatedId);
                  const evaluator = users.find(u => u.id === ev.evaluatorId);
                  const evActionPlans = (Array.isArray(actionPlans) ? actionPlans : []).filter(p => p.employeeId === ev.evaluatedId && p.period === ev.period);
                  return (
                    <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4">{evaluated?.name} <span className="text-xs text-muted-foreground">({evaluated ? getPositionLabel(evaluated.position) : ''})</span></td>
                      <td className="py-3 px-4 text-muted-foreground">{ev.type === 'self' ? 'Auto' : 'Evaluador'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{evaluator?.name}</td>
                      <td className="py-3 px-4 text-center"><ScoreBadge value={Math.round(ev.totalScore)} size="sm" /></td>
                      {canViewAllDetails && (
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px]">
                          {ev.comments && <p className="truncate" title={ev.comments}>📝 {ev.comments.substring(0, 60)}...</p>}
                          {ev.supervisorComments && <p className="truncate text-accent" title={ev.supervisorComments}>🔒 {ev.supervisorComments.substring(0, 60)}...</p>}
                          {evActionPlans.length > 0 && <p className="text-smps-success">📋 {evActionPlans.length} plan(es)</p>}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => setViewingEval(ev.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredViewableEvals.length === 0 && (
                  <tr><td colSpan={canViewAllDetails ? 6 : 5} className="py-6 text-center text-muted-foreground">Sin evaluaciones en este periodo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewableEvals.length === 0 && pendingEmployees.length === 0 && !isAdminOrSocio && (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-display font-semibold mb-1">Sin evaluaciones aún</p>
          <p className="text-sm">Completa tu autoevaluación en <span className="text-accent font-medium">Mi Eval.</span> para ver resultados aquí.</p>
        </div>
      )}
      {viewableEvals.length === 0 && pendingEmployees.length === 0 && isAdminOrSocio && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay evaluaciones para mostrar en este periodo.</p>
        </div>
      )}

      {evalToView && <EvaluationViewer evaluation={evalToView} onClose={() => setViewingEval(null)} />}

      {/* Action Plan Modal */}
      {actionPlanEmployee && (
        <div className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setActionPlanEmployee(null); setActionPlanContent(''); }}>
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="smps-section-title font-display text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Plan de Acción — {users.find(u => u.id === actionPlanEmployee)?.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Completar tras la sesión de feedback</p>
            </div>
            <div className="p-4">
              <textarea value={actionPlanContent} onChange={e => setActionPlanContent(e.target.value)}
                placeholder="Defina los objetivos, metas y acciones para el siguiente periodo..."
                className="w-full h-40 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm" />
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => { setActionPlanEmployee(null); setActionPlanContent(''); }} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSaveActionPlan} disabled={!actionPlanContent.trim()} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">Guardar Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
