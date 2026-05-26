import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluations, useAssignments, useActionPlans, useCreateEvaluation, useCustomQuestions } from '@/api/queries';
import { QUESTIONS_BY_POSITION, getQuestionsForUser, calculateScore, getSectionForQuestion, SECTION_LABELS, SECTION_ORDER } from '@/data/questions';
import { getSectionWeights } from '@/data/sectionWeights';

import { CURRENT_PERIOD, SCORE_LABELS, POSITION_LABELS, Evaluation } from '@/types';
import { CheckCircle, AlertCircle, Ban, Clock, Users, MessageSquare, FileText, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type EvalStage = 'self' | 'supervisor' | 'feedback' | 'action_plan';

const STAGES: { key: EvalStage; label: string; icon: React.ElementType }[] = [
  { key: 'self', label: 'Autoevaluación', icon: ClipboardCheck },
  { key: 'supervisor', label: 'Evaluación de Evaluador(es)', icon: Users },
  { key: 'feedback', label: 'Sesión de Feedback', icon: MessageSquare },
  { key: 'action_plan', label: 'Plan de Acción', icon: FileText },
];

export default function SelfEvaluation() {
  const { user: currentUser } = useAuth();
  const { data: evaluations = [] } = useEvaluations();
  const { data: assignments = [] } = useAssignments();
  const { data: actionPlans = [] } = useActionPlans();
  const addEvaluation = useCreateEvaluation().mutate;
  const { data: customQuestionsData = [] } = useCustomQuestions();
  const customQuestions = Array.isArray(customQuestionsData) ? {} : customQuestionsData;
  const navigate = useNavigate();
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [naQuestions, setNaQuestions] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    const newNa = { ...naQuestions };
    delete newNa[questionId];
    setNaQuestions(newNa);
    setResponses(prev => ({ ...prev, [questionId]: score }));
  };

  const handleNA = (questionId: string) => {
    const newResponses = { ...responses };
    delete newResponses[questionId];
    setResponses(newResponses);
    setNaQuestions(prev => ({ ...prev, [questionId]: true }));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const evalResponses = [
      ...Object.entries(responses).map(([questionId, score]) => ({ questionId, score, notApplicable: false, weight: questions.find(q => q.id === questionId)?.weight || 1 })),
      ...Object.keys(naQuestions).map(questionId => ({ questionId, score: 0, notApplicable: true, weight: questions.find(q => q.id === questionId)?.weight || 1 })),
    ];
    const totalScore = calculateScore(questions, evalResponses);
    addEvaluation({
      id: `eval-${Date.now()}`,
      evaluatorId: currentUser.id,
      evaluatedId: currentUser.id,
      period: CURRENT_PERIOD,
      type: 'self',
      responses: evalResponses,
      comments,
      completedAt: new Date().toISOString().split('T')[0],
      totalScore,
    });
    setSubmitted(true);
    setShowConfirm(false);
  };

  // Average score from multiple evaluators
  const supervisorAvgScore = supervisorEvals.length > 0
    ? Math.round(supervisorEvals.reduce((s, e) => s + e.totalScore, 0) / supervisorEvals.length)
    : null;

  const processBar = (
    <div className="bg-card rounded-xl border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Proceso de Evaluación</h2>
        <span className="text-sm text-muted-foreground">{progressPct}% completado</span>
      </div>
      {supervisorAvgScore !== null && supervisorEvals.length > 1 && (
        <div className="mb-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-sm font-medium text-accent">Calificación Promedio de Evaluadores: <span className="text-lg font-bold">{supervisorAvgScore}%</span></p>
          <p className="text-xs text-muted-foreground">{supervisorEvals.length} evaluador(es)</p>
        </div>
      )}
      <div className="smps-progress-bar mb-4"><div className="fill" style={{ width: `${progressPct}%` }} /></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAGES.map(stage => {
          const status = getStageStatus(stage.key);
          const Icon = stage.icon;
          return (
            <div key={stage.key} className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${
              status === 'done' ? 'bg-smps-success/10 border-smps-success/30 text-smps-success' :
              status === 'current' ? 'bg-accent/10 border-accent/30 text-accent' :
              'bg-muted/50 border-border text-muted-foreground'
            }`}>
              {status === 'done' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> :
               status === 'current' ? <Clock className="h-4 w-4 flex-shrink-0" /> :
               <Icon className="h-4 w-4 flex-shrink-0 opacity-50" />}
              <span className="text-xs font-medium">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (existing || submitted) {
    const score = existing?.totalScore ?? calculateScore(questions, [
      ...Object.entries(responses).map(([q, s]) => ({ questionId: q, score: s, notApplicable: false, weight: questions.find(qr => qr.id === q)?.weight || 1 })),
      ...Object.keys(naQuestions).map(q => ({ questionId: q, score: 0, notApplicable: true, weight: questions.find(qr => qr.id === q)?.weight || 1 })),
    ]);
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Mi Evaluación</h1>
          <p className="text-muted-foreground text-sm mt-1">{POSITION_LABELS[currentUser.position]} · Periodo {CURRENT_PERIOD}</p>
        </div>
        {processBar}
        <div className="max-w-2xl mx-auto text-center py-8">
          <CheckCircle className="h-16 w-16 text-smps-success mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Autoevaluación Completada</h2>
          <div className="inline-block bg-card rounded-xl border p-6 mt-4">
            <p className="text-4xl font-bold font-display text-accent">{score}%</p>
            <p className="text-sm text-muted-foreground mt-1">Calificación obtenida</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="mt-6 block mx-auto px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Volver al Panel
          </button>
        </div>
      </div>
    );
  }

  const sectioned = questions.map(q => ({ q, section: getSectionForQuestion(q, currentUser.position) }));
  const sectionsPresent = SECTION_ORDER.filter(s => sectioned.some(x => x.section === s));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Mi Evaluación</h1>
        <p className="text-muted-foreground text-sm mt-1">{POSITION_LABELS[currentUser.position]} · Periodo {CURRENT_PERIOD}</p>
      </div>

      {processBar}

      <div className="bg-card rounded-xl border p-4 mb-6 sticky top-14 z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progreso: {answeredCount}/{questions.length}</span>
          <span className="text-sm text-muted-foreground">{Math.round((answeredCount / questions.length) * 100)}%</span>
        </div>
        <div className="smps-progress-bar"><div className="fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
      </div>

      <div className="space-y-8">
        {sectionsPresent.map(section => {
          const sectionQs = sectioned.filter(x => x.section === section).map(x => x.q);
          const sectionWeight = sectionQs.reduce((s, q) => s + q.weight, 0);
          const categories: string[] = [...new Set(sectionQs.map(q => q.category as string))];
          const sectionGlobalWeight = getSectionWeights(currentUser.position)[section];

          return (
            <section key={section} className="border-l-4 border-accent/40 pl-4">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-xl font-bold text-primary">{SECTION_LABELS[section]}</h2>
                <span className="text-xs font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full">Peso de sección: {sectionGlobalWeight}%</span>
              </div>
              <div className="space-y-6">
                {categories.map(cat => (
                  <div key={cat}>
                    <h3 className="font-display text-sm font-semibold text-accent mb-3 uppercase tracking-wide">{cat}</h3>
                    <div className="space-y-4">
                      {sectionQs.filter(q => q.category === cat).map(q => {
                        const isNA = naQuestions[q.id];
                        return (
                          <div key={q.id} className="bg-card rounded-lg border p-4">
                            <div className="flex items-start justify-between mb-3">
                              <p className="text-sm font-medium text-foreground pr-4">{q.text}</p>
                              <span className="smps-badge bg-muted text-muted-foreground whitespace-nowrap">Peso: {q.weight}%</span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => handleNA(q.id)}
                                className={`min-w-[80px] py-2 px-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1 ${isNA ? 'bg-muted text-foreground border-foreground/30' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                <Ban className="h-3 w-3" /> No Aplica
                              </button>
                              {[1, 2, 3, 4, 5].map(score => (
                                <button key={score} onClick={() => handleScore(q.id, score)}
                                  className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg text-xs font-medium border transition-all ${!isNA && responses[q.id] === score ? 'bg-accent text-accent-foreground border-accent' : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'}`}>
                                  {SCORE_LABELS[score]}
                                </button>
                              ))}
                            </div>
                            {isNA && (
                              <p className="text-xs text-smps-warning mt-2">Requiere aprobación del evaluador para validar que no aplica.</p>
                            )}
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

      <div className="mt-6 bg-card rounded-xl border p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Comentarios Abiertos <span className="text-accent text-sm font-normal">(requerido)</span></h3>
        <textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Comparta sus observaciones..." className="w-full h-32 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none text-sm" maxLength={2000} />
        <p className={`text-xs mt-1 ${wordCount > 300 ? 'text-accent' : 'text-muted-foreground'}`}>{wordCount}/300 palabras máximo</p>
        {!commentsValid && comments.length === 0 && (
          <p className="text-xs text-smps-warning mt-1">Debe agregar comentarios para poder enviar la evaluación.</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
        {!allAnswered && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" /><span>Responda todas las preguntas</span></div>}
        {allAnswered && !commentsValid && <div className="flex items-center gap-2 text-smps-warning text-sm"><AlertCircle className="h-4 w-4" /><span>Agregue comentarios</span></div>}
        <button onClick={() => setShowConfirm(true)} disabled={!canSubmit} className="ml-auto px-6 py-2.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">Guardar Autoevaluación</button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-xl border p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold mb-2">Confirmar Envío</h3>
            <p className="text-sm text-muted-foreground mb-4">Una vez enviada la autoevaluación, <strong>no será posible modificarla</strong>. ¿Desea continuar?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleSubmit} className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
