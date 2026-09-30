import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';
import { homePathForRole } from '../api/auth.js';

export default function ProtectedRoute({
  children,
  allowedRoles,
  requireAdmin = false,
  requireAuthor = false,
  requireConsultant = false,
}) {
  const { isAuthenticated, user, roles, primaryRole, hasRole, hasAnyRole, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Construct required roles list
  let requiredRoles = [];
  if (allowedRoles) {
    requiredRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  } else if (requireAdmin) {
    requiredRoles = ['Admin'];
  } else if (requireAuthor) {
    requiredRoles = ['ContentAuthor', 'Admin'];
  } else if (requireConsultant) {
    requiredRoles = ['Consultant', 'Admin'];
  }

  if (requiredRoles.length > 0) {
    const hasPermission = hasAnyRole(requiredRoles);

    if (!hasPermission) {
      const myHomePath = homePathForRole(primaryRole);

      return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#FAF7F5]">
          <div className="max-w-lg w-full bg-white border border-[#F8BBD0] rounded-3xl p-8 text-center shadow-[0_8px_30px_rgba(217,75,104,0.1)]">
            <div className="w-16 h-16 bg-[#FDF2F5] text-[#D94B68] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#F8BBD0]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#FDF2F5] text-[#D94B68] text-xs font-bold uppercase tracking-wider mb-2">
              Truy cập bị giới hạn (403 Forbidden)
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không đủ quyền truy cập</h2>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Tài khoản của bạn (<strong className="text-gray-900">{user?.email || user?.name}</strong>) đang có vai trò{' '}
              <span className="font-semibold text-[#D94B68] px-2 py-0.5 bg-[#FFF0F5] rounded-md border border-[#F8BBD0]">
                {primaryRole}
              </span>
              , nhưng trang này yêu cầu một trong các quyền:{' '}
              <span className="font-semibold text-gray-800">
                {requiredRoles.join(', ')}
              </span>
              .
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Link
                to={myHomePath}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] hover:opacity-95 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#D94B68]/20"
              >
                <Home className="w-4 h-4" />
                Về Cổng làm việc của bạn
              </Link>
              <button
                type="button"
                onClick={logout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất / Đổi tài khoản
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
}

