import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getSession, saveSession, clearSession, patchSession } from './session.js';
import { extractUserFromToken, normalizeRole } from './jwt.js';
import { homePathForRole } from '../api/auth.js';

const AuthContext = createContext(null);

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

  const primaryRole = roles[0] || (session?.role ? normalizeRole(session.role) : (session?.user?.role ? normalizeRole(session.user.role) : 'Learner'));

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

  const login = useCallback((sessionData, remember = true) => {
    saveSession(sessionData, remember);
    setSessionState(sessionData);
  }, []);

  const logout = useCallback(() => {
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
    updateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

