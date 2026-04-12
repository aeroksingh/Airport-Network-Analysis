import { useAuth } from '../App';

/**
 * Custom hook to get the current user's role and role-check helpers.
 *
 * Usage:
 *   const { role, isAdmin, isStaff, isViewer, hasRole } = useRole();
 *   if (hasRole('admin', 'staff')) { ... }
 */
export default function useRole() {
  const { user } = useAuth();
  const role = user?.role || 'viewer';

  return {
    role,
    isAdmin: role === 'admin',
    isStaff: role === 'staff',
    isViewer: role === 'viewer',
    hasRole: (...roles) => roles.includes(role),
    can: (allowedRoles) => allowedRoles.includes(user?.role),
  };
}
