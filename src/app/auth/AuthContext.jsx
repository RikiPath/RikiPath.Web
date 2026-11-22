import { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthContext } from './authContext.js';
import { getSession, saveSession, clearSession, patchSession } from './session.js';
import { extractUserFromToken, normalizeRole } from './jwt.js';
import { homePathForRole } from '@/features/auth/api/authApi.js';
import { queryClient } from '@/api/queryClient.js';
import { notify } from '@/components/ui/feedbackStore.js';

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  useEffect(() => {
    // Listen for storage changes if updated in another tab
    const handleStorageChange = () => {
      setSessionState(getSession());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const token = session?.accessToken || session?.token || null;
  const decodedUser = useMemo(() => (token ? extractUserFromToken(token) : null), [token]);

  // Roles extraction & normalization
  const roles = useMemo(() => {
    if (decodedUser?.roles && decodedUser.roles.length > 0) {
      return decodedUser.roles;
    }
    if (session?.role) {
      return [normalizeRole(session.role)];
    }
    if (session?.user?.role) {
      return [normalizeRole(session.user.role)];
    }
    return [];
  }, [decodedUser, session]);

  // No role claim → no privileged role is assumed (falls back to the least-privileged Learner home).
  const primaryRole = roles[0] || 'Learner';

  // Merge stored user details with JWT claims
  const user = useMemo(() => {
    if (!token && !session?.user && !session?.userId) return null;
    return {
      userId: decodedUser?.userId || session?.userId || session?.user?.id || '0',
      email: decodedUser?.email || session?.email || session?.user?.email || '',
      fullName: session?.fullName || session?.user?.fullName || decodedUser?.fullName || decodedUser?.name || 'User',
      name: session?.fullName || session?.user?.fullName || decodedUser?.name || 'User',
      roles,
      primaryRole,
      avatarUrl: session?.avatarUrl || session?.user?.avatarUrl || null,
      ...session?.user,
      ...decodedUser,
    };
  }, [decodedUser, session, roles, primaryRole, token]);

  const isAuthenticated = Boolean(token && (!decodedUser || !decodedUser.isExpired));

  const hasRole = useCallback(
    (roleToCheck) => {
      if (!roleToCheck) return false;
      const normalized = normalizeRole(roleToCheck).toLowerCase();
      return roles.some((r) => r.toLowerCase() === normalized);
    },
    [roles]
  );

  const hasAnyRole = useCallback(
    (allowedRoles) => {
      if (!allowedRoles || allowedRoles.length === 0) return true;
      const list = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      return list.some((reqRole) => hasRole(reqRole));
    },
    [hasRole]
  );

  const isAdmin = hasRole('Admin');
  const isContentAuthor = hasRole('ContentAuthor');
  const isMentor = hasRole('Mentor') || hasRole('Consultant');
  const isLearner = hasRole('Learner') || (!isAdmin && !isContentAuthor && !isMentor);

  const homePath = homePathForRole(primaryRole);

  const refreshSession = useCallback(() => {
    setSessionState(getSession());
  }, []);

  const login = useCallback((sessionData, remember = true) => {
    saveSession(sessionData, remember);
    setSessionState(sessionData);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    if (getSession()) {
      notify.error('Chưa đăng xuất được', 'Vui lòng thử lại.', { key: 'auth-logout-error' });
      return;
    }
    queryClient.clear();
    notify.flash('success', 'Bạn đã đăng xuất thành công.', '', { key: 'auth-logout-success' });
    // Hard redirect immediately without triggering ProtectedRoute's `<Navigate state={{ from }}>` stashing the previous role's path.
    window.location.replace('/auth/');
  }, []);

  /** Session expired (401 from the API or JWT exp passed): clear it without a full reload so the return path survives. */
  const expireSession = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  const updateSession = useCallback((partial) => {
    const updated = patchSession(partial);
    setSessionState(updated);
  }, []);

  const value = {
    session,
    token,
    user,
    roles,
    primaryRole,
    isAdmin,
    isContentAuthor,
    isMentor,
    isLearner,
    isAuthenticated,
    homePath,
    hasRole,
    hasAnyRole,
    login,
    logout,
    expireSession,
    updateSession,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


