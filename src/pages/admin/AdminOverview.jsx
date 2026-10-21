import { AdminShell } from '../../components/shells';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard, getAdminPendingContent, unwrapApiList, unwrapApiResult } from '../../api/admin.js';

const METRICS = [['totalUsers', 'Người dùng hoạt động'], ['learners', 'Học viên'], ['mentors', 'Mentor'], ['pendingContent', 'Nội dung chờ duyệt'], ['pendingMentorSchedules', 'Lịch Mentor chờ duyệt'], ['mentorBookings', 'Lượt đặt lịch'], ['activePlans', 'Gói đang mở'], ['paidSubscriptions', 'Gói đã thanh toán']];

export default function AdminOverview() {
  const { pathname } = useLocation();
  const dashboardQuery = useQuery({ queryKey: ['admin-dashboard'], queryFn: async () => unwrapApiResult(await getAdminDashboard()) });
  const pendingQuery = useQuery({ queryKey: ['admin-pending-content'], queryFn: async () => unwrapApiList(await getAdminPendingContent()) });
  const dashboard = dashboardQuery.data;
  const dashboardError = dashboardQuery.error?.message;
  const pendingItems = [...(pendingQuery.data || [])].sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))).slice(0, 6);
  const dashboardMetrics = dashboard ? METRICS.map(([key, label]) => [label, dashboard[key] ?? 0]) : [];

  return (
    <AdminShell pathname={pathname} breadcrumb="Tổng quan">
      <div className="px-6 py-8 sm:px-8" data-page="AdminOverview">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4B8BA]">Bảng điều khiển</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#2D282A]">Tổng quan hệ thống</h1>
            <p className="mt-1 max-w-xl text-sm text-[#6F6669]">Theo dõi người dùng, mentor và hàng chờ duyệt trong một dashboard gọn.</p>
          </div>
          <Link
            to="/admin/content-review"
            className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Đi tới duyệt nội dung
          </Link>
        </div>

        {dashboardError && (
          <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {dashboardError}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardMetrics.length ? dashboardMetrics.map(([label, value]) => (
            <div key={label} className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#A59B9E]">{label}</div>
              <div className="mt-2 text-2xl font-extrabold text-[#2D282A]">{String(value)}</div>
            </div>
          )) : (
            <div className="rounded-[22px] border border-[#eadfd9] bg-white p-5 text-sm text-[#6F6669] md:col-span-2 xl:col-span-4">
              {dashboardError ? 'Số liệu chưa khả dụng.' : dashboard ? 'API chưa trả về chỉ số để hiển thị.' : 'Đang tải số liệu quản trị…'}
            </div>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
          <section className="overflow-hidden rounded-[22px] border border-[#eadfd9] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0e8e4] px-5 py-4">
              <div>
                <h2 className="font-bold text-[#2D282A]">Hàng chờ duyệt</h2>
                <p className="mt-0.5 text-xs text-[#A59B9E]">Yêu cầu duyệt nội dung gần nhất</p>
              </div>
              <Link to="/admin/content-review" className="text-sm font-semibold text-[#D94B68] hover:underline">Xem tất cả</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] font-bold uppercase tracking-wide text-[#A59B9E]">
                  <tr>
                    <th className="px-5 py-3 font-bold">Nội dung</th>
                    <th className="px-5 py-3 font-bold">Loại</th>
                    <th className="px-5 py-3 font-bold">Tác giả</th>
                    <th className="px-5 py-3 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.length ? pendingItems.map((item, index) => (
                    <tr key={item.requestId ?? `${item.entityType}-${index}`} className="border-t border-[#f0e8e4]">
                      <td className="px-5 py-3 font-semibold text-[#2D282A]">
                        {item.rowKey || `${item.entityType} #${item.requestId}`}
                      </td>
                      <td className="px-5 py-3 text-[#6F6669]">{item.entityType}</td>
                      <td className="px-5 py-3 text-[#6F6669]">{item.submittedByName || '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <Link to={`/admin/content-review/?type=${item.entityType}&requestId=${item.requestId}`} className="font-semibold text-[#D94B68] hover:underline">Duyệt</Link>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-[#6F6669]">{pendingQuery.isPending ? 'Đang tải hàng chờ…' : pendingQuery.isError ? <span role="alert">{pendingQuery.error.message}</span> : 'Chưa có nội dung chờ duyệt.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#eadfd9] bg-white p-5 shadow-sm">
            <h2 className="font-bold text-[#2D282A]">Lối tắt</h2>
            <p className="mt-1 text-xs text-[#A59B9E]">Các trang quản trị dùng nhiều nhất</p>
            <div className="mt-4 flex flex-col gap-2">
              {[
                ['/admin/users', 'group', 'Người dùng'],
                ['/admin/mentors', 'support_agent', 'Mentor'],
                ['/admin/mentor-schedules', 'event_available', 'Duyệt lịch Mentor'],
                ['/admin/operations', 'tune', 'Gói & lịch'],
                ['/admin/content-review', 'fact_check', 'Duyệt nội dung'],
              ].map(([to, icon, label]) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 text-sm font-semibold text-[#6F6669] hover:bg-[#fff8f8] hover:text-[#D94B68]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF8F8] text-[#D94B68]">
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
