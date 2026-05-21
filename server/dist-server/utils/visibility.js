// Determines if `viewer` can see evaluations of `target`
// Ported from src/lib/visibility.ts for server-side use
export function canViewUserEvaluations(viewer, target) {
    if (viewer.id === target.id)
        return true;
    if (viewer.is_super_user || viewer.is_admin)
        return true;
    if (viewer.is_managing_partner)
        return true;
    if (viewer.position === 'socio') {
        if (target.is_managing_partner)
            return false;
        if (target.position === 'socio')
            return false;
        if (target.position === 'salary_partner')
            return false;
        return true;
    }
    return true;
}
export function filterVisibleUsers(viewer, users) {
    return users.filter(u => canViewUserEvaluations(viewer, u));
}
//# sourceMappingURL=visibility.js.map