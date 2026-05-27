import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);
const DEPLOY_SECRET = process.env.DEPLOY_WEBHOOK_SECRET || 'smps-deploy-webhook-2025';

// ─── POST /api/deploy ──────────────────────────────────────────────────────
// Called by GitHub Actions after pushing built artifacts
router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const payload = JSON.stringify(req.body);
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', DEPLOY_SECRET).update(payload).digest('hex');

    if (signature !== expectedSig) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('[Deploy] Webhook received, starting deployment...');

    // Run git pull and restart in background (don't block the response)
    res.json({ status: 'deploy_started' });

    // Deploy in background
    try {
      const appDir = process.env.DEPLOY_PATH || process.cwd();
      console.log(`[Deploy] Working directory: ${appDir}`);
      
      const { stdout, stderr } = await execAsync(`cd ${appDir} && git pull origin main 2>&1`);
      console.log('[Deploy] Git pull:', stdout, stderr);

      // Install dependencies
      const { stdout: npmOut, stderr: npmErr } = await execAsync(`cd ${appDir} && npm install --omit=dev --ignore-scripts 2>&1`);
      console.log('[Deploy] npm install:', npmOut, npmErr);

      console.log('[Deploy] Deployment complete. Restart Passenger to pick up changes.');
      
      // Try to restart Passenger
      try {
        await execAsync(`cd ${appDir} && touch tmp/restart.txt 2>&1 || true`);
        console.log('[Deploy] Passenger restart triggered');
      } catch {
        console.log('[Deploy] Could not trigger Passenger restart (may need manual restart)');
      }
    } catch (deployErr) {
      console.error('[Deploy] Error:', deployErr);
    }
  } catch (err) {
    console.error('Deploy webhook error:', err);
    return res.status(500).json({ error: 'Deploy webhook failed' });
  }
});

export default router;
