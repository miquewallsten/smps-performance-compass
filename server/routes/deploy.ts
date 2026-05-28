import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);
const DEPLOY_SECRET = process.env.DEPLOY_WEBHOOK_SECRET || 'smps-deploy-webhook-2025';

// ─── POST /api/deploy ──────────────────────────────────────────────────────
// Called by GitHub Actions after pushing built artifacts
// NOTE: Build artifacts (dist/, server.cjs) are uploaded via SCP by CI,
// they are NOT in git. This webhook only handles git pull + npm install + restart.
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

    // Respond immediately so CI doesn't hang
    res.json({ status: 'deploy_started' });

    // Run deployment in background (non-blocking)
    deployAsync().catch(err => console.error('[Deploy] Async error:', err));
  } catch (err) {
    console.error('Deploy webhook error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Deploy webhook failed' });
    }
  }
});

async function deployAsync() {
  const appDir = process.env.DEPLOY_PATH || process.cwd();
  console.log(`[Deploy] Working directory: ${appDir}`);

  try {
    // Set up proper PATH for Hostinger environment
    const env = {
      ...process.env,
      HOME: process.env.HOME || '/home/u906489923',
      PATH: `${appDir}/node_modules/.bin:/opt/alt/alt-nodejs22/root/usr/bin:/usr/local/bin:/usr/bin:/bin`,
      NODE_ENV: 'production',
    };

    // Git pull — only source code, NOT build artifacts
    // Do NOT delete dist/ or dist/assets/ — those are managed by CI SCP uploads
    await execAsync(`cd ${appDir} && git checkout -- . 2>&1`, { env });
    const { stdout: gitOut } = await execAsync(`cd ${appDir} && git pull origin main 2>&1`, { env });
    console.log('[Deploy] Git pull:', gitOut);

    // Check if there were actual changes
    if (gitOut.includes('Already up to date')) {
      console.log('[Deploy] No changes detected, skipping restart');
      return;
    }

    // npm install (with proper PATH)
    try {
      const { stdout: npmOut } = await execAsync(`cd ${appDir} && npm install --omit=dev --ignore-scripts 2>&1`, { env, timeout: 60000 });
      console.log('[Deploy] npm install:', npmOut.slice(-200));
    } catch (npmErr: any) {
      console.log('[Deploy] npm install warning:', (npmErr.message || '').slice(-200));
      // Don't fail - npm install failure is not critical
    }

    // Restart Passenger by touching restart.txt
    try {
      await execAsync(`mkdir -p ${appDir}/tmp && touch ${appDir}/tmp/restart.txt`, { env });
      console.log('[Deploy] Passenger restart triggered');
    } catch (restartErr) {
      console.log('[Deploy] Could not trigger Passenger restart:', restartErr);
    }

    console.log('[Deploy] Deployment complete!');
  } catch (deployErr) {
    console.error('[Deploy] Error:', deployErr);
  }
}

export default router;
