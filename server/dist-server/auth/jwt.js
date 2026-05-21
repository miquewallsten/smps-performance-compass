import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';
export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
export function getTokenExpiry() {
    const date = new Date();
    date.setHours(date.getHours() + 24);
    return date;
}
export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
export function getRole(user) {
    if (user.isSuperUser)
        return 'super_user';
    if (user.isAdmin)
        return 'admin';
    return 'user';
}
//# sourceMappingURL=jwt.js.map