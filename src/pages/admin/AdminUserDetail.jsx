import { Link, useLocation } from 'react-router-dom';
import { AdminShell } from '../../components/shells';

const ACTIVITY = [
  { when: '10 phút trước', what: 'Hoàn thành SRS 28 thẻ' },
  { when: 'Hôm qua', what: 'Nộp đề thử N3-2024-04 · 111/180' },
  { when: '2 ngày trước', what: 'Đặt lịch Sato-sensei · 14:00' },
];

export default function AdminUserDetail() {
  const { pathname } = useLocation();
  return (
    <AdminShell pathname={pathname} breadcrumb="Chi tiết người dùng">
      <div className="p-8 text-on-surface" data-page="AdminUserDetail">
        <Link to="/admin/users" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6F6669] hover:text-[#D94B68]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Người dùng
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#eadfd9] bg-white p-6">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fde8ec] font-bold text-[#9E2A4B]">
              NA
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nguyễn Văn A</h1>
              <p className="text-sm text-[#6F6669]">nguyenvana@rikipath.vn · Learner · Active</p>
              <p className="mt-1 text-xs font-semibold text-[#9E2A4B]">Mục tiêu N3 · Streak 14 ngày</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-[#eadfd9] px-3 py-2 text-sm font-semibold">
              Tạm khóa
            </button>
            <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
              Gửi email
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-[#eadfd9] bg-white p-6 lg:col-span-7">
            <h2 className="text-lg font-bold">Tiến độ học</h2>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                ['Bài xong', '19/42'],
                ['SRS hôm nay', '28'],
                ['Thi thử', '111'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#FFF8F8] py-4">
                  <dt className="text-[11px] font-bold uppercase text-[#A59B9E]">{k}</dt>
                  <dd className="mt-1 text-xl font-extrabold text-[#9E2A4B]">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-6 text-sm font-bold">Hoạt động gần đây</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {ACTIVITY.map((a) => (
                <li key={a.what} className="flex justify-between gap-4 border-b border-[#eadfd9] py-2 last:border-0">
                  <span>{a.what}</span>
                  <span className="shrink-0 text-[#A59B9E]">{a.when}</span>
                </li>
              ))}
            </ul>
          </section>
          <aside className="rounded-2xl border border-[#eadfd9] bg-white p-6 lg:col-span-5">
            <h2 className="text-lg font-bold">Gói &amp; tư vấn</h2>
            <p className="mt-2 text-sm text-[#6F6669]">Gói Đồng hành JLPT · còn 2 buổi</p>
            <p className="mt-3 text-xs text-[#A59B9E]">Lịch tư vấn xem ở cổng học viên / Sensei, không nhảy từ Admin.</p>
            <h3 className="mt-6 text-sm font-bold">Vai trò</h3>
            <p className="mt-1 text-sm text-[#6F6669]">Learner — có thể chuyển sang Author tại Phân quyền.</p>
            <Link to="/admin/roles" className="mt-3 inline-flex text-sm font-bold text-[#D94B68] hover:underline">
              Mở vai trò &amp; quyền
            </Link>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
