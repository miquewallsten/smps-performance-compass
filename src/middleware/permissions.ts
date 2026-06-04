/**
 * Client-side role checking utilities for SMPS Performance Compass.
 */

export type Role = 'super_user' | 'admin' | 'managing_partner' | 'socio' | 'employee';

/**
 * Check if a user has one of the allowed roles.
 * super_user → matches everything
 * admin → matches admin, managing_partner
 * others → match exactly
 */
export function hasRole(user: { isSuperUser: boolean; isAdmin: boolean; position?: string } | null, allowedRoles: Role[]): boolean {
  if (!user) return false;
  
  // super_user has access to everything
  if (user.isSuperUser) return true;
  
  // admin has access to admin-level features
  if (user.isAdmin && allowedRoles.includes('admin')) return true;
  
  // Check specific positions
  if (user.position) {
    if (allowedRoles.includes('managing_partner') && user.position === 'managing_partner') return true;
    if (allowedRoles.includes('socio') && ['socio', 'salary_partner'].includes(user.position)) return true;
    if (allowedRoles.includes('employee') && user.position !== 'managing_partner' && user.position !== 'socio' && user.position !== 'salary_partner') return true;
  }
  
  return false;
}
