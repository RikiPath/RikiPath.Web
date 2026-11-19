import { Navigate, useLocation } from 'react-router-dom';
import { resolvePaymentReturn } from './paymentReturnResolver.js';

export default function PaymentReturn({ children, legacyPlans = false }) {
  const { pathname, search } = useLocation();
  const redirect = resolvePaymentReturn({ pathname, search, legacyPlans });
  if (!redirect) return children;

  // Only retain the identifier used by the authenticated status lookup.
  return <Navigate replace to={redirect.destination} state={redirect.state} />;
}
