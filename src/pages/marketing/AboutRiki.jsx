import { Link } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';

const FACTS = [
  'Ôn luyện tiếng Nhật theo mục tiêu từ N5 đến N2.',
  'Thi thử có giới hạn thời gian, nhận diện điểm mạnh và phần cần cải thiện.',
  'Luyện nói và viết với phản hồi từ trợ lý AI Haru.',
  'Trao đổi cùng Sensei để được hướng dẫn phù hợp với nhu cầu học tập.',
];

const CHIPS = [
  { href: '#la-gi', label: 'Về RikiPath' },
  { href: '#gom-gi', label: 'Tính năng nổi bật' },
  { href: '#cap-do', label: 'Cấp độ ôn luyện' },
  { href: '#bat-dau', label: 'Hướng dẫn bắt đầu' },
  { href: '#faq', label: 'Câu hỏi thường gặp' },
];

const PARTS = [
  [
    'Ôn tập mỗi ngày',
    'Củng cố từ vựng, ngữ pháp, đọc hiểu và nghe hiểu qua bài luyện tập theo cấp độ.',
  ],
  [
    'Luyện đề và thi thử',
    'Làm quen với áp lực thời gian, xem lại kết quả và xác định những nội dung cần ôn tập sau mỗi bài thi.',
  ],
  [
    'Luyện tập cùng AI Haru',
    'Luyện nói và viết với phản hồi từ Haru, giúp bạn nhận ra lỗi và từng bước cải thiện cách diễn đạt.',
  ],
  [
    'Đồng hành cùng Sensei',
    'Trao đổi trực tiếp trong buổi tư vấn 1–1 để giải đáp thắc mắc và định hướng việc học theo mục tiêu của bạn.',
  ],
];

const LEVELS = [
  [
    'N5',
    'Bắt đầu với bảng chữ cái, từ vựng cơ bản và những mẫu câu giao tiếp đơn giản.',
  ],
  [
    'N4',
    'Củng cố kiến thức sơ cấp và luyện hiểu các nội dung quen thuộc trong đời sống.',
  ],
  [
    'N3',
    'Mở rộng kiến thức trung cấp, luyện đọc và nghe trong nhiều tình huống thường ngày.',
  ],
  [
    'N2',
    'Nâng cao khả năng đọc hiểu và nghe hiểu các chủ đề đa dạng trong học tập, công việc và đời sống.',
  ],
];

const START = [
  [
    '01',
    'Tạo tài khoản và chọn mục tiêu',
    'Chọn cấp độ bạn muốn chinh phục để bắt đầu tìm kiếm nội dung học phù hợp.',
  ],
  [
    '02',
    'Thử sức với một bài thi',
    'Làm bài ở cấp độ bạn đang hướng đến và xem kết quả để nhận diện phần cần cải thiện.',
  ],
  [
    '03',
    'Ôn tập và theo dõi tiến bộ',
    'Củng cố phần còn yếu, luyện đề để đánh giá lại và trao đổi cùng Sensei khi cần hỗ trợ.',
  ],
];

const FAQ = [
  [
    'RikiPath có tổ chức kỳ thi JLPT chính thức không?',
    'RikiPath là nền tảng ôn luyện JLPT, không tổ chức kỳ thi hay cấp chứng chỉ chính thức. Kết quả thi thử giúp bạn xem lại lỗi sai và điều chỉnh kế hoạch ôn tập.',
  ],
  [
    'Nội dung luyện thi JLPT gồm những gì?',
    'Nội dung ôn luyện tập trung vào từ vựng, ngữ pháp, đọc hiểu và nghe hiểu. RikiPath còn hỗ trợ luyện nói và viết cùng AI Haru để phát triển thêm kỹ năng sử dụng tiếng Nhật; đây không phải các phần thi của JLPT.',
  ],
  [
    'Tôi nên bắt đầu từ cấp độ nào?',
    'Bạn có thể chọn cấp độ phù hợp với kiến thức đã học và thử làm một bài thi ở cấp độ đó. Dựa vào kết quả, bạn sẽ có thêm cơ sở để chọn nội dung ôn tập hoặc trao đổi cùng Sensei.',
  ],
  [
    'AI Haru và Sensei hỗ trợ tôi như thế nào?',
    'AI Haru hỗ trợ phản hồi khi bạn luyện nói và viết. Sensei giúp giải đáp thắc mắc và tư vấn hướng học phù hợp với nhu cầu của bạn. Phản hồi từ AI mang tính tham khảo và đôi khi cần được kiểm tra lại.',
  ],
];

const NEXT = [
  {
    to: '/courses',
    t: 'Khám phá nội dung luyện thi',
    d: 'Tìm bài luyện tập và nội dung cần ôn tiếp theo cấp độ bạn đang hướng đến.',
    cta: 'Xem nội dung luyện thi',
  },
  {
    to: '/exam-n3',
    t: 'Thử sức với đề N3',
    d: 'Làm bài có giới hạn thời gian để đánh giá khả năng làm đề ở cấp độ N3.',
    cta: 'Thi thử N3',
  },
  {
    to: '/#pathway',
    t: 'Tìm hiểu cấu trúc đề thi',
    d: 'Khám phá các nội dung kiểm tra để chuẩn bị kế hoạch ôn tập phù hợp.',
    cta: 'Xem cấu trúc đề thi',
  },
  {
    to: '/mentor',
    t: 'Kết nối cùng Sensei',
    d: 'Trao đổi về khó khăn hiện tại và nhận tư vấn cho mục tiêu học tiếng Nhật.',
    cta: 'Khám phá dịch vụ tư vấn',
  },
];

export default function AboutRiki() {
  return (
    <MarketingShell>
      <div className="bg-[#FFF8F8] text-[#2D282A]" data-page="AboutRiki">
        <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-6 sm:px-8">
          <nav className="mb-6 flex items-center gap-2 text-[13px] text-[#6F6669]">
            <Link className="hover:text-[#D94B68]" to="/">Trang chủ</Link>
            <span>/</span>
            <span className="font-medium text-[#2D282A]">RikiPath là gì</span>
          </nav>

          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#c23a58] via-[#D94B68] to-[#9E2A4B] px-5 py-8 text-white shadow-[0_24px_60px_-28px_rgba(158,42,75,0.55)] sm:px-8 sm:py-10 lg:px-10">
            <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <div className="pt-2">
                <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                  Nền tảng ôn luyện JLPT
                </div>
                <h1 className="mt-5 max-w-xl text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">
                  Hiểu rõ mình đang ở đâu. Ôn để tiến xa hơn.
                </h1>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85">
                	RikiPath gom bài luyện tập, thi thử và hỗ trợ trên cùng một nền tảng. Củng cố kiến thức, xem lại lỗi sai và tiến gần hơn đến mục tiêu tiếng Nhật của bạn.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/register" className="inline-flex rounded-full bg-[#ffd9e4] px-5 py-2.5 text-[14px] font-semibold text-[#9E2A4B]">
                    Bắt đầu ôn luyện
                  </Link>
                  <Link to="/courses" className="inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#2D282A]">
                    Khám phá nội dung luyện thi
                  </Link>
                </div>
              </div>
              <aside className="rounded-[24px] bg-white p-5 text-[#2D282A] shadow-[0_16px_40px_-24px_rgba(45,40,42,0.45)] sm:p-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Khám phá nhanh về RikiPath</div>
                <h2 className="mt-2 text-[22px] font-extrabold leading-snug">Bạn có thể làm gì với RikiPath?</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed">
                  {FACTS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            </div>
            <nav className="mt-8 flex gap-2 overflow-x-auto pb-1">
              {CHIPS.map((chip) => (
                <a
                  key={chip.label}
                  href={chip.href}
                  className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#2D282A] shadow-sm hover:text-[#D94B68]"
                >
                  {chip.label}
                </a>
              ))}
            </nav>
          </section>

          <section className="mt-8 scroll-mt-24 max-w-3xl" id="la-gi">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Giới thiệu</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Đồng hành trên hành trình học và luyện thi tiếng Nhật</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6F6669]">
            RikiPath giúp bạn nối nội dung ôn với việc làm đề và xem kết quả. Từ bài luyện tập đến bài thi thử, bạn xem lại lỗi sai và điều chỉnh kế hoạch ôn tập. Khi cần thêm hướng dẫn, luyện nói và viết cùng AI Haru hoặc trao đổi với Sensei.
            </p>
          </section>

          <section className="mt-8 scroll-mt-24" id="gom-gi">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Tính năng nổi bật</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Học, luyện tập và nhận hỗ trợ tại một nơi</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {PARTS.map(([title, desc]) => (
                <article key={title} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5">
                  <h3 className="text-[16px] font-bold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#6F6669]">{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 scroll-mt-24" id="cap-do">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Cấp độ</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Từng bước chinh phục mục tiêu từ N5 đến N2</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {LEVELS.map(([level, desc]) => (
                <article key={level} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-4">
                  <div className="text-[13px] font-extrabold text-[#D94B68]">{level}</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#6F6669]">{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 scroll-mt-24" id="bat-dau">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Hướng dẫn bắt đầu</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Ba bước, không học lan man.</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {START.map(([n, title, desc]) => (
                <article key={n} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5">
                  <div className="text-[13px] font-extrabold text-[#D94B68]">{n}</div>
                  <h3 className="mt-2 text-[16px] font-bold">{title}</h3>
                  <p className="mt-1 text-[14px] text-[#6F6669]">{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 scroll-mt-24" id="faq">
            <h2 className="text-[28px] font-extrabold leading-tight sm:text-[32px]">Câu hỏi thường gặp</h2>
            <div className="mt-4 divide-y divide-[#dfbfc1]/50 rounded-[28px] border border-[#dfbfc1]/45 bg-white">
              {FAQ.map(([q, a]) => (
                <details key={q} className="px-5 py-4 sm:px-6">
                  <summary className="cursor-pointer list-none text-[15px] font-bold">{q}</summary>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#6F6669]">{a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-[28px] font-extrabold leading-tight sm:text-[32px]">Chọn bước tiếp theo của bạn</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {NEXT.map((item) => (
                <article key={item.t} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5">
                  <h3 className="text-[16px] font-bold">{item.t}</h3>
                  <p className="mt-1 text-[14px] text-[#6F6669]">{item.d}</p>
                  <Link className="mt-4 inline-flex text-[13px] font-semibold text-[#D94B68]" to={item.to}>
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
