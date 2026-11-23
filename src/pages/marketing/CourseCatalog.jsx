import { Link, useLocation } from 'react-router-dom';
import { PublicShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';

const CHIPS = [
  { href: '#danh-cho-ban', label: 'Tổng quan' },
  { href: '#lo-trinh', label: 'Lộ trình ôn luyện' },
  { href: '#thi-thu', label: 'Luyện đề và thi thử' },
  { href: '#cap-do', label: 'Cấp độ N5–N2' },
  { href: '/register', label: 'Học nhóm cùng Giáo viên', route: true },
];

const FIT = [
  'Muốn ôn luyện theo mục tiêu và cấp độ rõ ràng.',
  'Cần kết hợp học kiến thức với thực hành làm đề.',
  'Muốn xem lại kết quả để tập trung cải thiện phần còn yếu.',
];

const STEPS = [
  {
    n: '01',
    t: 'Đánh giá ban đầu',
    d: 'Thử sức với một bài thi để nhận diện kiến thức đã vững và phần cần củng cố.',
  },
  {
    n: '02',
    t: 'Ôn tập có trọng tâm',
    d: 'Tập trung vào từ vựng, ngữ pháp và những kỹ năng bạn còn gặp khó khăn.',
  },
  {
    n: '03',
    t: 'Luyện đề có thời gian',
    d: 'Thực hành làm đề để rèn cách phân bổ thời gian và kiểm tra kiến thức đã ôn.',
  },
  {
    n: '04',
    t: 'Xem lại và điều chỉnh',
    d: 'Rút kinh nghiệm từ lỗi sai và điều chỉnh kế hoạch cho vòng ôn tập tiếp theo.',
  },
];

const GAINS = [
  'Nhận diện nội dung đã nắm vững và phần cần ôn thêm.',
  'Đánh giá khả năng hoàn thành bài trong thời gian quy định.',
  'Có thêm cơ sở để điều chỉnh kế hoạch ôn luyện.',
];

const LEVELS = [
  {
    k: 'N5',
    t: 'Xây dựng nền tảng',
    d: 'Làm quen với từ vựng, chữ Hán và mẫu câu cơ bản.',
  },
  {
    k: 'N4',
    t: 'Củng cố sơ cấp',
    d: 'Mở rộng kiến thức và luyện hiểu các tình huống quen thuộc.',
  },
  {
    k: 'N3',
    t: 'Phát triển trung cấp',
    d: 'Luyện đọc và nghe với nội dung đa dạng trong đời sống.',
  },
  {
    k: 'N2',
    t: 'Nâng cao năng lực',
    d: 'Rèn đọc hiểu văn bản dài và nghe các chủ đề phức tạp hơn.',
  },
];

const MORE = [
  {
    to: '/mock-tests/?level=N3',
    t: 'Thi thử JLPT N3',
    d: 'Thử sức với đề N3 và luyện phân bổ thời gian làm bài.',
    cta: 'Bắt đầu thi thử N3',
  },
  {
    to: '/feature/ai-scoring',
    t: 'Luyện tập cùng AI Haru',
    d: 'Khám phá phản hồi AI dành cho bài luyện nói và viết.',
    cta: 'Tìm hiểu AI Haru',
  },
  {
    to: '/courses/#lo-trinh',
    t: 'Lộ trình ôn luyện',
    d: 'Sắp xếp nội dung ôn luyện theo từng bước để duy trì việc học.',
    cta: 'Khám phá lộ trình',
  },
  {
    to: '/#group-learning',
    t: 'Học nhóm cùng Giáo viên',
    d: 'Lớp nhỏ 1–4 học viên trong 10 tuần, lịch cố định cùng Giáo viên.',
    cta: 'Tìm hiểu lớp nhóm',
  },
];

export default function CourseCatalog() {
  const { tr } = useLocale();
  const { pathname } = useLocation();

  return (
    <PublicShell pathname={pathname}>
      <div className="bg-rp-bg text-rp-text" data-page="CourseCatalog">
        <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-6 sm:px-8">
          <nav className="mb-4 flex items-center gap-2 text-[13px] text-rp-text-2">
            <Link className="hover:text-rp-brand" to="/">{tr('Trang chủ')}</Link>
            <span>/</span>
            <span className="font-medium text-rp-text">{tr('Luyện thi JLPT')}</span>
          </nav>

          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-rp-brand-strong via-rp-brand to-rp-brand-strong px-5 py-8 text-white shadow-[0_24px_60px_-28px_rgba(158,42,75,0.55)] sm:px-8 sm:py-10 lg:px-10">
            <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <div className="pt-2">
                <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                  {tr('Luyện thi JLPT')}
                </div>
                <h1 className="mt-5 max-w-xl text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">
                  {tr('Luyện thi JLPT theo lộ trình, có thi thử.')}
                </h1>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85">
                  {tr('Biết ôn gì trước, khi nào làm đề, và sửa đúng phần đang kéo điểm.')}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/register/"
                    className="inline-flex rounded-full bg-rp-brand-soft px-5 py-2.5 text-[14px] font-semibold text-rp-brand-strong"
                  >
                    {tr('Bắt đầu ôn luyện')}
                  </Link>
                  <Link
                    to="/plans/"
                    className="inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-rp-text"
                  >
                    {tr('Xem gói tự học')}
                  </Link>
                </div>
              </div>

              <aside id="danh-cho-ban" className="scroll-mt-24 rounded-[24px] bg-white p-5 text-rp-text shadow-[0_16px_40px_-24px_rgba(45,40,42,0.45)] sm:p-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-rp-text-muted">{tr('Dành cho bạn')}</div>
                <h2 className="mt-2 text-[22px] font-extrabold leading-snug">{tr('Trang này phù hợp nếu bạn đang:')}</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-rp-text">
                  {FIT.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            </div>

            <nav className="mt-8 flex gap-2 overflow-x-auto pb-1">
              {CHIPS.map((chip) => {
                const className = 'shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-rp-text shadow-sm hover:text-rp-brand';
                return chip.route ? (
                  <Link key={chip.label} to={chip.href} className={className}>
                    {tr(chip.label)}
                  </Link>
                ) : (
                  <a key={chip.label} href={chip.href} className={className}>
                    {tr(chip.label)}
                  </a>
                );
              })}
            </nav>
          </section>

          <section className="mt-8 scroll-mt-24" id="lo-trinh">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Lộ trình ôn luyện')}</div>
            <h2 className="mt-2 max-w-xl text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Bốn bước, từ đánh giá đến điều chỉnh.')}</h2>
            <div style={{ '--rp-grid-min': '14.5rem' }} className="rp-fluid-grid mt-4">
              {STEPS.map((step) => (
                <article key={step.n} className="rounded-[24px] border border-rp-brand-border/45 bg-white p-5">
                  <div className="text-[13px] font-extrabold text-rp-brand">{step.n}</div>
                  <h3 className="mt-3 text-[16px] font-bold">{step.t}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-rp-text-2">{step.d}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 grid scroll-mt-24 items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]" id="thi-thu">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Luyện đề và thi thử')}</div>
              <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Thi thử cho bạn biết gì?')}</h2>
              <ul className="mt-4 space-y-2">
                {GAINS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rp-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <aside className="rounded-[28px] border border-rp-line bg-white p-6 shadow-rp-xs sm:p-7">
              <h3 className="text-[20px] font-extrabold">{tr('Bắt đầu ngay')}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-rp-text-2">{tr('Tạo tài khoản, làm một bài thi thử, hoặc học nhóm cùng Giáo viên.')}</p>
              <div className="mt-4 flex flex-col items-start gap-2 text-[14px] font-semibold text-rp-brand-strong">
                <Link className="hover:text-rp-brand" to="/register">{tr('Tạo tài khoản')}</Link>
                <Link className="hover:text-rp-brand" to="/mock-tests/?level=N3">{tr('Làm thi thử')}</Link>
                <Link className="hover:text-rp-brand" to="/register">{tr('Học nhóm cùng Giáo viên')}</Link>
              </div>
            </aside>
          </section>

          <section className="mt-8 scroll-mt-24" id="cap-do">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Cấp độ')}</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Chọn mức từ N5 đến N2.')}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LEVELS.map((level) => (
                <Link
                  key={level.k}
                  to="/register"
                  className="rounded-[24px] border border-rp-brand-border/45 bg-white p-5 transition hover:border-rp-brand/35"
                >
                  <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-rp-brand">{level.k}</div>
                  <h3 className="mt-2 text-[16px] font-bold">{level.t}</h3>
                  <p className="mt-1 text-[14px] text-rp-text-2">{level.d}</p>
                  <div className="mt-4 text-[13px] font-semibold text-rp-brand">{tr('Xem bài luyện tập')}</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="max-w-md text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Đi tiếp từ đây.')}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {MORE.map((item) => (
                <article key={item.t} className="rounded-[24px] border border-rp-brand-border/45 bg-white p-5">
                  <h3 className="text-[16px] font-bold">{item.t}</h3>
                  <p className="mt-1 text-[14px] text-rp-text-2">{item.d}</p>
                  <Link className="mt-4 inline-flex text-[13px] font-semibold text-rp-brand hover:text-rp-brand-strong" to={item.to}>
                    {tr(item.cta)}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
