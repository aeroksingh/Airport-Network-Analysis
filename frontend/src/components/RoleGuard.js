// import useRole from '../hooks/useRole';

// /**
//  * RoleGuard — renders children only if the current user's role is in the allowed list.
//  *
//  * Usage:
//  *   <RoleGuard roles={['admin', 'staff']}>
//  *     <button>Add Flight</button>
//  *   </RoleGuard>
//  *
//  * Props:
//  *   roles     — array of allowed role strings
//  *   fallback  — optional JSX to render when access is denied (default: null)
//  */
// export default function RoleGuard({ roles = [], fallback = null, children }) {
//   const { hasRole } = useRole();

//   if (!roles.length || hasRole(...roles)) {
//     return children;
//   }

//   return fallback;
// }

// /**
//  * AccessDenied — friendly 403 message component.
//  */
// export function AccessDenied() {
//   return (
//     <div style={{
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       justifyContent: 'center',
//       padding: '60px 20px',
//       textAlign: 'center',
//     }}>
//       <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
//       <h2 style={{ color: '#f0f4ff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
//         Access Denied
//       </h2>
//       <p style={{ color: '#4a6080', fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>
//         You don't have permission to perform this action.
//         Contact an administrator if you believe this is an error.
//       </p>
//     </div>
//   );
// }


import { useAuth } from '../App';

// Usage: <RoleGuard roles={['admin', 'staff']}>  <button>...</button>  </RoleGuard>
// If user role is NOT in the allowed list, renders nothing.

export default function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuth();

  if (!user) return null;

  if (!roles.includes(user.role)) {
    return fallback; // renders null by default (hides element)
  }

  return children;
}