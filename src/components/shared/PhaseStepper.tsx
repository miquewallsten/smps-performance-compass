import { CheckCircle } from 'lucide-react';

export type EvalStage = 'self' | 'supervisor' | 'feedback' | 'action_plan';

const STAGES: { key: EvalStage; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { key: 'self', label: 'Autoevaluación', shortLabel: 'Autoeval.', icon: () => null },
  { key: 'supervisor', label: 'Evaluadores', shortLabel: 'Evaluadores', icon: () => null },
  { key: 'feedback', label: 'Feedback', shortLabel: 'Feedback', icon: () => null },
  { key: 'action_plan', label: 'Plan de Acción', shortLabel: 'Plan Acción', icon: () => null },
];

export function getStageStatus(
  stage: EvalStage,
  selfDone: boolean,
  allSupDone: boolean,
  feedbackDone: boolean,
  planDone: boolean,
): 'done' | 'current' | 'pending' {
  switch (stage) {
    case 'self': return selfDone ? 'done' : 'current';
    case 'supervisor': return allSupDone ? 'done' : selfDone ? 'current' : 'pending';
    case 'feedback': return feedbackDone ? 'done' : allSupDone ? 'current' : 'pending';
    case 'action_plan': return planDone ? 'done' : feedbackDone ? 'current' : 'pending';
  }
}

interface PhaseStepperProps {
  selfDone: boolean;
  allSupDone: boolean;
  feedbackDone: boolean;
  planDone: boolean;
  progressPct?: number;
  score?: number | null;
}

export function PhaseStepper({ selfDone, allSupDone, feedbackDone, planDone, progressPct, score }: PhaseStepperProps) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1">
        {STAGES.map((phase, i) => {
          const status = getStageStatus(phase.key, selfDone, allSupDone, feedbackDone, planDone);
          return (
            <div key={phase.key} className="flex items-center flex-1 min-w-0">
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium min-w-0 transition-[background-color,color] duration-200 ${
                status === 'done'
                  ? 'bg-smps-success/10 text-smps-success'
                  : status === 'current'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-muted/50 text-muted-foreground'
              }`}>
                {status === 'done' ? (
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                ) : status === 'current' ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0 animate-pulse" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                )}
                <span className="hidden sm:inline truncate">{phase.label}</span>
                <span className="sm:hidden truncate">{phase.shortLabel}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="w-3 h-px bg-muted-foreground/20 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      {(progressPct !== undefined || score !== undefined) && (
        <div className="flex items-center gap-3 mt-2">
          {progressPct !== undefined && (
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                />
              </div>
            </div>
          )}
          {progressPct !== undefined && (
            <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">{Math.round(progressPct)}% completo</span>
          )}
          {score !== undefined && score !== null && (
            <span className="text-[11px] font-display font-bold tabular-nums flex-shrink-0">{Math.round(score)}%</span>
          )}
        </div>
      )}
    </div>
  );
}
