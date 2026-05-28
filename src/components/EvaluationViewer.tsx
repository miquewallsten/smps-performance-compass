import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useAssignments, useUpdateEvaluation, useCompleteFeedback, useApproveNA, useActionPlans, useCustomQuestions } from '@/api/queries';
import { QUESTIONS_BY_POSITION, getQuestionsForUser } from '@/data/questions';
import { SCORE_LABELS, POSITION_LABELS, Evaluation } from '@/types';
import { Ban, ShieldCheck, ShieldX, MinusCircle, FileText } from 'lucide-react';
import { calculateScore } from '@/data/questions';

interface Props {
  evaluation: Evaluation;
  onClose: () => void;
}

export default function EvaluationViewer({ evaluation, onClose }: Props) {
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: assignments = [] } = useAssignments();
  const updateEvaluation = useUpdateEvaluation().mutate;
  const completeFeedback = useCompleteFeedback().mutate;
  const approveNA = useApproveNA().mutate;
  const { data: actionPlans = [] } = useActionPlans();
  const { data: customQuestionsData = [] } = useCustomQuestions();
  const customQuestions = Array.isArray(customQuestionsData) ? {} : customQuestionsData;
  const [supComments, setSupComments] = useState(evaluation.supervisorComments || '');
  const [saved, setSaved] = useState(false);

  const evaluated = users.find(u => u.id === evaluation.evaluatedId);
  const evaluator = users.find(u => u.id === evaluation.evaluatorId);

  if (!evaluated || !currentUser) return null;

  const isSocio = currentUser.position === 'socio';
  const isSuperUser = currentUser.isSuperUser;
  const isAdmin = currentUser.isAdmin;
  const isSupervisorOfEvaluated = assignments.some(a => a.supervisorId === currentUser.id && a.employeeId === evaluation.evaluatedId);
  const canEditSupervisorComments = (isSocio || isSupervisorOfEvaluated) && evaluation.type === 'supervisor';
  const canApproveNA = (isSocio || isSupervisorOfEvaluated) && evaluation.type === 'self';
  const canViewAllDetails = isAdmin || isSocio || isSuperUser;

  // Action plans for this employee/period
  const evalActionPlans = actionPlans.filter(p => p.employeeId === evaluation.evaluatedId && p.period === evaluation.period);

  const handleSaveComments = () => {
    updateEvaluation({ id: evaluation.id, supervisorComments: supComments });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNAApproval = (questionId: string, approved: boolean) => {
    // Use the dedicated NA approval endpoint instead of the general update
    approveNA({ id: evaluation.id, questionId, approved });
  };

  const questions = getQuestionsForUser(evaluated, customQuestions || {});
  const categories: string[] = [...new Set(questions.map(q => q.category as string))];
  const responses = evaluation.responses || [];

  // Normalize naApprovals: convert from array to Record if needed
  // (should already be normalized by queries.ts, but defensive check)
  const naApprovals: Record<string, boolean> = (() => {
    const raw = evaluation.naApprovals;
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const result: Record<string, boolean> = {};
      for (const item of raw as any[]) {
        if (item && item.questionId) {
          result[item.questionId] = !!item.approved;
        }
      }
      return result;
    }
    return raw as Record<string, boolean>;
  })();


  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {evaluation.type === 'self' ? 'Autoevaluación' : 'Evaluación de Evaluador'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {evaluated.name} ({POSITION_LABELS[evaluated.position]}) · {evaluation.period} · {evaluation.type === 'supervisor' ? `Por: ${evaluator?.name}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-display text-accent">{Math.round(evaluation.totalScore)}%</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {categories.map(cat => {
            const catQuestions = questions.filter(q => q.category === cat);
            return (
              <div key={cat}>
                <h4 className="text-sm font-semibold text-accent mb-2">{cat}</h4>
                <div className="space-y-2">
                  {catQuestions.map(q => {
                    const response = responses.find(r => r.questionId === q.id);
                    const isNA = response?.notApplicable;
                    const isNE = response?.noElements;
                    const naApproved = naApprovals?.[q.id];
                    const naPending = isNA && naApproved === undefined;
                    return (
                      <div key={q.id} className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${isNA || isNE ? 'bg-muted/30 border border-dashed' : 'bg-muted/50'}`}>
                        <span className="pr-4">{q.text}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isNE ? (
                            <div className="flex items-center gap-1">
                              <MinusCircle className="h-3.5 w-3.5 text-smps-warning" />
                              <span className="text-xs text-smps-warning">Sin Elementos</span>
                            </div>
                          ) : isNA ? (
                            <div className="flex items-center gap-1">
                              <Ban className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">N/A</span>
                              {evaluation.type === 'supervisor' && <span className="text-xs text-smps-success">✓</span>}
                              {evaluation.type === 'self' && naApproved === true && <span className="text-xs text-smps-success">✓</span>}
                              {evaluation.type === 'self' && naApproved === false && <span className="text-xs text-smps-warning">✗</span>}
                              {naPending && canApproveNA && (
                                <>
                                  <button onClick={() => handleNAApproval(q.id, true)} className="p-0.5 rounded text-smps-success hover:bg-accent/10" title="Aprobar"><ShieldCheck className="h-4 w-4" /></button>
                                  <button onClick={() => handleNAApproval(q.id, false)} className="p-0.5 rounded text-smps-warning hover:bg-accent/10" title="Rechazar"><ShieldX className="h-4 w-4" /></button>
                                </>
                              )}
                              {naPending && !canApproveNA && <span className="text-xs text-smps-warning">(pendiente)</span>}
                            </div>
                          ) : (
                            <span className="font-medium text-xs">{response ? SCORE_LABELS[response.score] : '—'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {evaluation.comments && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Comentarios del Evaluado</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{evaluation.comments}</p>
            </div>
          )}

          {canEditSupervisorComments && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 text-accent">Comentarios del Evaluador</h4>
              <textarea value={supComments} onChange={e => setSupComments(e.target.value)}
                placeholder="Agregar comentarios confidenciales del evaluador..."
                className="w-full h-20 px-3 py-2 rounded-lg border border-accent/30 bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent" />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={handleSaveComments} className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90">Guardar</button>
                {saved && <span className="text-xs text-smps-success">✓ Guardado</span>}
              </div>
            </div>
          )}

          {!canEditSupervisorComments && evaluation.supervisorComments && (canViewAllDetails || isSupervisorOfEvaluated) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 text-accent">Comentarios del Evaluador</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{evaluation.supervisorComments}</p>
            </div>
          )}

          {/* Action Plans visible to admin/socio/superuser */}
          {canViewAllDetails && evalActionPlans.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-accent" /> Planes de Acción</h4>
              <div className="space-y-2">
                {evalActionPlans.map(plan => {
                  const sup = users.find(u => u.id === plan.supervisorId);
                  return (
                    <div key={plan.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="text-xs font-medium text-accent mb-1">{sup?.name || 'Evaluador'} — {sup ? POSITION_LABELS[sup.position] : ''}</p>
                      <p className="whitespace-pre-wrap text-xs">{plan.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">Actualizado: {plan.updatedAt}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <button onClick={onClose} className="w-full py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
