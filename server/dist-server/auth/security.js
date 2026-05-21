import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 12;
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export async function hashSecurityAnswer(answer) {
    const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
    return bcrypt.hash(normalized, SALT_ROUNDS);
}
export async function verifySecurityAnswer(answer, hash) {
    const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
    return bcrypt.compare(normalized, hash);
}
//# sourceMappingURL=security.js.map