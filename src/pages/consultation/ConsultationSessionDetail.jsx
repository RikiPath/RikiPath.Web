import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

const AGENDA = [
  'Rà soát 3 câu Dokkai sai ở đề thử 04/2024',
  'Chiến thuật đọc lướt đoạn 余白 / 間',
  'Bài tập về nhà: 5 câu わけにはいかない',
];

export default function ConsultationSessionDetail() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Chi tiết buổi tư vấn">
      <div className="mx-auto max-w-5xl px-6 py-8 text-on-surface" data-page="ConsultationSessionDetail">
        <Link to="/consultation-center" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6F6669] hover:text-[#D94B68]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Lịch của tôi
        </Link>

        <header className="rounded-3xl border border-[#eadfd9] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-[#FFF0F5] px-2.5 py-0.5 text-[11px] font-bold text-[#9E2A4B]">
                Video 1-1 · Sắp diễn ra
              </span>
              <h1 className="mt-3 text-2xl font-bold">Tư vấn Video với Sensei Sato</h1>
              <p className="mt-1 text-sm text-[#6F6669]">Ngày mai, 14:00–14:45 · Phòng Riki Room 02</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/booking-schedule"
                className="rounded-full border border-[#eadfd9] px-4 py-2 text-sm font-semibold text-[#6F6669] hover:border-[#D94B68]/40"
              >
                Đổi lịch
              </Link>
              <Link
                to="/consultation-room"
                className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2 text-sm font-bold text-white shadow-md"
              >
                Vào phòng (mở trước 5 phút)
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-[#eadfd9] bg-white p-6 lg:col-span-7">
            <h2 className="text-lg font-bold">Nội dung buổi</h2>
            <ol className="mt-4 space-y-3">
              {AGENDA.map((item, i) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fde8ec] text-[11px] font-extrabold text-[#9E2A4B]">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-xl bg-[#FFF8F8] p-4 text-sm text-[#6F6669]">
              <p className="font-semibold text-on-surface">Ghi chú của bạn</p>
              <p className="mt-1">Mình hay hết giờ ở đoạn trường văn. Muốn sensei xem lại thứ tự làm bài.</p>
            </div>
          </section>
          <aside className="space-y-4 lg:col-span-5">
            <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
              <h2 className="text-lg font-bold">Sensei phụ trách</h2>
              <Link to="/sensei-profile" className="mt-4 flex items-center gap-3 rounded-xl hover:bg-[#FFF8F8]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fde8ec] text-[#D94B68]">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <p className="font-bold">Sensei Sato</p>
                  <p className="text-xs text-[#6F6669]">Dokkai &amp; lộ trình N2</p>
                </div>
              </Link>
            </section>
            <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
              <h2 className="text-lg font-bold">Thanh toán</h2>
              <p className="mt-2 text-sm text-[#6F6669]">Gói Đồng hành JLPT · Đã thanh toán 599.000đ</p>
              <Link to="/consultation-receipt" className="mt-3 inline-flex text-sm font-bold text-[#D94B68] hover:underline">
                Xem biên lai
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </LearnerShell>
  );
}
