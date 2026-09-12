import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

const SECTIONS = [
  { name: '言語知識 · Từ vựng / Ngữ pháp', score: 38, max: 60, note: 'Yếu わけにはいかない' },
  { name: '読解 · Đọc hiểu', score: 32, max: 60, note: 'Hết giờ ở trường văn' },
  { name: '聴解 · Nghe hiểu', score: 41, max: 60, note: 'Ổn phần hội thoại ngắn' },
];

export default function ExamResult() {
  const { pathname } = useLocation();
  const total = SECTIONS.reduce((s, x) => s + x.score, 0);
  return (
    <LearnerShell pathname={pathname} breadcrumb="Kết quả thi thử">
      <div className="mx-auto max-w-4xl px-6 py-8 text-on-surface" data-page="ExamResult">
        <Link to="/exam-n3" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6F6669] hover:text-[#D94B68]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Đề N3
        </Link>

        <header className="rounded-3xl border border-[#eadfd9] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#D94B68]">Mã đề N3-2024-04</p>
          <h1 className="mt-2 text-2xl font-bold">Kết quả thi thử JLPT N3</h1>
          <p className="mt-1 text-sm text-[#6F6669]">Chấm tự động · Ngưỡng đỗ tham khảo 95/180 và không liệt phần nào.</p>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-5xl font-extrabold text-[#9E2A4B]">{total}</p>
              <p className="text-sm text-[#6F6669]">/ 180 điểm</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              Chưa đạt ngưỡng đỗ · thiếu {95 - total} điểm
            </span>
          </div>
        </header>

        <section className="mt-6 space-y-3">
          {SECTIONS.map((s) => (
            <article key={s.name} className="rounded-2xl border border-[#eadfd9] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold">{s.name}</h2>
                <span className="font-mono text-sm font-bold">
                  {s.score}/{s.max}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2e8ea]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B]"
                  style={{ width: `${(s.score / s.max) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[#6F6669]">{s.note}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/ai-counselor"
            className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2.5 text-sm font-bold text-white"
          >
            Nhờ Haru phân tích
          </Link>
          <Link
            to="/lessons"
            className="rounded-full border border-[#f2d7de] bg-[#FFF0F5] px-5 py-2.5 text-sm font-bold text-[#9E2A4B]"
          >
            Học bài yếu
          </Link>
        </div>
      </div>
    </LearnerShell>
  );
}
