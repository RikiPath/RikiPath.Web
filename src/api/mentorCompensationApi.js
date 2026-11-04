import { api } from './client.js';
import { unwrapApiList, unwrapApiResult } from './admin.js';

export const SUPPORTED_JLPT_LEVELS = Object.freeze(['N5', 'N4', 'N3', 'N2']);

export function normalizeJlptLevel(level) {
  return String(level ?? '').trim().toUpperCase();
}

export function isSupportedJlptLevel(level) {
  const normalized = normalizeJlptLevel(level);
  return SUPPORTED_JLPT_LEVELS.includes(normalized);
}

export function assertSupportedJlptLevel(level) {
  const normalized = normalizeJlptLevel(level);
  if (!isSupportedJlptLevel(normalized)) {
    throw new Error('Hệ thống tư vấn 1-1 chỉ hỗ trợ trình độ JLPT N5, N4, N3 và N2 (không hỗ trợ N1).');
  }
  return normalized;
}

const ATTENDANCE_STATUS_BY_INDEX = [
  'PendingAdminReview',
  'ApprovedForEarning',
  'HeldDisputed',
  'RejectedNoEarning',
  'LegacyIneligible',
];

const EARNING_STATUS_BY_INDEX = [
  'Eligible',
  'HeldDisputed',
  'LockedInPayroll',
  'Paid',
];

const PAYROLL_STATUS_BY_INDEX = [
  'Draft',
  'Review',
  'Approved',
  'Paid',
  'Closed',
];

const BANK_STATUS_BY_INDEX = [
  'PendingVerification',
  'Verified',
  'Rejected',
  'Superseded',
];

const PAYOUT_METHOD_BY_INDEX = [
  'ManualBankTransfer',
  'PayOsPayout',
];

const PAYOUT_STATUS_BY_INDEX = [
  'PendingExecution',
  'Processing',
  'UnknownPendingReconciliation',
  'OnHoldMissingEvidence',
  'Paid',
  'FailedRetryable',
  'Cancelled',
];

function normalizeEnumValue(value, list) {
  if (typeof value === 'number' && Number.isInteger(value) && list[value]) {
    return list[value];
  }
  const text = String(value ?? '').trim();
  if (/^\d+$/.test(text)) {
    const idx = Number(text);
    if (list[idx]) return list[idx];
  }
  return text;
}

export function normalizeAttendanceStatus(status) {
  return normalizeEnumValue(status, ATTENDANCE_STATUS_BY_INDEX);
}

export function normalizeEarningStatus(status) {
  return normalizeEnumValue(status, EARNING_STATUS_BY_INDEX);
}

export function normalizePayrollStatus(status) {
  return normalizeEnumValue(status, PAYROLL_STATUS_BY_INDEX);
}

export function normalizeBankVerificationStatus(status) {
  return normalizeEnumValue(status, BANK_STATUS_BY_INDEX);
}

export function normalizePayoutMethod(method) {
  return normalizeEnumValue(method, PAYOUT_METHOD_BY_INDEX);
}

export function normalizePayoutObligationStatus(status) {
  return normalizeEnumValue(status, PAYOUT_STATUS_BY_INDEX);
}

export function isPayoutPaid(status) {
  return normalizePayoutObligationStatus(status) === 'Paid';
}

export function isPayoutLockedPendingReconciliation(status) {
  return normalizePayoutObligationStatus(status) === 'UnknownPendingReconciliation';
}

export function canSwitchPayoutMethod(status) {
  const normalized = normalizePayoutObligationStatus(status);
  return ['PendingExecution', 'FailedRetryable', 'OnHoldMissingEvidence'].includes(normalized);
}

export function canExecutePayOsPayout(obligation) {
  if (!obligation) return false;
  const status = normalizePayoutObligationStatus(obligation.status);
  if (!['PendingExecution', 'FailedRetryable'].includes(status)) return false;
  const method = normalizePayoutMethod(obligation.selectedExecutionMethod);
  if (method && method !== 'PayOsPayout') return false;
  return Boolean(obligation.mentorBankAccountId && obligation.recipientMaskedAccountSnapshot);
}

export function canConfirmManualPayout(obligation, { transferReference, evidenceStorageKey } = {}) {
  if (!obligation) return false;
  const status = normalizePayoutObligationStatus(obligation.status);
  if (['Paid', 'Processing', 'UnknownPendingReconciliation', 'Cancelled'].includes(status)) {
    return false;
  }
  return Boolean(String(transferReference ?? '').trim() && String(evidenceStorageKey ?? '').trim());
}

export function formatVnd(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

// —— Admin Mentor Plans (Package × JLPT Level N5–N2) ——

export const getAdminMentorPlans = async () =>
  unwrapApiList(await api.get('/admin/mentor-plans'));

export const createAdminMentorPlan = async (body) => {
  const jlptLevel = body?.jlptLevel ? assertSupportedJlptLevel(body.jlptLevel) : undefined;
  return unwrapApiResult(
    await api.post('/admin/mentor-plans', {
      ...body,
      ...(jlptLevel ? { jlptLevel } : {}),
    }),
  );
};

export const updateAdminMentorPlan = async (id, body) => {
  const jlptLevel = body?.jlptLevel ? assertSupportedJlptLevel(body.jlptLevel) : undefined;
  return unwrapApiResult(
    await api.put(`/admin/mentor-plans/${id}`, {
      ...body,
      ...(jlptLevel ? { jlptLevel } : {}),
    }),
  );
};

// —— Admin Mentor Compensation Configuration ——

export const getAdminMentorHourlyRates = async (mentorUserId) =>
  unwrapApiList(
    await api.get('/admin/mentor-compensation/hourly-rates', {
      params: mentorUserId ? { mentorUserId } : undefined,
    }),
  );

export const configureAdminMentorHourlyRate = async (body) =>
  unwrapApiResult(await api.post('/admin/mentor-compensation/hourly-rates', body));

export const getAdminJlptCoefficients = async () =>
  unwrapApiList(await api.get('/admin/mentor-compensation/jlpt-coefficients'));

export const configureAdminJlptCoefficient = async (body) => {
  const jlptLevel = assertSupportedJlptLevel(body?.jlptLevel);
  return unwrapApiResult(
    await api.post('/admin/mentor-compensation/jlpt-coefficients', {
      ...body,
      jlptLevel,
    }),
  );
};

export const getAdminMentorQualifications = async (mentorUserId) =>
  unwrapApiList(
    await api.get('/admin/mentor-compensation/qualifications', {
      params: mentorUserId ? { mentorUserId } : undefined,
    }),
  );

export const grantAdminMentorQualification = async (body) => {
  const jlptLevel = assertSupportedJlptLevel(body?.jlptLevel);
  return unwrapApiResult(
    await api.post('/admin/mentor-compensation/qualifications/grant', {
      ...body,
      jlptLevel,
    }),
  );
};

export const revokeAdminMentorQualification = async (body) => {
  const jlptLevel = assertSupportedJlptLevel(body?.jlptLevel);
  return unwrapApiResult(
    await api.post('/admin/mentor-compensation/qualifications/revoke', {
      ...body,
      jlptLevel,
    }),
  );
};

// —— Admin Attendance, Earning Ledger & Monthly Payroll ——

export const getAdminBookingAttendance = async (bookingId) =>
  unwrapApiResult(await api.get(`/admin/mentor-compensation/bookings/${bookingId}/attendance`));

export const evaluateAdminBookingAttendance = async (bookingId) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/bookings/${bookingId}/attendance/evaluate`));

export const reviewAdminBookingAttendance = async (bookingId, body) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/bookings/${bookingId}/attendance/review`, body));

export const getAdminMentorEarnings = async (mentorUserId) =>
  unwrapApiList(
    await api.get('/admin/mentor-compensation/earnings', {
      params: mentorUserId ? { mentorUserId } : undefined,
    }),
  );

export const getAdminMonthlyPayrolls = async (params) =>
  unwrapApiList(await api.get('/admin/mentor-compensation/payrolls', { params }));

export const getAdminMonthlyPayrollDetail = async (payrollPeriodId) =>
  unwrapApiResult(await api.get(`/admin/mentor-compensation/payrolls/${payrollPeriodId}`));

export const generateAdminMonthlyPayroll = async (body) =>
  unwrapApiResult(await api.post('/admin/mentor-compensation/payrolls/generate', body));

export const addAdminPayrollAdjustment = async (payrollPeriodId, body) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/payrolls/${payrollPeriodId}/adjustments`, body));

export const approveAdminMonthlyPayroll = async (payrollPeriodId, body = {}) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/payrolls/${payrollPeriodId}/approve`, body));

// —— Admin Bank Verification & Organization Payout Accounts ——

export const getAdminMentorBankAccounts = async (mentorUserId) =>
  unwrapApiList(
    await api.get('/admin/mentor-compensation/bank-accounts', {
      params: mentorUserId ? { mentorUserId } : undefined,
    }),
  );

export const verifyAdminMentorBankAccount = async (bankAccountId, body) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/bank-accounts/${bankAccountId}/verify`, body));

export const getAdminOrganizationPayoutAccounts = async () =>
  unwrapApiList(await api.get('/admin/mentor-compensation/organization-payout-accounts'));

export const configureAdminOrganizationPayoutAccount = async (body) =>
  unwrapApiResult(await api.post('/admin/mentor-compensation/organization-payout-accounts', body));

// —— Admin Dual Payout Management (Manual Bank Transfer + payOS Payout) ——

export const getAdminPayoutObligations = async (mentorUserId) =>
  unwrapApiList(
    await api.get('/admin/mentor-compensation/payouts', {
      params: mentorUserId ? { mentorUserId } : undefined,
    }),
  );

export const getAdminPayoutObligationDetail = async (obligationId) =>
  unwrapApiResult(await api.get(`/admin/mentor-compensation/payouts/${obligationId}`));

export const selectAdminPayoutMethod = async (obligationId, body) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/payouts/${obligationId}/select-method`, body));

export const initiateAdminManualPayout = async (obligationId, body = {}) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/payouts/${obligationId}/manual/initiate`, body));

export const confirmAdminManualPayout = async (obligationId, body) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/payouts/${obligationId}/manual/confirm`, body));

export const executeAdminPayOsPayout = async (obligationId, body = {}) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/payouts/${obligationId}/payos/execute`, body));

export const executeAdminPayOsBatchPayout = async (body) =>
  unwrapApiResult(await api.post('/admin/mentor-compensation/payouts/payos/batch', body));

export const reconcileAdminPayoutObligation = async (obligationId, body) =>
  unwrapApiResult(await api.post(`/admin/mentor-compensation/payouts/${obligationId}/reconcile`, body));

export const getAdminPayOsPayoutBalance = async () =>
  unwrapApiResult(await api.get('/admin/mentor-compensation/payouts/payos/balance'));

export const estimateAdminPayOsCredit = async (obligationIds) =>
  unwrapApiResult(await api.post('/admin/mentor-compensation/payouts/payos/estimate-credit', obligationIds));

// —— Mentor Self-Service Compensation API ——

export const getMentorCompensationOverview = async () =>
  unwrapApiResult(await api.get('/mentor/compensation/overview'));

export const getMentorHourlyRates = async () =>
  unwrapApiList(await api.get('/mentor/compensation/hourly-rates'));

export const getMentorQualifications = async () =>
  unwrapApiList(await api.get('/mentor/compensation/qualifications'));

export const getMentorEarnings = async () =>
  unwrapApiList(await api.get('/mentor/compensation/earnings'));

export const getMentorPayrolls = async (params) =>
  unwrapApiList(await api.get('/mentor/compensation/payrolls', { params }));

export const getMentorPayrollDetail = async (payrollPeriodId) =>
  unwrapApiResult(await api.get(`/mentor/compensation/payrolls/${payrollPeriodId}`));

export const getMentorBankAccounts = async () =>
  unwrapApiList(await api.get('/mentor/compensation/bank-accounts'));

export const upsertMentorBankAccount = async (body) =>
  unwrapApiResult(await api.post('/mentor/compensation/bank-accounts', body));

export const getMentorPayouts = async () =>
  unwrapApiList(await api.get('/mentor/compensation/payouts'));

export const getMentorPayoutDetail = async (obligationId) =>
  unwrapApiResult(await api.get(`/mentor/compensation/payouts/${obligationId}`));
