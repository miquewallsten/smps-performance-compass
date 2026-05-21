import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashSecurityAnswer(answer: string): Promise<string> {
  const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
  return bcrypt.hash(normalized, SALT_ROUNDS);
}

export async function verifySecurityAnswer(answer: string, hash: string): Promise<boolean> {
  const normalized = answer.toLowerCase().trim().replace(/\s+/g, ' ');
  return bcrypt.compare(normalized, hash);
}
