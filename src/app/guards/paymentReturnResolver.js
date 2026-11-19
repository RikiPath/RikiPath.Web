const studyOrderPrefix = 900_000_000;

function positiveId(value) {
  const id = /^[0-9]+$/.test(value ?? '') ? Number(value) : 0;
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

/**
 * Resolves PayOS query callbacks on return/cancel URLs into a clean internal destination
 * plus `{ payment }` state for server-side verification (ignoring client query status flags).
 */
export function resolvePaymentReturn({ pathname, search, legacyPlans = false }) {
  if (!search) return null;

  const params = new URLSearchParams(search);
  const orderCode = positiveId(params.get('orderCode'));
  const subscriptionId = positiveId(params.get('subscriptionId'));
  const studyId = positiveId(params.get('purchaseId'))
    || (!subscriptionId && orderCode > studyOrderPrefix ? orderCode - studyOrderPrefix : 0);
  if (legacyPlans && !params.has('purchaseId') && !studyId) return null;

  const cancelled = params.get('cancel') === 'true' || params.get('status') === 'CANCELLED';
  const payment = studyId
    ? { kind: 'study', id: studyId }
    : { kind: 'mentor', id: subscriptionId || orderCode };

  let destination;
  if (legacyPlans) {
    destination = payment.id
      ? (cancelled ? '/payment/cancel/' : '/payment/success/')
      : '/app/';
  } else {
    destination = pathname.endsWith('/') ? pathname : `${pathname}/`;
  }

  return {
    destination,
    state: payment.id ? { payment } : null,
  };
}
