import { Link } from 'react-router-dom';
import { PublicShell } from '@/layouts';
import { useLocale } from '@/locales/locale.js';

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
  const { tr } = useLocale();
  return (
    <PublicShell>
      <div className="bg-rp-brand-tint text-rp-text" data-page="MockExam">
        <div className="mx-auto max-w-[1100px] px-5 pb-12 pt-6 sm:px-8">
          <nav className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-rp-text-2">
            <Link className="hover:text-rp-brand" to="/">{tr('Trang chủ')}</Link>
            <span>/</span>
            <Link className="hover:text-rp-brand" to="/courses">{tr('Luyện thi JLPT')}</Link>
            <span>/</span>
            <span className="font-medium text-rp-text">{tr('Thi thử')}</span>
          </nav>

          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-rp-brand-strong via-rp-brand to-rp-brand-strong px-5 py-8 text-white shadow-[0_24px_60px_-28px_rgba(158,42,75,0.55)] sm:px-8 sm:py-10 lg:px-10">
            <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <div className="pt-2">
                <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
                  {tr('Thi thử JLPT')}
                </div>
                <h1 className="mt-5 max-w-xl text-[34px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">
                  {tr('Thi thử JLPT có giờ, đủ các phần của đề.')}
                </h1>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85">
                  {tr('Làm một lượt, xem kết quả từng phần, rồi biết nên ôn gì tiếp. Điểm này để luyện, không phải chứng chỉ.')}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/mock-tests/?level=N3" className="inline-flex rounded-full bg-rp-brand-soft px-5 py-2.5 text-[14px] font-semibold text-rp-brand-strong">
                    {tr('Bắt đầu thi thử')}
                  </Link>
                  <a href="#cau-truc" className="inline-flex rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-rp-text">
                    {tr('Xem cấu trúc đề')}
                  </a>
                </div>
              </div>
              <aside className="rounded-[24px] bg-white p-5 text-rp-text shadow-[0_16px_40px_-24px_rgba(45,40,42,0.45)] sm:p-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-rp-text-muted">{tr('Bạn nhận được gì')}</div>
                <h2 className="mt-2 text-[22px] font-extrabold leading-snug">{tr('Một mốc để bắt đầu ôn.')}</h2>
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
                  className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-rp-text shadow-sm hover:text-rp-brand"
                >
                  {tr(chip.label)}
                </a>
              ))}
            </nav>
          </section>

          <section className="mt-8 scroll-mt-24" id="tong-quan">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Tổng quan')}</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Một lượt, đủ ba phần đề N3.')}</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-rp-text-2">
              {tr('Đề thử dùng cấu trúc trên RikiPath và lưu kết quả từng lượt. Thời lượng dưới đây là của bài luyện, không phải cam kết trùng đề chính thức.')}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                ['3 phần', 'Kiến thức ngôn ngữ, đọc và nghe.'],
                ['140 phút', 'Nếu làm liền một mạch.'],
                ['Cần tài khoản', 'Để lưu tiến độ và xem lại kết quả.'],
              ].map(([title, desc]) => (
                <article key={title} className="rounded-[24px] border border-rp-brand-border/45 bg-white p-5">
                  <div className="text-[16px] font-extrabold text-rp-brand">{tr(title)}</div>
                  <p className="mt-1 text-[14px] text-rp-text-2">{tr(desc)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 scroll-mt-24" id="cau-truc">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Cấu trúc')}</div>
            <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Ba phần trong đề thử N3.')}</h2>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-rp-brand-border/45 bg-white">
              <div className="hidden grid-cols-[1.1fr_0.7fr_1.3fr_1fr] gap-3 border-b border-rp-brand-border/40 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-rp-text-muted sm:grid">
                <span>{tr('Phần')}</span>
                <span>{tr('Thời lượng')}</span>
                <span>{tr('Cần quan sát')}</span>
                <span>{tr('Ôn tiếp')}</span>
              </div>
              {PARTS.map(([name, time, watch, next]) => (
                <div key={name} className="grid gap-1 border-b border-rp-brand-border/30 px-5 py-4 last:border-b-0 sm:grid-cols-[1.1fr_0.7fr_1.3fr_1fr] sm:items-center sm:gap-3">
                  <div className="font-bold">{name}</div>
                  <div className="text-[14px] text-rp-brand">{time}</div>
                  <div className="text-[14px] text-rp-text-2">{watch}</div>
                  <Link className="text-[14px] font-semibold text-rp-brand" to="/courses">{next}</Link>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 scroll-mt-24" id="cach-lam">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Cách làm')}</div>
            <h2 className="mt-2 max-w-xl text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Đừng chỉ làm đề. Biến kết quả thành vòng ôn.')}</h2>
            <div style={{ '--rp-grid-min': '14.5rem' }} className="rp-fluid-grid mt-4">
              {STEPS.map(([n, title, desc]) => (
                <article key={n} className="rounded-[24px] border border-rp-brand-border/45 bg-white p-5">
                  <div className="text-[13px] font-extrabold text-rp-brand">{n}</div>
                  <h3 className="mt-2 text-[16px] font-bold">{tr(title)}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-rp-text-2">{tr(desc)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8 grid scroll-mt-24 items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]" id="ket-qua">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Đọc kết quả')}</div>
              <h2 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Điểm thử là dữ liệu luyện, không phải dự đoán chắc.')}</h2>
              <ul className="mt-4 space-y-2">
                {READS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rp-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <aside className="rounded-[28px] bg-rp-brand-tint p-6">
              <h3 className="text-[20px] font-extrabold">{tr('Sẵn sàng làm lượt đầu?')}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-rp-text-2">{tr('Đăng nhập để lưu từng phần và xem kết quả sau khi nộp bài.')}</p>
              <div className="mt-4 flex flex-col items-start gap-2 text-[14px] font-semibold text-rp-brand-strong">
                <Link className="hover:text-rp-brand" to="/mock-tests/?level=N3">{tr('Mở đề thi thử N3')}</Link>
                <Link className="hover:text-rp-brand" to="/register">{tr('Học nhóm cùng Mentor')}</Link>
                <Link className="hover:text-rp-brand" to="/courses">{tr('Xem lộ trình ôn')}</Link>
              </div>
            </aside>
          </section>

          <section className="mt-8 rounded-[24px] border border-rp-brand-border/45 bg-white p-5 sm:p-6">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-rp-brand">{tr('Minh bạch')}</div>
            <h2 className="mt-2 text-[22px] font-extrabold">{tr('Bài thi thử không thay kỳ thi JLPT.')}</h2>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-rp-text-2">
              {tr('RikiPath là nơi luyện tập. Kết quả giúp tự đánh giá và chọn phần ôn, không phải chứng chỉ, không thay điểm do đơn vị tổ chức thi cấp, và không bảo đảm trùng ngày thi thật.')}
            </p>
          </section>

          <section className="mt-8 scroll-mt-24" id="faq">
            <h2 className="text-[28px] font-extrabold leading-tight sm:text-[32px]">{tr('Câu hỏi thường gặp.')}</h2>
            <div className="mt-4 divide-y divide-rp-brand-border/50 rounded-[28px] border border-rp-brand-border/45 bg-white">
              {FAQ.map(([q, a]) => (
                <details key={q} className="px-5 py-4 sm:px-6">
                  <summary className="cursor-pointer list-none text-[15px] font-bold">{q}</summary>
                  <p className="mt-2 text-[14px] leading-relaxed text-rp-text-2">{a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="rounded-[28px] bg-gradient-to-br from-rp-brand via-rp-brand-strong to-rp-brand-strong px-6 py-8 text-white sm:px-8">
              <h2 className="max-w-xl text-[28px] font-extrabold leading-tight">{tr('Chọn lúc bạn có đủ thời gian và thiết bị ổn.')}</h2>
              <p className="mt-2 max-w-xl text-[15px] text-white/85">{tr('Xong lượt đầu, ghi lại tối đa ba điểm yếu. Đó là việc cần ôn tiếp.')}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-rp-brand-strong">
                  {tr('Tạo tài khoản')}
                </Link>
                <Link to="/courses" className="inline-flex rounded-full border border-white/40 px-5 py-2.5 text-[13px] font-semibold text-white">
                  {tr('Xem cách ôn sau bài')}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
