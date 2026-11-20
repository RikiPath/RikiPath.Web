import { useLocation, useNavigate } from 'react-router-dom';
import { learnerHomePath } from '@/features/auth/api/authApi.js';
import { queryClient } from '@/api/queryClient.js';
import { useAuth } from '@/app/auth/authContext.js';
import { saveRememberedLogin } from '@/app/auth/session.js';
import { extractUserFromToken, normalizeRole } from '@/app/auth/jwt.js';
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
  const { login } = useAuth();
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
      avatarUrl: result.avatarUrl || null,
      role: result.role,
      isEmailVerified: Boolean(result.isEmailVerified),
      hasPassword: typeof result.hasPassword === 'boolean' ? result.hasPassword : true,
      googleLinked: Boolean(result.googleLinked),
    };
    login(nextSession, remember);
    saveRememberedLogin({ email: result.email, remember });
    notify.success('Đăng nhập thành công! Chào mừng bạn trở lại RikiPath.', '', { key: 'auth-login-success' });

    const claims = extractUserFromToken(result.accessToken);
    const roles = claims?.roles?.length ? claims.roles : [normalizeRole(result.role)];
    const role = roles[0];

    const from = location.state?.from;
    const normalizedFromPath = from?.pathname ? `${from.pathname.replace(/\/+$/, '')}/` : '';
    if (
      role === 'Learner' &&
      from?.state?.payment &&
      ['/payment/success/', '/payment/cancel/', '/study-payment-receipt/'].includes(normalizedFromPath)
    ) {
      navigate(normalizedFromPath, { replace: true, state: from.state });
      return;
    }

    let home;
    if (role === 'Learner') {
      let prefetchFailed = false;
      await prefetchLearnerHome(nextSession).catch((err) => {
        prefetchFailed = true;
        recordDiagnostic({ source: 'useCompleteSignIn', operation: 'prefetchLearnerHome', error: err });
      });
      const cachedProfile = queryClient.getQueryData(learnerProfileQueryKey(nextSession));
      home = prefetchFailed && !cachedProfile ? '/app' : learnerHomePath(cachedProfile, role);
    } else {
      home = learnerHomePath(null, role);
    }
    // Onboarding must finish first; otherwise honour a safe, role-allowed return path.
    const target = home === '/onboarding'
      ? home
      : postLoginDestination(from ? `${from.pathname || ''}${from.search || ''}` : '', home, (path) => canAccessPath(path, roles));
    navigate(target, { replace: true });
  };
}
