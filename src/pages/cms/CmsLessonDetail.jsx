import { Link, useLocation } from 'react-router-dom';
import { CmsShell } from '../../components/shells';

const BLOCKS = [];

export default function CmsLessonDetail() {
  const { pathname } = useLocation();
  return (
    <CmsShell pathname={pathname} breadcrumb="Chi tiết bài học">
      <div className="p-8 text-on-surface" data-page="CmsLessonDetail">
        <Link to="/lesson-cms" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#6F6669] hover:text-[#D94B68]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quản lý bài học
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#eadfd9] bg-white p-6">
          <div>
            <p className="font-mono text-xs font-bold text-[#D94B68]">Mục này chưa có dữ liệu.</p>
            <h1 className="mt-1 text-2xl font-bold">—</h1>
            <p className="mt-1 text-sm text-[#6F6669]">—</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/video-editor"
              className="rounded-lg border border-[#eadfd9] px-3 py-2 text-sm font-semibold"
            >
              Sửa video
            </Link>
            <Link
              to="/admin/content-review"
              className="rounded-lg bg-[#D94B68] px-3 py-2 text-sm font-semibold text-white"
            >
              Gửi duyệt lại
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-7">
            {BLOCKS.map((b) => (
              <article key={b.t} className="rounded-2xl border border-[#eadfd9] bg-white p-5">
                <h2 className="text-sm font-bold">{b.t}</h2>
                <p className="mt-1 text-sm text-[#6F6669]">—</p>
              </article>
            ))}
          </section>
          <aside className="rounded-2xl border border-[#eadfd9] bg-white p-6 lg:col-span-5">
            <h2 className="text-lg font-bold">Thống kê</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#6F6669]">Lượt học</dt>
                <dd className="font-bold">—</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6F6669]">—</dt>
                <dd className="font-bold">—</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6F6669]">Điểm quiz TB</dt>
                <dd className="font-bold">—</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6F6669]">Tác giả</dt>
                <dd className="font-bold">—</dd>
              </div>
            </dl>
            <Link to="/lesson-player" className="mt-6 inline-flex text-sm font-bold text-[#D94B68] hover:underline">
              Xem như học viên
            </Link>
          </aside>
        </div>
      </div>
    </CmsShell>
  );
}
