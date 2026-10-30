import { homePathForRole } from '../api/auth.js';
import { queryClient } from '../api/queryClient.js';
import { learnerKeys, prefetchLearnerHome } from '../hooks/useLearnerHome.js';

export function finishAuthSession({ data, remember, login, navigate }) {
  const result = data.result || {};
  if (!result.accessToken) return false;

  login(
    {
      accessToken: result.accessToken,
      userId: result.userId,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
    },
    remember,
  );

  if ((result.role || '').toLowerCase() === 'learner') {
    prefetchLearnerHome()
      .catch(() => {})
      .finally(() => {
        const profile = queryClient.getQueryData(learnerKeys.profile);
        if (!profile?.targetJlptLevelId) {
          navigate('/onboarding', { replace: true });
          return;
        }
        navigate('/app', { replace: true });
      });
  } else {
    navigate(homePathForRole(result.role), { replace: true });
  }

  return true;
}
