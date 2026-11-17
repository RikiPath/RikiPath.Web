import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAdminMentors, unwrapApiList } from '../../api/admin.js';
import {
  SUPPORTED_JLPT_LEVELS,
  addAdminPayrollAdjustment,
  approveAdminMonthlyPayroll,
  canConfirmManualPayout,
  canExecutePayOsPayout,
  canSwitchPayoutMethod,
  configureAdminJlptCoefficient,
  configureAdminMentorHourlyRate,
  configureAdminOrganizationPayoutAccount,
  confirmAdminManualPayout,
   estimateAdminPayOsCredit,
  evaluateAdminBookingAttendance,
  executeAdminPayOsBatchPayout,
  executeAdminPayOsPayout,
  formatVnd,
  generateAdminMonthlyPayroll,
  getAdminBookingAttendance,
  getAdminJlptCoefficients,
  getAdminMentorBankAccounts,
  getAdminMentorEarnings,
  getAdminMentorHourlyRates,
  getAdminMentorQualifications,
  getAdminMonthlyPayrollDetail,
  getAdminMonthlyPayrolls,
  getAdminOrganizationPayoutAccounts,
  getAdminPayOsPayoutBalance,
  getAdminPayoutObligations,
  grantAdminMentorQualification,
  initiateAdminManualPayout,
  isPayoutLockedPendingReconciliation,
  isPayoutPaid,
  normalizeAttendanceStatus,
  normalizeBankVerificationStatus,
  normalizeEarningStatus,
  normalizePayrollStatus,
  normalizePayoutMethod,
  normalizePayoutObligationStatus,
  reconcileAdminPayoutObligation,
  reviewAdminBookingAttendance,
  revokeAdminMentorQualification,
  selectAdminPayoutMethod,
  verifyAdminMentorBankAccount,
} from '../../api/mentorCompensationApi.js';

const TABS = [
  { id: 'config', label: 'Cấu hình' },
  { id: 'banks', label: 'Tài khoản' },
  { id: 'payrolls', label: 'Kỳ lương' },
  { id: 'payouts', label: 'Chi trả' },
];

const inputClass =
  'mt-1 h-10 w-full rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31] outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/30';
const cardClass =
  'rounded-2xl border border-[#EADFE5] bg-white p-5 shadow-[0_6px_20px_rgba(80,40,55,0.03)]';
const btnPrimary =
  'inline-flex h-10 items-center justify-center rounded-xl bg-[#AD3155] px-4 text-[13px] font-medium text-white transition hover:bg-[#982B4B] disabled:cursor-not-allowed disabled:opacity-50';
const btnSecondary =
  'inline-flex h-9 items-center justify-center rounded-xl border border-[#E7DAE1] bg-white px-3 text-[12px] font-medium text-[#51434A] transition hover:bg-[#FDFAFC] disabled:cursor-not-allowed disabled:opacity-50';

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function StatusBadge({ label, tone = 'neutral' }) {
  const tones = {
    success: 'bg-[#E7F6EC] text-[#1E5C36]',
    warning: 'bg-[#FFF5E5] text-[#945B00]',
    danger: 'bg-[#FDECEF] text-[#A32145]',
    info: 'bg-[#EEF4FF] text-[#1D4ED8]',
    neutral: 'bg-[#F4EEF1] text-[#6E5A64]',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.neutral}`}>
      {label}
    </span>
  );
}

function payoutStatusBadge(rawStatus) {
  const status = normalizePayoutObligationStatus(rawStatus);
  switch (status) {
    case 'Paid':
      return <StatusBadge label="Đã chi trả hoàn tất (Paid)" tone="success" />;
    case 'Processing':
      return <StatusBadge label="Đang xử lý tại cổng (Processing — chưa Paid)" tone="info" />;
    case 'UnknownPendingReconciliation':
      return <StatusBadge label="Chưa rõ kết quả — Chờ đối soát (Khóa tạo lại)" tone="danger" />;
    case 'OnHoldMissingEvidence':
      return <StatusBadge label="Chờ mã giao dịch & chứng từ" tone="warning" />;
    case 'FailedRetryable':
      return <StatusBadge label="Thất bại — Có thể thử lại (FailedRetryable)" tone="danger" />;
    case 'Cancelled':
      return <StatusBadge label="Đã hủy" tone="neutral" />;
    default:
      return <StatusBadge label="Chờ thực thi chi trả (PendingExecution)" tone="warning" />;
  }
}

function attendanceStatusBadge(rawStatus) {
  const status = normalizeAttendanceStatus(rawStatus);
  switch (status) {
    case 'ApprovedForEarning':
      return <StatusBadge label="Đủ điều kiện ghi nhận thù lao" tone="success" />;
    case 'HeldDisputed':
      return <StatusBadge label="Tạm giữ do tranh chấp (HeldDisputed)" tone="danger" />;
    case 'LegacyIneligible':
      return <StatusBadge label="Dữ liệu cũ thiếu log (LegacyIneligible)" tone="warning" />;
    case 'RejectedNoEarning':
      return <StatusBadge label="Từ chối — Không tính thù lao" tone="danger" />;
    default:
      return <StatusBadge label="Chờ Admin xét duyệt điểm danh" tone="info" />;
  }
}

function bankStatusBadge(rawStatus) {
  const status = normalizeBankVerificationStatus(rawStatus);
  switch (status) {
    case 'Verified':
      return <StatusBadge label="Đã xác minh (Verified)" tone="success" />;
    case 'Rejected':
      return <StatusBadge label="Từ chối xác minh (Rejected)" tone="danger" />;
    case 'Superseded':
      return <StatusBadge label="Phiên bản cũ (Superseded)" tone="neutral" />;
    default:
      return <StatusBadge label="Chờ xác minh (PendingVerification)" tone="warning" />;
  }
}

export default function AdminMentorCompensation() {
  const [activeTab, setActiveTab] = useState(() => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') || 'config' : 'config'));
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [banner, setBanner] = useState({ type: '', text: '' });

  // Tab 1 states
  const [qualForm, setQualForm] = useState({ mentorUserId: '', jlptLevel: 'N3', notes: '' });
  const [revokeReason, setRevokeReason] = useState('');
  const [rateForm, setRateForm] = useState({
    mentorUserId: '',
    hourlyRateVnd: '200000',
    effectiveFromUtc: '',
    effectiveToUtc: '',
    reason: 'Cập nhật đơn giá',
  });
  const [coeffForm, setCoeffForm] = useState({
    jlptLevel: 'N3',
    coefficient: '1.20',
    effectiveFromUtc: '',
    effectiveToUtc: '',
    reason: 'Cập nhật hệ số',
  });

  // Tab 2 states
  const [bankVerifyNotes, setBankVerifyNotes] = useState({});
  const [orgForm, setOrgForm] = useState({
    displayName: 'Tài khoản chi trả RikiPath QA',
    bankBin: '970415',
    bankShortName: 'VietinBank',
    maskedAccountNumber: '****6789',
    accountHolderName: 'CONG TY RIKIPATH',
    supportsManualTransfer: true,
    supportsPayOsPayout: true,
    payOsPayoutChannelCode: 'PAYOS_DEFAULT',
    isActive: true,
  });

  // Tab 3 states
  const [attendanceBookingId, setAttendanceBookingId] = useState('');
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    approvedEligibleMinutes: 90,
    approve: true,
    holdDisputed: false,
    reason: '',
  });
  const nowDate = new Date();
  const [payrollGenForm, setPayrollGenForm] = useState({
    year: nowDate.getUTCFullYear(),
    month: nowDate.getUTCMonth() + 1,
    mentorUserId: '',
    notes: '',
  });
  const [selectedPayrollId, setSelectedPayrollId] = useState(null);
  const [adjForm, setAdjForm] = useState({
    amountVnd: '',
    reason: '',
    relatedMentorBookingId: '',
  });
  const [approveMethod, setApproveMethod] = useState('ManualBankTransfer');

  // Tab 4 states
  const [selectedObligationIds, setSelectedObligationIds] = useState([]);
  const [creditEstimate, setCreditEstimate] = useState(null);
  const [manualConfirmForms, setManualConfirmForms] = useState({});
  const [payOsSimOutcome, setPayOsSimOutcome] = useState('PAID');
  const [reconcileForms, setReconcileForms] = useState({});

  const setNotice = (text) => setBanner({ type: 'success', text });
  const setErr = (err) => setBanner({ type: 'error', text: err?.message || String(err) });

  // Queries
  const mentorsQuery = useQuery({
    queryKey: ['admin-mentors-comp'],
    queryFn: async () => unwrapApiList(await getAdminMentors()),
  });
  const mentors = mentorsQuery.data || [];
  const mentorFilterId = selectedMentorId ? Number(selectedMentorId) : undefined;

  const qualificationsQuery = useQuery({
    queryKey: ['admin-comp-qualifications', mentorFilterId],
    queryFn: () => getAdminMentorQualifications(mentorFilterId),
  });

  const hourlyRatesQuery = useQuery({
    queryKey: ['admin-comp-hourly-rates', mentorFilterId],
    queryFn: () => getAdminMentorHourlyRates(mentorFilterId),
  });

  const coefficientsQuery = useQuery({
    queryKey: ['admin-comp-coefficients'],
    queryFn: getAdminJlptCoefficients,
  });

  const bankAccountsQuery = useQuery({
    queryKey: ['admin-comp-banks', mentorFilterId],
    queryFn: () => getAdminMentorBankAccounts(mentorFilterId),
  });

  const orgAccountsQuery = useQuery({
    queryKey: ['admin-comp-org-accounts'],
    queryFn: getAdminOrganizationPayoutAccounts,
  });

  const earningsQuery = useQuery({
    queryKey: ['admin-comp-earnings', mentorFilterId],
    queryFn: () => getAdminMentorEarnings(mentorFilterId),
  });

  const payrollsQuery = useQuery({
    queryKey: ['admin-comp-payrolls', mentorFilterId],
    queryFn: () =>
      getAdminMonthlyPayrolls(mentorFilterId ? { mentorUserId: mentorFilterId } : undefined),
  });

  const payrollDetailQuery = useQuery({
    queryKey: ['admin-comp-payroll-detail', selectedPayrollId],
    queryFn: () => getAdminMonthlyPayrollDetail(selectedPayrollId),
    enabled: Boolean(selectedPayrollId),
  });

  const payoutsQuery = useQuery({
    queryKey: ['admin-comp-payouts', mentorFilterId],
    queryFn: () => getAdminPayoutObligations(mentorFilterId),
  });

  const payOsBalanceQuery = useQuery({
    queryKey: ['admin-comp-payos-balance'],
    queryFn: getAdminPayOsPayoutBalance,
  });

  // Mutations — Tab 1
  const grantQualMut = useMutation({
    mutationFn: () =>
      grantAdminMentorQualification({
        mentorUserId: Number(qualForm.mentorUserId || selectedMentorId),
        jlptLevel: qualForm.jlptLevel,
        notes: qualForm.notes,
      }),
    onSuccess: async () => {
      setNotice(`Đã cấp quyền dạy JLPT ${qualForm.jlptLevel}.`);
      await qualificationsQuery.refetch();
    },
    onError: setErr,
  });

  const revokeQualMut = useMutation({
    mutationFn: ({ mentorUserId, jlptLevel }) =>
      revokeAdminMentorQualification({
        mentorUserId,
        jlptLevel,
        reason: revokeReason || 'Thu hồi theo quyết định của Admin',
      }),
    onSuccess: async () => {
      setNotice('Đã thu hồi trình độ dạy JLPT.');
      await qualificationsQuery.refetch();
    },
    onError: setErr,
  });

  const saveHourlyRateMut = useMutation({
    mutationFn: () =>
      configureAdminMentorHourlyRate({
        mentorUserId: Number(rateForm.mentorUserId || selectedMentorId),
        hourlyRateVnd: Number(rateForm.hourlyRateVnd),
        effectiveFromUtc: rateForm.effectiveFromUtc ? new Date(rateForm.effectiveFromUtc).toISOString() : undefined,
        effectiveToUtc: rateForm.effectiveToUtc ? new Date(rateForm.effectiveToUtc).toISOString() : undefined,
        reason: rateForm.reason,
      }),
    onSuccess: async () => {
      setNotice('Đã lưu cấu hình đơn giá giờ cơ bản cho cố vấn.');
      await hourlyRatesQuery.refetch();
    },
    onError: setErr,
  });

  const saveCoeffMut = useMutation({
    mutationFn: () =>
      configureAdminJlptCoefficient({
        jlptLevel: coeffForm.jlptLevel,
        coefficient: Number(coeffForm.coefficient),
        effectiveFromUtc: coeffForm.effectiveFromUtc ? new Date(coeffForm.effectiveFromUtc).toISOString() : undefined,
        effectiveToUtc: coeffForm.effectiveToUtc ? new Date(coeffForm.effectiveToUtc).toISOString() : undefined,
        reason: coeffForm.reason,
      }),
    onSuccess: async () => {
      setNotice(`Đã lưu hệ số thù lao cho trình độ ${coeffForm.jlptLevel}.`);
      await coefficientsQuery.refetch();
    },
    onError: setErr,
  });

  // Mutations — Tab 2
  const verifyBankMut = useMutation({
    mutationFn: ({ bankAccountId, approve }) =>
      verifyAdminMentorBankAccount(bankAccountId, {
        approve,
        verificationMethod: 'ADMIN_MANUAL_CHECK',
        notes: bankVerifyNotes[bankAccountId] || (approve ? 'Đã đối chiếu tên chủ TK và mã ngân hàng' : 'Thông tin tài khoản không khớp'),
      }),
    onSuccess: async (_, vars) => {
      setNotice(vars.approve ? 'Đã xác minh tài khoản nhận thù lao.' : 'Đã từ chối tài khoản nhận thù lao.');
      await bankAccountsQuery.refetch();
    },
    onError: setErr,
  });

  const saveOrgAccountMut = useMutation({
    mutationFn: () => configureAdminOrganizationPayoutAccount(orgForm),
    onSuccess: async () => {
      setNotice('Đã lưu cấu hình tài khoản chi trả của tổ chức.');
      await orgAccountsQuery.refetch();
    },
    onError: setErr,
  });

  // Mutations — Tab 3
  const evaluateAttendanceMut = useMutation({
    mutationFn: () => evaluateAdminBookingAttendance(Number(attendanceBookingId)),
    onSuccess: async (res) => {
      setAttendanceResult(res);
      setNotice(`Đã đánh giá điểm danh buổi tư vấn #${attendanceBookingId}.`);
      await earningsQuery.refetch();
    },
    onError: setErr,
  });

  const fetchAttendanceMut = useMutation({
    mutationFn: () => getAdminBookingAttendance(Number(attendanceBookingId)),
    onSuccess: (res) => {
      setAttendanceResult(res);
    },
    onError: setErr,
  });

  const reviewAttendanceMut = useMutation({
    mutationFn: () => {
      if (!String(reviewForm.reason || '').trim()) {
        throw new Error('Bắt buộc nhập lý do khi Admin xét duyệt điểm danh thủ công hoặc tạm giữ tranh chấp.');
      }
      return reviewAdminBookingAttendance(Number(attendanceBookingId), {
        approvedEligibleMinutes: Number(reviewForm.approvedEligibleMinutes),
        approve: Boolean(reviewForm.approve),
        holdDisputed: Boolean(reviewForm.holdDisputed),
        reason: reviewForm.reason.trim(),
        operationKey: `admin-review-${attendanceBookingId}-${Date.now()}`,
      });
    },
    onSuccess: async (res) => {
      setAttendanceResult(res);
      setNotice(`Đã lưu kết quả xét duyệt điểm danh buổi #${attendanceBookingId}.`);
      await earningsQuery.refetch();
    },
    onError: setErr,
  });

  const generatePayrollMut = useMutation({
    mutationFn: () =>
      generateAdminMonthlyPayroll({
        year: Number(payrollGenForm.year),
        month: Number(payrollGenForm.month),
        mentorUserId: payrollGenForm.mentorUserId ? Number(payrollGenForm.mentorUserId) : mentorFilterId,
        notes: payrollGenForm.notes || undefined,
      }),
    onSuccess: async (res) => {
      setNotice('Đã tổng hợp kỳ lương tháng.');
      if (res?.id) setSelectedPayrollId(res.id);
      await Promise.all([payrollsQuery.refetch(), earningsQuery.refetch()]);
    },
    onError: setErr,
  });

  const addAdjustmentMut = useMutation({
    mutationFn: () => {
      if (!String(adjForm.reason || '').trim()) {
        throw new Error('Bắt buộc nhập lý do điều chỉnh kỳ lương.');
      }
      return addAdminPayrollAdjustment(selectedPayrollId, {
        amountVnd: Number(adjForm.amountVnd),
        reason: adjForm.reason.trim(),
        relatedMentorBookingId: adjForm.relatedMentorBookingId ? Number(adjForm.relatedMentorBookingId) : undefined,
        operationKey: `adj-${selectedPayrollId}-${Date.now()}`,
      });
    },
    onSuccess: async () => {
      setNotice('Đã thêm khoản điều chỉnh vào kỳ lương.');
      setAdjForm({ amountVnd: '', reason: '', relatedMentorBookingId: '' });
      await Promise.all([payrollDetailQuery.refetch(), payrollsQuery.refetch()]);
    },
    onError: setErr,
  });

  const approvePayrollMut = useMutation({
    mutationFn: (payrollId) =>
      approveAdminMonthlyPayroll(payrollId, {
        defaultPayoutMethod: approveMethod,
        notes: 'Phê duyệt kỳ lương chuyển sang nghĩa vụ chi trả',
      }),
    onSuccess: async () => {
      setNotice('Đã phê duyệt kỳ lương và khởi tạo nghĩa vụ chi trả.');
      await Promise.all([
        payrollDetailQuery.refetch(),
        payrollsQuery.refetch(),
        payoutsQuery.refetch(),
      ]);
    },
    onError: setErr,
  });

  // Mutations — Tab 4
  const selectMethodMut = useMutation({
    mutationFn: ({ obligationId, executionMethod }) =>
      selectAdminPayoutMethod(obligationId, {
        executionMethod,
        notes: `Chuyển phương thức chi trả sang ${executionMethod}`,
      }),
    onSuccess: async () => {
      setNotice('Đã cập nhật phương thức chi trả.');
      await payoutsQuery.refetch();
    },
    onError: setErr,
  });

  const initiateManualMut = useMutation({
    mutationFn: (obligationId) =>
      initiateAdminManualPayout(obligationId, {
        notes: 'Khởi tạo lệnh chuyển khoản ngân hàng thủ công',
        idempotencyKey: `manual-init-${obligationId}-${Date.now()}`,
      }),
    onSuccess: async () => {
      setNotice('Đã khởi tạo lệnh chuyển khoản thủ công. Vui lòng nhập mã giao dịch và chứng từ để xác nhận.');
      await payoutsQuery.refetch();
    },
    onError: setErr,
  });

  const confirmManualMut = useMutation({
    mutationFn: (obligation) => {
      const form = manualConfirmForms[obligation.id] || {};
      if (!canConfirmManualPayout(obligation, form)) {
        throw new Error('Phải nhập đầy đủ Mã tham chiếu ngân hàng (TransferReference) và Khóa bằng chứng (EvidenceStorageKey) trước khi xác nhận Paid.');
      }
      return confirmAdminManualPayout(obligation.id, {
        transferReference: form.transferReference.trim(),
        evidenceStorageKey: form.evidenceStorageKey.trim(),
        transferredAtUtc: new Date().toISOString(),
        notes: form.notes || 'Đã đối soát sao kê chuyển khoản thủ công',
        idempotencyKey: `manual-confirm-${obligation.id}`,
      });
    },
    onSuccess: async () => {
      setNotice('Đã xác nhận hoàn tất chuyển khoản thủ công (Paid).');
      await Promise.all([payoutsQuery.refetch(), payrollsQuery.refetch(), earningsQuery.refetch()]);
    },
    onError: setErr,
  });

  const executePayOsMut = useMutation({
    mutationFn: (obligationId) =>
      executeAdminPayOsPayout(obligationId, {
        description: `Chi tra thu lao co van #${obligationId}`,
        categories: ['MENTOR_COMPENSATION'],
        idempotencyKey: `payos-exec-${obligationId}-${Date.now()}`,
        qaSimulatedOutcome: payOsSimOutcome,
      }),
    onSuccess: async (res) => {
      const st = normalizePayoutObligationStatus(res?.status);
      setNotice(`Đã gửi lệnh payOS Payout. Trạng thái hiện tại: ${st}.`);
      await Promise.all([payoutsQuery.refetch(), payOsBalanceQuery.refetch()]);
    },
    onError: setErr,
  });

  const estimateCreditMut = useMutation({
    mutationFn: () => estimateAdminPayOsCredit(selectedObligationIds),
    onSuccess: (res) => {
      setCreditEstimate(res);
      setNotice('Đã ước tính chi phí lô chi trả payOS.');
    },
    onError: setErr,
  });

  const executeBatchPayOsMut = useMutation({
    mutationFn: () =>
      executeAdminPayOsBatchPayout({
        obligationIds: selectedObligationIds,
        description: 'Chi tra thu lao co van theo lo',
        categories: ['MENTOR_COMPENSATION'],
        idempotencyKey: `payos-batch-${Date.now()}`,
      }),
    onSuccess: async (res) => {
      setNotice(
        `Đã thực thi lô payOS Payout (${res?.totalObligations || selectedObligationIds.length} nghĩa vụ · Paid: ${res?.succeededCount ?? 0}, Processing: ${res?.processingCount ?? 0}).`,
      );
      await Promise.all([payoutsQuery.refetch(), payOsBalanceQuery.refetch()]);
    },
    onError: setErr,
  });

  const reconcileMut = useMutation({
    mutationFn: (obligationId) => {
      const form = reconcileForms[obligationId] || { providerFinalState: 'PAID', reason: '' };
      if (!String(form.reason || '').trim()) {
        throw new Error('Bắt buộc nhập lý do đối soát trạng thái chi trả.');
      }
      return reconcileAdminPayoutObligation(obligationId, {
        providerFinalState: form.providerFinalState || 'PAID',
        providerTransactionId: form.providerTransactionId || `RECON-${obligationId}-${Date.now()}`,
        reason: form.reason.trim(),
      });
    },
    onSuccess: async () => {
      setNotice('Đã đối soát trạng thái nghĩa vụ chi trả thành công.');
      await Promise.all([payoutsQuery.refetch(), payrollsQuery.refetch(), earningsQuery.refetch()]);
    },
    onError: setErr,
  });

  const activePayroll = payrollDetailQuery.data;

  return (
    <section className="space-y-5" data-testid="admin-mentor-compensation">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-tight text-[#352C31]">
            Thù lao cố vấn
          </h2>
        </div>

        <label className="text-[12px] font-medium text-[#6E5360]">
          Lọc theo cố vấn
          <select
            value={selectedMentorId}
            onChange={(e) => setSelectedMentorId(e.target.value)}
            className="ml-2 h-9 rounded-xl border border-[#E7DAE1] bg-white px-3 text-[13px] text-[#352C31]"
          >
            <option value="">Tất cả cố vấn</option>
            {mentors.map((m) => {
              const id = m.id ?? m.mentorId ?? m.userId;
              const name = m.fullName || m.name || m.email || `Mentor #${id}`;
              return (
                <option key={id} value={id}>
                  #{id} · {name}
                </option>
              );
            })}
          </select>
        </label>
      </header>

      {banner.text && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-[13px] ${
            banner.type === 'error'
              ? 'border border-[#F5C2D0] bg-[#FFF5F8] text-[#A32145]'
              : 'border border-[#C4E8D1] bg-[#F2FBF5] text-[#1E5C36]'
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner({ type: '', text: '' })}
            className="ml-3 text-[12px] font-semibold underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[#EADFE5] pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3.5 py-2 text-[13px] font-medium transition ${
              activeTab === tab.id
                ? 'bg-[#AD3155] text-white'
                : 'border border-[#E7DAE1] bg-white text-[#51434A] hover:bg-[#FDFAFC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: CONFIGURATION ================= */}
      {activeTab === 'config' && (
        <div className="space-y-5" data-testid="comp-tab-config">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* 1A. Grant / Revoke JLPT Qualifications (N5–N2) */}
            <div className={cardClass}>
              <h3 className="text-[15px] font-semibold text-[#352C31]">Trình độ được dạy</h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  grantQualMut.mutate();
                }}
                className="mt-4 space-y-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Mã cố vấn
                    <input
                      required
                      type="number"
                      min={1}
                      value={qualForm.mentorUserId || selectedMentorId}
                      onChange={(e) => setQualForm((f) => ({ ...f, mentorUserId: e.target.value }))}
                      placeholder="ID cố vấn"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Trình độ
                    <select
                      value={qualForm.jlptLevel}
                      onChange={(e) => setQualForm((f) => ({ ...f, jlptLevel: e.target.value }))}
                      className={inputClass}
                    >
                      {SUPPORTED_JLPT_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          JLPT {lvl}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block text-[12px] font-medium text-[#6E5360]">
                  Ghi chú
                  <input
                    value={qualForm.notes}
                    onChange={(e) => setQualForm((f) => ({ ...f, notes: e.target.value }))}
                    className={inputClass}
                  />
                </label>

                <button type="submit" disabled={grantQualMut.isPending} className={btnPrimary}>
                  {grantQualMut.isPending ? 'Đang cấp quyền…' : 'Cấp quyền dạy JLPT'}
                </button>
              </form>

              <div className="mt-5 border-t border-[#F2EAEF] pt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-[13px] font-semibold text-[#51434A]">
                    Đã cấp ({(qualificationsQuery.data || []).length})
                  </h4>
                  <input
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Lý do thu hồi"
                    className="h-8 rounded-lg border border-[#E7DAE1] px-2.5 text-[12px]"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#F2EAEF] text-[#82737B]">
                        <th className="py-2">Mentor</th>
                        <th className="py-2">Trình độ</th>
                        <th className="py-2">Trạng thái</th>
                        <th className="py-2">Cập nhật</th>
                        <th className="py-2 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(qualificationsQuery.data || []).map((q) => (
                        <tr key={q.id} className="border-b border-[#F9F5F7]">
                          <td className="py-2 font-medium">
                            #{q.mentorUserId} {q.mentorName ? `· ${q.mentorName}` : ''}
                          </td>
                          <td className="py-2 font-bold text-[#AD3155]">{q.jlptLevel}</td>
                          <td className="py-2">
                            {q.isActive ? (
                              <StatusBadge label="Đang hiệu lực" tone="success" />
                            ) : (
                              <StatusBadge label="Đã thu hồi" tone="neutral" />
                            )}
                          </td>
                          <td className="py-2 text-[#82737B]">
                            {fmtDate(q.revokedAtUtc || q.approvedAtUtc)}
                          </td>
                          <td className="py-2 text-right">
                            {q.isActive && (
                              <button
                                type="button"
                                onClick={() =>
                                  revokeQualMut.mutate({
                                    mentorUserId: q.mentorUserId,
                                    jlptLevel: q.jlptLevel,
                                  })
                                }
                                className="text-[12px] font-medium text-[#A32145] hover:underline"
                              >
                                Thu hồi
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 1B. Mentor Base Hourly Rate (VND/h) */}
            <div className={cardClass}>
              <h3 className="text-[15px] font-semibold text-[#352C31]">Đơn giá giờ</h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveHourlyRateMut.mutate();
                }}
                className="mt-4 space-y-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Mã cố vấn
                    <input
                      required
                      type="number"
                      min={1}
                      value={rateForm.mentorUserId || selectedMentorId}
                      onChange={(e) => setRateForm((f) => ({ ...f, mentorUserId: e.target.value }))}
                      placeholder="ID cố vấn"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Đơn giá (VND/giờ)
                    <input
                      required
                      type="number"
                      min={1000}
                      step={1000}
                      value={rateForm.hourlyRateVnd}
                      onChange={(e) => setRateForm((f) => ({ ...f, hourlyRateVnd: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Có hiệu lực từ
                    <input
                      type="datetime-local"
                      value={rateForm.effectiveFromUtc}
                      onChange={(e) => setRateForm((f) => ({ ...f, effectiveFromUtc: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Hết hiệu lực
                    <input
                      type="datetime-local"
                      value={rateForm.effectiveToUtc}
                      onChange={(e) => setRateForm((f) => ({ ...f, effectiveToUtc: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="block text-[12px] font-medium text-[#6E5360]">
                  Lý do
                  <input
                    required
                    value={rateForm.reason}
                    onChange={(e) => setRateForm((f) => ({ ...f, reason: e.target.value }))}
                    className={inputClass}
                  />
                </label>

                <button type="submit" disabled={saveHourlyRateMut.isPending} className={btnPrimary}>
                  {saveHourlyRateMut.isPending ? 'Đang lưu…' : 'Lưu đơn giá giờ'}
                </button>
              </form>

              <div className="mt-5 border-t border-[#F2EAEF] pt-4">
                <h4 className="mb-2 text-[13px] font-semibold text-[#51434A]">
                  Lịch sử ({(hourlyRatesQuery.data || []).length})
                </h4>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#F2EAEF] text-[#82737B]">
                        <th className="py-2">Mentor</th>
                        <th className="py-2">Đơn giá/giờ</th>
                        <th className="py-2">Hiệu lực từ</th>
                        <th className="py-2">Hiệu lực đến</th>
                        <th className="py-2">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(hourlyRatesQuery.data || []).map((r) => (
                        <tr key={r.id} className="border-b border-[#F9F5F7]">
                          <td className="py-2 font-medium">#{r.mentorUserId}</td>
                          <td className="py-2 font-semibold text-[#AD3155]">
                            {formatVnd(r.hourlyRateVnd)}/h
                          </td>
                          <td className="py-2 text-[#82737B]">{fmtDate(r.effectiveFromUtc)}</td>
                          <td className="py-2 text-[#82737B]">{fmtDate(r.effectiveToUtc)}</td>
                          <td className="py-2">
                            {r.isActive ? (
                              <StatusBadge label="Đang áp dụng" tone="success" />
                            ) : (
                              <StatusBadge label="Lịch sử" tone="neutral" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 1C. JLPT Level Pay Coefficients (N5–N2) */}
          <div className={cardClass}>
            <h3 className="text-[15px] font-semibold text-[#352C31]">Hệ số theo trình độ</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCoeffMut.mutate();
              }}
              className="mt-4 grid gap-3 sm:grid-cols-5"
            >
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Trình độ
                <select
                  value={coeffForm.jlptLevel}
                  onChange={(e) => setCoeffForm((f) => ({ ...f, jlptLevel: e.target.value }))}
                  className={inputClass}
                >
                  {SUPPORTED_JLPT_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Hệ số
                <input
                  required
                  type="number"
                  min={0.5}
                  max={5}
                  step="0.05"
                  value={coeffForm.coefficient}
                  onChange={(e) => setCoeffForm((f) => ({ ...f, coefficient: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Hiệu lực từ
                <input
                  type="datetime-local"
                  value={coeffForm.effectiveFromUtc}
                  onChange={(e) => setCoeffForm((f) => ({ ...f, effectiveFromUtc: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Lý do cập nhật
                <input
                  required
                  value={coeffForm.reason}
                  onChange={(e) => setCoeffForm((f) => ({ ...f, reason: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={saveCoeffMut.isPending} className={`${btnPrimary} w-full`}>
                  {saveCoeffMut.isPending ? 'Đang lưu…' : 'Cập nhật hệ số'}
                </button>
              </div>
            </form>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#F2EAEF] text-[#82737B]">
                    <th className="py-2">Trình độ</th>
                    <th className="py-2">Hệ số</th>
                    <th className="py-2">Từ</th>
                    <th className="py-2">Đến</th>
                    <th className="py-2">Lý do</th>
                    <th className="py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {(coefficientsQuery.data || []).map((c) => (
                    <tr key={c.id} className="border-b border-[#F9F5F7]">
                      <td className="py-2 font-bold text-[#AD3155]">{c.jlptLevel}</td>
                      <td className="py-2 font-semibold">×{Number(c.coefficient).toFixed(2)}</td>
                      <td className="py-2 text-[#82737B]">{fmtDate(c.effectiveFromUtc)}</td>
                      <td className="py-2 text-[#82737B]">{fmtDate(c.effectiveToUtc)}</td>
                      <td className="py-2 text-[#6E5360]">{c.reason || '—'}</td>
                      <td className="py-2">
                        {c.isActive ? (
                          <StatusBadge label="Đang hiệu lực" tone="success" />
                        ) : (
                          <StatusBadge label="Lịch sử" tone="neutral" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: BANK ACCOUNTS & ORG PAYOUT ACCOUNTS ================= */}
      {activeTab === 'banks' && (
        <div className="space-y-5" data-testid="comp-tab-banks">
          {/* 2A. Mentor Bank Account Verification */}
          <div className={cardClass}>
            <h3 className="text-[15px] font-semibold text-[#352C31]">Tài khoản nhận</h3>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#F2EAEF] text-[#82737B]">
                    <th className="py-2">ID / Mentor</th>
                    <th className="py-2">Ngân hàng</th>
                    <th className="py-2">Số tài khoản (Che số)</th>
                    <th className="py-2">Chủ tài khoản</th>
                    <th className="py-2">Phiên bản</th>
                    <th className="py-2">Trạng thái</th>
                    <th className="py-2">Ghi chú xác minh</th>
                    <th className="py-2 text-right">Thao tác Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {(bankAccountsQuery.data || []).map((b) => (
                    <tr key={b.id} className="border-b border-[#F9F5F7]">
                      <td className="py-2.5 font-medium">
                        TK #{b.id} · Mentor #{b.mentorUserId}
                      </td>
                      <td className="py-2.5">
                        {b.bankShortName} ({b.bankBin})
                      </td>
                      <td className="py-2.5 font-mono font-semibold text-[#352C31]">
                        {b.maskedAccountNumber}
                      </td>
                      <td className="py-2.5 font-medium">{b.accountHolderName}</td>
                      <td className="py-2.5">
                        v{b.accountVersion} {b.isCurrent ? '(Hiện tại)' : '(Cũ)'}
                      </td>
                      <td className="py-2.5">{bankStatusBadge(b.verificationStatus)}</td>
                      <td className="py-2.5">
                        <input
                          value={bankVerifyNotes[b.id] ?? b.notes ?? ''}
                          onChange={(e) =>
                            setBankVerifyNotes((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }
                          placeholder="Ghi chú đối chiếu…"
                          className="h-8 w-44 rounded-lg border border-[#E7DAE1] px-2 text-[12px]"
                        />
                      </td>
                      <td className="py-2.5 text-right">
                        {b.isCurrent && (
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                verifyBankMut.mutate({ bankAccountId: b.id, approve: true })
                              }
                              className="rounded-lg bg-[#1E5C36] px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90"
                            >
                              Xác minh (Verify)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                verifyBankMut.mutate({ bankAccountId: b.id, approve: false })
                              }
                              className="rounded-lg bg-[#A32145] px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!(bankAccountsQuery.data || []).length && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#82737B]">
                        Chưa có tài khoản ngân hàng nào của cố vấn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2B. Organization Payout Accounts */}
          <div className={cardClass}>
            <h3 className="text-[15px] font-semibold text-[#352C31]">Tài khoản chi</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveOrgAccountMut.mutate();
              }}
              className="mt-4 grid gap-3 sm:grid-cols-3"
            >
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Tên hiển thị tài khoản chi
                <input
                  required
                  value={orgForm.displayName}
                  onChange={(e) => setOrgForm((f) => ({ ...f, displayName: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Ngân hàng & Mã BIN
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    required
                    value={orgForm.bankShortName}
                    onChange={(e) => setOrgForm((f) => ({ ...f, bankShortName: e.target.value }))}
                    placeholder="VietinBank"
                    className="h-10 rounded-xl border border-[#E7DAE1] px-3 text-[13px]"
                  />
                  <input
                    required
                    value={orgForm.bankBin}
                    onChange={(e) => setOrgForm((f) => ({ ...f, bankBin: e.target.value }))}
                    placeholder="970415"
                    className="h-10 rounded-xl border border-[#E7DAE1] px-3 text-[13px]"
                  />
                </div>
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Số TK hiển thị (Che số) & Chủ TK
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    required
                    value={orgForm.maskedAccountNumber}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, maskedAccountNumber: e.target.value }))
                    }
                    placeholder="****6789"
                    className="h-10 rounded-xl border border-[#E7DAE1] px-3 text-[13px]"
                  />
                  <input
                    required
                    value={orgForm.accountHolderName}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, accountHolderName: e.target.value }))
                    }
                    placeholder="CONG TY RIKIPATH"
                    className="h-10 rounded-xl border border-[#E7DAE1] px-3 text-[13px]"
                  />
                </div>
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Mã kênh payOS Payout (Channel Code)
                <input
                  value={orgForm.payOsPayoutChannelCode}
                  onChange={(e) =>
                    setOrgForm((f) => ({ ...f, payOsPayoutChannelCode: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <div className="flex items-center gap-4 pt-5 text-[12px] font-medium text-[#51434A]">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={orgForm.supportsManualTransfer}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, supportsManualTransfer: e.target.checked }))
                    }
                  />
                  Hỗ trợ CK thủ công
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={orgForm.supportsPayOsPayout}
                    onChange={(e) =>
                      setOrgForm((f) => ({ ...f, supportsPayOsPayout: e.target.checked }))
                    }
                  />
                  Hỗ trợ payOS Payout
                </label>
              </div>
              <div className="flex items-end justify-end">
                <button type="submit" disabled={saveOrgAccountMut.isPending} className={btnPrimary}>
                  {saveOrgAccountMut.isPending ? 'Đang lưu…' : 'Lưu tài khoản chi tổ chức'}
                </button>
              </div>
            </form>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#F2EAEF] text-[#82737B]">
                    <th className="py-2">ID</th>
                    <th className="py-2">Tên hiển thị</th>
                    <th className="py-2">Ngân hàng</th>
                    <th className="py-2">Số TK (Che số)</th>
                    <th className="py-2">Kênh hỗ trợ</th>
                    <th className="py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {(orgAccountsQuery.data || []).map((acc) => (
                    <tr key={acc.id} className="border-b border-[#F9F5F7]">
                      <td className="py-2 font-medium">#{acc.id}</td>
                      <td className="py-2 font-semibold">{acc.displayName}</td>
                      <td className="py-2">
                        {acc.bankShortName} ({acc.bankBin})
                      </td>
                      <td className="py-2 font-mono">{acc.maskedAccountNumber}</td>
                      <td className="py-2">
                        {[
                          acc.supportsManualTransfer ? 'ManualBankTransfer' : null,
                          acc.supportsPayOsPayout ? `PayOsPayout (${acc.payOsPayoutChannelCode || 'Default'})` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </td>
                      <td className="py-2">
                        {acc.isActive ? (
                          <StatusBadge label="Hoạt động" tone="success" />
                        ) : (
                          <StatusBadge label="Đã tắt" tone="neutral" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ATTENDANCE, EARNINGS & MONTHLY PAYROLL ================= */}
      {activeTab === 'payrolls' && (
        <div className="space-y-5" data-testid="comp-tab-payrolls">
          {/* 3A. Attendance Evaluation & Manual Admin Review */}
          <div className={cardClass}>
            <h3 className="text-[15px] font-semibold text-[#352C31]">Điểm danh</h3>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-[12px] font-medium text-[#6E5360]">
                Mã buổi
                <input
                  type="number"
                  min={1}
                  value={attendanceBookingId}
                  onChange={(e) => setAttendanceBookingId(e.target.value)}
                  placeholder="Ví dụ: 105"
                  className="mt-1 block h-10 w-44 rounded-xl border border-[#E7DAE1] px-3 text-[13px]"
                />
              </label>
              <button
                type="button"
                disabled={!attendanceBookingId || evaluateAttendanceMut.isPending}
                onClick={() => evaluateAttendanceMut.mutate()}
                className={btnPrimary}
              >
                {evaluateAttendanceMut.isPending
                  ? 'Đang đánh giá…'
                  : 'Đánh giá tự động từ log phòng họp'}
              </button>
              <button
                type="button"
                disabled={!attendanceBookingId || fetchAttendanceMut.isPending}
                onClick={() => fetchAttendanceMut.mutate()}
                className={btnSecondary}
              >
                Tra cứu trạng thái hiện tại
              </button>
            </div>

            {attendanceResult && (
              <div className="mt-4 rounded-xl border border-[#EADFE5] bg-[#FCFAFB] p-4 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#352C31]">
                    Buổi tư vấn #{attendanceResult.mentorBookingId} · Mentor #{attendanceResult.mentorUserId} · Học viên #{attendanceResult.learnerUserId}
                  </p>
                  {attendanceStatusBadge(attendanceResult.status)}
                </div>
                <p className="mt-1 text-[#6E5360]">
                  Thời lượng lịch: <strong>{attendanceResult.scheduledMinutes} phút</strong> · Hiện diện Mentor:{' '}
                  <strong>{Math.round((attendanceResult.mentorObservedSeconds || 0) / 60)} phút</strong> · Hiện diện Học viên:{' '}
                  <strong>{Math.round((attendanceResult.learnerObservedSeconds || 0) / 60)} phút</strong> · Phút đủ điều kiện được duyệt:{' '}
                  <strong>{attendanceResult.approvedEligibleMinutes} phút</strong>
                </p>
                {attendanceResult.decisionReason && (
                  <p className="mt-1 text-[#82737B]">
                    Lý do / Ghi chú hệ thống: <em>{attendanceResult.decisionReason}</em>
                  </p>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reviewAttendanceMut.mutate();
              }}
              className="mt-4 grid gap-3 border-t border-[#F2EAEF] pt-4 sm:grid-cols-4"
            >
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Số phút hợp lệ được duyệt (0–90)
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={reviewForm.approvedEligibleMinutes}
                  onChange={(e) =>
                    setReviewForm((f) => ({ ...f, approvedEligibleMinutes: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Quyết định xét duyệt
                <select
                  value={
                    reviewForm.holdDisputed
                      ? 'HOLD'
                      : reviewForm.approve
                        ? 'APPROVE'
                        : 'REJECT'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setReviewForm((f) => ({
                      ...f,
                      approve: val === 'APPROVE',
                      holdDisputed: val === 'HOLD',
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="APPROVE">Duyệt ghi nhận thù lao (ApprovedForEarning)</option>
                  <option value="HOLD">Tạm giữ do tranh chấp (HeldDisputed)</option>
                  <option value="REJECT">Từ chối tính thù lao (RejectedNoEarning)</option>
                </select>
              </label>
              <label className="block text-[12px] font-medium text-[#6E5360]">
                Lý do xét duyệt thủ công (Bắt buộc)
                <input
                  required
                  value={reviewForm.reason}
                  onChange={(e) => setReviewForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Nhập lý do đối chiếu bằng chứng buổi học…"
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!attendanceBookingId || reviewAttendanceMut.isPending}
                  className={`${btnPrimary} w-full`}
                >
                  {reviewAttendanceMut.isPending ? 'Đang lưu…' : 'Lưu xét duyệt điểm danh'}
                </button>
              </div>
            </form>
          </div>

          {/* 3B. Immutable Earning Entries Ledger */}
          <div className={cardClass}>
            <h3 className="text-[15px] font-semibold text-[#352C31]">Bảng kê từng buổi</h3>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#F2EAEF] text-[#82737B]">
                    <th className="py-2">Mã bút toán</th>
                    <th className="py-2">Buổi đặt lịch</th>
                    <th className="py-2">Mentor</th>
                    <th className="py-2">Trình độ</th>
                    <th className="py-2">Thời lượng hợp lệ</th>
                    <th className="py-2">Đơn giá chốt</th>
                    <th className="py-2">Hệ số chốt</th>
                    <th className="py-2">Thành tiền (VND)</th>
                    <th className="py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {(earningsQuery.data || []).map((e) => (
                    <tr key={e.id} className="border-b border-[#F9F5F7]">
                      <td className="py-2 font-mono">#{e.id}</td>
                      <td className="py-2 font-medium">Booking #{e.mentorBookingId}</td>
                      <td className="py-2">Mentor #{e.mentorUserId}</td>
                      <td className="py-2 font-bold text-[#AD3155]">{e.jlptLevel}</td>
                      <td className="py-2">
                        {e.approvedEligibleMinutes}/{e.scheduledMinutes} phút ({(e.approvedEligibleMinutes / 60).toFixed(2)}h)
                      </td>
                      <td className="py-2">{formatVnd(e.frozenHourlyRateVnd)}/h</td>
                      <td className="py-2">×{Number(e.frozenLevelCoefficient).toFixed(2)}</td>
                      <td className="py-2 font-semibold text-[#1E5C36]">
                        {formatVnd(e.eligibleAmountVnd)}
                      </td>
                      <td className="py-2">
                        <StatusBadge
                          label={normalizeEarningStatus(e.status)}
                          tone={
                            normalizeEarningStatus(e.status) === 'Paid'
                              ? 'success'
                              : normalizeEarningStatus(e.status) === 'HeldDisputed'
                                ? 'danger'
                                : 'info'
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  {!(earningsQuery.data || []).length && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-[#82737B]">
                        Chưa có bút toán thù lao nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3C. Monthly Payroll Generation, Adjustments & Approval */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className={cardClass}>
              <h3 className="text-[15px] font-semibold text-[#352C31]">
                Kỳ lương tháng
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  generatePayrollMut.mutate();
                }}
                className="mt-3 space-y-3"
              >
                <div className="grid grid-cols-3 gap-2">
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Năm
                    <input
                      required
                      type="number"
                      min={2025}
                      max={2035}
                      value={payrollGenForm.year}
                      onChange={(e) =>
                        setPayrollGenForm((f) => ({ ...f, year: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Tháng
                    <input
                      required
                      type="number"
                      min={1}
                      max={12}
                      value={payrollGenForm.month}
                      onChange={(e) =>
                        setPayrollGenForm((f) => ({ ...f, month: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-[#6E5360]">
                    Mentor ID (tùy chọn)
                    <input
                      type="number"
                      min={1}
                      value={payrollGenForm.mentorUserId}
                      onChange={(e) =>
                        setPayrollGenForm((f) => ({ ...f, mentorUserId: e.target.value }))
                      }
                      placeholder="Tất cả"
                      className={inputClass}
                    />
                  </label>
                </div>
                <button type="submit" disabled={generatePayrollMut.isPending} className={btnPrimary}>
                  {generatePayrollMut.isPending ? 'Đang tổng hợp…' : 'Tạo / Cập nhật kỳ lương tháng'}
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {(payrollsQuery.data || []).map((p) => {
                  const selected = selectedPayrollId === p.id;
                  const status = normalizePayrollStatus(p.status);
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPayrollId(p.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition ${
                        selected
                          ? 'border-[#AD3155] bg-[#FCEEF3]/60'
                          : 'border-[#E7DAE1] bg-white hover:bg-[#FDFAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold">
                          Kỳ {p.periodMonth}/{p.periodYear} · Mentor #{p.mentorUserId}{' '}
                          {p.mentorName ? `(${p.mentorName})` : ''}
                        </span>
                        <StatusBadge
                          label={status}
                          tone={
                            status === 'Paid' || status === 'Approved'
                              ? 'success'
                              : 'info'
                          }
                        />
                      </div>
                      <p className="mt-1 text-[12px] text-[#6E5360]">
                        Thù lao buổi học: <strong>{formatVnd(p.totalEarningsAmountVnd)}</strong> · Điều chỉnh:{' '}
                        <strong>{formatVnd(p.totalAdjustmentsAmountVnd)}</strong> · Tổng phải trả:{' '}
                        <strong className="text-[#AD3155]">{formatVnd(p.grossPayableAmountVnd)}</strong>
                      </p>
                    </div>
                  );
                })}
                {!(payrollsQuery.data || []).length && (
                  <p className="py-4 text-[12px] text-[#82737B]">Chưa có kỳ lương tháng nào.</p>
                )}
              </div>
            </div>

            {/* Payroll Detail, Adjustments & Approval */}
            <div className={cardClass}>
              <h3 className="text-[15px] font-semibold text-[#352C31]">
                Chi tiết kỳ
              </h3>
              {!activePayroll ? (
                <p className="mt-4 text-[12px] text-[#82737B]">
                  Chọn một kỳ bên trái.
                </p>
              ) : (
                <div className="mt-3 space-y-4 text-[12px]">
                  <div className="rounded-xl bg-[#FCF8FA] p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold text-[#352C31]">
                        Kỳ lương #{activePayroll.id} ({activePayroll.periodMonth}/{activePayroll.periodYear}) · Mentor #{activePayroll.mentorUserId}
                      </span>
                      <StatusBadge
                        label={normalizePayrollStatus(activePayroll.status)}
                        tone="info"
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <span className="block text-[#82737B]">Số buổi hoàn tất</span>
                        <strong className="text-[14px]">{(activePayroll.lines || []).length} buổi</strong>
                      </div>
                      <div>
                        <span className="block text-[#82737B]">Tổng phút/giờ hợp lệ</span>
                        <strong className="text-[14px]">
                          {(activePayroll.lines || []).reduce((acc, l) => acc + (l.approvedEligibleMinutes || 0), 0)} phút (
                          {(
                            (activePayroll.lines || []).reduce((acc, l) => acc + (l.approvedEligibleMinutes || 0), 0) / 60
                          ).toFixed(2)}
                          h)
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[#82737B]">Thù lao + Điều chỉnh</span>
                        <strong className="text-[14px]">
                          {formatVnd(activePayroll.totalEarningsAmountVnd)} / {formatVnd(activePayroll.totalAdjustmentsAmountVnd)}
                        </strong>
                      </div>
                      <div>
                        <span className="block text-[#82737B]">Tổng duyệt chi (VND)</span>
                        <strong className="text-[15px] text-[#AD3155]">
                          {formatVnd(activePayroll.grossPayableAmountVnd)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Lines */}
                  <div>
                    <h4 className="font-semibold text-[#51434A]">
                      Các buổi tư vấn trong kỳ ({(activePayroll.lines || []).length})
                    </h4>
                    <div className="mt-1.5 max-h-40 overflow-y-auto">
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className="border-b border-[#F2EAEF] text-[#82737B]">
                            <th className="py-1.5">Booking</th>
                            <th className="py-1.5">JLPT</th>
                            <th className="py-1.5">Phút hợp lệ</th>
                            <th className="py-1.5">Đơn giá × Hệ số</th>
                            <th className="py-1.5 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activePayroll.lines || []).map((line) => (
                            <tr key={line.id} className="border-b border-[#F9F5F7]">
                              <td className="py-1.5">#{line.mentorBookingId}</td>
                              <td className="py-1.5 font-bold text-[#AD3155]">{line.jlptLevel}</td>
                              <td className="py-1.5">{line.approvedEligibleMinutes} phút</td>
                              <td className="py-1.5">
                                {formatVnd(line.frozenHourlyRateVnd)} × {Number(line.frozenLevelCoefficient).toFixed(2)}
                              </td>
                              <td className="py-1.5 text-right font-semibold">
                                {formatVnd(line.lineAmountVnd)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Adjustments */}
                  <div>
                    <h4 className="font-semibold text-[#51434A]">
                      Các khoản điều chỉnh có lý do ({(activePayroll.adjustments || []).length})
                    </h4>
                    {(activePayroll.adjustments || []).map((adj) => (
                      <div key={adj.id} className="mt-1 flex justify-between rounded-lg bg-[#FAF6F8] px-3 py-1.5">
                        <span>
                          {adj.reason} {adj.relatedMentorBookingId ? `(Booking #${adj.relatedMentorBookingId})` : ''}
                        </span>
                        <strong className={adj.amountVnd >= 0 ? 'text-[#1E5C36]' : 'text-[#A32145]'}>
                          {adj.amountVnd >= 0 ? '+' : ''}
                          {formatVnd(adj.amountVnd)}
                        </strong>
                      </div>
                    ))}

                    {['Draft', 'Review'].includes(normalizePayrollStatus(activePayroll.status)) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          addAdjustmentMut.mutate();
                        }}
                        className="mt-3 grid gap-2 sm:grid-cols-3"
                      >
                        <input
                          required
                          type="number"
                          value={adjForm.amountVnd}
                          onChange={(e) => setAdjForm((f) => ({ ...f, amountVnd: e.target.value }))}
                          placeholder="Số tiền (+/- VND)"
                          className="h-9 rounded-lg border border-[#E7DAE1] px-2.5 text-[12px]"
                        />
                        <input
                          required
                          value={adjForm.reason}
                          onChange={(e) => setAdjForm((f) => ({ ...f, reason: e.target.value }))}
                          placeholder="Lý do điều chỉnh (bắt buộc)"
                          className="h-9 rounded-lg border border-[#E7DAE1] px-2.5 text-[12px]"
                        />
                        <button type="submit" disabled={addAdjustmentMut.isPending} className={btnSecondary}>
                          Thêm điều chỉnh
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Approve Payroll */}
                  {['Draft', 'Review'].includes(normalizePayrollStatus(activePayroll.status)) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F2EAEF] pt-3">
                      <label className="text-[12px] font-medium text-[#6E5360]">
                        Phương thức chi trả mặc định:
                        <select
                          value={approveMethod}
                          onChange={(e) => setApproveMethod(e.target.value)}
                          className="ml-2 h-9 rounded-lg border border-[#E7DAE1] px-2.5 text-[12px]"
                        >
                          <option value="ManualBankTransfer">Chuyển khoản thủ công (ManualBankTransfer)</option>
                          <option value="PayOsPayout">Chi trả tự động (PayOsPayout)</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={approvePayrollMut.isPending}
                        onClick={() => approvePayrollMut.mutate(activePayroll.id)}
                        className={btnPrimary}
                      >
                        {approvePayrollMut.isPending
                          ? 'Đang phê duyệt…'
                          : 'Phê duyệt kỳ lương & Tạo nghĩa vụ chi trả'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: DUAL PAYOUT MANAGEMENT ================= */}
      {activeTab === 'payouts' && (
        <div className="space-y-5" data-testid="comp-tab-payouts">
          {/* 4A. payOS Payout Balance & Batch Controls */}
          <div className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-semibold text-[#352C31]">Chi trả</h3>
                <p className="mt-1 text-[12px] text-[#82737B]">
                  Số dư payOS{' '}
                  <strong className="text-[#1E5C36]">
                    {payOsBalanceQuery.data ? formatVnd(payOsBalanceQuery.data.balanceVnd) : '…'}
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] font-medium text-[#6E5360]">
                  Thử payOS
                  <select
                    value={payOsSimOutcome}
                    onChange={(e) => setPayOsSimOutcome(e.target.value)}
                    className="ml-1.5 h-9 rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
                  >
                    <option value="PAID">PAID (Thành công)</option>
                    <option value="PROCESSING">PROCESSING (Đang xử lý — chưa Paid)</option>
                    <option value="TIMEOUT">TIMEOUT (Mất kết nối — Khóa chờ đối soát)</option>
                    <option value="FAILED">FAILED (Thất bại — Cho phép thử lại)</option>
                  </select>
                </label>

                <button
                  type="button"
                  disabled={!selectedObligationIds.length || estimateCreditMut.isPending}
                  onClick={() => estimateCreditMut.mutate()}
                  className={btnSecondary}
                >
                  Ước tính chi phí lô ({selectedObligationIds.length})
                </button>
                <button
                  type="button"
                  disabled={!selectedObligationIds.length || executeBatchPayOsMut.isPending}
                  onClick={() => executeBatchPayOsMut.mutate()}
                  className={btnPrimary}
                >
                  Chi trả lô qua payOS ({selectedObligationIds.length})
                </button>
              </div>
            </div>

            {creditEstimate && (
              <div className="mt-3 rounded-xl bg-[#EEF4FF] px-4 py-2.5 text-[12px] text-[#1D4ED8]">
                Ước tính lô chi trả payOS: Tổng tiền thù lao{' '}
                <strong>{formatVnd(creditEstimate.totalAmountVnd)}</strong> · Phí dự kiến{' '}
                <strong>{formatVnd(creditEstimate.estimatedFeeVnd)}</strong> · Tổng hạn mức cần có{' '}
                <strong>{formatVnd(creditEstimate.totalCreditRequiredVnd)}</strong>.
              </div>
            )}
          </div>

          {/* 4B. Payout Obligations List */}
          <div className="space-y-4">
            {(payoutsQuery.data || []).map((ob) => {
              const status = normalizePayoutObligationStatus(ob.status);
              const method = normalizePayoutMethod(ob.selectedExecutionMethod) || 'ManualBankTransfer';
              const paid = isPayoutPaid(status);
              const lockedUnknown = isPayoutLockedPendingReconciliation(status);
              const switchAllowed = canSwitchPayoutMethod(status);
              const payOsAllowed = canExecutePayOsPayout({
                ...ob,
                selectedExecutionMethod: method,
              });
              const manualForm = manualConfirmForms[ob.id] || {
                transferReference: '',
                evidenceStorageKey: '',
                notes: '',
              };
              const reconcileForm = reconcileForms[ob.id] || {
                providerFinalState: 'PAID',
                providerTransactionId: '',
                reason: '',
              };
              const checked = selectedObligationIds.includes(ob.id);

              return (
                <article
                  key={ob.id}
                  data-testid={`payout-obligation-${ob.id}`}
                  className={cardClass}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={paid || lockedUnknown}
                        onChange={(e) => {
                          setSelectedObligationIds((prev) =>
                            e.target.checked
                              ? [...prev, ob.id]
                              : prev.filter((id) => id !== ob.id),
                          );
                        }}
                        className="mt-1 h-4 w-4 accent-[#AD3155]"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[15px] font-semibold text-[#352C31]">
                            Nghĩa vụ chi trả #{ob.id} · Kỳ lương #{ob.mentorPayrollPeriodId} · Mentor #{ob.mentorUserId}{' '}
                            {ob.mentorName ? `(${ob.mentorName})` : ''}
                          </h4>
                          {payoutStatusBadge(status)}
                        </div>
                        <p className="mt-1 text-[12px] text-[#6E5360]">
                          Tài khoản nhận thù lao (Đã khóa bản chụp):{' '}
                          <strong>
                            {ob.recipientBankShortNameSnapshot || 'Chưa có TK verified'} ·{' '}
                            <span className="font-mono">{ob.recipientMaskedAccountSnapshot || '—'}</span> ·{' '}
                            {ob.recipientAccountHolderSnapshot || '—'}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[12px] text-[#82737B]">Số tiền được duyệt phải trả</p>
                      <p className="text-[18px] font-bold text-[#AD3155]">
                        {formatVnd(ob.payableAmountVnd)}
                      </p>
                      <p className="text-[12px] text-[#1E5C36]">
                        Đã thanh toán hoàn tất: <strong>{paid ? formatVnd(ob.paidAmountVnd) : formatVnd(0)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Warning if UnknownPendingReconciliation */}
                  {lockedUnknown && (
                    <div
                      role="alert"
                      className="mt-3 rounded-xl border border-[#F5C2D0] bg-[#FFF5F8] px-4 py-2.5 text-[12px] font-medium text-[#A32145]"
                    >
                      Cảnh báo an toàn tài chính: Lệnh chi trả đang ở trạng thái UnknownPendingReconciliation (timeout hoặc chưa rõ phản hồi từ cổng thanh toán). Hệ thống đã khóa tạo lại lệnh mới và khóa đổi phương thức để chống chi trả 2 lần. Vui lòng thực hiện Đối soát trạng thái bên dưới.
                    </div>
                  )}

                  {/* Controls row */}
                  {!paid && (
                    <div className="mt-4 grid gap-4 border-t border-[#F2EAEF] pt-4 lg:grid-cols-2">
                      {/* Method Selection + Execution */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-medium text-[#6E5360]">
                            Phương thức thực thi:
                          </span>
                          <select
                            disabled={!switchAllowed || selectMethodMut.isPending}
                            value={method}
                            onChange={(e) =>
                              selectMethodMut.mutate({
                                obligationId: ob.id,
                                executionMethod: e.target.value,
                              })
                            }
                            className="h-9 rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
                          >
                            <option value="ManualBankTransfer">
                              Chuyển khoản ngân hàng thủ công (ManualBankTransfer)
                            </option>
                            <option value="PayOsPayout">
                              Chi trả tự động qua payOS (PayOsPayout)
                            </option>
                          </select>
                        </div>

                        {method === 'ManualBankTransfer' ? (
                          <div className="space-y-2 rounded-xl bg-[#FAF7F9] p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-semibold text-[#51434A]">
                                Quy trình chuyển khoản thủ công
                              </span>
                              <button
                                type="button"
                                disabled={lockedUnknown || status === 'Processing' || initiateManualMut.isPending}
                                onClick={() => initiateManualMut.mutate(ob.id)}
                                className={btnSecondary}
                              >
                                1. Khởi tạo lệnh thủ công
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                value={manualForm.transferReference}
                                onChange={(e) =>
                                  setManualConfirmForms((prev) => ({
                                    ...prev,
                                    [ob.id]: { ...manualForm, transferReference: e.target.value },
                                  }))
                                }
                                placeholder="Mã giao dịch ngân hàng (TransferReference) *"
                                className="h-9 rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
                              />
                              <input
                                value={manualForm.evidenceStorageKey}
                                onChange={(e) =>
                                  setManualConfirmForms((prev) => ({
                                    ...prev,
                                    [ob.id]: { ...manualForm, evidenceStorageKey: e.target.value },
                                  }))
                                }
                                placeholder="Khóa chứng từ (EvidenceStorageKey) *"
                                className="h-9 rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={
                                !canConfirmManualPayout(ob, manualForm) || confirmManualMut.isPending
                              }
                              onClick={() => confirmManualMut.mutate(ob)}
                              className={btnPrimary}
                            >
                              2. Xác nhận đã chuyển khoản (Confirm Paid)
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 rounded-xl bg-[#FAF7F9] p-3">
                            <p className="text-[12px] text-[#6E5360]">
                              Gửi lệnh chi trả tự động qua Backend tới payOS Payout. Không đánh dấu Paid nếu cổng trả về Processing hoặc Timeout.
                            </p>
                            <button
                              type="button"
                              disabled={!payOsAllowed || executePayOsMut.isPending}
                              onClick={() => executePayOsMut.mutate(ob.id)}
                              className={btnPrimary}
                            >
                              {executePayOsMut.isPending
                                ? 'Đang gửi lệnh payOS…'
                                : 'Thực thi lệnh chi trả payOS Payout'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Reconciliation panel */}
                      <div className="space-y-2 rounded-xl border border-[#EADFE5] bg-[#FCFAFB] p-3">
                        <span className="block text-[12px] font-semibold text-[#51434A]">
                          Đối soát trạng thái (Dành cho lệnh Processing / UnknownPendingReconciliation)
                        </span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={reconcileForm.providerFinalState}
                            onChange={(e) =>
                              setReconcileForms((prev) => ({
                                ...prev,
                                [ob.id]: { ...reconcileForm, providerFinalState: e.target.value },
                              }))
                            }
                            className="h-9 rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
                          >
                            <option value="PAID">Đối soát xác nhận: ĐÃ CHI TRẢ (PAID)</option>
                            <option value="FAILED">Đối soát xác nhận: THẤT BẠI (FAILED — Mở lại)</option>
                          </select>
                          <input
                            value={reconcileForm.providerTransactionId}
                            onChange={(e) =>
                              setReconcileForms((prev) => ({
                                ...prev,
                                [ob.id]: {
                                  ...reconcileForm,
                                  providerTransactionId: e.target.value,
                                },
                              }))
                            }
                            placeholder="Mã GD nhà cung cấp (tùy chọn)"
                            className="h-9 rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={reconcileForm.reason}
                            onChange={(e) =>
                              setReconcileForms((prev) => ({
                                ...prev,
                                [ob.id]: { ...reconcileForm, reason: e.target.value },
                              }))
                            }
                            placeholder="Lý do & kết quả đối soát sao kê / webhook (Bắt buộc)"
                            className="h-9 flex-1 rounded-lg border border-[#E7DAE1] bg-white px-2.5 text-[12px]"
                          />
                          <button
                            type="button"
                            disabled={
                              !['UnknownPendingReconciliation', 'Processing'].includes(status) ||
                              reconcileMut.isPending
                            }
                            onClick={() => reconcileMut.mutate(ob.id)}
                            className={btnSecondary}
                          >
                            Xác nhận đối soát
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attempts History */}
                  {(ob.attempts || []).length > 0 && (
                    <div className="mt-3 border-t border-[#F2EAEF] pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#82737B]">
                        Lịch sử lần thực thi ({ob.attempts.length})
                      </p>
                      <div className="mt-1.5 space-y-1 text-[12px]">
                        {ob.attempts.map((att) => (
                          <div
                            key={att.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FAF7F9] px-3 py-1.5"
                          >
                            <span>
                              Lần #{att.attemptNumber} · {normalizePayoutMethod(att.executionMethod)} ·{' '}
                              <strong>{att.status}</strong>
                              {att.transferReference ? ` · Mã CK: ${att.transferReference}` : ''}
                              {att.evidenceStorageKey ? ` · Chứng từ: ${att.evidenceStorageKey}` : ''}
                              {att.providerPayoutId ? ` · payOS ID: ${att.providerPayoutId}` : ''}
                            </span>
                            <span className="text-[#82737B]">{fmtDate(att.initiatedAtUtc)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}

            {!(payoutsQuery.data || []).length && (
              <div className={cardClass}>
                <p className="text-center text-[13px] text-[#82737B]">
                  Chưa có nghĩa vụ chi trả nào. Hãy phê duyệt kỳ lương ở mục 3 để sinh nghĩa vụ chi trả.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
