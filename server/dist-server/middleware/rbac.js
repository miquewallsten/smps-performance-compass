import db from '../db/connection.js';
export function requireAdmin(req, res, next) {
    if (!req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    const role = req.user.role;
    if (role === 'admin' || role === 'super_user')
        return next();
    return res.status(403).json({ error: 'Admin access required' });
}
export function requireSuperUser(req, res, next) {
    if (!req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role === 'super_user')
        return next();
    return res.status(403).json({ error: 'Super user access required' });
}
export function requireSelfOrAdmin(req, res, next) {
    if (!req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    const targetId = req.params.id;
    if (req.user.role === 'admin' || req.user.role === 'super_user' || req.user.id === targetId) {
        return next();
    }
    return res.status(403).json({ error: 'Access denied' });
}
export function requireAuthenticated(req, res, next) {
    if (!req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    next();
}
export async function getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
//# sourceMappingURL=rbac.js.map