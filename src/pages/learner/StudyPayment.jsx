import { Navigate, useSearchParams } from 'react-router-dom';

import { CHECKOUT_PLAN_PARAM, parsePlanIdParam } from '@/features/checkout/planGroups.js';

/**
 * Legacy `/study-payment?planId=6` (bookmarks, old links, the sign-in return path). Checkout now happens in the
 * confirmation modal on `/plans`, so this route only forwards to `/plans/?checkoutPlan=6`, which selects the
 * variant and opens the modal once. `replace` keeps Back from bouncing through this page again.
 */
export default function StudyPayment() {
  const [params] = useSearchParams();
  const planId = parsePlanIdParam(params.get('planId'));
  const to = planId ? `/plans/?${CHECKOUT_PLAN_PARAM}=${planId}` : '/plans/';
  return <Navigate to={to} replace />;
}
