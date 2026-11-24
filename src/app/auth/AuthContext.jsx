import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AuthContext } from './authContext.js';
import { getSession, saveSession, clearSession, patchSession, saveAuthRedirectNotice, saveRememberedLogin } from './session.js';
import { extractUserFromToken, normalizeRole } from './jwt.js';
import { homePathForRole, getAuthMe } from '@/features/auth/api/authApi.js';
import { queryClient } from '@/api/queryClient.js';
import { notify } from '@/components/ui/feedbackStore.js';
import { normalizeAvatarUrl } from '@/components/ui/userAvatarLogic.js';
import { clearSidebarCounterSnapshots } from '@/features/sidebar-counters/api/sidebarCountersApi.js';

function buildSessionPatchFromUser(me) {
  if (!me || typeof me !== 'object') return null;
  const patch = {
    _meSynced: undefined,
  };
  if (me.userId != null) patch.userId = me.userId;
  if (me.fullName) patch.fullName = String(me.fullName).trim();
  if (me.email) patch.email = String(me.email).trim();
  if (me.role) patch.role = me.role;
  if ('avatarUrl' in me) patch.avatarUrl = normalizeAvatarUrl(me.avatarUrl);
  if ('phoneNumber' in me) patch.phoneNumber = me.phoneNumber ?? null;
  if ('pendingEmail' in me) patch.pendingEmail = me.pendingEmail ?? null;
  if ('isEmailVerified' in me) patch.isEmailVerified = Boolean(me.isEmailVerified);
  if (typeof me.hasPassword === 'boolean') patch.hasPassword = me.hasPassword;
  if ('googleLinked' in me) patch.googleLinked = Boolean(me.googleLinked);
  return patch;
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());
  const [meSyncedToken, setMeSyncedToken] = useState(null);
  const activeIdentityRef = useRef({
    userId: session?.userId ?? null,
    token: session?.accessToken || session?.token || null,
  });

  useEffect(() => {
    activeIdentityRef.current = {
      userId: session?.userId ?? null,
      token: session?.accessToken || session?.token || null,
    };
  }, [session?.userId, session?.accessToken, session?.token]);

  useEffect(() => {
    // Sync across browser tabs and clear React Query cache immediately on logout or account switch
    const handleStorageChange = () => {
      const next = getSession();
      const prev = activeIdentityRef.current;
      const nextToken = next?.accessToken || next?.token || null;
      const switchedOrLoggedOut =
        (Boolean(prev.token || prev.userId) && !next) ||
        (prev.userId != null && next?.userId != null && String(next.userId) !== String(prev.userId)) ||
        (Boolean(prev.token) && Boolean(nextToken) && nextToken !== prev.token);
      if (switchedOrLoggedOut) {
        clearSidebarCounterSnapshots();
        queryClient.clear();
        setMeSyncedToken(null);
      }
      setSessionState(next);
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

  // Merge stored user details with JWT claims (session values win for mutable profile fields)
  const user = useMemo(() => {
    if (!token && !session?.user && !session?.userId) return null;
    const resolvedName = String(
      session?.fullName || session?.user?.fullName || decodedUser?.fullName || decodedUser?.name || '',
    ).trim() || 'User';
    const resolvedAvatarUrl = normalizeAvatarUrl(session?.avatarUrl ?? session?.user?.avatarUrl);
    const resolvedEmail = session?.email || decodedUser?.email || session?.user?.email || '';
    const resolvedId = decodedUser?.userId || session?.userId || session?.user?.id || '0';
    const resolvedVerified = typeof session?.isEmailVerified === 'boolean' ? session.isEmailVerified : true;
    return {
      ...session?.user,
      ...decodedUser,
      id: resolvedId,
      userId: resolvedId,
      email: resolvedEmail,
      pendingEmail: session?.pendingEmail ?? null,
      displayName: resolvedName,
      fullName: resolvedName,
      name: resolvedName,
      phoneNumber: session?.phoneNumber ?? null,
      avatarUrl: resolvedAvatarUrl,
      role: primaryRole,
      emailVerified: resolvedVerified,
      isEmailVerified: resolvedVerified,
      hasPassword: typeof session?.hasPassword === 'boolean' ? session.hasPassword : true,
      googleLinked: Boolean(session?.googleLinked),
      roles,
      primaryRole,
    };
  }, [decodedUser, session, roles, primaryRole, token]);

  // The API validates JWT lifetime; the device clock must not sign users out.
  const isAuthenticated = Boolean(token);
  const userLoading = Boolean(isAuthenticated && !session?.isPreview && meSyncedToken !== token);

  useEffect(() => {
    if (!isAuthenticated || !token || session?.isPreview || meSyncedToken === token) return undefined;
    let active = true;
    getAuthMe()
      .then((res) => {
        if (!active || getSession()?.accessToken !== token) return;
        const me = res?.result;
        if (me) {
          const patch = buildSessionPatchFromUser(me);
          if (patch) {
            const updated = patchSession(patch);
            if (updated) setSessionState(updated);
          }
        }
        setMeSyncedToken(token);
      })
      .catch(() => {
        if (active) setMeSyncedToken(token);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, token, session?.isPreview, meSyncedToken]);

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
    const cleanSession = sessionData ? { ...sessionData, avatarUrl: normalizeAvatarUrl(sessionData.avatarUrl) } : sessionData;
    clearSidebarCounterSnapshots();
    queryClient.clear();
    saveSession(cleanSession, remember);
    setMeSyncedToken(cleanSession?.accessToken || null);
    setSessionState(cleanSession);
  }, []);

  const logout = useCallback((options = {}) => {
    clearSession();
    if (getSession()) {
      notify.error('Chưa đăng xuất được', 'Vui lòng thử lại.', { key: 'auth-logout-error' });
      return;
    }
    setMeSyncedToken(null);
    clearSidebarCounterSnapshots();
    queryClient.clear();
    if (options?.email) {
      saveRememberedLogin({ email: options.email, remember: true });
    }
    if (options?.notice) {
      saveAuthRedirectNotice({
        notice: options.notice,
        tone: options.tone || 'success',
        email: options.email || '',
        focusPassword: Boolean(options.focusPassword),
      });
    }
    if (!options?.skipDefaultToast) {
      notify.flash(
        options?.tone || 'success',
        options?.flashTitle || 'Bạn đã đăng xuất thành công.',
        options?.flashDescription || '',
        { key: options?.flashKey || 'auth-logout-success' },
      );
    }
    // Hard redirect immediately without triggering ProtectedRoute's `<Navigate state={{ from }}>` stashing the previous role's path.
    window.location.replace('/auth/');
  }, []);

  /** Session expired (401 from the API or JWT exp passed): clear it without a full reload so the return path survives. */
  const expireSession = useCallback(() => {
    clearSession();
    setMeSyncedToken(null);
    clearSidebarCounterSnapshots();
    queryClient.clear();
    setSessionState(null);
  }, []);

  const updateSession = useCallback((partial) => {
    const updated = patchSession(partial);
    setSessionState(updated);
  }, []);

  const syncUserProfile = useCallback((serverUser) => {
    const patch = buildSessionPatchFromUser(serverUser);
    if (!patch) return null;
    const updated = patchSession(patch);
    if (updated) setSessionState(updated);
    return updated;
  }, []);

  const value = {
    session,
    token,
    user,
    userLoading,
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
    syncUserProfile,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


