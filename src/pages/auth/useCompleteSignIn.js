import { useLocation, useNavigate } from 'react-router-dom';
import { learnerHomePath, getAuthMe } from '@/features/auth/api/authApi.js';
import { queryClient } from '@/api/queryClient.js';
import { useAuth } from '@/app/auth/authContext.js';
import { saveRememberedLogin } from '@/app/auth/session.js';
import { extractUserFromToken, normalizeRole } from '@/app/auth/jwt.js';
import { normalizeAvatarUrl } from '@/components/ui/userAvatarLogic.js';
import { learnerKeys, learnerProfileQueryKey, prefetchLearnerHome } from '@/features/dashboard/hooks/useLearnerHome.js';
import { canAccessPath } from '@/app/routes/routeTable.js';
import { postLoginDestination } from '@/utils/safeRedirect.js';
import { recordDiagnostic } from '@/api/diagnostics.js';
import { notify } from '@/components/ui/feedbackStore.js';

/**
 * Finishes sign-in and sends the user to a role-correct page.
 * The role is read from the signed token claims first (falling back to the
 * server's login response) — never from URL parameters. A `from` path saved by
 * the route guard is honoured only if it is internal and allowed for that role.
 */
export function useCompleteSignIn() {
  const { login, syncUserProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return async function completeSignIn(data, remember) {
    const result = data?.result;
    if (!result?.accessToken) throw new Error('Đăng nhập chưa hoàn tất. Vui lòng thử lại.');

    // Clear previous account's query cache before establishing the new user's session.
    queryClient.clear();
    queryClient.removeQueries({ queryKey: learnerKeys.profile });
    const nextSession = {
      accessToken: result.accessToken,
      userId: result.userId,
      email: result.email,
      pendingEmail: result.pendingEmail || null,
      fullName: result.fullName,
      phoneNumber: result.phoneNumber || null,
      avatarUrl: normalizeAvatarUrl(result.avatarUrl),
      role: result.role,
      isEmailVerified: Boolean(result.isEmailVerified),
      hasPassword: typeof result.hasPassword === 'boolean' ? result.hasPassword : true,
      googleLinked: Boolean(result.googleLinked),
    };
    login(nextSession, remember);
    saveRememberedLogin({ email: result.email, remember });
    notify.success('Đăng nhập thành công!', '', { key: 'auth-login-success' });

    const claims = extractUserFromToken(result.accessToken);
    const roles = claims?.roles?.length ? claims.roles : [normalizeRole(result.role)];
    const role = roles[0];

    // Hydrate current user from Backend right after login when login payload lacks avatar/profile details
    // or to guarantee unified profile/AuthContext state without requiring a page reload.
    let syncedFromProfile = false;
    if (role === 'Learner') {
      let prefetchFailed = false;
      await prefetchLearnerHome(nextSession).catch((err) => {
        prefetchFailed = true;
        recordDiagnostic({ source: 'useCompleteSignIn', operation: 'prefetchLearnerHome', error: err });
      });
      const cachedProfile = queryClient.getQueryData(learnerProfileQueryKey(nextSession));
      if (cachedProfile) {
        syncUserProfile(cachedProfile);
        syncedFromProfile = true;
      }
      if (!syncedFromProfile && result.avatarUrl == null) {
        const meRes = await getAuthMe().catch(() => null);
        if (meRes?.result) syncUserProfile(meRes.result);
      }

      const from = location.state?.from;
      const normalizedFromPath = from?.pathname ? `${from.pathname.replace(/\/+$/, '')}/` : '';
      if (
        from?.state?.payment &&
        ['/payment/success/', '/payment/cancel/', '/study-payment-receipt/'].includes(normalizedFromPath)
      ) {
        navigate(normalizedFromPath, { replace: true, state: from.state });
        return;
      }

      const home = prefetchFailed && !cachedProfile ? '/app' : learnerHomePath(cachedProfile, role, nextSession);
      const fromUrl = from ? `${from.pathname || ''}${from.search || ''}` : '';
      const target = fromUrl
        ? postLoginDestination(fromUrl, home, (path) => canAccessPath(path, roles))
        : home;
      navigate(target, { replace: true });
      return;
    }

    // Non-Learner roles: hydrate current user via /Auth/me right after login so Header/Dropdown syncs immediately.
    const meRes = await getAuthMe().catch(() => null);
    if (meRes?.result) {
      syncUserProfile(meRes.result);
    }

    const from = location.state?.from;
    const home = learnerHomePath(null, role);
    const target = postLoginDestination(from ? `${from.pathname || ''}${from.search || ''}` : '', home, (path) => canAccessPath(path, roles));
    navigate(target, { replace: true });
  };
}
