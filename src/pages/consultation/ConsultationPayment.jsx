import { Navigate, useSearchParams } from 'react-router-dom';

export default function ConsultationPayment() {
  const [params] = useSearchParams();
  const planId = Number(params.get('planId'));
  const destination = Number.isSafeInteger(planId) && planId > 0
    ? `/mentor/?planId=${planId}`
    : '/booking-schedule/';

  return <Navigate to={destination} replace />;
}
