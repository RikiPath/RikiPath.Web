import { Navigate, useLocation } from 'react-router-dom';

const studyOrderPrefix = 900_000_000;

function positiveId(value) {
  const id = /^[0-9]+$/.test(value ?? '') ? Number(value) : 0;
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export default function PaymentReturn({ children, legacyPlans = false }) {
  const { pathname, search } = useLocation();
  if (!search) return children;

  const params = new URLSearchParams(search);
  const orderCode = positiveId(params.get('orderCode'));
  const subscriptionId = positiveId(params.get('subscriptionId'));
  const studyId = positiveId(params.get('purchaseId'))
    || (!subscriptionId && orderCode > studyOrderPrefix ? orderCode - studyOrderPrefix : 0);
  if (legacyPlans && !params.has('purchaseId') && !studyId) return children;

  if (legacyPlans && params.get('cancel') !== 'true' && params.get('status') !== 'CANCELLED') {
    return <Navigate replace to="/app/" />;
  }

  const payment = studyId
    ? { kind: 'study', id: studyId }
    : { kind: 'mentor', id: subscriptionId || orderCode };
  const destination = legacyPlans
    ? '/payment/cancel/'
    : pathname.endsWith('/') ? pathname : pathname + '/';

  // Only retain the identifier used by the authenticated status lookup.
  return <Navigate replace to={destination} state={payment.id ? { payment } : null} />;
}
