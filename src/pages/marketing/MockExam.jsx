import { Link } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';

const GAINS = [
  'Làm quen áp lực thời gian và nhịp chuyển giữa các phần.',
  'Xem kết quả từng phần, không chỉ dựa vào cảm giác.',
  'Biết nhóm lỗi nào nên ôn trước trong vòng sau.',
];

const CHIPS = [
  { href: '#tong-quan', label: 'Tổng quan' },
  { href: '#cau-truc', label: 'Cấu trúc đề' },
  { href: '#cach-lam', label: 'Cách làm' },
  { href: '#ket-qua', label: 'Đọc kết quả' },
  { href: '#faq', label: 'Hỏi đáp' },
];

const PARTS = [
  ['Kiến thức ngôn ngữ', '30 phút', 'Từ vựng, Kanji và ngữ pháp.', 'Ôn từ và mẫu câu'],
  ['Đọc hiểu', '70 phút', 'Ý chính, chi tiết và mạch văn.', 'Luyện đọc theo đoạn'],
  ['Nghe hiểu', '40 phút', 'Hội thoại, thái độ và ý chính.', 'Nghe lại dạng còn sai'],
];

const STEPS = [
  ['01', 'Chuẩn bị', 'Tai nghe, chỗ yên, đủ thời gian để làm liền một lượt.'],
  ['02', 'Làm như đề thật', 'Bám đồng hồ. Không tra từ và không xem đáp án giữa chừng.'],
  ['03', 'Tách lỗi', 'Lỗi kiến thức, lỗi dạng bài, hay lỗi hết giờ. Mỗi loại sửa một cách.'],
  ['04', 'Ôn ít việc', 'Chọn tối đa ba điểm yếu, ôn rồi làm lại trong điều kiện tương tự.'],
];

const READS = [
  'So từng phần để thấy phần đang kéo điểm xuống.',
  'Nhận xét nói và viết của Haru là gợi ý luyện, không phải điểm giám khảo.',
  'Xem nhiều lượt làm trong cùng điều kiện, đừng kết luận từ một lần.',
];

const FAQ = [
  ['Ai làm được bài thi thử?', 'Bạn cần tài khoản. Đăng nhập rồi mở đề N3 để hệ thống lưu lượt làm.'],
  ['Đề có đủ các phần JLPT không?', 'Đề thử N3 trên RikiPath có ba phần: kiến thức ngôn ngữ, đọc hiểu và nghe hiểu. Tổng khoảng 140 phút nếu làm liền.'],
  ['Điểm thi thử có phải điểm JLPT không?', 'Không. Đây là dữ liệu luyện tập. Thiết bị, độ khó và cách chấm có thể khác ngày thi thật.'],
  ['Có cần làm đủ ba phần một lần không?', 'Nên làm liền nếu bạn muốn thấy áp lực thời gian. Chỉ so các lượt làm trong điều kiện giống nhau.'],
  ['Bao lâu nên thi lại?', 'Ôn vài điểm yếu trước, rồi làm lại. Làm nhiều đề liên tiếp mà chưa xem lỗi thường không cho thấy tiến bộ.'],
];

export default function MockExam() {
  return (
    <MarketingShell>
      <div className="bg-[#FFF8F8] text-[#2D282A]" data-page="MockExam">
        <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-6 sm:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-[#6F6669]">
            <Link className="hover:text-[#D94B68]" to="/">Trang chủ</Link>
            <span>/</span>
            <Link className="hover:text-[#D94B68]" to="/courses">Luyện thi JLPT</Link>
            <span>/</span>
            <span className="font-medium text-[#2D282A]">Thi thử</span>
          </nav>

          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#c23a58] via-[#D94B68] to-[#9E2A4B] px-5 py-8 text-white shadow-[0_24px_60px_-28px_rgba(158,42,75,0.55)] sm:px-8 sm:py-10 lg:px-10">
            <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <div className="pt-2">
                <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                  Thi thử JLPT
                </div>
                <h1 className="mt-5 max-w-xl text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">
                  Thi thử JLPT có giờ, đủ các phần của đề.
                </h1>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85">
                  Làm một lượt, xem kết quả từng phần, rồi biết nên ôn gì tiếp. Điểm này để luyện, không phải chứng chỉ.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/exam-n3" className="inline-flex rounded-full bg-[#ffd9e4] px-5 py-2.5 text-[14px] font-semibold text-[#9E2A4B]">
                    Bắt đầu thi thử
                  </Link>
                  <a href="#cau-truc" className="inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#2D282A]">
                    Xem cấu trúc đề
                  </a>
                </div>
              </div>
              <aside className="rounded-[24px] bg-white p-5 text-[#2D282A] shadow-[0_16px_40px_-24px_rgba(45,40,42,0.45)] sm:p-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A59B9E]">Bạn nhận được gì</div>
                <h2 className="mt-2 text-[22px] font-extrabold leading-snug">Một mốc để bắt đầu ôn.</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-relaxed">
                  {GAINS.map((item) => (
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

          <section className="mt-8 scroll-mt-24" id="tong-quan">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Tổng quan</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Một lượt, đủ ba phần đề N3.</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#6F6669]">
              Đề thử dùng cấu trúc trên RikiPath và lưu kết quả từng lượt. Thời lượng dưới đây là của bài luyện, không phải cam kết trùng đề chính thức.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                ['3 phần', 'Kiến thức ngôn ngữ, đọc và nghe.'],
                ['140 phút', 'Nếu làm liền một mạch.'],
                ['Cần tài khoản', 'Để lưu tiến độ và xem lại kết quả.'],
              ].map(([title, desc]) => (
                <article key={title} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5">
                  <div className="text-[16px] font-extrabold text-[#D94B68]">{title}</div>
                  <p className="mt-1 text-[14px] text-[#6F6669]">{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 scroll-mt-24" id="cau-truc">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Cấu trúc</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Ba phần trong đề thử N3.</h2>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-[#dfbfc1]/45 bg-white">
              <div className="hidden grid-cols-[1.1fr_0.7fr_1.3fr_1fr] gap-3 border-b border-[#dfbfc1]/40 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#A59B9E] sm:grid">
                <span>Phần</span>
                <span>Thời lượng</span>
                <span>Cần quan sát</span>
                <span>Ôn tiếp</span>
              </div>
              {PARTS.map(([name, time, watch, next]) => (
                <div key={name} className="grid gap-1 border-b border-[#dfbfc1]/30 px-5 py-4 last:border-b-0 sm:grid-cols-[1.1fr_0.7fr_1.3fr_1fr] sm:items-center sm:gap-3">
                  <div className="font-bold">{name}</div>
                  <div className="text-[14px] text-[#D94B68]">{time}</div>
                  <div className="text-[14px] text-[#6F6669]">{watch}</div>
                  <Link className="text-[14px] font-semibold text-[#D94B68]" to="/courses">{next}</Link>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 scroll-mt-24" id="cach-lam">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Cách làm</div>
            <h2 className="mt-2 max-w-xl text-[28px] font-extrabold leading-tight sm:text-[32px]">Đừng chỉ làm đề. Biến kết quả thành vòng ôn.</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(([n, title, desc]) => (
                <article key={n} className="rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5">
                  <div className="text-[13px] font-extrabold text-[#D94B68]">{n}</div>
                  <h3 className="mt-2 text-[16px] font-bold">{title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#6F6669]">{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 grid scroll-mt-24 items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]" id="ket-qua">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Đọc kết quả</div>
              <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">Điểm thử là dữ liệu luyện, không phải dự đoán chắc.</h2>
              <ul className="mt-4 space-y-2">
                {READS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D94B68]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <aside className="rounded-[28px] bg-[#FFF0F5] p-6">
              <h3 className="text-[20px] font-extrabold">Sẵn sàng làm lượt đầu?</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6F6669]">Đăng nhập để lưu từng phần và xem kết quả sau khi nộp bài.</p>
              <div className="mt-4 flex flex-col items-start gap-2 text-[14px] font-semibold text-[#9E2A4B]">
                <Link className="hover:text-[#D94B68]" to="/exam-n3">Mở đề thi thử N3</Link>
                <Link className="hover:text-[#D94B68]" to="/mentor">Xem gói tư vấn</Link>
                <Link className="hover:text-[#D94B68]" to="/courses">Xem lộ trình ôn</Link>
              </div>
            </aside>
          </section>

          <section className="mt-8 rounded-[24px] border border-[#dfbfc1]/45 bg-white p-5 sm:p-6">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Minh bạch</div>
            <h2 className="mt-2 text-[22px] font-extrabold">Bài thi thử không thay kỳ thi JLPT.</h2>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#6F6669]">
              RikiPath là nơi luyện tập. Kết quả giúp tự đánh giá và chọn phần ôn, không phải chứng chỉ, không thay điểm do đơn vị tổ chức thi cấp, và không bảo đảm trùng ngày thi thật.
            </p>
          </section>

          <section className="mt-8 scroll-mt-24" id="faq">
            <h2 className="text-[28px] font-extrabold leading-tight sm:text-[32px]">Câu hỏi thường gặp.</h2>
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
            <div className="rounded-[28px] bg-gradient-to-br from-[#D94B68] via-[#ab2848] to-[#9E2A4B] px-6 py-8 text-white sm:px-8">
              <h2 className="max-w-xl text-[28px] font-extrabold leading-tight">Chọn lúc bạn có đủ thời gian và thiết bị ổn.</h2>
              <p className="mt-2 max-w-xl text-[15px] text-white/85">Xong lượt đầu, ghi lại tối đa ba điểm yếu. Đó là việc cần ôn tiếp.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#9E2A4B]">
                  Tạo tài khoản
                </Link>
                <Link to="/courses" className="inline-flex rounded-full border border-white/40 px-5 py-2.5 text-[13px] font-semibold text-white">
                  Xem cách ôn sau bài
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
