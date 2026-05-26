import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useEvaluations, useAssignments, useActionPlans } from "@/api/queries";
import { POSITION_LABELS, SCORE_LABELS, PERIODS, CURRENT_PERIOD, Evaluation } from '@/types';
import { QUESTIONS_BY_POSITION } from '@/data/questions';
import { Eye, FileText, ChevronDown, ChevronUp, Lock, Key } from 'lucide-react';

export default function SettingsPage() {
  const { user: currentUser, changePassword } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: evaluations = [] } = useEvaluations();
  const { data: assignments = [] } = useAssignments();
  const { data: actionPlans = [] } = useActionPlans();
  const [selectedPeriod, setSelectedPeriod] = useState(CURRENT_PERIOD);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword.length < 6) { setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordError('Las contraseñas no coinciden.'); return; }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => { setShowPasswordForm(false); setPasswordSuccess(false); }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!currentUser) return null;

  const myEvals = evaluations.filter(e => e.evaluatedId === currentUser.id && e.period === selectedPeriod);
  const selfEval = myEvals.find(e => e.type === 'self');
  const supervisorEvals = myEvals.filter(e => e.type === 'supervisor');

  const supervisorAvgScore = supervisorEvals.length > 0
    ? Math.round(supervisorEvals.reduce((s, e) => s + e.totalScore, 0) / supervisorEvals.length)
    : null;

  const myPlans = actionPlans.filter(p => p.employeeId === currentUser.id && p.period === selectedPeriod);

  const renderEvalDetail = (ev: Evaluation) => {
    const evaluated = users.find(u => u.id === ev.evaluatedId);
    if (!evaluated) return null;
    const questions = QUESTIONS_BY_POSITION[evaluated.position] || [];
    const categories = [...new Set(questions.map(q => q.category))];

    return (
      <div className="mt-3 space-y-3">
        {categories.map(cat => {
          const catQuestions = questions.filter(q => q.category === cat);
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">{cat}</p>
              <div className="space-y-1">
                {catQuestions.map(q => {
                  const response = (ev.responses || []).find(r => r.questionId === q.id);
                  const isNA = response?.notApplicable;
                  const naApproved = ev.naApprovals?.[q.id];
                  return (
                    <div key={q.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-muted/50 text-xs">
                      <span className="pr-3">{q.text}</span>
                      <span className="font-medium flex-shrink-0">
                        {isNA ? (
                          <span className={naApproved ? 'text-muted-foreground' : 'text-smps-warning'}>
                            N/A {naApproved ? '✓' : '(pendiente)'}
                          </span>
                        ) : (
                          response ? SCORE_LABELS[response.score] : '—'
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {ev.comments && (
          <div>
            <p className="text-xs font-semibold mb-1">Comentarios del evaluado</p>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">{ev.comments}</p>
          </div>
        )}
        {ev.supervisorComments && (
          <div>
            <p className="text-xs font-semibold mb-1 text-accent">Comentarios del Evaluador</p>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 bg-muted/50 rounded-lg p-3 italic">{ev.supervisorComments}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground text-sm mt-1">Información de tu cuenta y evaluaciones recibidas</p>
        </div>
        <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Profile Card */}
      <div className="smps-surface-elevated">
        <h3 className="smps-section-title font-display text-base font-semibold mb-3">Datos Personales</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Nombre:</span><span className="font-medium">{currentUser.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{currentUser.email}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Posición:</span>
            <span>{POSITION_LABELS[currentUser.position as keyof typeof POSITION_LABELS] || currentUser.position}</span>
          </div>
          {currentUser.isAdmin && <div className="flex justify-between"><span className="text-muted-foreground">Rol:</span><span className="font-medium text-accent">Administrador</span></div>}
          {currentUser.isSuperUser && <div className="flex justify-between"><span className="text-muted-foreground">Rol:</span><span className="font-medium text-yellow-500">Super Administrador</span></div>}
        </div>
      </div>

      {/* Password Change Card */}
      <div className="smps-surface-elevated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg font-semibold">Cambiar Contraseña</h3>
          </div>
          {!showPasswordForm && (
            <button onClick={() => setShowPasswordForm(true)}
              className="text-sm text-accent hover:underline flex items-center gap-1">
              <Key className="h-4 w-4" /> Cambiar
            </button>
          )}
        </div>
        {passwordSuccess && (
          <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2.5 mb-4">
            Contraseña actualizada exitosamente.
          </div>
        )}
        {showPasswordForm ? (
          <form onSubmit={handleChangePassword} className="space-y-3">
            {passwordError && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">{passwordError}</div>}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña actual</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar nueva contraseña</label>
              <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Repita la nueva contraseña" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={passwordLoading}
                className="px-6 py-2.5 rounded-md bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-[opacity,transform] duration-150 ease-out active:scale-[0.98] disabled:opacity-50 text-sm">
                {passwordLoading ? 'Guardando...' : 'Guardar Contraseña'}
              </button>
              <button type="button" onClick={() => { setShowPasswordForm(false); setPasswordError(''); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}
                className="px-6 py-2.5 rounded-lg border border-input text-muted-foreground hover:text-foreground text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Puede cambiar su contraseña en cualquier momento.</p>
        )}
      </div>

      {/* Self Evaluation */}
      <div className="smps-surface-elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">Autoevaluación — {selectedPeriod}</h3>
          {selfEval && <span className="text-2xl font-bold font-display text-accent">{selfEval.totalScore}%</span>}
        </div>
        {selfEval ? (
          <div>
            <button onClick={() => setExpandedEval(expandedEval === selfEval.id ? null : selfEval.id)}
              className="flex items-center gap-2 text-sm text-accent hover:underline">
              <Eye className="h-4 w-4" />
              {expandedEval === selfEval.id ? 'Ocultar detalle' : 'Ver detalle'}
              {expandedEval === selfEval.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expandedEval === selfEval.id && renderEvalDetail(selfEval)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No has completado tu autoevaluación para este periodo.</p>
        )}
      </div>

      {/* Evaluator Evaluations */}
      <div className="smps-surface-elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">Evaluaciones de Evaluadores — {selectedPeriod}</h3>
          {supervisorAvgScore !== null && supervisorEvals.length > 1 && (
            <div className="text-right">
              <span className="text-2xl font-bold font-display text-accent">{supervisorAvgScore}%</span>
              <p className="text-xs text-muted-foreground">Promedio ({supervisorEvals.length} evaluadores)</p>
            </div>
          )}
        </div>
        {supervisorEvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No se han recibido evaluaciones de evaluadores para este periodo.</p>
        ) : (
          <div className="space-y-4">
            {supervisorEvals.map(ev => {
              const evaluator = users.find(u => u.id === ev.evaluatorId);
              return (
                <div key={ev.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{evaluator?.name}</p>
                      <p className="text-xs text-muted-foreground">{evaluator ? POSITION_LABELS[evaluator.position] : ''} · {ev.completedAt}</p>
                    </div>
                    <span className="text-xl font-bold font-display text-accent">{ev.totalScore}%</span>
                  </div>
                  <button onClick={() => setExpandedEval(expandedEval === ev.id ? null : ev.id)}
                    className="flex items-center gap-2 text-sm text-accent hover:underline">
                    <Eye className="h-4 w-4" />
                    {expandedEval === ev.id ? 'Ocultar detalle' : 'Ver detalle'}
                    {expandedEval === ev.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {expandedEval === ev.id && renderEvalDetail(ev)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Plans - one per evaluator */}
      <div className="smps-surface-elevated border-accent/30">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg font-semibold">Planes de Acción — {selectedPeriod}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Cada evaluador asignado puede registrar un plan de acción tras la sesión de feedback.
        </p>
        {myPlans.length > 0 ? (
          <div className="space-y-4">
            {myPlans.map(plan => {
              const supervisor = users.find(u => u.id === plan.supervisorId);
              return (
                <div key={plan.id} className="bg-muted/50 rounded-lg p-4 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-accent">{supervisor?.name || 'Evaluador'}</p>
                    <p className="text-xs text-muted-foreground">{supervisor ? POSITION_LABELS[supervisor.position] : ''}</p>
                  </div>
                  <p className="whitespace-pre-wrap">{plan.content}</p>
                  <p className="text-xs text-muted-foreground mt-3 border-t pt-2">
                    Actualizado: {plan.updatedAt}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no se han registrado planes de acción para este periodo. Los evaluadores los completarán tras la sesión de feedback.
          </p>
        )}
      </div>
    </div>
  );
}
