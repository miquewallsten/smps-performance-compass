import { Router } from 'express';
import { pool, get, all, run } from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';
import { hasRole } from '../middleware/permissions.js';

const router = Router();

// ─── GET /api/feature-visibility — Get all feature visibility settings (admin only) ─────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!hasRole(req.user!, ['super_user', 'admin'])) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const settings = await all('SELECT * FROM feature_visibility ORDER BY role, feature');
    return res.json({ settings });
  } catch (err) {
    console.error('Get feature visibility error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/feature-visibility — Update feature visibility settings (admin only) ─────────────────────────────────
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (!hasRole(req.user!, ['super_user', 'admin'])) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { settings }: { settings: Array<{ role: string; feature: string; visible: number }> } = req.body;

    // Validate input
    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    // Update each setting
    for (const setting of settings) {
      await run(
        `INSERT INTO feature_visibility (role, feature, visible) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE visible = VALUES(visible)`,
        [setting.role, setting.feature, setting.visible ? 1 : 0]
      );
    }

    return res.json({ success: true, message: 'Feature visibility settings updated' });
  } catch (err) {
    console.error('Update feature visibility error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
