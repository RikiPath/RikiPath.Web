import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { getMySubscription } from '../api/subscriptions.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { getSession } from '../auth/session.js';

export default function RequireStudyPlan({ children }) {
  const location = useLocation();
  const session = getSession();
  const { isAuthenticated, isLearner } = useAuth();
  const path = location.pathname.replace(/\/$/, '') || '/';

  const subscriptionQuery = useQuery({
    queryKey: ['study-subscription'],
    queryFn: getMySubscription,
    enabled: Boolean(isAuthenticated && isLearner && !session?.isPreview),
    retry: false,
    staleTime: 0,
  });

  if (session?.isPreview || path === '/plans') return children;
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  if (!isLearner) return children;

  if (subscriptionQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F7] text-[#8C7782]">
        Đang kiểm tra gói học…
      </div>
    );
  }

  if (subscriptionQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F7] px-6">
        <div className="max-w-md rounded-2xl border border-[#EADFE5] bg-white p-6 text-center">
          <p className="text-[#49353F]">Chưa kiểm tra được gói học.</p>
          <button
            type="button"
            onClick={() => subscriptionQuery.refetch()}
            className="mt-4 rounded-full bg-[#AD3155] px-4 py-2 text-sm font-medium text-white"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!subscriptionQuery.data?.active) {
    return <Navigate to="/plans" state={{ from: location }} replace />;
  }

  return children;
}
