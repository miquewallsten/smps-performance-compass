import { verifyToken, hashToken } from '../auth/jwt.js';
import db from '../db/connection.js';
export async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    // Check if token is in blocklist (logged out)
    const tokenHash = hashToken(token);
    const blocked = db.prepare('SELECT id FROM sessions WHERE token_hash = ?').get(tokenHash);
    if (blocked) {
        return res.status(401).json({ error: 'Token revoked' });
    }
    req.user = { ...payload, id: payload.sub };
    next();
}
//# sourceMappingURL=auth.js.map