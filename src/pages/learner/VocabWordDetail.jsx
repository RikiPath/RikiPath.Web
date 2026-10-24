import { Link, useLocation } from 'react-router-dom';
import { LearnerShell } from '../../components/shells';

const EXAMPLES = [];

export default function VocabWordDetail() {
  const { pathname } = useLocation();
  return (
    <LearnerShell pathname={pathname} breadcrumb="Chi tiết từ">
      <div className="mx-auto max-w-4xl px-6 py-8 text-on-surface" data-page="VocabWordDetail">
        <Link to="/vocabulary" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6F6669] hover:text-[#D94B68]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Sổ từ
        </Link>

        <article className="rounded-3xl border border-[#eadfd9] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#D94B68]">Mục này chưa có dữ liệu.</p>
              <h1 className="mt-1 font-serif text-5xl font-bold tracking-tight">—</h1>
              <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[#A59B9E]">—</p>
              <p className="mt-2 max-w-md text-sm text-[#6F6669]">—</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full bg-[#fde8ec] px-3 py-1 text-[11px] font-bold text-[#9E2A4B]">—</span>
              <span className="text-xs font-semibold text-[#6F6669]">—</span>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['Âm On', '—'],
              ['Âm Kun', '—'],
              ['Hán Việt', '—'],
            ].map(([k]) => (
              <div key={k} className="rounded-xl bg-[#FFF8F8] px-4 py-3">
                <p className="text-[11px] font-bold uppercase text-[#A59B9E]">—</p>
                <p className="mt-1 text-lg font-bold">—</p>
              </div>
            ))}
          </div>

          <h2 className="mt-8 text-lg font-bold">Ví dụ</h2>
          <ul className="mt-3 space-y-3">
            {EXAMPLES.map((ex) => (
              <li key={ex.jp} className="rounded-xl border border-[#eadfd9] px-4 py-3">
                <p className="font-medium">—</p>
                <p className="mt-1 text-sm text-[#6F6669]">—</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              to="/daily-srs"
              className="rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2.5 text-sm font-bold text-white"
            >
              Ôn thẻ này trong SRS
            </Link>
            <Link
              to="/sentence-studio"
              className="rounded-full border border-[#f2d7de] bg-[#FFF0F5] px-5 py-2.5 text-sm font-bold text-[#9E2A4B]"
            >
              —
            </Link>
          </div>
        </article>
      </div>
    </LearnerShell>
  );
}
