import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { api } from '../src/api/client.js';
import {
  SUPPORTED_JLPT_LEVELS,
  addAdminPayrollAdjustment,
  approveAdminMonthlyPayroll,
  assertSupportedJlptLevel,
  canConfirmManualPayout,
  canExecutePayOsPayout,
  canSwitchPayoutMethod,
  configureAdminJlptCoefficient,
  configureAdminMentorHourlyRate,
  configureAdminOrganizationPayoutAccount,
  confirmAdminManualPayout,
  createAdminMentorPlan,
  estimateAdminPayOsCredit,
  evaluateAdminBookingAttendance,
  executeAdminPayOsBatchPayout,
  executeAdminPayOsPayout,
  generateAdminMonthlyPayroll,
  getAdminBookingAttendance,
  getAdminJlptCoefficients,
  getAdminMentorBankAccounts,
  getAdminMentorEarnings,
  getAdminMentorHourlyRates,
  getAdminMentorPlans,
  getAdminMentorQualifications,
  getAdminMonthlyPayrollDetail,
  getAdminMonthlyPayrolls,
  getAdminOrganizationPayoutAccounts,
  getAdminPayOsPayoutBalance,
  getAdminPayoutObligationDetail,
  getAdminPayoutObligations,
  getMentorBankAccounts,
  getMentorCompensationOverview,
  getMentorEarnings,
  getMentorHourlyRates,
  getMentorPayrollDetail,
  getMentorPayrolls,
  getMentorPayoutDetail,
  getMentorPayouts,
  getMentorQualifications,
  grantAdminMentorQualification,
  initiateAdminManualPayout,
  isPayoutLockedPendingReconciliation,
  isPayoutPaid,
  isSupportedJlptLevel,
  reconcileAdminPayoutObligation,
  reviewAdminBookingAttendance,
  revokeAdminMentorQualification,
  selectAdminPayoutMethod,
  updateAdminMentorPlan,
  upsertMentorBankAccount,
  verifyAdminMentorBankAccount,
} from '../src/api/mentorCompensationApi.js';

describe('JLPT N5–N2 Policy & N1 Rejection Guards', () => {
  it('supports only N5, N4, N3, N2 and rejects N1', () => {
    assert.deepEqual(SUPPORTED_JLPT_LEVELS, ['N5', 'N4', 'N3', 'N2']);
    for (const lvl of ['N5', 'N4', 'N3', 'N2', 'n3']) {
      assert.equal(isSupportedJlptLevel(lvl), true);
      assert.equal(assertSupportedJlptLevel(lvl), lvl.toUpperCase());
    }
    assert.equal(isSupportedJlptLevel('N1'), false);
    assert.throws(() => assertSupportedJlptLevel('N1'), /không hỗ trợ N1/i);
  });
});

describe('Financial State & Dual Payout Safety Guards', () => {
  it('never treats Processing or UnknownPendingReconciliation as Paid', () => {
    assert.equal(isPayoutPaid('Paid'), true);
    assert.equal(isPayoutPaid(4), true);
    assert.equal(isPayoutPaid('Processing'), false);
    assert.equal(isPayoutPaid(1), false);
    assert.equal(isPayoutPaid('UnknownPendingReconciliation'), false);
    assert.equal(isPayoutPaid(2), false);
    assert.equal(isPayoutPaid('PendingExecution'), false);
    assert.equal(isPayoutPaid('FailedRetryable'), false);
  });

  it('locks method switch and retry when status is UnknownPendingReconciliation', () => {
    assert.equal(isPayoutLockedPendingReconciliation('UnknownPendingReconciliation'), true);
    assert.equal(isPayoutLockedPendingReconciliation(2), true);
    assert.equal(canSwitchPayoutMethod('UnknownPendingReconciliation'), false);
    assert.equal(canSwitchPayoutMethod('Processing'), false);
    assert.equal(canSwitchPayoutMethod('Paid'), false);
    assert.equal(canSwitchPayoutMethod('PendingExecution'), true);
    assert.equal(canSwitchPayoutMethod('FailedRetryable'), true);
  });

  it('requires both transferReference and evidenceStorageKey for ManualBankTransfer confirmation', () => {
    const obligation = { id: 10, status: 'OnHoldMissingEvidence' };
    assert.equal(canConfirmManualPayout(obligation, { transferReference: '', evidenceStorageKey: '' }), false);
    assert.equal(canConfirmManualPayout(obligation, { transferReference: 'FT123', evidenceStorageKey: '' }), false);
    assert.equal(canConfirmManualPayout(obligation, { transferReference: '', evidenceStorageKey: 'ev/1.png' }), false);
    assert.equal(canConfirmManualPayout(obligation, { transferReference: 'FT123', evidenceStorageKey: 'ev/1.png' }), true);
    assert.equal(
      canConfirmManualPayout(
        { id: 10, status: 'UnknownPendingReconciliation' },
        { transferReference: 'FT123', evidenceStorageKey: 'ev/1.png' },
      ),
      false,
    );
  });

  it('blocks payOS payout execution when bank snapshot is missing or status is locked', () => {
    assert.equal(
      canExecutePayOsPayout({
        id: 1,
        status: 'PendingExecution',
        selectedExecutionMethod: 'PayOsPayout',
        mentorBankAccountId: null,
        recipientMaskedAccountSnapshot: '',
      }),
      false,
    );
    assert.equal(
      canExecutePayOsPayout({
        id: 2,
        status: 'UnknownPendingReconciliation',
        selectedExecutionMethod: 'PayOsPayout',
        mentorBankAccountId: 5,
        recipientMaskedAccountSnapshot: '****1234',
      }),
      false,
    );
    assert.equal(
      canExecutePayOsPayout({
        id: 3,
        status: 'PendingExecution',
        selectedExecutionMethod: 'PayOsPayout',
        mentorBankAccountId: 5,
        recipientMaskedAccountSnapshot: '****1234',
      }),
      true,
    );
  });
});

describe('Admin & Mentor Compensation API Contract Endpoints', () => {
  let lastRequest = null;
  const origGet = api.get;
  const origPost = api.post;
  const origPut = api.put;

  before(() => {
    api.get = async (url, config) => {
      lastRequest = { method: 'get', url, params: config?.params };
      return { isSuccess: true, result: [{ id: 1, url }] };
    };
    api.post = async (url, data, config) => {
      lastRequest = { method: 'post', url, data, params: config?.params };
      return { isSuccess: true, result: { id: 1, url, data } };
    };
    api.put = async (url, data, config) => {
      lastRequest = { method: 'put', url, data, params: config?.params };
      return { isSuccess: true, result: { id: 1, url, data } };
    };
  });

  after(() => {
    api.get = origGet;
    api.post = origPost;
    api.put = origPut;
  });

  it('manages JLPT level-bound Mentor Plans and rejects N1', async () => {
    await getAdminMentorPlans();
    assert.equal(lastRequest.method, 'get');
    assert.equal(lastRequest.url, '/admin/mentor-plans');

    await createAdminMentorPlan({
      name: 'Gói 3 buổi N2',
      jlptLevel: 'n2',
      meetingSessionCount: 3,
      price: 900000,
      isActive: true,
    });
    assert.equal(lastRequest.method, 'post');
    assert.equal(lastRequest.url, '/admin/mentor-plans');
    assert.equal(lastRequest.data.jlptLevel, 'N2');

    await updateAdminMentorPlan(7, {
      name: 'Gói 1 buổi N3',
      jlptLevel: 'N3',
      meetingSessionCount: 1,
      price: 300000,
      isActive: true,
    });
    assert.equal(lastRequest.method, 'put');
    assert.equal(lastRequest.url, '/admin/mentor-plans/7');

    await assert.rejects(
      () => createAdminMentorPlan({ name: 'Gói N1', jlptLevel: 'N1', meetingSessionCount: 1, price: 500000 }),
      /không hỗ trợ N1/i,
    );
  });

  it('calls canonical Admin hourly rate, JLPT coefficient, and qualification endpoints', async () => {
    await getAdminMentorHourlyRates(12);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/hourly-rates');
    assert.deepEqual(lastRequest.params, { mentorUserId: 12 });

    await configureAdminMentorHourlyRate({ mentorUserId: 12, hourlyRateVnd: 220000, reason: 'Standard' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/hourly-rates');

    await getAdminJlptCoefficients();
    assert.equal(lastRequest.url, '/admin/mentor-compensation/jlpt-coefficients');

    await configureAdminJlptCoefficient({ jlptLevel: 'N2', coefficient: 1.35, reason: 'Update' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/jlpt-coefficients');
    assert.equal(lastRequest.data.jlptLevel, 'N2');

    await getAdminMentorQualifications(12);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/qualifications');

    await grantAdminMentorQualification({ mentorUserId: 12, jlptLevel: 'N3', notes: 'Verified' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/qualifications/grant');

    await revokeAdminMentorQualification({ mentorUserId: 12, jlptLevel: 'N3', reason: 'Expired' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/qualifications/revoke');
  });

  it('calls canonical Admin attendance, earning ledger, and monthly payroll endpoints', async () => {
    await getAdminBookingAttendance(88);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/bookings/88/attendance');

    await evaluateAdminBookingAttendance(88);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/bookings/88/attendance/evaluate');

    await reviewAdminBookingAttendance(88, { approvedEligibleMinutes: 90, approve: true, reason: 'Manual' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/bookings/88/attendance/review');

    await getAdminMentorEarnings(12);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/earnings');

    await getAdminMonthlyPayrolls({ mentorUserId: 12, year: 2026, month: 11 });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payrolls');

    await getAdminMonthlyPayrollDetail(5);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payrolls/5');

    await generateAdminMonthlyPayroll({ year: 2026, month: 11, mentorUserId: 12 });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payrolls/generate');

    await addAdminPayrollAdjustment(5, { amountVnd: 50000, reason: 'Bonus' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payrolls/5/adjustments');

    await approveAdminMonthlyPayroll(5, { defaultPayoutMethod: 'ManualBankTransfer' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payrolls/5/approve');
  });

  it('calls canonical Admin bank account, org payout account, and dual payout endpoints', async () => {
    await getAdminMentorBankAccounts(12);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/bank-accounts');

    await verifyAdminMentorBankAccount(3, { approve: true, verificationMethod: 'MANUAL' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/bank-accounts/3/verify');

    await getAdminOrganizationPayoutAccounts();
    assert.equal(lastRequest.url, '/admin/mentor-compensation/organization-payout-accounts');

    await configureAdminOrganizationPayoutAccount({ displayName: 'Org QA', bankBin: '970415' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/organization-payout-accounts');

    await getAdminPayoutObligations(12);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts');

    await getAdminPayoutObligationDetail(9);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/9');

    await selectAdminPayoutMethod(9, { executionMethod: 'PayOsPayout' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/9/select-method');

    await initiateAdminManualPayout(9, { notes: 'Init' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/9/manual/initiate');

    await confirmAdminManualPayout(9, { transferReference: 'FT999', evidenceStorageKey: 'ev/9.png' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/9/manual/confirm');

    await executeAdminPayOsPayout(9, { qaSimulatedOutcome: 'PAID' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/9/payos/execute');

    await executeAdminPayOsBatchPayout({ obligationIds: [9, 10] });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/payos/batch');

    await reconcileAdminPayoutObligation(9, { providerFinalState: 'PAID', reason: 'Webhook matched' });
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/9/reconcile');

    await getAdminPayOsPayoutBalance();
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/payos/balance');

    await estimateAdminPayOsCredit([9, 10]);
    assert.equal(lastRequest.url, '/admin/mentor-compensation/payouts/payos/estimate-credit');
  });

  it('calls canonical Mentor self-service compensation endpoints', async () => {
    await getMentorCompensationOverview();
    assert.equal(lastRequest.url, '/mentor/compensation/overview');

    await getMentorHourlyRates();
    assert.equal(lastRequest.url, '/mentor/compensation/hourly-rates');

    await getMentorQualifications();
    assert.equal(lastRequest.url, '/mentor/compensation/qualifications');

    await getMentorEarnings();
    assert.equal(lastRequest.url, '/mentor/compensation/earnings');

    await getMentorPayrolls({ year: 2026 });
    assert.equal(lastRequest.url, '/mentor/compensation/payrolls');

    await getMentorPayrollDetail(5);
    assert.equal(lastRequest.url, '/mentor/compensation/payrolls/5');

    await getMentorBankAccounts();
    assert.equal(lastRequest.url, '/mentor/compensation/bank-accounts');

    await upsertMentorBankAccount({
      bankBin: '970436',
      bankShortName: 'Vietcombank',
      accountNumber: '0123456789',
      accountHolderName: 'NGUYEN VAN MENTOR',
    });
    assert.equal(lastRequest.url, '/mentor/compensation/bank-accounts');

    await getMentorPayouts();
    assert.equal(lastRequest.url, '/mentor/compensation/payouts');

    await getMentorPayoutDetail(9);
    assert.equal(lastRequest.url, '/mentor/compensation/payouts/9');
  });
});
