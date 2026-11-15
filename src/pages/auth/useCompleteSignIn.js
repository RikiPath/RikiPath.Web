import { useLocation, useNavigate } from 'react-router-dom';
import { learnerHomePath } from '../../api/auth.js';
import { queryClient } from '../../api/queryClient.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { learnerKeys, prefetchLearnerHome } from '../../hooks/useLearnerHome.js';

export function useCompleteSignIn() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return async function completeSignIn(data, remember) {
    const result = data?.result;
    if (!result?.accessToken) throw new Error('Đăng nhập thành công nhưng thiếu accessToken.');

    queryClient.removeQueries({ queryKey: learnerKeys.profile });
    login({
      accessToken: result.accessToken,
      userId: result.userId,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
    }, remember);

    let profile;
    if (result.role?.toLowerCase() === 'learner') {
      const paymentReturn = location.state?.from;
      if (paymentReturn?.state?.payment && [
        '/payment/cancel/', '/consultation-receipt/',
      ].includes(paymentReturn.pathname)) {
        navigate(paymentReturn.pathname, { replace: true, state: paymentReturn.state });
        return;
      }

      await prefetchLearnerHome().catch(() => {});
      profile = queryClient.getQueryData(learnerKeys.profile);
    }

    navigate(learnerHomePath(profile, result.role), { replace: true });
  };
}
