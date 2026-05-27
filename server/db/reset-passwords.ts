/**
 * Reset all user passwords to "1234" (except SuperAdmin).
 * Also clears must_change_password flag for all non-SuperAdmin users.
 * 
 * Usage: npx tsx server/db/reset-passwords.ts
 */
import { db } from './connection.js';
import bcrypt from 'bcryptjs';

const RESET_PASSWORD = '1234';
const SUPERADMIN_EMAIL = 'lab@bowdot.com';

export async function resetPasswords(): Promise<void> {
  console.log('Resetting all user passwords (except SuperAdmin)...');

  const passwordHash = bcrypt.hashSync(RESET_PASSWORD, 12);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Update all non-SuperAdmin users: reset password to "1234" and clear must_change_password
  const result = await db.run(
    `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE email != ?`,
    [passwordHash, now, SUPERADMIN_EMAIL]
  );

  console.log(`  ✓ Updated ${result.affectedRows} user(s) — password set to "${RESET_PASSWORD}", must_change_password cleared`);

  // Also reset security_answer for all non-SuperAdmin users to match their email
  // (security question is "¿Cuál es su correo electrónico?" and answer is the email)
  const users = await db.all(
    `SELECT id, email FROM users WHERE email != ?`,
    [SUPERADMIN_EMAIL]
  ) as { id: string; email: string }[];

  for (const user of users) {
    const securityAnswerHash = bcrypt.hashSync(user.email.toLowerCase().trim(), 12);
    await db.run(
      `UPDATE users SET security_question = ?, security_answer = ? WHERE id = ?`,
      ['¿Cuál es su correo electrónico?', securityAnswerHash, user.id]
    );
  }
  console.log(`  ✓ Reset security answers for ${users.length} user(s)`);

  // Clear all sessions so users must log in again
  try {
    await db.run('DELETE FROM sessions');
    console.log('  ✓ Cleared all sessions (users must log in again)');
  } catch {
    console.log('  ⚠ Could not clear sessions table');
  }

  console.log('\n✅ Password reset complete!');
  console.log(`   All users (except SuperAdmin): password = "${RESET_PASSWORD}"`);
  console.log(`   SuperAdmin (${SUPERADMIN_EMAIL}): password unchanged`);
}

// Self-execution
if (import.meta.url === `file://${process.argv[1]}`) {
  resetPasswords().catch(err => {
    console.error('Reset failed:', err);
    process.exit(1);
  });
}
