import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluations, useAssignments, useActionPlans, useCreateEvaluation, useCustomQuestions } from '@/api/queries';
import { QUESTIONS_BY_POSITION, getQuestionsForUser, calculateScore, getSectionForQuestion, SECTION_LABELS, SECTION_ORDER } from '@/data/questions';
import { getSectionWeights } from '@/data/sectionWeights';
import { CURRENT_PERIOD, SCORE_LABELS, POSITION_LABELS, Evaluation } from '@/types';
import { CheckCircle, AlertCircle, Ban, Clock, Users, MessageSquare, FileText, ClipboardCheck, ChevronDown, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type EvalStage = 'self' | 'supervisor' | 'feedback' | 'action_plan';
const STAGES: { key: EvalStage; label: string; icon: React.ElementType }[] = [
  { key: 'self', label: 'Autoevaluación', icon: ClipboardCheck },
  { key: 'supervisor', label: 'Evaluación de Evaluador(es)', icon: Users },
  { key: 'feedback', label: 'Sesión de Feedback', icon: MessageSquare },
  { key: 'action_plan', label: 'Plan de Acción', icon: FileText },
];
const DRAFT_KEY = 'smps-self-eval-draft';

export default function SelfEvaluation() {
  const { user: currentUser } = useAuth();
  const { data: evaluations = [] } = useEvaluations();
  const { data: assignments = [] } = useAssignments();
  const { data: actionPlans = [] } = useActionPlans();
  const addEvaluation = useCreateEvaluation().mutate;
  const { data: customQuestionsData = [] } = useCustomQuestions();
  const customQuestions = Array.isArray(customQuestionsData) ? {} : customQuestionsData;
  const navigate = useNavigate();

  const loadDraft = useCallback(() => {
    try { const saved = localStorage.getItem(DRAFT_KEY); if (saved) { const d = JSON.parse(saved); return { responses: d.responses || {}, naQuestions: d.naQuestions || {}, comments: d.comments || '' }; } } catch { /* ignore */ }
    return null;
  }, []);

  const [responses, setResponses] = useState<Record<string, number>>(() => loadDraft()?.responses || {});
  const [naQuestions, setNaQuestions] = useState<Record<string, boolean>>(() => loadDraft()?.naQuestions || {});
  const [comments, setComments] = useState<string>(() => loadDraft()?.comments || '');
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    if (!submitted) {
      const hasData = Object.keys(responses).length > 0 || Object.keys(naQuestions).length > 0 || comments.length > 0;
      if (hasData) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ responses, naQuestions, comments }));
        setDraftSaved(true);
        const timer = setTimeout(() => setDraftSaved(false), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [responses, naQuestions, comments, submitted]);

  const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); setDraftSaved(false); };

  if (!currentUser) return null;

  const existing = evaluations.find(e => e.type === 'self' && e.evaluatorId === currentUser.id && e.period === CURRENT_PERIOD);
  const questions = getQuestionsForUser(currentUser as any, customQuestions);

  const selfDone = !!existing || submitted;
  const mySupAssignments = assignments.filter(a => a.employeeId === currentUser.id && a.period === CURRENT_PERIOD);
  const supervisorEvals = evaluations.filter(e => e.type === 'supervisor' && e.evaluatedId === currentUser.id && e.period === CURRENT_PERIOD);
  const allSupervisorsDone = mySupAssignments.length > 0 && supervisorEvals.length >= mySupAssignments.length;
  const feedbackDone = supervisorEvals.some(e => e.feedbackCompleted);
  const actionPlanDone = actionPlans.some(p => p.employeeId === currentUser.id && p.period === CURRENT_PERIOD);

  const getStageStatus = (stage: EvalStage): 'done' | 'current' | 'pending' => {
    switch (stage) {
      case 'self': return selfDone ? 'done' : 'current';
      case 'supervisor': return allSupervisorsDone ? 'done' : selfDone ? 'current' : 'pending';
      case 'feedback': return feedbackDone ? 'done' : allSupervisorsDone ? 'current' : 'pending';
      case 'action_plan': return actionPlanDone ? 'done' : feedbackDone ? 'current' : 'pending';
    }
  };

  const completedStages = STAGES.filter(s => getStageStatus(s.key) === 'done').length;
  const progressPct = Math.round((completedStages / STAGES.length) * 100);
  const answeredCount = Object.keys(responses).length + Object.keys(naQuestions).length;
  const allAnswered = answeredCount === questions.length;
  const wordCount = comments.trim().split(/\s+/).filter(Boolean).length;
  const commentsValid = comments.trim().length > 0;
  const canSubmit = allAnswered && commentsValid && wordCount <= 300;

  const handleScore = (questionId: string, score: number) => {
    const newNa = { ...naQuestions }; delete newNa[questionId]; setNaQuestions(newNa);
    setResponses(prev => ({ ...prev, [questionId]: score }));
  };
  const handleNA = (questionId: string) => {
    const newResponses = { ...responses }; delete newResponses[questionId]; setResponses(newResponses);
    setNaQuestions(prev => ({ ...prev, [questionId]: true }));
  };
  const handleClearDraft = () => { setResponses({}); setNaQuestions({}); setComments(''); clearDraft(); };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const evalResponses = [
      ...Object.entries(responses).map(([questionId, score]) => ({ questionId, score, notApplicable: false, weight: questions.find(q => q.id === questionId)?.weight || 1 })),
      ...Object.keys(naQuestions).map(questionId => ({ questionId, score: 0, notApplicable: true, weight: questions.find(q => q.id === questionId)?.weight || 1 })),
    ];
    const totalScore = calculateScore(questions, evalResponses);
    addEvaluation({ id: `eval-${Date.now()}`, evaluatorId: currentUser.id, evaluatedId: currentUser.id, period: CURRENT_PERIOD, type: 'self', responses: evalResponses, comments, completedAt: new Date().toISOString().split('T')[0], totalScore });
    clearDraft(); setSubmitted(true);
  };

  const toggleSection = (section: string) => { setOpenSections(prev => { const next = new Set(prev); if (next.has(section)) next.delete(section); else next.add(section); return next; }); };
  const sectionGroups = SECTION_ORDER.reduce((acc, section) => { const sectionQs = questions.filter(q => getSectionForQuestion(q.id) === section); if (sectionQs.length > 0) acc.push({ section, label: SECTION_LABELS[section] || section, questions: sectionQs }); return acc; }, [] as { section: string; label: string; questions: typeof questions }[]);

  if (selfDone) {
    return (
      <div className="space-y-4 smps-fade-in">
        <h1 className="font-display text-xl font-bold">Evaluación — {CURRENT_PERIOD}</h1>
        <div className="flex items-center gap-6 mb-4">
          {STAGES.map(stage => { const status = getStageStatus(stage.key); return (
            <div key={stage.key} className="flex items-center gap-2">
              {status === 'done' ? <CheckCircle className="h-4 w-4 text-smps-success" /> : status === 'current' ? <Clock className="h-4 w-4 text-accent" /> : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
              <span className={`text-sm ${status === 'done' ? 'text-smps-success font-medium' : status === 'current' ? 'text-accent font-medium' : 'text-muted-foreground'}`}>{stage.label}</span>
            </div>
          ); })}
        </div>
        <div className="smps-progress-bar"><div className="fill" style={{ width: `${progressPct}%` }} /></div>
        <div className="smps-surface-elevated text-center py-8">
          <CheckCircle className="h-10 w-10 text-smps-success mx-auto mb-3" />
          <p className="font-display text-lg font-semibold">Autoevaluación completada</p>
          <p className="text-sm text-muted-foreground mt-1">Tu calificación: {existing?.totalScore ?? '—'}%</p>
        </div>
      </div>
    );
  }

  const sectionProgress = sectionGroups.map(g => { const answered = g.questions.filter(q => responses[q.id] !== undefined || naQuestions[q.id]).length; return { ...g, answered, total: g.questions.length, pct: Math.round((answered / g.questions.length) * 100) }; });
  const totalProgressPct = allAnswered ? 100 : Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="space-y-4 smps-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Autoevaluación</h1>
          <p className="text-xs text-muted-foreground">{CURRENT_PERIOD} · {questions.length} preguntas</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{answeredCount}/{questions.length}</p>
          <div className="w-24 mt-1 smps-progress-bar"><div className="fill" style={{ width: `${totalProgressPct}%` }} /></div>
          {draftSaved && <p className="text-[10px] text-smps-success mt-0.5">Borrador guardado</p>}
        </div>
      </div>

      <div className="space-y-2">
        {sectionProgress.map(({ section, label, questions: sectionQs, answered, total, pct }, idx) => {
          const isOpen = openSections.has(section);
          const categories = [...new Set(sectionQs.map(q => q.category))];
          return (
            <div key={section} className={`rounded-lg border transition-all duration-200 ${isOpen ? 'bg-card' : 'bg-card hover:bg-card/80'}`}>
              <button onClick={() => toggleSection(section)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors duration-200 ${answered === total ? 'bg-smps-success/15 text-smps-success' : pct > 0 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {answered === total ? '✓' : idx + 1}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{answered}/{total}</span>
                  <div className="w-16 smps-progress-bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 smps-fade-in">
                  {categories.map(cat => (
                    <div key={cat}>
                      <h4 className="smps-section-title mb-2">{cat}</h4>
                      <div className="space-y-3">
                        {sectionQs.filter(q => q.category === cat).map(q => {
                          const isNA = naQuestions[q.id];
                          return (
                            <div key={q.id} className="rounded-md border bg-background/50 px-4 py-3">
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-sm font-medium pr-4">{q.text}</p>
                                <span className="smps-badge bg-muted text-muted-foreground whitespace-nowrap">Peso: {q.weight}%</span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                <button onClick={() => handleNA(q.id)} className={`smps-score-btn min-w-[72px] py-1.5 px-2 rounded-md text-xs font-medium border transition-all duration-150 flex items-center justify-center gap-1 ${isNA ? 'bg-foreground/10 text-foreground border-foreground/20' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                  <Ban className="h-3 w-3" /> No Aplica
                                </button>
                                {[1, 2, 3, 4, 5].map(score => (
                                  <button key={score} onClick={() => handleScore(q.id, score)} className={`smps-score-btn flex-1 min-w-[60px] py-1.5 px-2 rounded-md text-xs font-medium border transition-all duration-150 ${!isNA && responses[q.id] === score ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                    {SCORE_LABELS[score]}
                                  </button>
                                ))}
                              </div>
                              {isNA && <p className="text-[11px] text-smps-warning mt-1.5">Requiere aprobación del evaluador para validar que no aplica.</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="smps-surface-card">
        <h3 className="font-display text-sm font-semibold mb-2">Comentarios Abiertos <span className="text-accent text-xs font-normal">(requerido)</span></h3>
        <textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Comparta sus observaciones..." className="w-full h-28 px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none text-sm transition-shadow duration-150" maxLength={2000} />
        <div className="flex items-center justify-between mt-1">
          <p className={`text-[11px] ${wordCount > 300 ? 'text-accent' : 'text-muted-foreground'}`}>{wordCount}/300 palabras máximo</p>
          {(Object.keys(responses).length > 0 || comments.length > 0) && !submitted && (
            <button onClick={handleClearDraft} className="text-[11px] text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"><RotateCcw className="h-3 w-3" /> Limpiar borrador</button>
          )}
        </div>
        {!commentsValid && comments.length === 0 && <p className="text-[11px] text-smps-warning mt-0.5">Debe agregar comentarios para poder enviar la evaluación.</p>}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        {!allAnswered && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" /><span>Responda todas las preguntas</span></div>}
        {allAnswered && !commentsValid && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" /><span>Agregue comentarios</span></div>}
        <button onClick={() => setShowConfirm(true)} disabled={!canSubmit} className="ml-auto px-5 py-2 rounded-md bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all duration-150 active:scale-[0.98]">Guardar Autoevaluación</button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center smps-overlay" onClick={() => setShowConfirm(false)}>
          <div className="smps-surface-card w-full max-w-sm shadow-xl smps-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-2">Confirmar Envío</h3>
            <p className="text-sm text-muted-foreground mb-4">Una vez enviada la autoevaluación, <strong>no será posible modificarla</strong>. ¿Desea continuar?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors duration-150">Cancelar</button>
              <button onClick={handleSubmit} className="flex-1 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98]">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
