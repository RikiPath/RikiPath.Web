import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

const SLOTS = [
  { day: 'Thứ 3', time: '14:00–14:45', open: true },
  { day: 'Thứ 5', time: '10:00–10:45', open: true },
  { day: 'Thứ 6', time: '19:30–20:15', open: false },
];

const REVIEWS = [
  { name: 'Lan Anh', text: 'Sato-sensei giải Dokkai rất rõ — mình tăng 8 điểm phần đọc sau 3 buổi.', rating: 5 },
  { name: 'Minh Đức', text: 'Chuẩn bị phiếu trước buổi rất kỹ, không mất thời gian hỏi lại ngữ cảnh.', rating: 5 },
];

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
                alt="Sensei Sato"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1rEBdofcr03ICOlXMbZQ4R1Alv6h6k77VqNg6kujnfyZ-g_Pz6-9dozYx4IlkBPcj7TZ-zEN921FtO4lzoYhOg0BYZMelBGE9VnH15zF0uax1pAasZx8SQpt0f8sf8s6GTEWBaWHUFhmtsaOghGa-XxKfLxvfAP5DYzIQhq4fJFZwJTAUoNSvmVe9qoutTzB3WCttq42EMyKQubCyCfQ1cf5SyO3pdHq6ITeXcThHJC9ePbaL2ROl2Q"
                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">Sensei Sato</h1>
                  <span className="rounded-full bg-[#FFF0F5] px-2.5 py-0.5 text-[11px] font-bold text-[#9E2A4B]">JLPT N1 · Tokyo</span>
                </div>
                <p className="mt-1 text-sm text-[#6F6669]">Ngữ pháp &amp; Đọc hiểu · 8 năm đồng hành N3–N2</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[#6F6669]">
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <span className="material-symbols-outlined text-[16px]">star</span> 4.9 · 112 đánh giá
                  </span>
                  <span>312 buổi hoàn thành</span>
                  <span>Phản hồi trung bình 6 giờ</span>
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
              <p className="mt-3 text-sm leading-relaxed text-[#6F6669]">
                Từng giảng tại Shinjuku Campus, Sato-sensei tập trung vào chiến lược Dokkai: quét từ khóa,
                bỏ bẫy phủ định kép, và lập thứ tự làm bài trong 70 phút. Mỗi buổi có phiếu chuẩn bị trước
                và ghi chú sau buổi gửi vào sổ học viên.
              </p>
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
                {REVIEWS.map((r) => (
                  <blockquote key={r.name} className="rounded-xl bg-[#FFF8F8] p-4">
                    <p className="text-sm leading-relaxed text-on-surface">“{r.text}”</p>
                    <footer className="mt-2 text-xs font-semibold text-[#9E2A4B]">{r.name} · {'★'.repeat(r.rating)}</footer>
                  </blockquote>
                ))}
              </div>
            </section>
          </div>
          <aside className="space-y-4 lg:col-span-5">
            <section className="rounded-2xl border border-[#eadfd9] bg-white p-6">
              <h2 className="text-lg font-bold">Khung giờ gần nhất</h2>
              <ul className="mt-4 space-y-2">
                {SLOTS.map((s) => (
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
