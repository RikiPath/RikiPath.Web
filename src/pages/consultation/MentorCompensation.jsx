import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { ConsultShell } from '../../components/shells';
import {
  formatVnd,
  getMentorCompensationOverview,
  getMentorHourlyRates,
  getMentorPayrollDetail,
  getMentorPayoutDetail,
  normalizeBankVerificationStatus,
  normalizeEarningStatus,
  normalizePayrollStatus,
  normalizePayoutMethod,
  normalizePayoutObligationStatus,
  upsertMentorBankAccount,
} from '../../api/mentorCompensationApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';
const field = `mt-1.5 w-full rounded-xl border border-[#EADFE5] bg-white px-3 py-2.5 text-[13px] outline-none ${focus}`;

const BANKS = [
  ['970436', 'Vietcombank'],
  ['970415', 'VietinBank'],
  ['970418', 'BIDV'],
  ['970405', 'Agribank'],
  ['970422', 'MB'],
  ['970407', 'Techcombank'],
  ['970432', 'VPBank'],
  ['970423', 'TPBank'],
  ['970403', 'Sacombank'],
  ['970416', 'ACB'],
];

const EARNING_LABEL = {
  Eligible: 'Đủ điều kiện',
  HeldDisputed: 'Đang giữ',
  LockedInPayroll: 'Đã vào kỳ lương',
  Paid: 'Đã chi',
};

const PAYROLL_LABEL = {
  Draft: 'Nháp',
  Review: 'Đang rà soát',
  Approved: 'Đã duyệt',
  Paid: 'Đã chi',
  Closed: 'Đã đóng',
};

const BANK_LABEL = {
  PendingVerification: 'Chờ xác minh',
  Verified: 'Đã xác minh',
  Rejected: 'Bị từ chối',
  Superseded: 'Đã thay thế',
};

const PAYOUT_LABEL = {
  PendingExecution: 'Chờ chi',
  Processing: 'Đang chi',
  UnknownPendingReconciliation: 'Chờ đối soát',
  OnHoldMissingEvidence: 'Tạm giữ',
  Paid: 'Đã chi',
  FailedRetryable: 'Chi lỗi',
  Cancelled: 'Đã hủy',
};

const METHOD_LABEL = {
  ManualBankTransfer: 'Chuyển khoản',
  PayOsPayout: 'payOS',
};

function when(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function labelOf(map, value, normalize) {
  const key = normalize ? normalize(value) : value;
  return map[key] || key || '—';
}

function asOverview(data) {
  if (!data || typeof data !== 'object') return null;
  if ('isSuccess' in data && !('recentEarnings' in data) && !('totalPaidVnd' in data)) return null;
  return data;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#EADFE5] bg-white px-4 py-4">
      <p className="text-[12px] text-[#967F8A]">{label}</p>
      <p className="mt-1 text-[18px] font-semibold text-[#A33357]">{value}</p>
    </div>
  );
}

export default function MentorCompensation() {
  const { pathname } = useLocation();
  const client = useQueryClient();
  const [bankKey, setBankKey] = useState(BANKS[0][0]);
  const [customBank, setCustomBank] = useState(false);
  const [form, setForm] = useState({
    bankBin: BANKS[0][0],
    bankShortName: BANKS[0][1],
    accountNumber: '',
    accountHolderName: '',
  });
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [openPayrollId, setOpenPayrollId] = useState(null);
  const [openPayoutId, setOpenPayoutId] = useState(null);

  const overviewQuery = useQuery({
    queryKey: ['mentor-compensation-overview'],
    queryFn: async () => asOverview(await getMentorCompensationOverview()),
    retry: false,
  });
  const ratesQuery = useQuery({
    queryKey: ['mentor-hourly-rates'],
    queryFn: getMentorHourlyRates,
    retry: false,
  });
  const payoutDetail = useQuery({
    queryKey: ['mentor-payout', openPayoutId],
    queryFn: () => getMentorPayoutDetail(openPayoutId),
    enabled: Boolean(openPayoutId),
    retry: false,
  });
  const payrollDetail = useQuery({
    queryKey: ['mentor-payroll', openPayrollId],
    queryFn: () => getMentorPayrollDetail(openPayrollId),
    enabled: Boolean(openPayrollId),
    retry: false,
  });

  const saveBank = useMutation({
    mutationFn: () => upsertMentorBankAccount({
      bankBin: form.bankBin.trim(),
      bankShortName: form.bankShortName.trim(),
      accountNumber: form.accountNumber.trim(),
      accountHolderName: form.accountHolderName.trim(),
    }),
    onSuccess: () => {
      setFormError('');
      setNotice('Đã gửi tài khoản. Quản trị cần xác minh trước khi khoản thù lao được chi vào số này.');
      setForm((current) => ({ ...current, accountNumber: '' }));
      client.invalidateQueries({ queryKey: ['mentor-compensation-overview'] });
    },
    onError: (err) => {
      setNotice('');
      setFormError(err.message || 'Không lưu được tài khoản.');
    },
  });

  const overview = overviewQuery.data;
  const rate = overview?.currentHourlyRate;
  const bank = overview?.currentBankAccount;
  const qualifications = overview?.activeQualifications || [];
  const earnings = overview?.recentEarnings || [];
  const payrolls = overview?.recentPayrolls || [];
  const payouts = overview?.recentPayouts || [];
  const rates = Array.isArray(ratesQuery.data) ? ratesQuery.data : [];
  const detail = payrollDetail.data && payrollDetail.data.id ? payrollDetail.data : null;

  const chooseBank = (value) => {
    if (value === 'other') {
      setCustomBank(true);
      setBankKey('other');
      setForm((current) => ({ ...current, bankBin: '', bankShortName: '' }));
      return;
    }
    const found = BANKS.find(([bin]) => bin === value);
    setCustomBank(false);
    setBankKey(value);
    setForm((current) => ({
      ...current,
      bankBin: found?.[0] || '',
      bankShortName: found?.[1] || '',
    }));
  };

  return (
    <ConsultShell pathname={pathname} breadcrumb="Thù lao">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-6 text-[#49353F] sm:px-6 lg:px-8">
        <header className="mb-5">
          <h1 className="text-[25px] font-semibold tracking-tight">Thù lao</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#927B88]">
            Đơn giá, bảng kê từng buổi, kỳ lương và tài khoản nhận tiền. Việc chi trả do quản trị thực hiện sau khi tài khoản được xác minh.
          </p>
        </header>

        {overviewQuery.isPending && <p className="mb-4 text-[13px] text-[#9A8390]">Đang tải thù lao…</p>}
        {overviewQuery.error && (
          <p role="alert" className="mb-4 rounded-xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">
            {overviewQuery.error.message}
          </p>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Đơn giá giờ" value={rate ? formatVnd(rate.hourlyRateVnd) : 'Chưa có'} />
          <Stat label="Chưa vào kỳ lương" value={formatVnd(overview?.totalEligibleUnassignedVnd)} />
          <Stat label="Đã khóa trong kỳ" value={formatVnd(overview?.totalLockedInPayrollVnd)} />
          <Stat label="Đã chi" value={formatVnd(overview?.totalPaidVnd)} />
        </section>

        <section className="mt-4 rounded-2xl border border-[#EADFE5] bg-white p-5">
          <h2 className="text-[14px] font-semibold text-[#705261]">Trình độ được tính thù lao</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {qualifications.length ? qualifications.map((item) => (
              <span key={item.id} className="rounded-full bg-[#FCEEF3] px-3 py-1 text-[12px] font-medium text-[#A33357]">
                {item.jlptLevel || 'JLPT'}
              </span>
            )) : (
              <p className="text-[13px] text-[#8C7782]">Chưa có trình độ được duyệt.</p>
            )}
          </div>
          {rate?.effectiveFromUtc && (
            <p className="mt-3 text-[12px] text-[#967F8A]">Đơn giá có hiệu lực từ {when(rate.effectiveFromUtc)}.</p>
          )}
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
            <h2 className="text-[14px] font-semibold text-[#705261]">Tài khoản đang dùng</h2>
            {bank ? (
              <dl className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between gap-3"><dt className="text-[#967F8A]">Ngân hàng</dt><dd className="font-medium">{bank.bankShortName} · {bank.bankBin}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#967F8A]">Số tài khoản</dt><dd className="font-medium">{bank.maskedAccountNumber}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#967F8A]">Chủ tài khoản</dt><dd className="font-medium">{bank.accountHolderName}</dd></div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#967F8A]">Xác minh</dt>
                  <dd className="font-medium">{labelOf(BANK_LABEL, bank.verificationStatus, normalizeBankVerificationStatus)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-[13px] text-[#8C7782]">Chưa đăng ký tài khoản nhận thù lao.</p>
            )}
          </section>

          <section className="rounded-2xl border border-[#EADFE5] bg-white p-5">
            <h2 className="text-[14px] font-semibold text-[#705261]">Đăng ký hoặc đổi tài khoản</h2>
            <p className="mt-1 text-[12px] leading-6 text-[#A18B97]">
              Tài khoản mới thay tài khoản hiện tại và chờ quản trị xác minh lại.
            </p>
            <form
              className="mt-3 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setNotice('');
                setFormError('');
                const account = form.accountNumber.replace(/[\s-]/g, '');
                if (!form.bankBin.trim() || !form.bankShortName.trim()) {
                  setFormError('Chọn ngân hàng hoặc nhập mã BIN và tên viết tắt.');
                  return;
                }
                if (account.length < 6 || account.length > 34) {
                  setFormError('Số tài khoản cần từ 6 đến 34 ký tự.');
                  return;
                }
                if (form.accountHolderName.trim().length < 2) {
                  setFormError('Nhập tên chủ tài khoản.');
                  return;
                }
                saveBank.mutate();
              }}
            >
              <label className="block text-[12px] font-medium text-[#705261]">
                Ngân hàng
                <select
                  value={customBank ? 'other' : bankKey}
                  onChange={(event) => chooseBank(event.target.value)}
                  className={field}
                >
                  {BANKS.map(([bin, name]) => <option key={bin} value={bin}>{name}</option>)}
                  <option value="other">Ngân hàng khác</option>
                </select>
              </label>
              {customBank && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] font-medium text-[#705261]">
                    Mã BIN
                    <input value={form.bankBin} maxLength={50} onChange={(event) => setForm((current) => ({ ...current, bankBin: event.target.value }))} className={field} />
                  </label>
                  <label className="block text-[12px] font-medium text-[#705261]">
                    Tên viết tắt
                    <input value={form.bankShortName} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, bankShortName: event.target.value }))} className={field} />
                  </label>
                </div>
              )}
              <label className="block text-[12px] font-medium text-[#705261]">
                Số tài khoản
                <input value={form.accountNumber} inputMode="numeric" autoComplete="off" maxLength={34} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value }))} className={field} />
              </label>
              <label className="block text-[12px] font-medium text-[#705261]">
                Tên chủ tài khoản
                <input value={form.accountHolderName} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, accountHolderName: event.target.value }))} className={field} />
              </label>
              {formError && <p role="alert" className="text-[12px] text-[#A33357]">{formError}</p>}
              {notice && <p role="status" className="text-[12px] leading-5 text-[#1E5C36]">{notice}</p>}
              <button
                type="submit"
                disabled={saveBank.isPending}
                className={`h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-40 ${focus}`}
              >
                {saveBank.isPending ? 'Đang lưu…' : 'Lưu tài khoản'}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          <h2 className="border-b border-[#F0E7EC] px-5 py-3 text-[14px] font-semibold text-[#705261]">Bảng kê gần đây</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-[#FCFAFB] text-[11px] uppercase tracking-[0.04em] text-[#8C7782]">
                <tr>
                  {['Buổi', 'Trình độ', 'Phút tính', 'Số tiền', 'Trạng thái', 'Ngày'].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {earnings.map((row) => (
                  <tr key={row.id} className="border-t border-[#F0E7EC]">
                    <td className="px-4 py-3">#{row.mentorBookingId}</td>
                    <td className="px-4 py-3">{row.jlptLevel || '—'}</td>
                    <td className="px-4 py-3">{row.approvedEligibleMinutes}</td>
                    <td className="px-4 py-3">{formatVnd(row.eligibleAmountVnd)}</td>
                    <td className="px-4 py-3">{labelOf(EARNING_LABEL, row.status, normalizeEarningStatus)}</td>
                    <td className="px-4 py-3">{when(row.earnedAtUtc)}</td>
                  </tr>
                ))}
                {!earnings.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8C7782]">Chưa có bút toán thù lao.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          <h2 className="border-b border-[#F0E7EC] px-5 py-3 text-[14px] font-semibold text-[#705261]">Kỳ lương</h2>
          <div className="divide-y divide-[#F0E7EC]">
            {payrolls.map((period) => {
              const open = openPayrollId === period.id;
              return (
                <div key={period.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenPayrollId(open ? null : period.id)}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-[#FFF7FA] ${focus}`}
                  >
                    <span>
                      <span className="block text-[14px] font-medium">Tháng {period.periodMonth}/{period.periodYear}</span>
                      <span className="mt-0.5 block text-[12px] text-[#967F8A]">{labelOf(PAYROLL_LABEL, period.status, normalizePayrollStatus)}</span>
                    </span>
                    <span className="text-[14px] font-semibold text-[#A33357]">{formatVnd(period.grossPayableAmountVnd)}</span>
                  </button>
                  {open && (
                    <div className="bg-[#FCFAFB] px-5 py-3 text-[13px]">
                      {payrollDetail.isPending && <p className="text-[#9A8390]">Đang tải chi tiết kỳ…</p>}
                      {payrollDetail.error && <p role="alert" className="text-[#A33357]">{payrollDetail.error.message}</p>}
                      {detail && (
                        <>
                          <p className="text-[#705261]">
                            Bảng kê {formatVnd(detail.totalEarningsAmountVnd)} · Điều chỉnh {formatVnd(detail.totalAdjustmentsAmountVnd)}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {(detail.lines || []).map((line) => (
                              <li key={line.id} className="flex justify-between gap-3">
                                <span>Buổi #{line.mentorBookingId} · {line.jlptLevel} · {line.approvedEligibleMinutes} phút</span>
                                <span>{formatVnd(line.lineAmountVnd)}</span>
                              </li>
                            ))}
                            {(detail.adjustments || []).map((item) => (
                              <li key={item.id} className="flex justify-between gap-3">
                                <span>Điều chỉnh: {item.reason}</span>
                                <span>{formatVnd(item.amountVnd)}</span>
                              </li>
                            ))}
                            {!detail.lines?.length && !detail.adjustments?.length && <li className="text-[#8C7782]">Kỳ này chưa có dòng chi tiết.</li>}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!payrolls.length && <p className="px-5 py-8 text-center text-[13px] text-[#8C7782]">Chưa có kỳ lương.</p>}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          <h2 className="border-b border-[#F0E7EC] px-5 py-3 text-[14px] font-semibold text-[#705261]">Chi trả</h2>
          <div className="divide-y divide-[#F0E7EC]">
            {rates.length > 0 && (
              <div className="border-b border-[#F0E7EC] px-5 py-3 text-[12px] text-[#705261]">
                <p className="mb-1 font-medium text-[#49353F]">Đơn giá theo giờ</p>
                {rates.map((item) => (
                  <p key={item.id}>
                    {formatVnd(item.hourlyRateVnd)}/giờ · từ {when(item.effectiveFromUtc)}
                    {item.effectiveToUtc ? ` đến ${when(item.effectiveToUtc)}` : ''}
                    {item.isActive ? ' · đang dùng' : ''}
                  </p>
                ))}
              </div>
            )}
            {payouts.map((item) => (
              <div key={item.id} className="px-5 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Kỳ #{item.mentorPayrollPeriodId}</p>
                    <p className="mt-0.5 text-[12px] text-[#967F8A]">
                      {labelOf(PAYOUT_LABEL, item.status, normalizePayoutObligationStatus)}
                      {item.selectedExecutionMethod ? ` · ${labelOf(METHOD_LABEL, item.selectedExecutionMethod, normalizePayoutMethod)}` : ''}
                      {item.recipientMaskedAccountSnapshot ? ` · ${item.recipientBankShortNameSnapshot} ${item.recipientMaskedAccountSnapshot}` : ''}
                    </p>
                    {item.failureReason && <p className="mt-1 text-[12px] text-[#A33357]">{item.failureReason}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#A33357]">{formatVnd(item.paidAmountVnd || item.payableAmountVnd)}</p>
                    <button type="button" onClick={() => setOpenPayoutId(openPayoutId === item.id ? null : item.id)} className="mt-1 text-[12px] text-[#AD3155]">
                      {openPayoutId === item.id ? 'Ẩn lần chi' : 'Xem lần chi'}
                    </button>
                  </div>
                </div>
                {openPayoutId === item.id && (
                  <div className="mt-2 rounded-xl bg-[#FCF7F9] px-3 py-2 text-[12px] text-[#705261]">
                    {payoutDetail.isFetching && <p>Đang tải…</p>}
                    {payoutDetail.error && <p className="text-[#A33357]">{payoutDetail.error.message}</p>}
                    {(payoutDetail.data?.attempts || []).map((attempt) => (
                      <p key={attempt.id}>
                        Lần {attempt.attemptNumber} · {formatVnd(attempt.amountVnd)} · {attempt.status}
                        {attempt.providerErrorMessage ? ` · ${attempt.providerErrorMessage}` : ''}
                      </p>
                    ))}
                    {payoutDetail.data && !payoutDetail.data.attempts?.length && !payoutDetail.isFetching && <p>Chưa có lần chi.</p>}
                  </div>
                )}
              </div>
            ))}
            {!payouts.length && <p className="px-5 py-8 text-center text-[13px] text-[#8C7782]">Chưa có khoản chi trả.</p>}
          </div>
        </section>
      </div>
    </ConsultShell>
  );
}
