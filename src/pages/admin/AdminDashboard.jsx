import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { completeQaPayment, getAdminDashboard } from '../../api/admin.js';
import { AdminShell } from '../../components/shells';

const ATTENTION = [
  { key: 'pendingContent', label: 'Nội dung chờ duyệt', hint: 'Bài và câu hỏi mới', to: '/admin/content-review' },
  { key: 'pendingMentorSchedules', label: 'Khung giờ chờ duyệt', hint: 'Lịch cố vấn chưa mở', to: '/admin/slot-review' },
];

const FIGURES = [
  { key: 'totalUsers', label: 'Người dùng', to: '/admin/users' },
  { key: 'learners', label: 'Học viên', to: '/admin/users' },
  { key: 'mentors', label: 'Cố vấn', to: '/admin/mentors' },
  { key: 'mentorBookings', label: 'Buổi tư vấn', to: '/admin/mentor-schedules' },
  { key: 'activePlans', label: 'Gói đang bán', to: '/admin/mentor-plans' },
  { key: 'paidSubscriptions', label: 'Gói đã thanh toán', to: '/admin/mentor-plans' },
];

export default function AdminDashboard() {
  const { pathname } = useLocation();
  const [subscriptionId, setSubscriptionId] = useState('');
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const data = await getAdminDashboard();
      return data?.result ?? data;
    },
  });
  const qa = useMutation({
    mutationFn: () => completeQaPayment(Number(subscriptionId)),
    onSuccess: () => {
      setNotice('Đã xác nhận thanh toán mô phỏng.');
      setSubscriptionId('');
      query.refetch();
    },
  });
  const stats = query.data || {};
  const number = (key) => (query.isLoading ? '…' : stats[key] ?? 0);

  return (
    <AdminShell pathname={pathname} breadcrumb="Tổng quan">
      <main className="mx-auto max-w-[1080px] px-4 py-6 text-[#352C31] sm:px-6">
        <h1 className="text-[25px] font-semibold tracking-tight">Tổng quan</h1>
        <p className="mt-1 text-[13px] text-[#82737B]">Việc cần xử lý và số liệu hiện tại của hệ thống.</p>
        {query.isError && <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-[13px] text-[#A33357]">{query.error.message}</p>}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {ATTENTION.map((card) => {
            const count = Number(stats[card.key] || 0);
            return (
              <Link key={card.key} to={card.to} className="flex items-center justify-between rounded-2xl border border-[#EADFE5] bg-white px-5 py-4 hover:border-[#E7C9D6]">
                <span>
                  <span className="block text-[14px] font-medium">{card.label}</span>
                  <span className="mt-1 block text-[12px] text-[#A08B96]">{card.hint}</span>
                </span>
                <span className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[18px] font-semibold ${count > 0 ? 'bg-[#FCE8F0] text-[#AD3155]' : 'bg-[#F6F1F4] text-[#A08B96]'}`}>
                  {number(card.key)}
                </span>
              </Link>
            );
          })}
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#EADFE5] bg-white">
          <h2 className="border-b border-[#F3EDF0] px-5 py-3 text-[14px] font-semibold">Số liệu</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {FIGURES.map((card) => (
              <Link key={card.key} to={card.to} className="border-b border-r border-[#F6F0F3] px-5 py-4 hover:bg-[#FFF8FB]">
                <span className="block text-[12px] text-[#A08B96]">{card.label}</span>
                <span className="mt-1 block text-[22px] font-semibold">{number(card.key)}</span>
              </Link>
            ))}
          </div>
        </section>

        <form
          className="mt-4 rounded-2xl border border-[#EADFE5] bg-white px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice('');
            qa.mutate();
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <h2 className="text-[14px] font-semibold">Thanh toán mô phỏng</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#A08B96]">Nhập mã gói đã mua. Máy chủ chỉ nhận khi môi trường thử đang bật.</p>
              <label className="mt-3 block text-[12px] font-medium text-[#6E5360]">
                Mã gói
                <input
                  required
                  min="1"
                  type="number"
                  value={subscriptionId}
                  onChange={(event) => setSubscriptionId(event.target.value)}
                  className="mt-1.5 h-10 w-full max-w-xs rounded-lg border border-[#E7DAE1] px-3 text-[13px] outline-none focus:border-[#AD3155] focus:ring-2 focus:ring-[#AD3155]/20"
                />
              </label>
            </div>
            <button type="submit" disabled={qa.isPending} className="h-10 rounded-lg bg-[#AD3155] px-4 text-[13px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50">
              {qa.isPending ? 'Đang gửi…' : 'Xác nhận'}
            </button>
          </div>
          {qa.isError && <p role="alert" className="mt-3 text-[12px] text-[#A33357]">{qa.error.message}</p>}
          {notice && <p className="mt-3 text-[12px] text-[#1E5C36]">{notice}</p>}
        </form>
      </main>
    </AdminShell>
  );
}
