import { Link, useLocation } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';

const CHIPS = [
  { href: '#danh-cho-ban', label: 'Tổng quan' },
  { href: '#lo-trinh', label: 'Lộ trình ôn luyện' },
  { href: '#thi-thu', label: 'Luyện đề và thi thử' },
  { href: '#cap-do', label: 'Cấp độ N5–N2' },
  { href: '/mentor', label: 'Tư vấn cùng Sensei', route: true },
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
    to: '/exam-n3',
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
    to: '/roadmap',
    t: 'Lộ trình ôn luyện',
    d: 'Sắp xếp nội dung ôn luyện theo từng bước để duy trì việc học.',
    cta: 'Khám phá lộ trình',
  },
  {
    to: '/mentor',
    t: 'Tư vấn cùng Sensei',
    d: 'Trao đổi về mục tiêu, khó khăn và kế hoạch ôn luyện của bạn.',
    cta: 'Xem dịch vụ tư vấn',
  },
];

export default function CourseCatalog() {
  const { pathname } = useLocation();

  return (
    <MarketingShell pathname={pathname}>
      <div className="bg-[#FFF8F8] text-[#2D282A]" data-page="CourseCatalog">
        <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-6 sm:px-8">
          <nav className="mb-4 flex items-center gap-2 text-[13px] text-[#6F6669]">
            <Link className="hover:text-[#D94B68]" to="/">Trang chủ</Link>
            <span>/</span>
            <span className="font-medium text-[#2D282A]">Luyện thi JLPT</span>
          </nav>

          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#c23a58] via-[#D94B68] to-[#9E2A4B] px-5 py-8 text-white shadow-[0_24px_60px_-28px_rgba(158,42,75,0.55)] sm:px-8 sm:py-10 lg:px-10">
            <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <div className="pt-2">
                <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                  Luyện thi JLPT
                </div>
                <h1 className="mt-5 max-w-xl text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">
                  Luyện thi JLPT theo lộ trình, có thi thử.
                </h1>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85">
                  Biết ôn gì trước, khi nào làm đề, và sửa đúng phần đang kéo điểm.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to="/register"
                    className="inline-flex rounded-full bg-[#ffd9e4] px-5 py-2.5 text-[14px] font-semibold text-[#9E2A4B]"
                  >
                    Bắt đầu ôn luyện
                  </Link>
                  <Link
                    to="/#plans"
                    className="inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#2D282A]"
                  >
                    Xem gói tư vấn
                  </Link>
                </div>
              </div>

              <aside id="danh-cho-ban" className="scroll-mt-24 rounded-[24px] bg-white p-5 text-[#2D282A] shadow-[0_16px_40px_-24px_rgba(45,40,42,0.45)] sm:p-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Dành cho bạn</div>
                <h2 className="mt-2 text-[22px] font-extrabold leading-snug">Trang này phù hợp nếu bạn đang:</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[#2D282A]">
                  {FIT.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            </div>

            <nav className="mt-8 flex gap-2 overflow-x-auto pb-1">
              {CHIPS.map((chip) => {
                const className = 'shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#2D282A] shadow-sm hover:text-[#D94B68]';
                return chip.route ? (
                  <Link key={chip.label} to={chip.href} className={className}>
                    {chip.label}
                  </Link>
                ) : (
                  <a key={chip.label} href={chip.href} className={className}>
                    {chip.label}
                  </a>
                );
              })}
            </nav>
          </section>

          <section className="mt-8 scroll-mt-24" id="lo-trinh">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Lộ trình ôn luyện</div>
            <h2 className="mt-2 max-w-xl text-[28px] font-extrabold leading-tight sm:text-[32px]">Bốn bước, từ đánh giá đến điều chỉnh.</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <article key={step.n} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5">
                  <div className="text-[13px] font-extrabold text-[#D94B68]">{step.n}</div>
                  <h3 className="mt-3 text-[16px] font-bold">{step.t}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#6F6669]">{step.d}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 grid scroll-mt-24 items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]" id="thi-thu">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Luyện đề và thi thử</div>
              <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Thi thử cho bạn biết gì?</h2>
              <ul className="mt-4 space-y-2">
                {GAINS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D94B68]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <aside className="rounded-[28px] bg-[#FFF0F5] p-6 sm:p-7">
              <h3 className="text-[20px] font-extrabold">Bắt đầu ngay</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6F6669]">Tạo tài khoản, làm một bài thi thử, hoặc trao đổi cùng Sensei về kế hoạch ôn.</p>
              <div className="mt-4 flex flex-col items-start gap-2 text-[14px] font-semibold text-[#9E2A4B]">
                <Link className="hover:text-[#D94B68]" to="/register">Tạo tài khoản</Link>
                <Link className="hover:text-[#D94B68]" to="/exam-n3">Làm thi thử</Link>
                <Link className="hover:text-[#D94B68]" to="/mentor">Nhờ chọn lộ trình</Link>
              </div>
            </aside>
          </section>

          <section className="mt-8 scroll-mt-24" id="cap-do">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Cấp độ</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Chọn mức từ N5 đến N2.</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {LEVELS.map((level) => (
                <Link
                  key={level.k}
                  to="/course-detail"
                  className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5 transition hover:border-[#D94B68]/35"
                >
                  <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#D94B68]">{level.k}</div>
                  <h3 className="mt-2 text-[16px] font-bold">{level.t}</h3>
                  <p className="mt-1 text-[14px] text-[#6F6669]">{level.d}</p>
                  <div className="mt-4 text-[13px] font-semibold text-[#D94B68]">Xem bài luyện tập</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="max-w-md text-[28px] font-extrabold leading-tight sm:text-[32px]">Đi tiếp từ đây.</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {MORE.map((item) => (
                <article key={item.t} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5">
                  <h3 className="text-[16px] font-bold">{item.t}</h3>
                  <p className="mt-1 text-[14px] text-[#6F6669]">{item.d}</p>
                  <Link className="mt-4 inline-flex text-[13px] font-semibold text-[#D94B68] hover:text-[#9E2A4B]" to={item.to}>
                    {item.cta}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
