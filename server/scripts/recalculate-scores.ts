/**
 * One-shot script to recalculate all evaluation total_scores from their
 * stored responses using the canonical calculateScore formula.
 *
 * Run: npx tsx server/scripts/recalculate-scores.ts
 */
import { pool } from '../db/connection.js';

interface Response {
  questionId: string;
  score: number;
  notApplicable: boolean;
  noElements: boolean;
}

interface Question {
  id: string;
  weight: number;
}

function calculateScore(questions: Question[], responses: Response[], naApprovals: Record<string, boolean>): number {
  const activeQuestions = questions.filter(q => {
    const r = responses.find(r => r.questionId === q.id);
    if (r?.notApplicable && naApprovals[q.id]) return false;
    if (r?.noElements) return false;
    if (r?.notApplicable && !naApprovals && r.score === 0) return false;
    return true;
  });

  const totalWeight = activeQuestions.reduce((sum, q) => sum + q.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const q of activeQuestions) {
    const r = responses.find(r => r.questionId === q.id);
    if (r && !r.notApplicable && !r.noElements && r.score > 0) {
      weightedSum += (r.score / 5) * q.weight;
    }
  }
  return Math.round((weightedSum / totalWeight) * 100);
}

async function main() {
  console.log('Recalculating all evaluation scores...\n');

  const [allEvals] = await pool.execute('SELECT id, total_score FROM evaluations WHERE completed_at IS NOT NULL');
  const evals = allEvals as any[];

  let fixed = 0;
  let correct = 0;
  let zeroResp = 0;

  for (const ev of evals) {
    // Get responses with weights
    const [rows] = await pool.execute(
      'SELECT question_id, score, not_applicable, no_elements, weight FROM evaluation_responses WHERE evaluation_id = ?',
      [ev.id]
    );
    const responses = (rows as any[]).map(r => ({
      questionId: r.question_id,
      score: r.score,
      notApplicable: !!r.not_applicable,
      noElements: !!r.no_elements,
    }));
    const questions = (rows as any[]).map(r => ({
      id: r.question_id,
      weight: r.weight || 1,
    }));

    if (responses.length === 0) {
      console.log(`  ${ev.id}: 0 responses, skipping`);
      zeroResp++;
      continue;
    }

    // Get NA approvals
    const [naRows] = await pool.execute(
      'SELECT question_id, approved FROM evaluation_na_approvals WHERE evaluation_id = ?',
      [ev.id]
    );
    const naApprovals: Record<string, boolean> = {};
    for (const na of naRows as any[]) {
      naApprovals[na.question_id] = !!na.approved;
    }

    const newScore = calculateScore(questions, responses, naApprovals);
    const oldScore = Math.round(ev.total_score);

    if (newScore !== oldScore) {
      console.log(`  ${ev.id}: ${oldScore} → ${newScore} (FIXED)`);
      await pool.execute('UPDATE evaluations SET total_score = ? WHERE id = ?', [newScore, ev.id]);
      fixed++;
    } else {
      correct++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Already correct: ${correct}, Zero responses: ${zeroResp}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
