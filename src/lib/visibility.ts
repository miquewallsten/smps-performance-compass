import { User, Evaluation } from '@/types';

/**
 * Determines if `viewer` can see the evaluations of `target`.
 *
 * Rules:
 * - SuperUser & Admin: see all
 * - Managing Partner (Socio Administrador): see all
 * - Other Socios: see all EXCEPT other Socios and the Managing Partner
 *   (they don't see Salary Partner either, treated as peer Socio level)
 * - Other users: visibility handled elsewhere by assignment
 */
export function canViewUserEvaluations(viewer: User, target: User): boolean {
  if (viewer.id === target.id) return true;
  if (viewer.isSuperUser || viewer.isAdmin) return true;
  if (viewer.isManagingPartner) return true;

  if (viewer.position === 'socio') {
    // Regular Socio: hide other Socios, Managing Partner, and Salary Partners
    if (target.isManagingPartner) return false;
    if (target.position === 'socio') return false;
    if (target.position === 'salary_partner') return false;
    return true;
  }

  return true;
}

/**
 * Filter a list of users keeping only those visible to the viewer.
 */
export function filterVisibleUsers(viewer: User, users: User[]): User[] {
  return users.filter(u => canViewUserEvaluations(viewer, u));
}

/**
 * Filter evaluations to those where the evaluated user is visible to the viewer.
 */
export function filterVisibleEvaluations(viewer: User, evaluations: Evaluation[], users: User[]): Evaluation[] {
  return evaluations.filter(ev => {
    const target = users.find(u => u.id === ev.evaluatedId);
    return target ? canViewUserEvaluations(viewer, target) : false;
  });
}
