/**
 * Frontend authorization helpers for SMPS Performance Compass.
 *
 * SINGLE SOURCE OF TRUTH for role-based checks.
 * Replaces the 5+ inconsistent `isAdminOrSocio` definitions scattered across pages.
 *
 * Usage:
 *   const { isAdminOrSocio, canViewAllEvals } = useRoleCheck();
 *   if (!isAdminOrSocio) return <Navigate to="/dashboard" />;
 */

import { useAuth } from '@/contexts/AuthContext';

interface RoleCheckResult {
  /** True if user is super_user, admin, managing partner, or socio */
  isAdminOrSocio: boolean;
  /** True if user is super_user */
  isSuperUser: boolean;
  /** True if user is admin (includes super_user) */
  isAdmin: boolean;
  /** True if user is a socio (managing partner or regular socio) */
  isSocio: boolean;
  /** True if user can view all evaluations (admin/socio/super_user) */
  canViewAllEvals: boolean;
  /** True if user can manage users (admin/super_user) */
  canManageUsers: boolean;
  /** True if user can manage periods (admin/super_user) */
  canManagePeriods: boolean;
  /** The user's normalized role string */
  role: 'super_user' | 'admin' | 'socio' | 'employee';
}

/**
 * Determine if a user is a socio (managing partner or regular socio/salary partner).
 * This matches the backend `normalizeRole` logic in permissions.ts.
 */
function isSocioPosition(position?: string, isManagingPartner?: boolean): boolean {
  return !!isManagingPartner || position === 'socio' || position === 'salary_partner';
}

/**
 * Normalize a user's role to match backend logic.
 */
function normalizeUserRole(user: {
  isSuperUser?: boolean;
  isAdmin?: boolean;
  isManagingPartner?: boolean;
  position?: string;
}): 'super_user' | 'admin' | 'socio' | 'employee' {
  if (user.isSuperUser) return 'super_user';
  if (user.isAdmin || user.isManagingPartner) return 'admin';
  if (isSocioPosition(user.position, user.isManagingPartner)) return 'socio';
  return 'employee';
}

/**
 * Hook that provides consistent role-based authorization checks.
 *
 * IMPORTANT: This is the ONLY place where `isAdminOrSocio` should be computed.
 * All pages should use this hook instead of inline role checks.
 */
export function useRoleCheck(): RoleCheckResult {
  const { user } = useAuth();

  if (!user) {
    return {
      isAdminOrSocio: false,
      isSuperUser: false,
      isAdmin: false,
      isSocio: false,
      canViewAllEvals: false,
      canManageUsers: false,
      canManagePeriods: false,
      role: 'employee',
    };
  }

  const role = normalizeUserRole(user);
  const isSuperUser = user.isSuperUser ?? false;
  const isAdmin = user.isAdmin ?? false;
  const isManagingPartner = user.isManagingPartner ?? false;
  const isSocioRole = isSocioPosition(user.position, isManagingPartner);

  // isAdminOrSocio: matches backend `isAdminOrSocio()` from permissions.ts
  // super_user → matches everything
  // admin → matches admin, managing_partner
  // socio → matches socio, admin
  const isAdminOrSocio = isSuperUser || isAdmin || isManagingPartner || isSocioRole;

  return {
    isAdminOrSocio,
    isSuperUser,
    isAdmin: isSuperUser || isAdmin,
    isSocio: isSocioRole,
    canViewAllEvals: isAdminOrSocio,
    canManageUsers: isSuperUser || isAdmin,
    canManagePeriods: isSuperUser || isAdmin,
    role,
  };
}

/**
 * Check if a viewer can see another user's evaluations.
 * Matches backend `canViewUserEvaluations` logic from visibility.ts.
 */
export function canViewUserEvaluations(
  viewer: { id: string; isSuperUser?: boolean; isAdmin?: boolean; isManagingPartner?: boolean; position?: string },
  target: { id: string; isManagingPartner?: boolean; position?: string }
): boolean {
  // Self
  if (viewer.id === target.id) return true;
  // SuperUser & Admin see all
  if (viewer.isSuperUser || viewer.isAdmin) return true;
  // Managing Partner sees all
  if (viewer.isManagingPartner) return true;
  // Regular socio: can see all EXCEPT other socios and managing partner
  if (viewer.position === 'socio') {
    if (target.isManagingPartner) return false;
    if (target.position === 'socio') return false;
    if (target.position === 'salary_partner') return false;
    return true;
  }
  // Default: allow (supervisor checks happen separately)
  return true;
}