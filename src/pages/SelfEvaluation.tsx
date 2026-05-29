import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluations, useAssignments, useActionPlans, useCreateEvaluation } from '@/api/queries';
import { Evaluation, Position, EvalQuestion } from '@/types';
import { SECTION_LABELS, SECTION_ORDER, getSectionForQuestion, calculateScore, getSectionWeights, getPositionLabel, getScoreLabels } from '@/lib/evaluationConfig';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { useFullTemplate } from '@/hooks/useEvaluationConfig';
import { CheckCircle, AlertCircle, Ban, Clock, Users, MessageSquare, FileText, ClipboardCheck, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PhaseStepper, getStageStatus, type EvalStage } from '@/components/shared/PhaseStepper';
import { SuccessAnimation } from '@/components/shared/SuccessAnimation';

const DRAFT_KEY = 'smps-self-eval-draft';

export default function SelfEvaluation() {
  const currentPeriod = useCurrentPeriod();
  const { user: currentUser } = useAuth();
  const { data: evaluations = [] } = useEvaluations();
  const { data: assignments = [] } = useAssignments();
  const { data: actionPlans = [] } = useActionPlans();
  const createEvaluationMut = useCreateEvaluation();
  const { data: templateData } = useFullTemplate(currentUser?.position || 'socio', currentUser?.practiceArea || 'corporativo');
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);

  const questions = useMemo(() => {
    if (!templateData?.questions) return [] as EvalQuestion[];
    return templateData.questions.map((q: any) => ({
      id: q.questionId || q.id,
      category: q.category,
      text: q.questionText || q.text,
      weight: q.weight,
      section: q.section,
      practiceArea: q.practiceArea,
    })) as EvalQuestion[];
  }, [templateData]);

  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        return { responses: draft.responses || {}, naQuestions: draft.naQuestions || {}, comments: draft.comments || '' };
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  const [responses, setResponses] = useState<Record<string, number>>(() => loadDraft()?.responses || {});
  const [naQuestions, setNaQuestions] = useState<Record<string, boolean>>(() => loadDraft()?.naQuestions || {});
  const [comments, setComments] = useState<string>(() => loadDraft()?.comments || '');
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftSaved(false);
  };

  if (!currentUser) return null;

  const existing = evaluations.find(e => e.type === 'self' && e.evaluatorId === currentUser.id && e.period === currentPeriod);

  const selfDone = !!existing || submitted;
  const mySupAssignments = assignments.filter(a => a.employeeId === currentUser.id && a.period === currentPeriod);
  const supervisorEvals = evaluations.filter(e => e.type === 'supervisor' && e.evaluatedId === currentUser.id && e.period === currentPeriod);
  const allSupervisorsDone = mySupAssignments.length > 0 && supervisorEvals.length >= mySupAssignments.length;
  const feedbackDone = supervisorEvals.some(e => e.feedbackCompleted);
  const actionPlanDone = actionPlans.some(p => p.employeeId === currentUser.id && p.period === currentPeriod);

  // ─── Scoring & progress ───────────────────────────────────────────────
  const sectionWeights = getSectionWeights(currentUser.position);
  const { totalScore, sectionScores } = calculateScore(responses, naQuestions, sectionWeights, questions);
  const totalQuestions = questions.length;
  const answeredQuestions = Object.keys(responses).length + Object.keys(naQuestions).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const wordCount = comments.trim().split(/\s+/).filter(Boolean).length;
  const commentsValid = wordCount >= 10 && wordCount <= 300;
  const allAnswered = answeredQuestions >= totalQuestions;

  const canSubmit = allAnswered && commentsValid && !submitted;

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleScore = (questionId: string, score: number) => {
    setResponses(prev => ({ ...prev, [questionId]: score }));
    const newNa = { ...naQuestions };
    delete newNa[questionId];
    setNaQuestions(newNa);
  };

  const handleNA = (questionId: string) => {
    if (naQuestions[questionId]) {
      const newNa = { ...naQuestions };
      delete newNa[questionId];
      setNaQuestions(newNa);
    } else {
      setNaQuestions(prev => ({ ...prev, [questionId]: true }));
      const newResponses = { ...responses };
      delete newResponses[questionId];
      setResponses(newResponses);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const formattedResponses = Object.entries(responses).map(([questionId, score]) => ({
      questionId,
      score,
      notApplicable: !!naQuestions[questionId],
    }));

    createEvaluationMut.mutate({
      evaluatedId: currentUser.id,
      evaluatorId: currentUser.id,
      type: 'self',
      period: currentPeriod,
      responses: formattedResponses,
      totalScore,
      comments,
    }, {
      onSuccess: () => {
        setSubmitted(true);
        clearDraft();
        setShowConfirm(false);
        setShowSuccess(true);
      },
      onError: (err: any) => {
        toast.error(err.message || 'Error al enviar la evaluación');
        setShowConfirm(false);
      },
    });
  };

  // ─── If already submitted, show status ─────────────────────────────────
  if (selfDone && !showSuccess) {
    const score = existing ? Math.round(existing.totalScore) : Math.round(totalScore);
    return (
      <div className="max-w-2xl mx-auto space-y-5 smps-fade-up">
        <PhaseStepper
          selfDone={true}
          allSupDone={allSupervisorsDone}
          feedbackDone={feedbackDone}
          planDone={actionPlanDone}
        />
        <div className="rounded-xl border bg-card p-6 text-center">
          <div className="flex justify-center mb-4">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" fill="hsl(var(--smps-success)/10)" stroke="hsl(var(--smps-success))" strokeWidth="2.5" />
              <path d="M20 32 L28 40 L44 24" stroke="hsl(var(--smps-success))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold mb-1">Autoevaluación Completada</h2>
          <p className="text-sm text-muted-foreground mb-4">Tu autoevaluación para {currentPeriod} ha sido enviada.</p>
          {score > 0 && (
            <div className="inline-flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">{score}%</span>
              <span className="text-sm text-muted-foreground">calificación</span>
            </div>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98]">
              Volver al Panel
            </button>
            {supervisorEvals.length > 0 && (
              <button onClick={() => navigate('/evaluations')} className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors duration-150">
                Ver Evaluaciones
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Questions by section ──────────────────────────────────────────────
  const sectionedQuestions = useMemo(() => {
    const sections: Record<string, EvalQuestion[]> = {};
    questions.forEach(q => {
      const section = q.section || q.category || 'General';
      if (!sections[section]) sections[section] = [];
      sections[section].push(q);
    });
    return sections;
  }, [questions]);

  const sectionOrder = SECTION_ORDER.length > 0
    ? SECTION_ORDER
    : Object.keys(sectionedQuestions);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {showSuccess && <SuccessAnimation onComplete={() => setShowSuccess(false)} />}

      <div className="max-w-3xl mx-auto space-y-4" ref={topRef}>
        {/* ─── Sticky Phase Stepper ───────────────────────────────────────── */}
        <div className="border-b border-border/50 px-4 md:px-5 py-2 bg-background">
          <PhaseStepper
            selfDone={false}
            allSupDone={false}
            feedbackDone={false}
            planDone={false}
            progressPct={progressPct}
            score={totalScore > 0 ? Math.round(totalScore) : null}
          />
        </div>

        {/* ─── Draft indicator ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Autoevaluación</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentPeriod} &middot; {answeredQuestions} de {totalQuestions} preguntas
            </p>
          </div>
          {draftSaved && (
            <span className="text-[11px] text-smps-success flex items-center gap-1 smps-fade-in">
              <CheckCircle className="h-3 w-3" /> Borrador guardado
            </span>
          )}
        </div>

        {/* ─── Questions by section ──────────────────────────────────────── */}
        <div className="space-y-2">
          {sectionOrder.map(sectionKey => {
            const sectionQuestions = sectionedQuestions[sectionKey];
            if (!sectionQuestions || sectionQuestions.length === 0) return null;
            const sectionLabel = SECTION_LABELS[sectionKey] || sectionKey;
            const sectionWeight = sectionWeights?.[sectionKey] || 0;
            const sectionTotal = sectionQuestions.length;
            const sectionAnswered = sectionQuestions.filter(q => responses[q.id] !== undefined || naQuestions[q.id]).length;
            const isOpen = openSections.has(sectionKey);
            const sectionComplete = sectionAnswered >= sectionTotal;

            // Calculate section score
            const sectionScorePct = (() => {
              const sResponses: Record<string, number> = {};
              const sNA: Record<string, boolean> = {};
              sectionQuestions.forEach(q => {
                if (responses[q.id] !== undefined) sResponses[q.id] = responses[q.id];
                if (naQuestions[q.id]) sNA[q.id] = true;
              });
              const { totalScore: sScore } = calculateScore(sResponses, sNA, sectionWeights, sectionQuestions);
              return sectionAnswered > 0 ? Math.round(sScore) : null;
            })();

            return (
              <div key={sectionKey} className="rounded-xl border bg-card overflow-hidden">
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-[background-color] duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                      sectionComplete ? 'bg-smps-success/10 text-smps-success' : 'bg-accent/10 text-accent'
                    }`}>
                      {sectionComplete ? <CheckCircle className="h-3.5 w-3.5" /> : <span>{sectionAnswered}/{sectionTotal}</span>}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{sectionLabel}</span>
                      {sectionWeight > 0 && (
                        <span className="text-[10px] text-muted-foreground">Peso: {(sectionWeight * 100).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {sectionScorePct !== null && (
                      <span className={`text-sm font-display font-bold tabular-nums ${
                        sectionScorePct >= 90 ? 'text-smps-success' : sectionScorePct >= 80 ? 'text-smps-gold' : sectionScorePct >= 70 ? 'text-smps-warning' : 'text-destructive'
                      }`}>
                        {sectionScorePct}%
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-2 space-y-4 smps-fade-in">
                    {/* Section progress bar */}
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                        style={{ width: `${sectionTotal > 0 ? (sectionAnswered / sectionTotal) * 100 : 0}%` }}
                      />
                    </div>

                    {sectionQuestions.map(q => {
                      const isNA = !!naQuestions[q.id];
                      const hasResponse = responses[q.id] !== undefined;
                      return (
                        <div key={q.id} className={`pl-4 smps-accent-bar ${isNA ? 'opacity-50' : ''}`} style={{ '--bar-color': hasResponse || isNA ? 'hsl(var(--smps-success))' : 'hsl(var(--muted-foreground))' } as React.CSSProperties}>
                          <p className="text-sm font-medium mb-2">{q.text}</p>
                          {q.practiceArea && (
                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground mb-2">{q.practiceArea}</span>
                          )}
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => handleNA(q.id)}
                              className={`smps-score-btn min-w-[72px] py-1.5 px-2 rounded-md text-xs font-medium border transition-[background-color,border-color,transform] duration-150 flex items-center justify-center gap-1 ${isNA ? 'bg-foreground/10 text-foreground border-foreground/20' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                              <Ban className="h-3 w-3" /> No Aplica
                            </button>
                            {[1, 2, 3, 4, 5].map(score => (
                              <button key={score} onClick={() => handleScore(q.id, score)}
                                className={`smps-score-btn flex-1 min-w-[60px] py-1.5 px-2 rounded-md text-xs font-medium border transition-[background-color,border-color,transform] duration-150 ${!isNA && responses[q.id] === score ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                {getScoreLabels()[score]}
                              </button>
                            ))}
                          </div>
                          {isNA && (
                            <p className="text-[11px] text-smps-warning mt-1.5">Requiere aprobación del evaluador para validar que no aplica.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Comments ──────────────────────────────────────────────────── */}
        <div className="smps-surface-card">
          <h3 className="font-display text-sm font-semibold mb-2">Comentarios Abiertos <span className="text-accent text-xs font-normal">(requerido)</span></h3>
          <textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Comparta sus observaciones..." className="w-full h-28 px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none text-sm transition-shadow duration-150" maxLength={2000} />
          <div className="flex items-center justify-between mt-1">
            <p className={`text-[11px] ${wordCount > 300 ? 'text-accent' : 'text-muted-foreground'}`}>{wordCount}/300 palabras máximo</p>
            {(Object.keys(responses).length > 0 || comments.length > 0) && !submitted && (
              <button onClick={handleClearDraft} className="text-[11px] text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors">
                <RotateCcw className="h-3 w-3" /> Limpiar borrador
              </button>
            )}
          </div>
          {!commentsValid && comments.length === 0 && (
            <p className="text-[11px] text-smps-warning mt-0.5">Debe agregar comentarios para poder enviar la evaluación.</p>
          )}
        </div>

        {/* ─── Submit ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {!allAnswered && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" /><span>Responda todas las preguntas</span></div>}
          {allAnswered && !commentsValid && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" /><span>Agregue comentarios</span></div>}
          <button onClick={() => setShowConfirm(true)} disabled={!canSubmit} className="ml-auto px-5 py-2 rounded-md bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98]">
            Guardar Autoevaluación
          </button>
        </div>

        {/* ─── Confirm Modal ─────────────────────────────────────────────── */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center smps-overlay" onClick={() => setShowConfirm(false)}>
            <div className="smps-surface-card w-full max-w-sm shadow-xl smps-scale-in" onClick={e => e.stopPropagation()}>
              <h3 className="font-display text-lg font-semibold mb-2">Confirmar Envío</h3>
              <p className="text-sm text-muted-foreground mb-4">Una vez enviada la autoevaluación, <strong>no será posible modificarla</strong>. ¿Desea continuar?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors duration-150">Cancelar</button>
                <button onClick={handleSubmit} className="flex-1 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-[opacity,transform] duration-150 active:scale-[0.98]">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
