import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth/authContext.js';
import { homeForRole } from '@/app/routes/routeTable.js';
import { ForbiddenScreen } from '@/components/ui';

/**
 * Route guard. Roles come from the verified session (JWT claims via AuthContext).
 *  - not signed in / token expired → /auth with a safe return path (401 semantics)
 *  - signed in but wrong role      → 403 screen; the session is kept (never treated as expiry)
 */
export default function ProtectedRoute({ children, allowedRoles, requireAdmin = false }) {
  const { isAuthenticated, token, hasAnyRole, primaryRole, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const expired = Boolean(token);
    return (
      <Navigate
        to="/auth/"
        replace
        state={{
          from: { pathname: location.pathname, search: location.search },
          notice: expired ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.' : undefined,
        }}
      />
    );
  }

  const required = requireAdmin ? ['Admin'] : Array.isArray(allowedRoles) ? allowedRoles : allowedRoles ? [allowedRoles] : [];
  if (required.length > 0 && !hasAnyRole(required)) {
    return <ForbiddenScreen homePath={homeForRole(primaryRole)} onSwitchAccount={logout} />;
  }

  return children;
}
