import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

const SLOTS = [];

const REVIEWS = [];

export default function SenseiProfile() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Hồ sơ Sensei">
      <div className="mx-auto max-w-5xl px-6 py-8 text-on-surface" data-page="SenseiProfile">
        <Link to="/consultation" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6F6669] hover:text-[#D94B68]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Gói tư vấn
        </Link>

        <section className="overflow-hidden rounded-3xl border border-[#eadfd9] bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-[#D94B68] to-[#9E2A4B]" />
          <div className="px-6 pb-8 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end">
              <img
                alt="Chưa có ảnh Mentor"

                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md"
               src="/empty-avatar.svg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">—</h1>
                  <span className="rounded-full bg-[#FFF0F5] px-2.5 py-0.5 text-[11px] font-bold text-[#9E2A4B]">—</span>
                </div>
                <p className="mt-1 text-sm text-[#6F6669]">Mục này chưa có dữ liệu.</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[#6F6669]">
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <span className="material-symbols-outlined text-[16px]">star</span> —
                  </span>
                  <span>—</span>
                  <span>—</span>
                </div>
              </div>
              <Link
                to="/booking-schedule"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#D94B68]/25"
              >
                Đặt lịch với Sensei
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
              <h2 className="text-lg font-bold">Giới thiệu</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#6F6669]">—</p>
              <ul className="mt-4 space-y-2 text-sm text-on-surface">
                {['Chữa đề JEES 2022–2024', 'Lộ trình N3 → N2 16 tuần', 'Sửa 10 câu viết / buổi'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#D94B68]">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
              <h2 className="text-lg font-bold">Học viên nói gì</h2>
              <div className="mt-4 space-y-4">
                {REVIEWS.length === 0 && <p>—</p>}{REVIEWS.map((r) => (
                  <blockquote key={r.name} className="rounded-xl bg-[#FFF8F8] p-4">—</blockquote>
                ))}
              </div>
            </section>
          </div>
          <aside className="space-y-4 lg:col-span-5">
            <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
              <h2 className="text-lg font-bold">Khung giờ gần nhất</h2>
              <ul className="mt-4 space-y-2">
                {SLOTS.length === 0 && <p>—</p>}{SLOTS.map((s) => (
                  <li
                    key={`${s.day}${s.time}`}
                    className="flex items-center justify-between rounded-xl border border-[#eadfd9] px-3 py-2.5 text-sm"
                  >
                    <span className="font-semibold">{s.day}</span>
                    <span className="text-[#6F6669]">{s.time}</span>
                    <span className={`text-[11px] font-bold ${s.open ? 'text-emerald-600' : 'text-[#A59B9E]'}`}>
                      {s.open ? 'Còn chỗ' : 'Đã kín'}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/booking-schedule"
                className="mt-4 flex w-full items-center justify-center rounded-full border border-[#f2d7de] bg-[#FFF0F5] py-2.5 text-sm font-bold text-[#9E2A4B]"
              >
                Xem toàn bộ lịch
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </LearnerShell>
  );
}
