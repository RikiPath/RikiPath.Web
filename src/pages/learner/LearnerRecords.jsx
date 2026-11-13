import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';

import { LearnerShell } from '../../components/shells';
import { useLocale } from '../../i18n/locale.js';
import { getCreditBalance, getCreditHistory, getLearnerDisputes } from '../../api/mentorBookingApi.js';

const STATUS = {
  Submitted: 'Mới gửi',
  UnderReview: 'Đang xem',
  AwaitingResponse: 'Chờ giải trình',
  Resolved: 'Đã xử lý',
  Rejected: 'Từ chối',
  Closed: 'Đã đóng',
};

const ENTRY = {
  Grant: 'Cấp vé',
  Spend: 'Dùng vé',
  Refund: 'Hoàn vé',
};

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function LearnerRecords() {
  const { tr } = useLocale();
  const { pathname } = useLocation();
  const balance = useQuery({ queryKey: ['learner-credit-balance'], queryFn: getCreditBalance });
  const history = useQuery({ queryKey: ['learner-credit-history'], queryFn: () => getCreditHistory({ page: 1, pageSize: 20 }) });
  const disputes = useQuery({ queryKey: ['learner-disputes'], queryFn: () => getLearnerDisputes({ page: 1, pageSize: 20 }) });
  const entries = Array.isArray(history.data) ? history.data : [];
  const cases = Array.isArray(disputes.data) ? disputes.data : disputes.data?.items || [];
  const error = balance.error || history.error || disputes.error;

  return (
    <LearnerShell pathname={pathname} breadcrumb={tr('Vé tư vấn')}>
      <main className="mx-auto max-w-[1040px] px-5 py-6 font-['Be_Vietnam_Pro',sans-serif] text-[#49353F] lg:px-7">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#AD3155]">{tr('TƯ VẤN')}</p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{tr('Vé và khiếu nại')}</h1>
          </div>
          <Link to="/consultation-center/" className="text-[13px] font-medium text-[#AD3155]">{tr('Về lịch tư vấn')}</Link>
        </header>

        {error && <p role="alert" className="mb-4 rounded-2xl bg-[#FCF4F8] px-4 py-3 text-[13px] text-[#A33357]">{error.message}</p>}

        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-[22px] bg-[#AD3155] px-5 py-5 text-white shadow-[0_16px_40px_rgba(173,49,85,0.18)]">
            <p className="text-[12px] text-white/80">{tr('Vé còn lại')}</p>
            <p className="mt-2 text-[48px] font-semibold leading-none">{balance.data?.totalAvailableCredits ?? balance.data?.balance ?? '—'}</p>
            {balance.data?.expiringSoonestAtUtc && (
              <p className="mt-3 text-[12px] text-white/80">{tr('Gói gần hết hạn')} {when(balance.data.expiringSoonestAtUtc)}</p>
            )}
          </section>

          <section className="rounded-[22px] border border-[#F0E4E9] bg-white p-5">
            <h2 className="text-[16px] font-semibold">{tr('Biến động vé')}</h2>
            {history.isPending && <p className="mt-3 text-[13px] text-[#A08B96]">{tr('Đang tải…')}</p>}
            {!history.isPending && !entries.length && <p className="mt-3 text-[13px] text-[#A08B96]">{tr('Chưa có biến động.')}</p>}
            <ul className="mt-3 divide-y divide-[#F6F0F3]">
              {entries.map((item) => (
                <li key={item.entryId} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-[13px] font-medium">{ENTRY[item.entryType] || item.entryType}</p>
                    <p className="mt-0.5 text-[12px] text-[#8C7782]">{when(item.createdAtUtc)}{item.reason ? ` · ${item.reason}` : ''}</p>
                  </div>
                  <span className={`text-[16px] font-semibold ${Number(item.amount) < 0 ? 'text-[#A33357]' : 'text-[#1E5C36]'}`}>
                    {Number(item.amount) > 0 ? `+${item.amount}` : item.amount}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-4 rounded-[22px] border border-[#F0E4E9] bg-white p-5">
          <h2 className="text-[16px] font-semibold">{tr('Khiếu nại của tôi')}</h2>
          {disputes.isPending && <p className="mt-3 text-[13px] text-[#A08B96]">{tr('Đang tải…')}</p>}
          {!disputes.isPending && !cases.length && <p className="mt-3 text-[13px] text-[#A08B96]">{tr('Chưa có khiếu nại.')}</p>}
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {cases.map((item) => (
              <li key={item.id} className="rounded-2xl bg-[#FDF2F5] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold">{item.mentorName || tr('Cố vấn')}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#AD3155]">{STATUS[item.status] || item.status}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#705261]">{item.reason}</p>
                <p className="mt-2 text-[12px] text-[#8C7782]">{tr('Buổi')} #{item.mentorBookingId} · {when(item.createdAtUtc)}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </LearnerShell>
  );
}
