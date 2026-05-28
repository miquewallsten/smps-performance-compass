import { v4 as uuidv4 } from 'uuid';
import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

// ─── GET /api/evaluation-config/categories ──────────────────────────────────
router.get('/categories', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const categories = await db.all('SELECT * FROM evaluation_categories ORDER BY sort_order');
    return res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/section-weights ────────────────────────────
router.get('/section-weights', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const weights = await db.all('SELECT * FROM section_weights');
    return res.json(weights);
  } catch (err) {
    console.error('Get section weights error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/section-weights/:position ──────────────────
router.get('/section-weights/:position', authMiddleware, async (req: Request, res: Response) => {
  try {
    const row = await db.get('SELECT * FROM section_weights WHERE position = ?', [req.params.position]);
    if (!row) {
      // Default: admin positions have no técnico
      return res.json({ position: req.params.position, tecnico: 0, competencias: 80, blandas: 20 });
    }
    return res.json(row);
  } catch (err) {
    console.error('Get section weights for position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluation-config/section-weights/:position ─────────────────
router.patch('/section-weights/:position', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tecnico, competencias, blandas } = req.body;
    if (tecnico === undefined || competencias === undefined || blandas === undefined) {
      return res.status(400).json({ error: 'tecnico, competencias, and blandas are required' });
    }
    if (Number(tecnico) + Number(competencias) + Number(blandas) !== 100) {
      return res.status(400).json({ error: 'Weights must sum to 100' });
    }
    const existing = await db.get('SELECT position FROM section_weights WHERE position = ?', [req.params.position]);
    if (existing) {
      await db.run('UPDATE section_weights SET tecnico = ?, competencias = ?, blandas = ? WHERE position = ?',
        [tecnico, competencias, blandas, req.params.position]);
    } else {
      await db.run('INSERT INTO section_weights (position, tecnico, competencias, blandas) VALUES (?, ?, ?, ?)',
        [req.params.position, tecnico, competencias, blandas]);
    }
    return res.json({ position: req.params.position, tecnico, competencias, blandas });
  } catch (err) {
    console.error('Update section weights error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/competencies ───────────────────────────────
router.get('/competencies', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const competencies = await db.all('SELECT * FROM competency_definitions ORDER BY position_level, sort_order');
    return res.json(competencies);
  } catch (err) {
    console.error('Get competencies error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/competencies/:positionLevel ────────────────
router.get('/competencies/:positionLevel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const competencies = await db.all('SELECT * FROM competency_definitions WHERE position_level = ? ORDER BY sort_order', [req.params.positionLevel]);
    return res.json(competencies);
  } catch (err) {
    console.error('Get competencies for position error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/template-questions ─────────────────────────
router.get('/template-questions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { position, practiceArea, section, category, is_active } = req.query as Record<string, string>;
    let sql = 'SELECT * FROM template_questions WHERE 1=1';
    const params: any[] = [];
    if (position) { sql += ' AND position = ?'; params.push(position); }
    if (practiceArea) { sql += ' AND practice_area = ?'; params.push(practiceArea); }
    if (section) { sql += ' AND section = ?'; params.push(section); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (is_active !== undefined) { sql += ' AND is_active = ?'; params.push(is_active === 'true' ? 1 : 0); }
    sql += ' ORDER BY section, sort_order';
    const questions = await db.all(sql, params);
    return res.json(questions);
  } catch (err) {
    console.error('Get template questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/evaluation-config/template-questions/:position ───────────────
// Replace ALL template questions for a position (full template save)
router.put('/template-questions/:position', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { position } = req.params;
    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions array is required' });
    }

    await db.transaction(async (conn) => {
      // Delete existing seed questions for this position
      await db.tx.run(conn, 'DELETE FROM template_questions WHERE position = ? AND source = ?', [position, 'seed']);
      
      // Insert new questions
      for (const q of questions) {
        const id = q.id || uuidv4();
        const questionId = q.questionId || q.question_id || id;
        await db.tx.run(conn,
          `INSERT INTO template_questions (id, question_id, position, practice_area, section, category, question_text, weight, sort_order, is_active, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'seed')`,
          [id, questionId, position, q.practiceArea || q.practice_area || 'corporativo',
           q.section || 'competencias', q.category, q.text || q.questionText || q.question_text,
           q.weight || 1, q.sortOrder || q.sort_order || 0]);
      }
    });

    const result = await db.all('SELECT * FROM template_questions WHERE position = ? ORDER BY section, sort_order', [position]);
    return res.json(result);
  } catch (err) {
    console.error('Put template questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/evaluation-config/template-questions/:id ────────────────────
router.patch('/template-questions/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { text, category, weight, section, isActive, is_active, sortOrder, sort_order } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (text !== undefined) { updates.push('question_text = ?'); params.push(text); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (weight !== undefined) { updates.push('weight = ?'); params.push(weight); }
    if (section !== undefined) { updates.push('section = ?'); params.push(section); }
    if (isActive !== undefined || is_active !== undefined) { updates.push('is_active = ?'); params.push(isActive ?? is_active ? 1 : 0); }
    if (sortOrder !== undefined || sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sortOrder ?? sort_order); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    await db.run(`UPDATE template_questions SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    const updated = await db.get('SELECT * FROM template_questions WHERE id = ?', [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error('Patch template question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/full-template/:position ────────────────────
// Assembles the complete evaluation template for a position, rescaling weights
router.get('/full-template/:position', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { position } = req.params;
    const practiceArea = (req.query.practiceArea as string) || 'corporativo';

    // 1. Get section weights
    const swRow = await db.get('SELECT * FROM section_weights WHERE position = ?', [position]);
    const sectionWeights = swRow ? { tecnico: swRow.tecnico, competencias: swRow.competencias, blandas: swRow.blandas }
      : { tecnico: 0, competencias: 80, blandas: 20 };

    // 2. Get position config
    const posConfig = await db.get('SELECT * FROM position_config WHERE position = ?', [position]);

    // 3. Get all active template questions for this position
    const questions = await db.all(
      'SELECT * FROM template_questions WHERE position = ? AND is_active = 1 ORDER BY section, sort_order',
      [position]
    );

    // 4. Partition by section
    const tecnicas = questions.filter(q => q.section === 'tecnico');
    const competencias = questions.filter(q => q.section === 'competencias');
    const blandas = questions.filter(q => q.section === 'blandas');

    // 5. Filter técnicas by practice area
    const filteredTecnicas = tecnicas.filter(q => q.practice_area === practiceArea || q.practice_area === 'corporativo');

    // 6. Rescale weights within each section
    const rescale = (qs: any[], target: number) => {
      if (qs.length === 0 || target <= 0) return [];
      const sum = qs.reduce((s, q) => s + (q.weight || 1), 0) || qs.length;
      return qs.map(q => ({
        ...q,
        weight: Math.round(((q.weight || 1) / sum) * target * 100) / 100,
      }));
    };

    const rescaledQuestions = [
      ...rescale(filteredTecnicas, sectionWeights.tecnico),
      ...rescale(competencias, sectionWeights.competencias),
      ...rescale(blandas, sectionWeights.blandas),
    ];

    // 7. Get categories for grouping
    const categories = await db.all('SELECT * FROM evaluation_categories ORDER BY sort_order');

    // 8. Get competencies for this position level
    const level = posConfig?.level || (position === 'socio' || position === 'salary_partner' || position === 'counsel' ||
      position === 'asociado_sr' || position === 'asociado_mid' || position === 'asociado_jr' ||
      position === 'pasante_carrera' || position === 'pasante' ? 'legal' : 'administrativo');
    const competencies = await db.all('SELECT * FROM competency_definitions WHERE position_level = ? ORDER BY sort_order', [level]);

    return res.json({
      position,
      practiceArea,
      sectionWeights,
      questions: rescaledQuestions,
      categories,
      competencies,
      positionConfig: posConfig,
    });
  } catch (err) {
    console.error('Get full template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/positions ──────────────────────────────────
router.get('/positions', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const positions = await db.all('SELECT * FROM position_config WHERE is_active = 1 ORDER BY level, sort_order');
    return res.json(positions);
  } catch (err) {
    console.error('Get positions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/evaluation-config/score-labels ───────────────────────────────
router.get('/score-labels', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const labels = await db.all('SELECT * FROM score_config ORDER BY score');
    return res.json(labels);
  } catch (err) {
    console.error('Get score labels error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Question Library CRUD ─────────────────────────────────────────────────

router.get('/library', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const questions = await db.all('SELECT * FROM question_library ORDER BY category, created_at');
    return res.json(questions);
  } catch (err) {
    console.error('Get library questions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/library', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, text } = req.body;
    if (!category || !text) {
      return res.status(400).json({ error: 'category and text are required' });
    }
    // uuidv4 already imported at top
    const id = uuidv4();
    // Generate a short question_id from category + timestamp
    const questionId = `lib-${category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    await db.run(
      'INSERT INTO question_library (id, question_id, category, text, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, questionId, category, text, req.user!.id]
    );
    const question = await db.get('SELECT * FROM question_library WHERE id = ?', [id]);
    return res.status(201).json(question);
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Question ID already exists' });
    }
    console.error('Create library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/library/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, text } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (text !== undefined) { updates.push('text = ?'); params.push(text); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    await db.run(`UPDATE question_library SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id]);
    const updated = await db.get('SELECT * FROM question_library WHERE id = ?', [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/library/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.run('DELETE FROM question_library WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Delete library question error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/evaluation-config/reseed ────────────────────────────────────
// Force re-seed evaluation data (admin only)
router.post('/reseed', authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Delete all seed data first to force re-seed
    await db.run("DELETE FROM template_questions WHERE source = 'seed'");
    await db.run('DELETE FROM section_weights');
    await db.run("DELETE FROM question_library WHERE created_by IS NULL");
    await db.run("DELETE FROM evaluation_categories WHERE id = 'Comunicación'");
    console.log('Force reseed: deleted all seed data');
    await seedEvaluationData();
    const count = await db.getScalar<number>('SELECT COUNT(*) as cnt FROM template_questions WHERE source = ?', ['seed']);
    return res.json({ message: `Re-seeded successfully. ${count} template questions.` });
  } catch (err) {
    console.error('Reseed error:', err);
    return res.status(500).json({ error: 'Reseed failed: ' + (err instanceof Error ? err.message : String(err)) });
  }
});

export default router;
