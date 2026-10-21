import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingShell } from '../../components/shells';

function DashPreview() {
  const days = Array.from({ length: 42 }, (_, i) => {
    const n = (i * 7) % 11;
    return n > 7 ? 'bg-[#D94B68]' : n > 4 ? 'bg-[#F8BBD0]' : 'bg-[#FFF0F5]';
  });

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#dfbfc1]/50 bg-white shadow-[0_24px_60px_-28px_rgba(158,42,75,0.35)]">
      <div className="border-b border-[#fff0f5] px-4 py-2.5 text-[11px] text-[#A59B9E]">riki.path / student / dashboard</div>
      <div className="grid grid-cols-[168px_1fr]">
        <aside className="hidden space-y-1 border-r border-[#fff0f5] p-3 sm:block">
          <div className="mb-3 flex items-center gap-2 px-2 py-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] text-[11px] font-bold text-white">R</span>
            <span className="text-[12px] font-bold">RikiPath</span>
          </div>
          {[
            ['Bảng điều khiển', true],
            ['Luyện tập JLPT', false],
            ['Thi thử', false],
            ['Kết quả', false],
            ['Từ vựng', false],
            ['Ngữ pháp', false],
            ['Đọc hiểu', false],
            ['Nghe hiểu', false],
          ].map(([label, on]) => (
            <div
              key={label}
              className={on ? 'rounded-xl bg-[#D94B68] px-2.5 py-2 text-[11px] font-semibold text-white' : 'px-2.5 py-2 text-[11px] text-[#6F6669]'}
            >
              {label}
            </div>
          ))}
        </aside>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-[#A59B9E]">Kế hoạch ôn tập mỗi ngày</div>
              <div className="text-[18px] font-extrabold leading-tight">Hôm nay ôn đúng phần còn yếu.</div>
            </div>
            <div className="rounded-full bg-[#fff0f5] px-2.5 py-1 text-[10px] font-semibold text-[#D94B68]">3 ngày liên tiếp</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl bg-gradient-to-br from-[#D94B68] to-[#9E2A4B] p-4 text-white">
              <div className="text-[11px] text-white/70">Việc tiếp theo</div>
              <div className="mt-2 text-[20px] font-extrabold">Ôn lỗi đọc N3</div>
              <p className="mt-2 text-[12px] leading-relaxed text-white/80">Xem lại câu sai ở lượt thi trước, rồi luyện thêm 15 phút.</p>
            </div>
            <div className="rounded-2xl border border-[#dfbfc1]/40 p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[#6F6669]">
                <span>Tiến độ ôn luyện</span>
                <span>3 tháng gần nhất</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((tone, i) => (
                  <span key={i} className={`h-2.5 rounded-sm ${tone}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Từ vựng N3', '10 phút · theo chủ đề'],
              ['Đọc hiểu', '20 phút · đoạn vừa'],
              ['Nghe hiểu', '15 phút · hội thoại'],
            ].map(([title, sub]) => (
              <div key={title} className="rounded-2xl border border-[#dfbfc1]/40 p-3">
                <div className="text-[13px] font-bold">{title}</div>
                <div className="mt-1 text-[11px] text-[#A59B9E]">{sub}</div>
                <div className="mt-3 text-[11px] font-semibold text-[#D94B68]">Luyện tập →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PARTS = [
  {
    id: 'vocab',
    tab: 'Từ vựng',
    title: 'Từ vựng',
    lead: 'Kanji, cách đọc và từ đúng ngữ cảnh đề.',
    items: [
      ['Kanji', 'Mặt chữ, âm đọc và nghĩa.'],
      ['Từ trong câu', 'Chọn từ hợp ngữ cảnh.'],
      ['Từ gần nghĩa', 'Phân biệt cách dùng hay bị tráo.'],
    ],
  },
  {
    id: 'grammar',
    tab: 'Ngữ pháp',
    title: 'Ngữ pháp',
    lead: 'Mẫu câu hay ra đề, kèm lỗi thường gặp.',
    items: [
      ['Chọn mẫu đúng', 'Điền cấu trúc hợp với câu.'],
      ['Sắp xếp câu', 'Ghép thứ tự từ thành câu.'],
      ['Theo cấp độ', 'Bài luyện tập tăng dần N5–N2.'],
    ],
  },
  {
    id: 'reading',
    tab: 'Đọc hiểu',
    title: 'Đọc hiểu',
    lead: 'Đoạn ngắn đến bài dài. Bắt ý chính, rồi xem câu sai.',
    items: [
      ['Đoạn ngắn', 'Một ý, một câu hỏi.'],
      ['Bài vừa', 'Theo mạch và từ nối.'],
      ['Bài dài', 'Ý chính, chi tiết, suy luận.'],
    ],
  },
  {
    id: 'listening',
    tab: 'Nghe hiểu',
    title: 'Nghe hiểu',
    lead: 'Hội thoại và bài nói, đúng nhịp từng dạng đề.',
    items: [
      ['Hội thoại ngắn', 'Bắt thông tin chính.'],
      ['Tình huống', 'Ai nói gì, làm gì tiếp.'],
      ['Bài dài', 'Ý chính và thái độ người nói.'],
    ],
  },
];

const LEVELS = [
  ['N5', 'Nền tảng'],
  ['N4', 'Sơ cấp'],
  ['N3', 'Trung cấp'],
  ['N2', 'Nâng cao'],
];

const FAQ = [
  ['Nội dung ôn luyện JLPT gồm những gì?', 'Từ vựng, ngữ pháp, đọc hiểu và nghe hiểu. Nói và viết cùng Haru là kỹ năng bổ trợ, không nằm trong đề thi thử JLPT.'],
  ['Thi thử diễn ra thế nào?', 'Chọn cấp độ, làm đề có giới hạn thời gian, rồi xem kết quả từng phần và lỗi cần ôn lại.'],
  ['Haru có thay Sensei không?', 'Không. Haru góp ý nhanh khi luyện nói và viết. Sensei tư vấn lộ trình ôn luyện khi bạn cần người thật.'],
  ['Nên bắt đầu từ đâu?', 'Chọn nội dung cần ôn, luyện tập, xem kết quả, rồi ôn lại lỗi sai.'],
];

export default function HomeLanding() {
  const [partId, setPartId] = useState(PARTS[0].id);
  const part = PARTS.find((item) => item.id === partId) ?? PARTS[0];

  return (
    <MarketingShell>
      <div className="bg-[#FFF8F8] text-[#2D282A]" data-page="HomeLanding">
        <section className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D94B68]" />
              Nền tảng ôn luyện JLPT
            </div>
            <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight sm:text-[48px]">
              Ôn đúng trọng tâm, vững vàng trước kỳ thi JLPT.
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[#6F6669]">
              Ôn tập từ vựng, ngữ pháp, luyện đọc và nghe theo cấp độ. Thi thử có giới hạn thời gian, xem lại lỗi sai và theo dõi tiến bộ qua từng lần luyện tập.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex rounded-full bg-gradient-to-r from-[#D94B68] to-[#9E2A4B] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[#D94B68]/25"
              >
                Bắt đầu ôn luyện
              </Link>
              <Link to="/register" className="px-2 text-[14px] font-semibold text-[#D94B68]">
                Thi thử ngay
              </Link>
            </div>
            <p className="mt-5 text-[13px] font-medium text-[#6F6669]">Chọn nội dung → Luyện tập → Xem kết quả → Ôn lại lỗi sai</p>
          </div>
          <DashPreview />
        </section>

        <section className="mx-auto max-w-[1200px] scroll-mt-24 px-5 py-6 sm:px-8" id="pathway">
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Nội dung ôn luyện</div>
          <h2 className="mt-2 text-[32px] font-extrabold leading-tight">Từ vựng, ngữ pháp, đọc hiểu và nghe hiểu.</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-[#6F6669]">Chọn một phần, luyện theo cấp độ, rồi xem câu sai để ôn lại.</p>
          <div className="mt-4 rounded-[28px] border border-[#dfbfc1]/45 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {PARTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPartId(item.id)}
                  className={
                    item.id === part.id
                      ? 'rounded-full bg-[#D94B68] px-4 py-2 text-[13px] font-semibold text-white'
                      : 'rounded-full border border-[#dfbfc1]/70 px-4 py-2 text-[13px] font-semibold text-[#6F6669] hover:text-[#D94B68]'
                  }
                >
                  {item.tab}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <h3 className="text-[22px] font-extrabold">{part.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6F6669]">{part.lead}</p>
                <Link to="/register" className="mt-3 inline-flex text-[14px] font-semibold text-[#D94B68]">
                  Xem bài luyện tập
                </Link>
              </div>
              <ol className="space-y-2">
                {part.items.map(([title, desc], index) => (
                  <li key={title} className="flex gap-3 rounded-2xl bg-[#FFF8F8] p-4">
                    <span className="text-[13px] font-extrabold text-[#D94B68]">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="text-[14px] font-bold">{title}</div>
                      <p className="mt-0.5 text-[13px] text-[#6F6669]">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8">
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Thi thử JLPT</div>
          <h2 className="mt-2 text-[32px] font-extrabold leading-tight">Chọn cấp độ, làm đề, xem kết quả.</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-[#6F6669]">Đề có giới hạn thời gian. Sau mỗi lượt, xem phần sai và đưa vào kế hoạch ôn tập.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map(([level, label]) => (
              <Link key={level} to="/register" className="rounded-2xl border border-[#dfbfc1]/45 bg-white p-5 hover:border-[#D94B68]/35">
                <div className="text-[13px] font-extrabold text-[#D94B68]">{level}</div>
                <div className="mt-1 text-[16px] font-bold">{label}</div>
                <div className="mt-3 text-[13px] font-semibold text-[#D94B68]">Thi thử ngay</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8" id="plans">
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D94B68]">Công cụ hỗ trợ</div>
          <h2 className="mt-2 text-[32px] font-extrabold leading-tight">AI Haru và tư vấn Sensei.</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-[#6F6669]">Nói và viết cùng Haru là luyện kỹ năng bổ trợ, tách khỏi nội dung thi thử JLPT.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-[28px] border border-[#dfbfc1]/45 bg-white p-6">
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#D94B68]">Kỹ năng bổ trợ</div>
              <h3 className="mt-2 text-[20px] font-extrabold">Luyện nói và viết với Haru</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6F6669]">Haru góp ý pitch, câu viết và gợi ý nội dung cần ôn tiếp. Không tính vào điểm đề thi thử.</p>
              <Link to="/register" className="mt-4 inline-flex text-[14px] font-semibold text-[#D94B68]">
                Xem phản hồi Haru
              </Link>
            </article>
            <article className="rounded-[28px] border border-[#dfbfc1]/45 bg-white p-6">
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#D94B68]">Người thật</div>
              <h3 className="mt-2 text-[20px] font-extrabold">Tư vấn cùng Sensei</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6F6669]">Trao đổi mục tiêu, chỗ còn yếu và lộ trình ôn luyện khi bạn cần người hướng dẫn.</p>
              <Link to="/register" className="mt-4 inline-flex text-[14px] font-semibold text-[#D94B68]">
                Xem gói tư vấn
              </Link>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8" id="faq">
          <h2 className="text-[32px] font-extrabold leading-tight">Câu hỏi thường gặp.</h2>
          <div className="mt-4 divide-y divide-[#dfbfc1]/50 rounded-[28px] border border-[#dfbfc1]/45 bg-white">
            {FAQ.map(([q, a]) => (
              <details key={q} className="px-5 py-4 sm:px-6">
                <summary className="cursor-pointer list-none text-[15px] font-bold">{q}</summary>
                <p className="mt-2 text-[14px] leading-relaxed text-[#6F6669]">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-10 pt-4 sm:px-8">
          <div className="rounded-[28px] bg-gradient-to-br from-[#D94B68] via-[#ab2848] to-[#9E2A4B] px-6 py-8 text-white sm:px-8">
            <h2 className="max-w-xl text-[32px] font-extrabold leading-tight">Bắt đầu ôn luyện.</h2>
            <p className="mt-2 max-w-xl text-[15px] text-white/85">Chọn nội dung, luyện tập, xem kết quả và ôn lại lỗi sai.</p>
            <Link to="/register" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#9E2A4B]">
              Bắt đầu ôn luyện
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
