import { Link, useLocation } from 'react-router-dom';

import { CmsShell } from '../../components/shells';

const LINKS = [
  { to: '/lesson-cms', label: 'Bài học', icon: 'menu_book' },
  { to: '/vocabulary-editor', label: 'Từ vựng', icon: 'translate' },
  { to: '/question-bank', label: 'Câu hỏi', icon: 'quiz' },
  { to: '/bulk-import', label: 'Import Excel', icon: 'upload_file' },
];

export default function AuthorDashboard() {
  const { pathname } = useLocation();
  return (
    <CmsShell pathname={pathname} breadcrumb="Bảng tác giả">
      <main data-page="AuthorDashboard" className="mx-auto w-full max-w-3xl px-6 py-7 sm:px-8">
        <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">Bảng tác giả</h1>
        <p className="mt-1 text-[13px] text-[#967F8A]">
          Bài và phản hồi duyệt sẽ hiện ở đây khi có trên máy chủ.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-xl border border-[#E8DFDC] bg-white px-3.5 py-3 text-[14px] text-[#3F3038] hover:bg-[#FFF7F9]"
            >
              <span className="material-symbols-outlined text-[18px] text-[#AD3155]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-[#E8DFDC] bg-white px-4 py-8 text-center">
          <p className="text-[14px] text-[#3F3038]">Chưa có bài được gán cho tài khoản này.</p>
          <p className="mt-1 text-[12px] text-[#AA8F9B]">Chưa có phản hồi duyệt.</p>
        </section>
      </main>
    </CmsShell>
  );
}
